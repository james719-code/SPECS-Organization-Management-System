# 🗄️ Database Schema Documentation (v2.3)

This document describes all 13 database collections (11 active, 2 unused) and 6 storage buckets in the database used by the SPECS Organization Management System.

> **Referenced by:** [README.md](README.md) — see the Database Schema section for a relationship overview.
> **Last audited:** 2026-07-02 via `scripts/audit-collections.mjs` against live Appwrite database `6858fee6003b57a2b4b7`.

---

## Relationship Overview

```
accounts (central hub)
├── students (one-to-one, onDelete: cascade)
│   ├── payments (one-to-many, onDelete: setNull)
│   ├── attendance (many-to-one from attendance, onDelete: setNull)
│   └── stories (many-to-one from stories, onDelete: setNull)
├── officers (one-to-one, onDelete: cascade)
│   └── students (one-to-one, onDelete: cascade)
└── admins (one-to-one, onDelete: cascade)

events
├── attendance (one-to-one from attendance, onDelete: setNull)
├── payments (one-to-one from payments, onDelete: setNull)
└── expenses (many-to-one from expenses, onDelete: setNull)

officers
├── attendance (one-to-many from attendance, onDelete: setNull)
└── payments (one-to-one from payments, onDelete: setNull)
```

---

## 1. Collection: `accounts`

**Collection ID:** `6858feff002fb157e032`
**Env var:** `VITE_COLLECTION_ID_ACCOUNTS`

Central hub collection linking Appwrite Auth users to their role-specific data.

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`username`** | string | Size: 150 | ✅ | ✅ | - | - |
| **`type`** | enum | `student`, `officer`, `admin` | ✅ | - | - | - |
| **`verified`** | boolean | - | - | - | `false` | - |
| **`deactivated`** | boolean | - | - | - | `false` | Managed via Cloud Function |
| **`students`** | relationship | - | - | - | `NULL` | One to one → `students` [onDelete: cascade] |
| **`admins`** | relationship | - | - | - | `NULL` | One to one → `admins` [onDelete: cascade] |
| **`officers`** | relationship | - | - | - | `NULL` | One to one → `officers` [onDelete: cascade] |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

**Indexes:**

| Index key | Type | Attributes | Orders |
| --- | --- | --- | --- |
| `index_1` | fulltext | `username` | ASC |

> **Note:** The `type` enum determines which relationship is populated. A `student` account links to `students`, an `officer` links to both `students` and `officers`, and an `admin` links to `admins`.

---

## 2. Collection: `students`

**Collection ID:** `6885e221000f3e6a5033`
**Env var:** `VITE_COLLECTION_ID_STUDENTS`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`name`** | string | Size: 250 | ✅ | ✅ | - | - |
| **`email`** | string | Size: 300 | - | - | `NULL` | - |
| **`section`** | string | Size: 20 | - | - | `NULL` | - |
| **`address`** | string | Size: 300 | - | - | `NULL` | - |
| **`yearLevel`** | integer | Min: 1, Max: 4 | - | - | `NULL` | - |
| **`student_id`** | integer | Min: 1 | ✅ | ✅ | - | - |
| **`is_volunteer`** | boolean | - | - | - | `false` | - |
| **`volunteer_request_status`** | string | Size: 20 (values: `none`, `pending`, `approved`, `rejected`, `backout_pending`) | - | - | `none` | - |
| **`payments`** | relationship | - | - | - | `NULL` | One to many → `payments` (two-way: `students`) [onDelete: setNull] |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

**Indexes:**

| Index key | Type | Attributes | Orders |
| --- | --- | --- | --- |
| `index_1` | key | `name`, `student_id` | ASC, ASC |

---

## 3. Collection: `officers`

