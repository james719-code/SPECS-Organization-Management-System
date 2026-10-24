# Supabase runtime

The old `appwrites-functions/` directory was empty. The replacement runtime is in `supabase/functions/specs-api/` and contains the TypeScript Edge Function used by the migrated frontend.

## Modules

- `auth/firebaseToken.ts` verifies Firebase ID tokens.
- `firebase/serviceAccount.ts`, `firebase/firestore.ts`, and `firebase/auth.ts` provide the privileged Firebase REST boundary without bundling the Firebase Admin SDK into Deno.
- `modules/officerManagement.ts` ports the Python Appwrite workflow: account acceptance, bulk acceptance, officer promotion/demotion, activation, password reset, deletion, volunteer decisions, and dual story approval.
- `modules/notifications.ts` publishes role-wide or direct in-app notifications in bounded batches (`publish_notification`, admin only) and one-to-one member notices (`notify_member`, officers and admins), then triggers push delivery.
- `modules/push.ts` stores browser push tokens (`register_push_token` / `unregister_push_token`, collection `push_tokens`) and delivers notifications through Firebase Cloud Messaging (HTTP v1) with the existing service account. Delivery is best-effort: a push failure never fails the publish, and dead tokens are deleted automatically.
- `modules/storage.ts` handles signed uploads/downloads/deletes and the CDN asset redirect used by existing image tags.

## What belongs in Git

The `supabase/` directory is part of the application and should remain tracked. It contains the deployable Edge Function source, `config.toml`, and this documentation.

The following local-only files are ignored:

- `supabase/.temp/` — Supabase CLI project state created by `supabase link`.
- `supabase/functions/.env*` — local secrets and provider credentials.
- Firebase service-account JSON keys anywhere in the repository.
- Completed migration scripts, exports, reports, and checkpoints under `specs-website/migration/`, `specs-website/migration-java/`, `specs-website/data/`, and `specs-website/.migration/`.

Do not commit service-role keys, Firebase service-account JSON, email-provider keys, or other production credentials. Keep the example environment files tracked and put real values in Supabase secrets or local ignored `.env` files.

## Supabase secrets

Set these with `supabase secrets set` or the Supabase dashboard. Never put service-account JSON, a service-role key, Resend key, or SendGrid key in `VITE_*` variables.

```text
FIREBASE_PROJECT_ID=specs-website-e902b
FIREBASE_SERVICE_ACCOUNT_JSON={...}
FIREBASE_WEB_API_KEY=the Firebase web API key
FIREBASE_PASSWORD_RESET_CONTINUE_URL=https://your-production-domain.example/login?passwordReset=1
STORAGE_ALLOWED_BUCKETS=specs-schedule,specs-files,specs-events,specs-picture,specs-public-files,specs-highlights
STORAGE_PUBLIC_ASSET_BUCKETS=specs-events,specs-picture,specs-highlights,specs-public-files,specs-files,specs-schedule
TEAM_ID_STUDENTS=students
TEAM_ID_OFFICERS=officers
TEAM_ID_VOLUNTEERS=volunteers
FIREBASE_TEAM_COLLECTION=team_memberships

```

`FIREBASE_PASSWORD_RESET_CONTINUE_URL` must use a domain authorized in Firebase Authentication. Set it to the local login URL while testing locally, and to the production login URL after deployment. The admin reset action accepts only an account UID and resolves the email from canonical account/snapshot data server-side.

The Edge Function no longer sends email. Announcements and member notices are in-app notifications plus Firebase Cloud Messaging web push (free). Push needs no extra secret here: it reuses `FIREBASE_SERVICE_ACCOUNT_JSON`, and the "Firebase Cloud Messaging API" must be enabled for the Firebase project. The browser needs `VITE_FIREBASE_VAPID_KEY` (Firebase Console > Project settings > Cloud Messaging > Web Push certificates).

Student payment receipts are generated in the `StudentPayments` frontend using the existing PDF dependency. The Edge Function does not create, upload, or email receipt files. Firebase's hosted password-reset handler is the canonical recovery flow; the frontend only requests the reset email and returns the user to the login page.

