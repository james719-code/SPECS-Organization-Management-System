# 👥 SPECS User Types & Features Guide

This document describes the features, views, and system permissions for each of the three user types in the **Society of Programmers and Enthusiasts in Computer Science (SPECS) Portal**:
1. **Student**
2. **Officer**
3. **Admin**

The system employs client-side role-based routing (defined in [auth.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/guard/auth.js)) paired with Appwrite server-side collection permissions to ensure data isolation and security.

---

## 📑 Quick Comparison Matrix

| Feature / Dashboard View | 🎓 Student | 👔 Officer | 🔑 Admin | Implementation Module |
| :--- | :---: | :---: | :---: | :--- |
| **Event Calendar (View Only)** | ✅ | ✅ | ✅ | [student/views/events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/events.js) |
| **Personal Payments & Ledger** | ✅ | - | - | [student/views/payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/payments.js) |
| **Personal Attendance Records** | ✅ | - | - | [student/views/attendance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/attendance.js) |
| **Write/Edit/Delete Blog Stories** | ✅ | - | - | [student/views/posts.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/posts.js) (Volunteers only) |
| **Profile & Volunteer Application** | ✅ | - | - | [student/views/profile.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/profile.js) |
| **Finance Overview & Charts** | - | ✅ | ✅ | [officer/views/finance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/finance.js) / [admin/views/finance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/finance.js) |
| **Payment Verification & Records** | - | ✅ | ✅ | [officer/views/payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/payments.js) / [admin/views/payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/payments.js) |
| **Student Directory & Verification** | - | ✅ | ✅ | [officer/views/students.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/students.js) / [admin/views/students.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/students.js) |
| **Volunteer Request Approval** | - | ✅ | ✅ | [officer/views/volunteers.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/volunteers.js) |
| **Story Draft Approval** | - | ✅ | ✅ | [officer/views/stories.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/stories.js) / [admin/views/stories.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/stories.js) |
| **Event Planning & Editing** | - | ✅ | ✅ | [officer/views/events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/events.js) / [admin/views/events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/events.js) |
| **File Upload & Resume / Schedules** | - | ✅ | ✅ | [officer/views/files.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/files.js) / [admin/views/files.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/files.js) |
| **Account Lifecycle Management** | - | - | ✅ | [admin/views/accounts.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/accounts.js) (Cloud Function integration) |
| **Event Attendance Tracking** | - | - | ✅ | [admin/views/attendance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/attendance.js) |
| **Broadcasting Announcements** | - | - | ✅ | [admin/views/announcements.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/announcements.js) |
| **Analytics, Logs, & Reports Export** | - | - | ✅ | [admin/views/reports.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/reports.js) & [activity-logs.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/activity-logs.js) |

---

## 🔒 Verification and Deactivation States

All user accounts possess two crucial flags in the `accounts` database collection:
* **`verified` (boolean):** Newly registered Students and Officers start as unverified (`false`). 
  > [!IMPORTANT]
  > Unverified accounts cannot access their respective dashboards. If they try to log in, they are immediately redirected to the **Pending Verification** route (`/landing/#pending-verification`). Admins do not require verification.
* **`deactivated` (boolean):** Any account can be deactivated by an Admin.
  > [!CAUTION]
  > Deactivated accounts are completely blocked from logging in. Any active sessions are terminated, and they are redirected back to the login screen.

---

## 🎓 1. Student Dashboard

The Student Dashboard focuses on personal information, payments, and participation. Students interact with the organization through 5 views:

### 📅 Event Calendar
* **View File:** [events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/events.js)
* **Description:** Displays list and cards of upcoming and past events.
* **Key Features:**
  * View event poster, date, location, description, collaborators, and relevant links.
  * Filter events by status (upcoming or past).

### 💳 Payment Tracking
* **View File:** [payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/payments.js)
* **Description:** Personal financial ledger displaying payments assigned to the student.
* **Key Features:**
  * Summary cards calculating **Total Outstanding Dues**, **Total Paid**, and **Pending Payments Count**.
  * Detailed payment records indicating paid status, date paid, item name, price, quantity, and payment modality (e.g. cash, online).

