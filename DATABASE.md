# 🗄️ Database Schema Documentation (v2.2)

This document describes all 13 database collections (11 active, 2 unused) and 6 storage buckets in the database used by the SPECS Organization Management System.

> **Referenced by:** [README.md](README.md) — see the Database Schema section for a relationship overview.

---

## Relationship Overview

```
accounts (central hub)
├── students (one-to-one)
│   ├── payments (one-to-many)
│   ├── attendance (many-to-one from attendance)
│   └── stories (many-to-one from stories)
├── officers (one-to-one)
│   └── students (one-to-one reference)
└── admins (one-to-one)

events
├── attendance (one-to-one from attendance)
├── payments (one-to-one from payments)
└── expenses (many-to-one from expenses)

officers
├── attendance (one-to-many from attendance)
└── payments (one-to-one from payments)
```

---

## 1. Collection: `accounts`

**Collection ID:** `6858feff002fb157e032`

Central hub collection linking Appwrite Auth users to their role-specific data.

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`username`** | string | Size: 150 | ✅ | ✅ | - | - |
| **`type`** | enum | `student`, `officer`, `admin` | ✅ | - | - | - |
| **`verified`** | boolean | - | - | - | `false` | - |
| **`deactivated`** | boolean | - | - | - | `false` | Managed via Cloud Function |
| **`students`** | relationship | - | - | - | `NULL` | One to one |
| **`admins`** | relationship | - | - | - | `NULL` | One to one |
| **`officers`** | relationship | - | - | - | `NULL` | One to one |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

> **Note:** The `type` enum determines which relationship is populated. A `student` account links to `students`, an `officer` links to both `students` and `officers`, and an `admin` links to `admins`.

---

## 2. Collection: `students`

**Collection ID:** `6885e221000f3e6a5033`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`name`** | string | Size: 250 | ✅ | ✅ | - | - |
| **`email`** | string | Size: 300 | - | - | `NULL` | - |
| **`section`** | string | Size: 20 | - | - | `NULL` | - |
| **`address`** | string | Size: 300 | - | - | `NULL` | - |
| **`yearLevel`** | integer | Min: 1, Max: 4 | - | - | `NULL` | - |
| **`payments`** | relationship | - | - | - | `NULL` | One to many |
| **`student_id`** | integer | - | ✅ | ✅ | - | - |
| **`is_volunteer`** | boolean | - | - | - | `false` | - |
| **`volunteer_request_status`** | string | Size: 20 (values: none, pending, approved, rejected, backout_pending) | - | - | `none` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 3. Collection: `officers`

**Collection ID:** `officers`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | relationship | - | - | - | `NULL` | One to one |
| **`isSchedule`** | boolean | - | - | - | `false` | - |
| **`scheduleId`** | string | Size: 150 | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 4. Collection: `admins`

**Collection ID:** `admins`

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

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`event_name`** | string | Size: 150 | - | ✅ | `NULL` | - |
| **`date_to_held`** | datetime | - | - | - | `NULL` | - |
| **`added_by`** | string | Size: 30 | - | - | `NULL` | - |
| **`image_file`** | string | Size: 30 | - | - | `NULL` | - |
| **`description`** | string | Size: 15000 | - | ✅ | `NULL` | - |
| **`event_ended`** | boolean | - | - | - | `false` | - |
| **`collab[]`** | string | Size: 300 | - | - | `NULL` | Array |
| **`related_links[]`** | url | - | - | - | `NULL` | Array |
| **`meaning[]`** | string | Size: 10000 | - | - | `NULL` | Array |
| **`location`** | text | - | - | - | `NULL` | - |
| **`rating_links`** | text | - | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 6. Collection: `attendance`