## Frontend variables

Copy `specs-website/.env.example` to the local `.env` and provide the Firebase web configuration, `VITE_SUPABASE_URL`, `VITE_SUPABASE_FUNCTION_URL`, and `VITE_SUPABASE_ANON_KEY`. Collection and bucket defaults match the local migration seed, but explicit variables are preferred.

Deploy after setting secrets:

```text
npx supabase functions deploy specs-api
```

The function intentionally uses `verify_jwt = false` in `supabase/config.toml` because the app sends Firebase ID tokens, not Supabase Auth JWTs. The function verifies the Firebase token itself on every protected request.

## Cached Storage egress

Asset views, previews, and downloads use the existing `/asset?bucket=...&fileId=...` resolver. It returns a `307` redirect to Supabase Storage instead of proxying the file bytes through the Edge Function. A warm function instance reuses each signed Storage URL for up to one hour, renewing it at least one minute before expiry. Reusing the exact URL lets repeat requests share a Storage CDN cache entry. Browser redirects are cached for up to five minutes, bounded by the remaining URL lifetime. The URL cache holds at most 500 entries per instance; cold starts or separate instances can issue different URLs and incur fresh cache misses.

Browser uploads explicitly set `cacheControl: '3600'` and disallow overwrites. Existing objects retain their current cache metadata. Replace files with new file IDs/paths so browsers receive a new URL. Deletion clears matching URL aliases in the current instance; browser caches can still retain previously downloaded bytes until their cache lifetime ends.

This preserves the existing bucket configuration and `STORAGE_PUBLIC_ASSET_BUCKETS`/`STORAGE_ALLOWED_BUCKETS` checks. Only buckets already exposed by the public asset resolver use its shared redirect cache. Authenticated JSON responses, including upload tokens and private download links, use `Cache-Control: no-store`.

Supabase's [Storage CDN](https://supabase.com/docs/guides/storage/cdn/fundamentals) serves Storage requests through its CDN. [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn), including signed-URL caching, is automatically enabled on Pro plans and above. Each distinct signed token has its own cache entry. Browser caching reduces downloads entirely; cached egress is recorded only when a network response actually hits Supabase's CDN cache. Adding cache headers to an Edge Function does not by itself guarantee cached-egress billing.

After deploying `specs-api` and rebuilding/deploying the frontend, verify an image in browser DevTools with browser caching disabled: follow the resolver's `Location` to Storage and repeat that exact Storage URL. Inspect `cf-cache-status` on the **Storage response** for `HIT` (the first request may show `MISS`). Check the Supabase usage dashboard over time for cached versus uncached Storage egress. Local tests cannot confirm the live plan, regional CDN cache hits, or billing totals. Signed URL expiry alone does not purge an existing CDN entry; see Supabase's Smart CDN documentation for invalidation behavior.

## Free-tier operating budget

Normal screens use Firebase client Auth/Firestore directly and Firestore rules; only privileged mutations, signed Storage operations, and email dispatch cross the Edge Function. This avoids turning every list/read into an Edge invocation. The 2026-10-15 data audit found 620 Firestore documents across the migrated collections, 159 Firebase Auth users, and 6 `files` metadata records. These are dataset counts, not read/write usage metrics. As a working estimate, 10 dashboard loads/day with roughly 10 Firestore reads each is about 100 reads/day; a 50-account acceptance batch is roughly 100 Firestore writes including team-membership records. Firestore's free quota is 50,000 reads/day, 20,000 writes/day, and 20,000 deletes/day, so normal usage should be comfortably below it while queries remain paginated.

Supabase's current free Edge quota is 500,000 invocations/month. Each protected admin/storage/email call is one invocation; preflight `OPTIONS` requests are not billed. Free runtime limits are 150 seconds wall-clock, 2 seconds CPU per request, and 256 MB memory. Bulk account actions are bounded at 50 accounts/request, while specific in-app notifications are bounded at 100 recipients and written in chunks so they can be retried instead of timing out. The email module therefore uses an HTTP provider and does not hold an SMTP connection.