### 📝 Attendance History
* **View File:** [attendance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/attendance.js)
* **Description:** Personal log of events the student has attended.
* **Key Features:**
  * Displays attendance logs with timestamps and event details.
  * Allows students to track and confirm their attendance presence.

### 👤 Profile Settings & Volunteer Lifecycle
* **View File:** [profile.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/profile.js)
* **Description:** Manage account details and apply for/resign from the Volunteer Program.
* **Key Features:**
  * Update contact details, address, section, and academic year level.
  * Apply for **Volunteer Status**: Initiates request (`none` ➡️ `pending` ➡️ `approved` or `rejected`).
  * Request to resign/leave the volunteer program (`approved` ➡️ `backout_pending`).

### ✍️ Volunteer Posts (Approved Volunteers Only)
* **View File:** [posts.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-student/views/posts.js)
* **Description:** A micro-blogging workspace where active volunteers write content for the landing page.
* **Key Features:**
  * Compose story drafts with HTML content/details, external links, meaning tags, and custom cover images.
  * Edit and delete personal stories.
  * Track approval status (drafts must be reviewed and approved by an Officer or Admin before being published to the landing page).

---

## 👔 2. Officer Dashboard

Officers represent the executive team, possessing dashboard management tools to process student submissions, events, files, and payments across 8 views:

### 📈 Finance Overview
* **View File:** [finance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/finance.js)
* **Description:** A read-and-track dashboard monitoring organization financial transactions.
* **Key Features:**
  * Charts detailing overall balance, cash inflow, and expenses.
  * View logs of revenue inputs and organization expense lists.

### 📂 File Sharing
* **View File:** [files.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/files.js)
* **Description:** An archive of shared resources, documents, and assets.
* **Key Features:**
  * Upload, describe, and download documents in shared buckets.
  * Organize assets by uploader, upload date, and file size.

### 📅 Event Calendar (Management Mode)
* **View File:** [events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/events.js)
* **Description:** Create and manage organization activities.
* **Key Features:**
  * Add new events with titles, descriptions, dates, and cover images.
  * Mark events as "Ended" to close attendance and lock configurations.
  * Add external links and edit description timelines.

### 📇 Student Directory
* **View File:** [students.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/students.js)
* **Description:** Filterable register of all students linked to the system.
* **Key Features:**
  * Search by name, section, or student ID.
  * Toggle student verification state (approve pending registrations).

### 💳 Payment Management
* **View File:** [payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/payments.js)
* **Description:** Verify and manage payments submitted by students.
* **Key Features:**
  * Browse pending payments and check submitted digital proof.
  * Approve payments (marks record as paid with timestamp, updates student outstanding balance).
  * Filter payments by event or individual student.

### 🤝 Volunteer Management
* **View File:** [volunteers.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/volunteers.js)
* **Description:** Process application forms and resignation requests.
* **Key Features:**
  * Review pending volunteer applications; approve or reject them.
  * Review "Backout Requests" from active volunteers requesting release.

### 📰 Story Approval
* **View File:** [stories.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/stories.js)
* **Description:** Editorial review board for volunteer-submitted stories.
* **Key Features:**
  * Approve drafts to publish them directly to the public landing page.
  * Reject drafts, edit text descriptions, or delete stories.

### ⚙️ Settings
* **View File:** [settings.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/settings.js)
* **Description:** Officer profile adjustments.
* **Key Features:**
  * Upload resume and schedule documents (stored securely in designated storage buckets).

---

## 🔑 3. Admin Panel

Admins hold the highest privilege, controlling accounts, databases, global settings, and accessing advanced analytics across 14 views:

### 📊 Dashboard Stats
* **View File:** [dashboard.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/dashboard.js)
* **Description:** Command center home displaying real-time metrics.
* **Key Features:**
  * Stat cards detailing total students, registered accounts, active volunteers, and total collections.
  * Animated counter cards and interactive Chart.js reports detailing trends.

