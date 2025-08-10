# SPECS Student & Admin Portal

A modern web application built with Vanilla JavaScript and Appwrite to serve as a central hub for the Society of Programmers and Enthusiasts in Computer Science (SPECS). It provides features for event management, file sharing, financial tracking, and user administration.

---

## ✨ Features

### ✅ General
- **User Authentication:** Secure login/signup for organization officers and members with university email validation and verification.
- **Role-Based Access:** Separated dashboards and permissions for `students` and `admins` within the `officers` collection.
- **Public Landing Page:** Displays upcoming events, past events, FAQ, and contact info.

### 🎓 Student Dashboard
- **Finance Overview:** Track revenue and expenses.
- **File Sharing:** Browse and download shared documents.
- **Event Calendar:** View upcoming events.
- **Student Directory:** Filterable list of general (`non-officer`) students.
- **Payment Tracking:** See pending and past payments.
- **Profile Settings:** Update personal info and upload documents (e.g., resume, schedule).

### 🛠️ Admin Panel
- **Dashboard Stats:** At-a-glance overview of accounts, events, files, and visual stats with charts.
- **Account Management:** A modern interface to approve, verify, and delete officer/student accounts.
- **Event Management:** A timeline view to add, edit, and delete events.
- **Payment Management:** Assign and manage payments (individually or by bulk).
- **File Management:** A view for all uploaded files.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, SASS/SCSS
- **UI:** Bootstrap 5 (via SCSS), Bootstrap Icons (as imported SVGs)
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
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Appwrite Backend

1.  **Create New Project** on [Appwrite Cloud](https://cloud.appwrite.io/).
2.  **Add Web Platform:** Name it, and set the hostname to `localhost`.
3.  **Create Database & Collections:**
    *   Create a new database (e.g., `Main Database`).
    *   Inside the database, create the following collections: `officers`, `non_officer_students`, `events`, `files`, `payments`, `revenue`, `expenses`.
    *   Set the necessary permissions and attributes for each collection as detailed in the [Collection Schemas](#-collection-schemas) section below.
4.  **Create Storage Buckets:**
    *   `Event Images`
    *   `User Uploads`
    *   `Resumes`
    *   `Schedules`

#### 4. Environment Setup

Create a file named `.env.local` in the `specs-website` directory and populate it with your Appwrite credentials.

```ini
# .env.local
# Replace placeholders with your actual Appwrite IDs

VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="<YOUR_NEW_PROJECT_ID>"

VITE_DATABASE_ID="<YOUR_NEW_DATABASE_ID>"
VITE_COLLECTION_ID_OFFICERS="<YOUR_OFFICERS_COLLECTION_ID>"
VITE_COLLECTION_ID_NON_OFFICER_STUDENTS="<YOUR_NON_OFFICER_STUDENTS_COLLECTION_ID>"
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

Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---
## 🏆 Project Quality

### Site-wide Performance Scanning
This project uses **Unlighthouse** to scan the entire site for performance, accessibility, and SEO issues, ensuring a consistently high-quality experience across all pages.

![Unlighthouse Scan](https://img.shields.io/badge/Unlighthouse-Scanned-brightgreen.svg?style=for-the-badge)
---

## 📚 Collection Schemas

<details>
<summary><strong>📋 Click to expand Appwrite collection schemas</strong></summary>

### 🧑‍✈️ `officers` (Users who can log in)

| Key          | Type    | Required | Default   | Notes                               |
| ------------ | ------- | -------- | --------- | ----------------------------------- |
| username     | String  | ✅        |           |                                     |
| fullname     | String  | ✅        |           |                                     |
| yearLevel    | String  | ✅        |           |                                     |
| gender       | Enum    | ✅        |           | (e.g., Male, Female, Other)         |
| email        | String  | ✅        |           | (Required for Appwrite Auth)        |
| type         | Enum    | ✅        | `student` | (Elements: `student`, `admin`)      |
| verified     | Boolean | ✅        | `false`   |                                     |
| haveResume   | Boolean | ✅        | `false`   |                                     |
| resumeId     | String  |          |           |                                     |
| haveSchedule | Boolean | ✅        | `false`   |                                     |
| scheduleId   | String  |          |           |                                     |


---

### 👥 `non_officer_students` (Directory list of students)

| Key     | Type   | Required |
| ------- | ------ | -------- |
| name    | String | ✅        |
| email   | String | ✅        |
| section | String | ✅        |
| address | String |          |

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
| collab         | String (Array) |          | `[]`    |

---

### 📂 `files`

| Key         | Type   | Required |
| ----------- | ------ | -------- |
| fileName    | String | ✅        |
| description | String |          |
| uploader    | String | ✅        |
| fileID      | String | ✅        |

---

### 💰 `payments`

| Key         | Type     | Required | Default |
| ----------- | -------- | -------- | ------- |
| student\_id | String   | ✅        |         |
| is\_event   | Boolean  | ✅        | `false` |
| event       | String   |          |         |
| activity    | String   |          |         |
| price       | Double   | ✅        |         |
| item\_name  | String   | ✅        |         |
| quantity    | Integer  | ✅        |         |
| isPaid      | Boolean  | ✅        | `false` |
| date\_paid   | Datetime |          |         |

---

### 📈 `revenue`

| Key         | Type     | Required |
| ----------- | -------- | -------- |
| name        | String   | ✅        |
| isEvent     | Boolean  | ✅        |
| event       | String   |          |
| activity    | String   |          |
| quantity    | Integer  | ✅        |
| price       | Double   | ✅        |
| date\_earned | Datetime | ✅        |
| recorder    | String   | ✅        |

---

### 📉 `expenses`

| Key           | Type     | Required | Default |
| ------------- | -------- | -------- | ------- |
| name          | String   | ✅        |         |
| isEvent       | Boolean  | ✅        | `false` |
| event         | String   |          |         |
| activity\_name | String   |          |         |
| quantity      | Integer  | ✅        | `1`     |
| price         | Double   | ✅        |         |
| date\_buy      | Datetime | ✅        |         |
| recorder      | String   | ✅        |         |

</details>

---

## 🤝 Contribution Guide

1.  **Create Branch:**
    `git checkout -b <type>/<feature-name>` (e.g., `feat/add-payment-list-page`)

2.  **Make Changes:**
    Implement your feature or fix, adhering to the project's coding style.

3.  **Commit Message Convention:**
    Use conventional commits for clear history. (e.g., `git commit -m "feat: Add payment list page"`)

4.  **Push & PR:**
    Push your branch to the repository and open a pull request targeting the `main` branch.

---

## 📜 License

This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for details.