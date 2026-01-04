# 🗄️ Database Schema Documentation (v2.0 - Fixed Relations)

## 1. Collection: `accounts`

**Collection ID:** `6858feff002fb157e032`

| Column name | Type | Size / Limits | Required | Indexed | Default value | Relationship Details |
| --- | --- | --- | --- | --- | --- | --- |
| **`$id`** | string | - | - | ✅ | - | - |
| **`username`** | string | Size: 150 | ✅ | ✅ | - | - |
| **`type`** | enum | - | ✅ | - | - | - |
| **`verified`** | boolean | - | - | - | `false` | - |
| **`students`** | relationship | - | - | - | `NULL` | One to one |
| **`admins`** | relationship | - | - | - | `NULL` | One to one |
| **`officers`** | relationship | - | - | - | `NULL` | One to one |
| **`$createdAt`** | datetime | - | - | - | - | - |
| **`$updatedAt`** | datetime | - | - | - | - | - |

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
| **`modal_paid`** | enum | - | - | - | `NULL` | - |
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