### 👥 Account Management (System-Wide Control)
* **View File:** [accounts.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/accounts.js)
* **Description:** Complete control over auth identities and roles.
* **Key Features:**
  * Verify or block user registrations.
  * Deactivate or reactivate accounts instantly.
  * **Role Promotion/Demotion:** Promote a student to Officer role or demote an Officer back to a Student.
    > [!IMPORTANT]
    > Promotion and demotion invoke server-side operations managed securely via an **Appwrite Cloud Function**.
  * Export account databases to CSV.

### 📅 Event Management (Timeline)
* **View File:** [events.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/events.js)
* **Description:** Advanced event layout.
* **Key Features:**
  * Fully edit event timelines, cover pictures, links, and tags.
  * Assign official collaborators and manage public-facing details.

### 📋 Attendance Management
* **View File:** [attendance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/attendance.js)
* **Description:** Real-time event attendance entry.
* **Key Features:**
  * Autocomplete search box to quickly add student names to the attendance registry.
  * Export event attendance logs.

### 💳 Payment & Dues Allocation
* **View File:** [payments.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/payments.js)
* **Description:** Financial database assignment controller.
* **Key Features:**
  * Allocate individual payments or assign bulk payments (e.g. charging an entire year level for membership dues).
  * Record outside/non-BSCS payments.
  * Edit payment price, status, date, or delete transaction errors.

### 📈 Finance Overview (Full CRUD)
* **View File:** [finance.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/finance.js)
* **Description:** Master ledger controller.
* **Key Features:**
  * Register raw revenues and log expenses with detail, quantity, price, and category.
  * Modify or remove financial logs to balance registers.

### 📇 Student Directory (Comprehensive)
* **View File:** [students.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/students.js)
* **Description:** Master record of students.
* **Key Features:**
  * Create, edit, and delete student records.
  * Directly modify student metadata (year level, section, volunteer flags).

### 📂 File Management (Override)
* **View File:** [files.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/files.js)
* **Description:** Overlooks files uploaded throughout the system.
* **Key Features:**
  * Download, verify, or delete files from user folders or public buckets.

### 🤝 Volunteer & Story Management
* **View Files:** [volunteers.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-officer/views/volunteers.js) & [stories.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/stories.js)
* **Description:** Comprehensive control over volunteer rosters and blog stories.
* **Key Features:**
  * View stats of active writers.
  * Direct edit and approval flow on all story entries.

### 📢 Announcements Composer
* **View File:** [announcements.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/announcements.js)
* **Description:** Broadcast announcements to targeted groups.
* **Key Features:**
  * Select target audiences: `All`, `Students`, `Officers`, or custom groupings.
  * Formats notification content, copies template code to clipboard, or invokes mailto actions for distribution.

### 📊 Reports & CSV Export
* **View File:** [reports.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/reports.js)
* **Description:** Generate and compile analytics.
* **Key Features:**
  * Display monthly user signup growth and payment collection statistics.
  * Generate CSV reports for user records, finances, payments, and events.

### 🕒 Activity Audit Logs
* **View File:** [activity-logs.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/activity-logs.js)
* **Description:** Track user actions in the portal for auditing purposes.
* **Key Features:**
  * Log 18 specific action types (e.g. login, verify, promote, edit payments).
  * Filter audit records by date, target account, or action category.
  * Export audit records to CSV (stored locally in client cache, capped at 500 entries).

### ⚙️ System Settings
* **View File:** [settings.js](file:///c:/Users/James/WebstormProjects/SPECS-Organization-Management-System/specs-website/src/dashboard-admin/views/settings.js)
* **Description:** Configure global portal preferences.
* **Key Features:**
  * Manage site metadata, cache options, and toggle developer bypass options.

---

## 🛠️ Development Login Accounts (Mock Mode)

When starting the project locally with `VITE_USE_MOCK_DATA=true` enabled, the following preconfigured testing accounts can be used to explore user dashboards and their features:

| User Type | Mock Email | Mock Password |
| :--- | :--- | :--- |
| **Admin** | `admin@specs.org` | `admin123` |
| **Officer** | `maria.santos@student.edu` | `officer123` |
| **Student** | `john.doe@student.edu` | `student123` |