**Collection ID:** `officers`
**Env var:** `VITE_COLLECTION_ID_OFFICERS`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | relationship | - | - | - | `NULL` | One to one → `students` [onDelete: cascade] |
| **`isSchedule`** | boolean | - | - | - | `false` | - |
| **`scheduleId`** | string | Size: 150 | - | - | `NULL` | - |
| **`position`** | enum | `president`, `vice-president-internal`, `vice-president-external`, `secretary`, `asst-secretary`, `treasurer`, `asst-treasurer`, `auditor`, `p.i.o`, `business-mngr-1`, `business-mngr-2`, `srgt-arms-1`, `sgrt-arms-2`, `representative` | - | - | `NULL` | - |
| **`pictureId`** | string | Size: 255 | - | - | `NULL` | Storage file ID for the officer's profile picture |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 4. Collection: `admins`

**Collection ID:** `admins`
**Env var:** `VITE_COLLECTION_ID_ADMINS`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`fullName`** | string | Size: 128 | ✅ | - | - | - |
| **`email`** | email | - | ✅ | - | - | - |
| **`contactNumber`** | string | Size: 15 | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 5. Collection: `events`

**Collection ID:** `6859026800232b07755d`
**Env var:** `VITE_COLLECTION_ID_EVENTS`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`event_name`** | string | Size: 150 | - | ✅ | `NULL` | - |
| **`date_to_held`** | datetime | - | - | - | `NULL` | - |
| **`added_by`** | string | Size: 30 | - | - | `NULL` | - |
| **`image_file`** | string | Size: 30 | - | - | `NULL` | - |
| **`description`** | string | Size: 15000 | - | ✅ | `NULL` | - |
| **`event_ended`** | boolean | - | - | - | `false` | - |
| **`archived`** | boolean | - | - | - | `false` | Soft-archive flag to hide events without deleting them |
| **`collab[]`** | string | Size: 300 | - | - | `NULL` | Array |
| **`meaning[]`** | string | Size: 10000 | - | - | `NULL` | Array |
| **`location`** | text | - | - | - | `NULL` | - |
| **`rating_links`** | text | - | - | - | `NULL` | - |
| **`related_links_name[]`** | text | - | - | - | `NULL` | Array — display names / labels for related links |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

**Indexes:**

| Index key | Type | Attributes | Orders |
| --- | --- | --- | --- |
| `index_1` | fulltext | `event_name` | ASC |
| `index_2` | fulltext | `description` | ASC |

---

## 6. Collection: `attendance`

**Collection ID:** `attendance`
**Env var:** `VITE_COLLECTION_ID_ATTENDANCE`

*Updated: Relationship flipped to Many-to-One to enable filtering.*

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | **relationship** | - | - | - | `NULL` | **Many to one** → `students` [onDelete: setNull] 🆕 |
| **`events`** | relationship | - | - | - | `NULL` | One to one → `events` [onDelete: setNull] |
| **`name_attendance`** | string | Size: 150 | ✅ | - | - | - |
| **`officers`** | relationship | - | - | - | `NULL` | One to many → `officers` [onDelete: setNull] |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 7. Collection: `payments`

**Collection ID:** `6885e333002bfa41803b`
**Env var:** `VITE_COLLECTION_ID_PAYMENTS`

*Updated: Added direct relationship to Students.*

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | **relationship** | - | - | - | `NULL` | **Many to one** → `students` (two-way: `payments`) [onDelete: setNull] 🆕 |
| **`is_event`** | boolean | - | - | - | `false` | - |
| **`activity`** | string | Size: 150 | - | - | `NULL` | - |
| **`price`** | double | Min: 1 | ✅ | - | - | - |
| **`item_name`** | string | Size: 150 | ✅ | - | - | - |
| **`quantity`** | integer | Min: 1 | ✅ | - | - | - |
| **`date_paid`** | datetime | - | ✅ | - | - | - |
| **`events`** | relationship | - | - | - | `NULL` | One to one → `events` [onDelete: setNull] |
| **`officers`** | relationship | - | - | - | `NULL` | One to one → `officers` [onDelete: setNull] |
| **`is_outside_bscs`** | boolean | - | - | - | `false` | - |
| **`non_bscs_name`** | string | Size: 200 | - | - | `NULL` | - |
| **`is_paid`** | boolean | - | - | - | `false` | - |
| **`modal_paid`** | enum | `cash`, `gcash` | - | - | `NULL` | - |
| **`verified_by_name`** | text | - | - | - | `NULL` | Name of the officer/admin who marked the payment as paid |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 8. Collection: `expenses`