**Collection ID:** `attendance`
*Updated: Relationship flipped to Many-to-One to enable filtering.*

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | **relationship** | - | - | - | `NULL` | **Many to one** 🆕 |
| **`events`** | relationship | - | - | - | `NULL` | One to one |
| **`name_attendance`** | string | Size: 150 | ✅ | - | - | - |
| **`officers`** | relationship | - | - | - | `NULL` | One to many |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 7. Collection: `payments`

**Collection ID:** `6885e333002bfa41803b`
*Updated: Added direct relationship to Students.*

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`students`** | **relationship** | - | - | - | `NULL` | **Many to one** 🆕 |
| **`is_event`** | boolean | - | - | - | `false` | - |
| **`activity`** | string | Size: 150 | - | - | `NULL` | - |
| **`price`** | double | Min: 1 | ✅ | - | - | - |
| **`item_name`** | string | Size: 150 | ✅ | - | - | - |
| **`quantity`** | integer | Min: 1 | ✅ | - | - | - |
| **`date_paid`** | datetime | - | ✅ | - | - | - |
| **`events`** | relationship | - | - | - | `NULL` | One to one |
| **`officers`** | relationship | - | - | - | `NULL` | One to one |
| **`is_outside_bscs`** | boolean | - | - | - | `false` | - |
| **`non_bscs_name`** | string | Size: 200 | - | - | `NULL` | - |
| **`is_paid`** | boolean | - | - | - | `false` | - |
| **`modal_paid`** | enum | `cash`, `gcash` | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 8. Collection: `expenses`

**Collection ID:** `685a5c8700349613807e`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`price`** | double | - | - | - | `NULL` | - |
| **`quantity`** | integer | - | - | - | `1` | - |
| **`name`** | string | Size: 150 | - | - | `NULL` | - |
| **`date_buy`** | datetime | - | - | - | `NULL` | - |
| **`isEvent`** | boolean | - | - | - | `false` | - |
| **`activity_name`** | string | Size: 150 | - | - | `NULL` | - |
| **`events`** | relationship | - | - | - | `NULL` | Many to one |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 9. Collection: `revenue`

**Collection ID:** `685a5c7b000cb98504a2`

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
| **`recorder`** | string | Size: 30 | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 10. Collection: `stories`

**Collection ID:** `stories`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`post_description`** | string | Size: 1000000 | - | - | `NULL` | - |
| **`image_bucket`** | string | Size: 30 | - | - | `NULL` | - |
| **`isAccepted`** | boolean | - | - | - | `false` | - |
| **`title`** | string | Size: 200 | - | ✅ | `NULL` | - |
| **`post_details`** | string | Size: 1000000 | - | - | `NULL` | - |
| **`related_links[]`** | url | - | - | - | `NULL` | Array |
| **`meaning[]`** | string | Size: 5000 | - | - | `NULL` | Array |
| **`students`** | relationship | - | - | - | `NULL` | Many to one |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

> **Note:** The `meaning[]` array provides labels/tags for the corresponding `related_links[]` entries.

---

## 11. Collection: `files`

**Collection ID:** `6859013f00315545756c`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`fileName`** | string | Size: 150 | - | ✅ | `NULL` | - |
| **`description`** | string | Size: 300 | - | ✅ | `NULL` | - |
| **`uploader`** | string | Size: 30 | - | - | `NULL` | - |
| **`fileID`** | string | Size: 30 | - | - | `NULL` | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 12. Collection: `metadata` (Unused)

**Collection ID:** `metadata`

Auxiliary collection containing only system metadata, not currently referenced by the application code.

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

---

## 13. Collection: `event_non_org` (Unused)

**Collection ID:** `event_non_org`

Auxiliary collection not active or referenced by the application code.

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
| **Cloud Function** | `VITE_FUNCTION_ID` | Server-side account management (promote, demote, deactivate, reactivate) |
| **Students Team** | `VITE_TEAM_ID_STUDENTS` | Team-based access control for student role |
| **Officers Team** | `VITE_TEAM_ID_OFFICERS` | Team-based access control for officer role |