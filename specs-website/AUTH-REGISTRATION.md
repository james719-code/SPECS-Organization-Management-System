# Registration reliability

Firebase Auth creates and authenticates the email/password identity. The
`complete_registration` Edge action then takes ownership and email from the
verified ID token and commits the account, student profile, and student-number
reservation together. The action accepts an unverified email so the student can
receive its verification link; private dashboard data still requires both email
verification and membership approval.

An interrupted signup can be submitted again using the same email/password.
Firebase verifies the password before resuming the existing UID. Completion is
idempotent: a repeated request never resets approval or replaces a completed
profile. Email delivery failures preserve the registered account and direct the
student to sign in and resend from the pending-verification screen.

Student numbers are canonical positive integers. The backend checks imported
profiles and atomically claims `student_numbers/{number}`. Profile edits use the
same reservation mechanism, and account deletion releases the reservation.
Client writes cannot create accounts/profiles or change student numbers. Existing
duplicate numbers need an administrator's correction; no migration silently
changes another student's identity.

## Rollout

Temporarily pause registrations while releasing the coordinated changes:

1. Deploy `supabase/functions/specs-api` with the new registration/profile actions.
2. Publish `firestore.rules` and deploy the rebuilt frontend together. Existing
   browser tabs running the old signup code should reload before registering.
3. Confirm the production hostname is authorized in Firebase Authentication and
   that email/password sign-in and verification emails work on that hostname.
4. Test a new registration, an interrupted/retried registration, duplicate student
   numbers, verification resend, and approval followed by a dashboard login.

Approval no longer marks an email as verified on the student's behalf. Accounts
that are approved but unverified will see the email-verification screen. The new
check cannot retrospectively distinguish emails that older approval code marked
verified from those confirmed by an actual email link.

## Normal registration settings

Registration uses the existing Firebase Authentication settings and quotas.
No temporary increase or event-specific schedule is configured by this change.
The reliability fixes apply to normal signup and login, including interrupted
requests and simultaneous attempts to claim the same student number.

## Local validation

```powershell
npm run test:run
npm run test:auth:emulator
npm run build
```

The emulator command requires the Firebase CLI and Java. It uses the isolated
`demo-specs-auth` project, never production. It exercises 300 concurrent database
registrations, duplicate-number races, transaction rollback, imported records,
idempotent retries, profile edits, security rules, and independent email/approval
checks. Auth-provider/browser regressions run in the normal unit suite. These
checks do not measure production network latency, email throughput, project
quotas, or Edge Function cold-start capacity.

The server's credential-refresh concurrency test also runs from the repository
root with Deno:

```powershell
deno test --node-modules-dir=none --no-lock --allow-env supabase/functions/specs-api/firebase/serviceAccount_test.ts
```
