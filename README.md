# SPECS Student & Admin Portal

A modern web application built with Vanilla JavaScript and Appwrite to serve as a central hub for the Society of Programmers and Enthusiasts in Computer Science (SPECS). It provides features for event management, file sharing, financial tracking, and user administration.

---

## ✨ Features

### ✅ General
- **User Authentication:** Secure login/signup with university email validation and email verification.
- **Role-Based Access:** Separated dashboards and permissions for `students` and `admins`.
- **Public Landing Page:** Displays upcoming events, past events, FAQ, and contact info.

### 🎓 Student Dashboard
- **Finance Overview:** Track revenue and expenses.
- **File Sharing:** Browse and download shared documents.
- **Event Calendar:** View upcoming events.
- **Student Directory:** Filterable list of non-officer students.
- **Payment Tracking:** See pending and past payments.
- **Profile Settings:** Update personal info and upload documents (e.g. resume, schedule).

### 🛠️ Admin Panel
- **Dashboard Stats:** Overview of accounts, events, files, and visual stats.
- **Account Management:** Approve/verify/delete student accounts.
- **Event Management:** Add/edit/delete events, mark them as ended, add collaborators.
- **Payment Management:** Assign and manage payments (individually or bulk).
- **Admin Settings:** Update profile and credentials.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, SASS/SCSS
- **UI:** Bootstrap 5, Bootstrap Icons
- **Backend:** Appwrite Cloud (BaaS)
- **Build Tool:** Vite

---

## 🚀 Getting Started for Developers

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)
- [Appwrite Cloud](https://cloud.appwrite.io/) account

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/james719-code/SPECS-Organization-Management-System.git
cd SPECS-Organization-Management-System/specs-website
````

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Appwrite Backend

1. **Create New Project** on [Appwrite Cloud](https://cloud.appwrite.io/)
2. **Add Web Platform:** Name it, set hostname as `localhost`.
3. **Create Database & Collections:**

    * Create a database (e.g. `Main Database`)
    * Create collections: `accounts`, `non_officer_students`, `events`, `files`, `payments`, `revenue`, `expenses`
    * Set proper permissions and attributes as [outlined here](#collection-schemas)
4. **Create Storage Buckets:**

    * `Event Images`
    * `User Uploads`
    * `Resumes`
    * `Schedules`

#### 4. Environment Setup

Create `.env.local` in the root and copy this template:

```ini
# .env.local
VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="<YOUR_NEW_PROJECT_ID>"

VITE_DATABASE_ID="<YOUR_NEW_DATABASE_ID>"
VITE_COLLECTION_ID_STUDENTS="<YOUR_STUDENTS_COLLECTION_ID>"
VITE_COLLECTION_NON_OFFICER_STUDENT="<YOUR_NON_OFFICER_STUDENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_EVENTS="<YOUR_EVENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_FILES="<YOUR_FILES_COLLECTION_ID>"
VITE_COLLECTION_ID_PAYMENTS="<YOUR_PAYMENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_REVENUE="<YOUR_REVENUE_COLLECTION_ID>"
VITE_COLLECTION_ID_EXPENSES="<YOUR_EXPENSES_COLLECTION_ID>"

VITE_BUCKET_ID_EVENT_IMAGES="<YOUR_EVENT_IMAGES_BUCKET_ID>"
VITE_BUCKET_ID_UPLOADS="<YOUR_UPLOADS_BUCKET_ID>"
VITE_BUCKET_ID_RESUMES="<YOUR_RESUMES_BUCKET_ID>"
VITE_BUCKET_ID_SCHEDULES="<YOUR_SCHEDULES_BUCKET_ID>"
```

#### 5. Run the Development Server

```bash
npm run dev
```

Open your browser to [http://localhost:5173](http://localhost:5173)

---

## 📚 Collection Schemas

<details>
<summary><strong>📋 Click to expand</strong></summary>

### 🧑‍🎓 `accounts`

| Key          | Type    | Required | Default   |
| ------------ | ------- | -------- | --------- |
| username     | String  | ✅        |           |
| fullname     | String  | ✅        |           |
| yearLevel    | String  | ✅        |           |
| gender       | String  | ✅        |           |
| type         | String  | ✅        | `student` |
| verified     | Boolean | ✅        | `false`   |
| haveResume   | Boolean | ✅        | `false`   |
| resumeId     | String  |          |           |
| haveSchedule | Boolean | ✅        | `false`   |
| scheduleId   | String  |          |           |
| email        | String  | ✅        |           |

---

### 👥 `non_officer_students`

| Key     | Type   | Required |
| ------- | ------ | -------- |
| name    | String | ✅        |
| email   | String | ✅        |
| section | String | ✅        |

---

### 📅 `events`

| Key            | Type           | Required | Default |
| -------------- | -------------- | -------- | ------- |
| event\_name    | String         | ✅        |         |
| date\_to\_held | Datetime       | ✅        |         |
| image\_file    | String         | ✅        |         |
| description    | String         |          |         |
| added\_by      | String         | ✅        |         |
| event\_ended   | Boolean        | ✅        | `false` |
| collab         | String (Array) |          |         |

* **Index:** Full-text on `event_name`

---

### 📂 `files`

| Key         | Type   | Required |
| ----------- | ------ | -------- |
| fileName    | String | ✅        |
| description | String |          |
| uploader    | String | ✅        |
| fileID      | String | ✅        |

* **Index:** Full-text on `fileName`

---

### 💰 `payments`

| Key         | Type    | Required | Default |
| ----------- | ------- | -------- | ------- |
| student\_id | String  | ✅        |         |
| is\_event   | Boolean | ✅        | `false` |
| event       | String  |          |         |
| activity    | String  |          |         |
| price       | Double  | ✅        |         |
| item\_name  | String  | ✅        |         |
| quantity    | Integer | ✅        | `1`     |
| isPaid      | Boolean | ✅        | `false` |

---

### 📈 `revenue` & `expenses`

**`revenue` Attributes:**

* name, price, quantity, date\_earned, recorder, isEvent, event, activity

**`expenses` Attributes:**

* name, price, quantity, date\_buy, recorder, isEvent, event, activity\_name

</details>

---

## 🤝 Contribution Guide

1. **Create Branch:**
   `git checkout -b <type>/<feature-name>`

2. **Make Changes**
   Implement your feature or fix.

3. **Commit Message Convention:**
   `git commit -m "feat: Add payment list page"`

4. **Push & PR:**
   Push your branch and open a pull request targeting `main`.

---