**Collection ID:** `685a5c8700349613807e`
**Env var:** `VITE_COLLECTION_ID_EXPENSES`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`price`** | double | - | - | - | `NULL` | - |
| **`quantity`** | integer | - | - | - | `1` | - |
| **`name`** | string | Size: 150 | - | - | `NULL` | - |
| **`date_buy`** | datetime | - | - | - | `NULL` | - |
| **`isEvent`** | boolean | - | - | - | `false` | - |
| **`activity_name`** | string | Size: 150 | - | - | `NULL` | - |
| **`events`** | relationship | - | - | - | `NULL` | Many to one → `events` [onDelete: setNull] |
| **`recorder`** | text | - | - | - | `NULL` | Name/ID of who recorded the expense |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 9. Collection: `revenue`

**Collection ID:** `685a5c7b000cb98504a2`
**Env var:** `VITE_COLLECTION_ID_REVENUE`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`name`** | string | Size: 400 | - | - | `NULL` | - |
| **`isEvent`** | boolean | - | - | - | `false` | - |
| **`event`** | string | Size: 30 | - | - | `NULL` | - |
| **`activity`** | string | Size: 150 | - | - | `NULL` | - |
| **`quantity`** | integer | - | - | - | `NULL` | - |
| **`price`** | double | - | - | - | `NULL` | - |
| **`date_earned`** | datetime | - | - | - | `NULL` | - |
| **`recorder`** | string | Size: 10000 | - | - | `NULL` | Name/ID of who recorded the revenue entry |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 10. Collection: `stories`

**Collection ID:** `stories`
**Env var:** `VITE_COLLECTION_ID_STORIES`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`post_description`** | string | Size: 1000000 | - | - | `NULL` | - |
| **`image_bucket`** | string | Size: 30 | - | - | `NULL` | - |
| **`isAccepted`** | boolean | - | - | - | `false` | Set `true` by admin final approval |
| **`officerApproval`** | boolean | - | - | - | `false` | Set `true` when an officer approves the story |
| **`adminApproval`** | boolean | - | - | - | `false` | Set `true` when an admin approves the story |
| **`title`** | string | Size: 200 | - | ✅ | `NULL` | - |
| **`post_details`** | string | Size: 1000000 | - | - | `NULL` | - |
| **`related_links[]`** | url | - | - | - | `NULL` | Array |
| **`meaning[]`** | string | Size: 5000 | - | - | `NULL` | Array |
| **`students`** | relationship | - | - | - | `NULL` | Many to one → `students` [onDelete: setNull] |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

**Indexes:**

| Index key | Type | Attributes | Orders |
| --- | --- | --- | --- |
| `title_index` | key | `title` | ASC |

> **Note:** The `meaning[]` array provides labels/tags for the corresponding `related_links[]` entries.
> **Approval workflow:** Officer sets `officerApproval=true` → story moves to admin queue. Admin sets `adminApproval=true` and `isAccepted=true` → story is published. Managed via Cloud Function (`approve_story` action).

---

## 11. Collection: `files`

**Collection ID:** `6859013f00315545756c`
**Env var:** `VITE_COLLECTION_ID_FILES`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`fileName`** | string | Size: 150 | - | ✅ | `NULL` | - |
| **`description`** | string | Size: 300 | - | ✅ | `NULL` | - |
| **`uploader`** | string | Size: 30 | - | - | `NULL` | - |
| **`fileID`** | string | Size: 30 | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

**Indexes:**

| Index key | Type | Attributes | Orders |
| --- | --- | --- | --- |
| `index_1` | fulltext | `fileName` | ASC |
| `index_2` | fulltext | `description` | ASC |

---

## 12. Collection: `metadata` (Unused)

