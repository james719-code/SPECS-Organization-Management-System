# Payments, uploads, privacy, and publishing

These changes target the configured Firebase/Firestore and Supabase runtime.
Deploy the Edge Function, Firestore rules, and frontend as a coordinated release.
Briefly pause payment entry, uploads, and story moderation during rollout, deploy
the backend first, then publish the rules and rebuilt frontend. Existing tabs
should reload. The earlier registration fixes are part of the same release;
see [AUTH-REGISTRATION.md](AUTH-REGISTRATION.md).

## Payment records and finance

Payment creation, confirmation, editing, and deletion now use the protected
`payment` action. A confirmation reads the current payment, commits its paid
status and revenue together, and uses a deterministic revenue ID plus a saved
`paymentId`/`revenueId` relationship. Competing confirmations and retries reuse
that pair. Paid edits update both records atomically and preserve the original
recorder. Outside collections create the payment and revenue in one transaction.

Deleting a payment removes only its explicitly linked revenue. Finance prevents
direct deletion of linked revenue and tells staff to manage the payment instead.
Firestore rules block direct payment writes and modifications to linked revenue.
Unrelated, manually recorded revenue retains the normal finance workflow.

Older paid records without a saved revenue relationship are never matched or
deleted by label, price, or quantity alone. When an administrator tries to edit or
delete one, a matching dialog lists unlinked revenue of the same price/quantity
with its payer, event/activity, date, and reference. The administrator must select
the exact original entry. The backend validates amounts/event and atomically
links the records. Linking does not delete anything: staff review the payment and
choose the intended edit/delete afterward. Other officers are directed to an
administrator for this step. Ambiguous historical data is not guessed or repaired
automatically, and pre-existing duplicate revenue needs a separate accounting review.

## Privacy and uploads

Students can read their own profile, payments, and attendance, including imported
student-profile IDs linked to their account. Staff retain access to the member
directory and records. Organization revenue/expenses and officer records require
an officer/admin role. Attendance details use the saved recorder snapshot instead
of fetching another person's private profile.

Uploads reserve an immutable file ID in the server-only `storage_assets`
collection. Students can upload story covers only as approved volunteers, and
can delete only files registered to their authenticated UID. They cannot take
over another reserved ID, claim an existing legacy folder, enumerate storage, or
obtain private download URLs for other owners. Public asset buckets retain their
existing public read behavior. Staff can manage organization files. Legacy files
without ownership metadata remain staff-managed; deleting a volunteer's story
still works, and an unattributed old cover may require staff cleanup.

## Stories and admin screens

Volunteer story creation/edit/deletion uses the protected `story` action. The
backend assigns author identity, validates cover ownership, resets all approvals
on content changes, and exposes only a small public author projection. Officer
approval forwards a draft for admin review; only admins publish. The existing
explicit admin override remains available. Reviews carry the revision the
reviewer opened, so an edit cannot silently substitute different content before
approval or rejection. Direct client story writes are denied.

Bulk account approval splits a cohort into sequential batches of at most 50,
reads the actual per-batch success/failure result, and retains failed or
unconfirmed accounts for retry. The report-date input now updates the active
narrative/documentation/rating date state.

## Validation

From `specs-website`:

```powershell
npm run test:run
npm run test:safety:emulator
npm run build
```

The emulator suite uses only `demo-specs-auth`, runs files serially to isolate
their database resets, and simulates Supabase Storage calls. It checks payment
races, transaction rollback, exact deletion, paid edits, legacy reconciliation,
privacy and scoped queries, story ownership/moderation, file ownership, and the
earlier 300-registration test. Browser/unit tests cover protected API routing,
300-account bulk approval, and explicit legacy linking. These are local checks;
production bucket policies, network capacity, and historical records are not
altered by running them. The repository-wide frontend type check still has
pre-existing errors; the production build and Deno server check are separate.
