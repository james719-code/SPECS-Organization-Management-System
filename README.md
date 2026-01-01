# SPECS Organization Management System

![Project Banner](https://img.shields.io/badge/SPECS-Organization%20Portal-blue?style=for-the-badge&logo=appwrite) ![Status](https://img.shields.io/badge/Status-Maintained-green?style=for-the-badge) ![License](https://img.shields.io/badge/License-BSD%203--Clause-orange?style=for-the-badge)

A centralized web application built with Vanilla JavaScript and Appwrite to serve as the central hub for the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**.

---

## Problem Statement

Before this platform, managing the organization was a manual and fragmented process. The executive board faced several key challenges:
* **Disorganized Data:** Student lists, payment records, and event attendance were scattered across multiple spreadsheets and paper logs, making data retrieval difficult.
* **File Fragmentation:** Important documents and learning resources were shared via ephemeral messaging apps or broken drive links, leading to resource loss.
* **Lack of Transparency:** Students had no real-time way to check their payment status or view upcoming events without directly contacting an officer.

## The Solution

This **Student & Admin Portal** acts as the "Single Source of Truth" for the organization. It digitizes the workflow by:
1. **Centralizing Records:** A unified database for students, officers, and financial records.
2. **Automating Access:** Role-based dashboards ensure officers have the tools they need while students access only what is relevant.
3. **Streamlining Resources:** A dedicated file repository ensures educational materials are always accessible.

---

## Design Decisions

In building this application, specific architectural and technical choices were made to balance performance, learning curve, and rapid deployment:

### 1. Why Vanilla JavaScript?
* **Decision:** We avoided heavy frontend frameworks (React/Vue) for the initial version.
* **Reasoning:** To ensure a deep understanding of DOM manipulation and core Web APIs without the abstraction overhead. This keeps the bundle size incredibly small and the performance high on lower-end devices often used by students.

### 2. Why Appwrite (BaaS)?
* **Decision:** We utilized Appwrite for the backend instead of building a custom REST API with Node/Express.
* **Reasoning:** As a student-led project with tight deadlines, we needed a secure, production-ready backend immediately. Appwrite handles Authentication, Database (CRUD), and File Storage out-of-the-box, allowing us to focus 100% on the frontend logic and user experience.

### 3. SCSS over Plain CSS
* **Decision:** Used SASS/SCSS with a BEM-like naming convention.
* **Reasoning:** To maintain modularity and use variables for the organization's color themes, making future rebranding or dark mode implementation significantly easier.

---

## Features

### General
- **User Authentication:** Secure login/signup for organization officers and members with university email validation and verification.
- **Role-Based Access:** Separated dashboards and permissions for `students` and `admins` within the `officers` collection.
- **Public Landing Page:** Displays upcoming events, past events, FAQ, and contact info.

### Student Dashboard
- **Finance Overview:** Track revenue and expenses.
- **File Sharing:** Browse and download shared documents.
- **Event Calendar:** View upcoming events.
- **Student Directory:** Filterable list of general (`non-officer`) students.
- **Payment Tracking:** See pending and past payments.
- **Profile Settings:** Update personal info and upload documents (e.g., resume, schedule).

### Admin Panel
- **Dashboard Stats:** At-a-glance overview of accounts, events, files, and visual stats with charts.
- **Account Management:** A modern interface to approve, verify, and delete officer/student accounts.
- **Event Management:** A timeline view to add, edit, and delete events.
- **Payment Management:** Assign and manage payments (individually or by bulk).
- **File Management:** A view for all uploaded files.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, SASS/SCSS
- **UI:** Bootstrap 5 (via SCSS), Bootstrap Icons (SVG)
- **Backend:** Appwrite Cloud (BaaS)
- **Build Tool:** Vite
- **Quality Control:** Unlighthouse (Performance & SEO Scanning)

---

## Getting Started for Developers

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)
- [Appwrite Cloud](https://cloud.appwrite.io/) account

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone [https://github.com/james719-code/SPECS-Organization-Management-System.git](https://github.com/james719-code/SPECS-Organization-Management-System.git)
cd SPECS-Organization-Management-System/specs-website
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Appwrite Backend1. **Create New Project** on [Appwrite Cloud](https://cloud.appwrite.io/).
2. **Add Web Platform:** Name it, and set the hostname to `localhost`.
3. **Create Database & Collections:**
* Create a new database (e.g., `Main Database`).
* Inside the database, create the following collections: `officers`, `non_officer_students`, `events`, `files`, `payments`, `revenue`, `expenses`.
* Set the necessary permissions and attributes for each collection as detailed in the [Collection Schemas](https://www.google.com/search?q=%23-collection-schemas) section below.


4. **Create Storage Buckets:**
* `Event Images`
* `User Uploads`
* `Resumes`
* `Schedules`



#### 4. Environment SetupCreate a file named `.env.local` in the `specs-website` directory and populate it with your Appwrite credentials.

```ini
# .env.local
# Replace placeholders with your actual Appwrite IDs

VITE_APPWRITE_ENDPOINT="[https://cloud.appwrite.io/v1](https://cloud.appwrite.io/v1)"
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

Open your browser and navigate to [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173).

---

## Collection Schemas
<details>
<summary><strong>Click to expand Appwrite collection schemas</strong></summary>

### `officers` (Users who can log in)
| Key | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| username | String | Yes |  |  |
| fullname | String | Yes |  |  |
| yearLevel | String | Yes |  |  |
| gender | Enum | Yes |  | (e.g., Male, Female, Other) |
| email | String | Yes |  | (Required for Appwrite Auth) |
| type | Enum | Yes | `student` | (Elements: `student`, `admin`) |
| verified | Boolean | Yes | `false` |  |
| haveResume | Boolean | Yes | `false` |  |
| resumeId | String |  |  |  |
| haveSchedule | Boolean | Yes | `false` |  |
| scheduleId | String |  |  |  |

---

### `non_officer_students` (Directory list of students)
| Key | Type | Required |
| --- | --- | --- |
| name | String | Yes |
| email | String | Yes |
| section | String | Yes |
| address | String |  |

---

### `events`
| Key | Type | Required | Default |
| --- | --- | --- | --- |
| event_name | String | Yes |  |
| date_to_held | Datetime | Yes |  |
| image_file | String | Yes |  |
| description | String |  |  |
| added_by | String | Yes |  |
| event_ended | Boolean | Yes | `false` |
| collab | String (Array) |  | `[]` |

---

### `files`
| Key | Type | Required |
| --- | --- | --- |
| fileName | String | Yes |
| description | String |  |
| uploader | String | Yes |
| fileID | String | Yes |

---

### `payments`
| Key | Type | Required | Default |
| --- | --- | --- | --- |
| student_id | String | Yes |  |
| is_event | Boolean | Yes | `false` |
| event | String |  |  |
| activity | String |  |  |
| price | Double | Yes |  |
| item_name | String | Yes |  |
| quantity | Integer | Yes |  |
| isPaid | Boolean | Yes | `false` |
| date_paid | Datetime |  |  |

---

### `revenue`
| Key | Type | Required |
| --- | --- | --- |
| name | String | Yes |
| isEvent | Boolean | Yes |
| event | String |  |
| activity | String |  |
| quantity | Integer | Yes |
| price | Double | Yes |
| date_earned | Datetime | Yes |
| recorder | String | Yes |

---

### `expenses`
| Key | Type | Required | Default |
| --- | --- | --- | --- |
| name | String | Yes |  |
| isEvent | Boolean | Yes | `false` |
| event | String |  |  |
| activity_name | String |  |  |
| quantity | Integer | Yes | `1` |
| price | Double | Yes |  |
| date_buy | Datetime | Yes |  |
| recorder | String | Yes |  |

</details>

---

## Project Quality
### Site-wide Performance Scanning
This project uses **Unlighthouse** to scan the entire site for performance, accessibility, and SEO issues, ensuring a consistently high-quality experience across all pages.

---

## Limitations & Known IssuesWhile functional, the current iteration has the following constraints:

* **Scalability of Vanilla JS:** As the codebase grows, state management in Vanilla JS is becoming complex. Refactoring to a component-based framework may be necessary in the future.
* **Manual Payments:** The system tracks payments, but does not *process* them. Students must still pay physically or via external e-wallets, then an admin manually updates the record.
* **Internet Dependency:** The app requires an active internet connection to fetch data from Appwrite; there is currently no offline/PWA support.

## Roadmap & Future Improvements 
* [ ] **Migration to React/Next.js:** To handle complex state management and improve routing.
* [ ] **Payment Gateway Integration:** Integration with PayMongo or Xendit for real-time, automated payment verification.
* [ ] **QR Code Attendance:** Generate QR codes for events to automate attendance tracking.
* [ ] **Real-time Notifications:** Use Appwrite Realtime to notify students of new events or cleared payments instantly.

---

## Contribution Guide
1. **Create Branch:**
`git checkout -b <type>/<feature-name>` (e.g., `feat/add-payment-list-page`)
2. **Make Changes:**
Implement your feature or fix, adhering to the project's coding style.
3. **Commit Message Convention:**
Use conventional commits for clear history. (e.g., `git commit -m "feat: Add payment list page"`)
4. **Push & PR:**
Push your branch to the repository and open a pull request targeting the `main` branch.

---

## License
This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
