# Firestore read model and runtime boundaries

Firebase Firestore is the production data source. Firebase Authentication is the
identity source, Supabase Storage holds files, and `supabase/functions/specs-api`
handles privileged mutations and signed storage operations.

The migrated data uses a small CQRS-style split:

- Canonical documents remain in the original collections and keep the original
  relationship IDs for filtering and repair.
- Frequently rendered relationships are copied into bounded snapshots on the
  document that renders them. Reads therefore use one query/page instead of
  fetching every related student, officer, event, or account.
- `dataModelVersion: 2` identifies documents that have the new projection.
- `snapshotUpdatedAt` records when a projection was refreshed.

## Projection map

| Collection | Canonical IDs | Read projections |
| --- | --- | --- |
| `accounts` | `studentId`, `officerId`, `adminId` | `studentSnapshot`, `officerSnapshot`, `adminSnapshot`, `displayName`, `email` |
| `officers` | `studentId`, `accountUid` | `studentSnapshot`, `displayName`, `studentEmail` |
| `attendance` | `studentId`, `eventId`, `sessionId` | `studentSnapshot`, `eventSnapshot` |
| `payments` | `studentId`, `eventId`, `officerId` | `studentSnapshot`, `eventSnapshot`, `officerSnapshot`, `amount` |
| `revenue`, `expenses` | `eventId`, `sourceId`, `sourceType` | `eventSnapshot`, `amount` |
| `stories` | `authorId`, `imageFileId` | `authorSnapshot` |
| `files` | `storageFileId` | stable storage reference |

Notification collections are intentionally separated by audience so each user
can read only the relevant feed without a composite query:

| Collection | Audience / purpose |
| --- | --- |
| `notifications_all` | All signed-in users |
| `notifications_students` | Students |
| `notifications_officers` | Officers and administrators |
| `notifications_direct` | Direct notifications keyed by recipient UID |
| `notification_reads` | Per-user read state |

Snapshots are intentionally small and must not include passwords, service
credentials, or large file contents. Profile edits refresh the linked officer
and account projections through the `sync_student_snapshot` Edge Function.
Officer assignment, promotion, demotion, volunteer approval, and backfill also
maintain the same projections.

## Migration status and deployment

The Appwrite-to-Firebase migration and read-model backfill are complete. The
one-off migration scripts, reports, exports, service-account keys, and local
checkpoints are intentionally ignored by Git under `specs-website/migration/`,
`specs-website/migration-java/`, `specs-website/data/`, and
`specs-website/.migration/`.

Routine deployment commands are:

```powershell
# From the repository root
firebase deploy --only firestore:rules
npx supabase functions deploy specs-api
```

The backfill was idempotent and did not delete canonical data. New writes
should set the same projection fields; this keeps reads cheap while accepting
that a name or profile edit may be briefly stale until its projection syncs.

## Cost and indexing guidance

Keep list screens paginated and cache them by filter/sort key. Add Firestore
indexes only for query combinations that are actually used. Prefer cursor
pagination for large collections; offset pagination is retained temporarily
for legacy-provider compatibility and is less efficient as the offset grows.