**Collection ID:** `metadata`

Auxiliary collection for system-wide flags and configuration. Not currently wired into the app via `.env`. No `VITE_COLLECTION_ID_*` entry in `.env`.

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`ismaintenance`** | boolean | - | - | - | `false` | Global maintenance mode flag |
| **`ishiddenofficer`** | boolean | - | - | - | `false` | Flag to hide the officers section site-wide |
| **`schoolYear`** | text | - | - | - | `NULL` | Current school year label (e.g. `2025-2026`) |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 13. Collection: `event_non_org` (Unused)

**Collection ID:** `event_non_org`

Auxiliary collection not active or referenced by the application code. No `VITE_COLLECTION_ID_*` entry in `.env`.

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## Storage Buckets

The application uses 6 storage buckets for file management:

| Bucket | Env Variable | Purpose |
| --- | --- | --- |
| **Event Images** | `VITE_BUCKET_ID_EVENT_IMAGES` | Cover images for events |
| **User Uploads** | `VITE_BUCKET_ID_UPLOADS` | General file uploads by officers |
| **Resumes** | `VITE_BUCKET_ID_RESUMES` | Officer resume files |
| **Schedules** | `VITE_BUCKET_ID_SCHEDULES` | Officer schedule files |
| **Public Files** | `VITE_BUCKET_PUBLIC_FILES` | Downloadable resources on the landing page |
| **Highlight Images** | `VITE_BUCKET_ID_HIGHLIGHT_IMAGES` | Cover images for volunteer stories/highlights |

---

## Cloud Function & Teams

| Resource | Env Variable | Purpose |
| --- | --- | --- |
| **Cloud Function** | `VITE_FUNCTION_ID` | Server-side account management (promote, demote, deactivate, reactivate, delete, volunteer & story approval) |
| **Email Function** | `VITE_EMAIL_FUNCTION_ID` | Email notification delivery |
| **Students Team** | `VITE_TEAM_ID_STUDENTS` | Team-based access control for student role |
| **Officers Team** | `VITE_TEAM_ID_OFFICERS` | Team-based access control for officer role |
| **Admins Team** | `VITE_TEAM_ID_ADMINS` | Team-based access control for admin role |
| **Volunteers Team** | `VITE_TEAM_ID_VOLUNTEERS` | Team-based access control for volunteer sub-role |

---

## Activity Logs

> **Storage:** Client-side `localStorage` key `admin_activity_logs` — **not** an Appwrite collection.

The Admin Activity Logs page (`AdminActivityLogs.tsx`) stores audit entries in the browser's `localStorage`. Each entry has the following shape:

| Field | Type | Description |
| --- | --- | --- |
| **`id`** | string | Unique log entry ID |
| **`type`** | string | Activity type key (see table below) |
| **`description`** | string | Human-readable description of the action |
| **`metadata`** | object? | Optional structured metadata |
| **`timestamp`** | string | ISO 8601 timestamp |
| **`user`** | string | User context (username or ID) |

**Supported activity types:**

| Type key | Label |
| --- | --- |
| `account_created` | Account Created |
| `account_verified` | Account Verified |
| `account_promoted` | Promoted to Officer |
| `account_demoted` | Demoted to Student |
| `account_deactivated` | Account Deactivated |
| `account_reactivated` | Account Reactivated |
| `account_deleted` | Account Deleted |
| `password_reset` | Password Reset |
| `event_created` | Event Created |
| `event_deleted` | Event Deleted |
| `file_uploaded` | File Uploaded |
| `file_deleted` | File Deleted |
| `payment_created` | Payment Created |
| `payment_marked_paid` | Payment Marked Paid |
| `bulk_action` | Bulk Action |
| `login` | Login |
| `logout` | Logout |
| `export_data` | Data Exported |
| `other` | Other Activity |

> **Note:** Logs are cleared per-browser. Export CSV is available from the Activity Logs admin page. If persistent cross-device audit logging is needed, migrate this to a dedicated Appwrite `audit_logs` collection.