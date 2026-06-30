# SPECS Organization Management System

![Project Banner](https://img.shields.io/badge/SPECS-Organization%20Portal-blue?style=for-the-badge&logo=appwrite) ![Status](https://img.shields.io/badge/Status-Maintained-green?style=for-the-badge) ![License](https://img.shields.io/badge/License-BSD%203--Clause-orange?style=for-the-badge)

A centralized web application built with **React**, **TypeScript**, **TailwindCSS**, and **Appwrite** to serve as the central hub for the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**.

---

## Problem Statement

Before this platform, managing the organization was a manual and fragmented process. The executive board faced several key challenges:
* **Disorganized Data:** Student lists, payment records, and event attendance were scattered across multiple spreadsheets and paper logs, making data retrieval difficult.
* **File Fragmentation:** Important documents and learning resources were shared via ephemeral messaging apps or broken drive links, leading to resource loss.
* **Lack of Transparency:** Students had no real-time way to check their payment status or view upcoming events without directly contacting an officer.

## The Solution

This **Student & Admin Portal** acts as the "Single Source of Truth" for the organization. It digitizes the workflow by:
1. **Centralizing Records:** A unified relational database with `accounts` as the central hub linking to `students`, `officers`, and `admins`.
2. **Automating Access:** Role-based dashboards ensure officers have the tools they need while students access only what is relevant.
3. **Streamlining Resources:** A dedicated file repository and resources page ensures educational materials are always accessible.

---

## Design Decisions

In building this application, specific architectural and technical choices were made to balance performance, learning curve, and rapid deployment:

### 1. React & TypeScript
* **Decision:** We migrated from Vanilla JavaScript to React 19 and TypeScript.
* **Reasoning:** As the application grew in size (14+ admin views, shared components, complex state management), Vanilla JS became hard to scale. React provides a component-driven architecture for high reusability, and TypeScript ensures compile-time type safety, minimizing runtime exceptions and ReferenceErrors.

### 2. Why Appwrite (BaaS)?
* **Decision:** We utilized Appwrite for the backend instead of building a custom REST API with Node/Express.
* **Reasoning:** As a student-led project with tight deadlines, we needed a secure, production-ready backend immediately. Appwrite handles Authentication, Database (CRUD), File Storage, Cloud Functions, and Teams out-of-the-box, allowing us to focus 100% on the frontend logic and user experience.

### 3. TailwindCSS for Styling
* **Decision:** Replaced Plain CSS/SCSS with TailwindCSS.
* **Reasoning:** TailwindCSS enables rapid prototyping and styling consistency through a robust utility-first system. It simplifies layout design, responsive configurations, and custom animations, while keeping CSS output extremely small through purge utilities.

### 4. Multi-Provider Architecture
* **Decision:** Built an abstraction layer with provider interfaces for Auth, Database, and Storage.
* **Reasoning:** To allow swapping backend services (e.g., Firebase for auth, Cloudflare R2 for storage) without changing application code. Each provider implements a common interface.

---

## Features

### General
- **User Authentication:** Secure login/signup with university email validation, verification, and session expiry detection.
- **Role-Based Access:** Separated dashboards and permissions for `students`, `officers`, and `admins` with team-based access control via Appwrite Teams.
- **Public Landing Page:** Displays upcoming events, past events, stories/highlights, resources, FAQ, and contact info.
- **Volunteer System:** Full lifecycle — students request volunteer status, officers approve/reject, volunteers create posts, and can request to leave (`none` → `pending` → `approved`/`rejected`, plus `backout_pending`).
- **Stories & Highlights:** Volunteer-authored blog posts with officer/admin approval workflow, published to the public landing page.
- **Centralized Caching:** localStorage-based image and data caches with TTL, LRU eviction, and stale-while-revalidate patterns.
- **Structured Error Handling:** Typed `ApiError` classes with error code enums and Appwrite error mapping.
- **Toast Notifications:** Custom toast system with 4 types (success, error, warning, info), auto-dismiss, progress bars, and pause-on-hover.
- **Confirmation Modals:** Custom reusable `ConfirmModal` component replacing legacy browser prompts with 5 visual variants.

### Student Dashboard (5 views)
- **Event Calendar:** View upcoming and past events.
- **Payment Tracking:** See pending and completed payments with payment card summaries.
- **Attendance History:** View personal event attendance records.
- **Profile Settings:** Update personal info, request volunteer status, or request to leave the volunteer program.
- **Volunteer Posts:** Create, edit, and delete blog posts with cover images (for approved volunteers only).

### Officer Dashboard (8 views)
- **Finance Overview:** Track revenue and expenses with charts.
- **File Sharing:** Browse and manage shared documents.
- **Event Calendar:** View and manage upcoming events.
- **Student Directory:** Filterable, paginated list of students with verification controls.
- **Payment Management:** View and manage student payments with payment card components.
- **Volunteer Management:** Approve or reject volunteer requests and backout requests with card-based UI.
- **Story Approval:** Review, approve/reject, edit, and delete volunteer posts before publication.
- **Settings:** Manage officer profile and preferences.

### Admin Panel (14 views)
- **Dashboard Stats:** At-a-glance overview with Chart.js / Recharts visualizations and animated counters.
- **Account Management:** Approve, verify, deactivate/reactivate, and delete accounts. Promote students to officers or demote via Appwrite Cloud Functions. CSV export.
- **Event Management:** A timeline view to add, edit, and delete events with related links and collaborators.
- **Attendance Management:** Event-based attendance tracking with student search autocomplete.
- **Payment Management:** Assign and manage payments (individually or by bulk) with support for non-BSCS students.
- **Finance Overview:** Revenue and expense tracking with charts.
- **Student Directory:** Comprehensive student management.
- **File Management:** View and manage all uploaded files.
- **Volunteer Management:** Full volunteer lifecycle management.
- **Stories Management:** Full CRUD, approval workflow, filtering by status, and statistics.
- **Announcements:** Draft composition with recipient targeting (all/students/officers), copy-to-clipboard, and open-in-email-client.
- **Reports:** Account, student, payment, and event reports with monthly growth charts, distribution analysis, and CSV export.
- **Activity Logs:** Client-side activity tracking (18 activity types, max 500 entries) with filtering, search, date range, and CSV export.
- **Settings:** Admin profile and preferences.

### Public Landing Page (7 routes)
- **Home:** Organization overview with event highlights.
- **Events:** Upcoming and past events listing.
- **About Us:** Organization information and team details.
- **Resources:** FAQ, job cards, downloadable files, and policies.
- **Stories:** Published volunteer stories with pagination.
- **Story Detail** (`#/stories/:id`): Full story view with hero image, author, date, and related links.
- **Login / Signup:** Authentication pages with dev quick login panel in mock mode.

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | React 19, TypeScript, TailwindCSS v3 | — |
| **Icons** | Lucide React, Bootstrap Icons (SVG) | ^1.22.0 / ^1.13.1 |
| **Charts** | Chart.js, Recharts | ^4.5.0 / ^3.9.0 |
| **Backend** | Appwrite Cloud (BaaS) | SDK ^18.1.1 |
| **Server SDK** | node-appwrite (Cloud Functions) | ^17.0.0 |
| **Build Tool** | Vite | 7.1.11 |
| **Testing** | Vitest, @testing-library/dom, @testing-library/user-event | ^2.1.8 |
| **Coverage** | @vitest/coverage-v8 | ^2.1.8 |
| **Quality** | Unlighthouse (Performance & SEO Scanning) | ^0.17.2 |

---

## Architecture

### Centralized API Layer

All backend operations go through a structured `api` object in `shared/api.ts`:

| Namespace | Methods |
|-----------|---------|
| `api.events` | `list()`, `get()`, `create()`, `update()`, `delete()`, `markEnded()` |
| `api.payments` | `list()`, `listForStudent()`, `create()`, `update()`, `delete()`, `markPaid()` |
| `api.attendance` | `listForStudent()`, `listForEvent()`, `create()`, `delete()` |
| `api.users` | `getCurrent()`, `getAccount()`, `getStudentProfile()`, `listStudents()` |
| `api.files` | `getFilePreview()`, `uploadEventImage()`, `deleteEventImage()` |
| `api.cache` | `clearAll()`, `clearByPattern()`, `clearKey()`, `getStats()` |
| `cachedApi` | Cached wrappers for frequently used read operations with configurable TTL |

### Shared Components

Reusable UI components in `components/ui/` and `shared/`:

| Component | Description |
|-----------|-------------|
| `EmptyState.tsx` | Empty state displays with multiple pre-configured icon layouts |
| `SkeletonLoader.tsx` | Loading skeletons for layouts, lists, metrics, cards, and tables |
| `Pagination.tsx` | Full pagination controls with page size configuration |
| `ConfirmModal.tsx` | Reusable modal dialog replacing browser native confirm alerts |

---

## Development Mode Features

### Mock Data System
Enable mock data to develop without a backend connection:

```bash
# In your .env file
VITE_USE_MOCK_DATA=true
```

When enabled:
- Authentication is bypassed with auto-login
- All API calls return realistic mock data (accounts, students, events, stories, payments, files, attendance, expenses, revenue)
- Full CRUD operations with Appwrite Query string parsing simulation
- Pagination simulation
- A Dev Quick Login panel appears on the landing page

### Dev Quick Login
In development mode with mock data enabled, a floating panel provides instant access to all dashboard types:
- Admin Dashboard
- Officer Dashboard
- Student Dashboard

### Available Test Accounts (Mock Mode)
| Type | Email | Password |
|------|-------|----------|
| Admin | admin@specs.org | admin123 |
| Officer | maria.santos@student.edu | officer123 |
| Student | john.doe@student.edu | student123 |

---

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests once (CI mode)
npm run test:run
```

---

## Multi-Provider Support

The application supports multiple backend providers through an abstraction layer with formally defined interfaces (`IAuthProvider`, `IDatabaseProvider`, `IStorageProvider`):

### Supported Providers
| Provider | Auth | Database | Storage | Implementation |
|----------|------|----------|---------|---------------|
| Appwrite | Yes | Yes | Yes | `appwriteProvider.ts` |
| Firebase | Yes | Yes | No | `firebaseProvider.ts` (lazy SDK loading) |
| Cloudflare R2 | No | No | Yes | `cloudflareR2Provider.ts` (pre-signed URLs) |

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
git clone https://github.com/james719-code/SPECS-Organization-Management-System.git
cd SPECS-Organization-Management-System/specs-website
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Appwrite Backend

1. **Create New Project** on [Appwrite Cloud](https://cloud.appwrite.io/).
2. **Add Web Platform:** Name it, and set the hostname to `localhost`.
3. **Create Database & Collections:**
   * Create a new database (e.g., `Main Database`).
   * Inside the database, create the following **11 collections**: `accounts`, `students`, `officers`, `admins`, `events`, `attendance`, `payments`, `revenue`, `expenses`, `stories`, `files`.
   * Set the necessary permissions, attributes, and relationships for each collection as detailed in [DATABASE.md](DATABASE.md).
4. **Create Storage Buckets:**
   * `Event Images`
   * `User Uploads`
   * `Resumes`
   * `Schedules`
   * `Public Files`
   * `Highlight Images`
5. **Create Teams:**
   * `Students` — for student role access control.
   * `Officers` — for officer role access control.
6. **Deploy Cloud Function:**
   * Create an Appwrite Cloud Function for account management operations (promote/demote).

#### 4. Environment Setup

Create a file named `.env.local` in the `specs-website` directory and populate it with your Appwrite credentials.

```ini
# .env.local
# Replace placeholders with your actual Appwrite IDs

VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="<YOUR_PROJECT_ID>"

# Database
VITE_DATABASE_ID="<YOUR_DATABASE_ID>"

# Collections (11)
VITE_COLLECTION_ID_ACCOUNTS="<YOUR_ACCOUNTS_COLLECTION_ID>"
VITE_COLLECTION_ID_STUDENTS="<YOUR_STUDENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_OFFICERS="<YOUR_OFFICERS_COLLECTION_ID>"
VITE_COLLECTION_ID_ADMINS="<YOUR_ADMINS_COLLECTION_ID>"
VITE_COLLECTION_ID_EVENTS="<YOUR_EVENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_ATTENDANCE="<YOUR_ATTENDANCE_COLLECTION_ID>"
VITE_COLLECTION_ID_PAYMENTS="<YOUR_PAYMENTS_COLLECTION_ID>"
VITE_COLLECTION_ID_REVENUE="<YOUR_REVENUE_COLLECTION_ID>"
VITE_COLLECTION_ID_EXPENSES="<YOUR_EXPENSES_COLLECTION_ID>"
VITE_COLLECTION_ID_STORIES="<YOUR_STORIES_COLLECTION_ID>"
VITE_COLLECTION_ID_FILES="<YOUR_FILES_COLLECTION_ID>"

# Storage Buckets (6)
VITE_BUCKET_ID_EVENT_IMAGES="<YOUR_EVENT_IMAGES_BUCKET_ID>"
VITE_BUCKET_ID_UPLOADS="<YOUR_UPLOADS_BUCKET_ID>"
VITE_BUCKET_ID_RESUMES="<YOUR_RESUMES_BUCKET_ID>"
VITE_BUCKET_ID_SCHEDULES="<YOUR_SCHEDULES_BUCKET_ID>"
VITE_BUCKET_PUBLIC_FILES="<YOUR_PUBLIC_FILES_BUCKET_ID>"
VITE_BUCKET_ID_HIGHLIGHT_IMAGES="<YOUR_HIGHLIGHT_IMAGES_BUCKET_ID>"

# Cloud Function & Teams
VITE_FUNCTION_ID="<YOUR_CLOUD_FUNCTION_ID>"
VITE_TEAM_ID_STUDENTS="<YOUR_STUDENTS_TEAM_ID>"
VITE_TEAM_ID_OFFICERS="<YOUR_OFFICERS_TEAM_ID>"
```

#### 5. Run the Development Server
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## Database Schema

The database uses a **relational model** with `accounts` as the central hub. There are **11 collections** with relationships:

```
accounts (central hub)
├── students (one-to-one)
│   ├── payments (one-to-many)
│   └── volunteer fields (is_volunteer, volunteer_request_status)
├── officers (one-to-one)
│   └── students (one-to-one reference)
└── admins (one-to-one)

events
├── attendance (one-to-one from attendance)
└── expenses (many-to-one from expenses)

stories (volunteer posts)
└── students (many-to-one)

files, revenue (standalone)
```

For complete collection schemas with all fields, types, constraints, and relationship details, see [DATABASE.md](DATABASE.md).

---

## Project Structure

```
specs-website/
├── public/                          # Static assets
├── src/
│   ├── index.html                   # Entry point
│   ├── index.css                    # Tailwind CSS directives
│   ├── __tests__/                   # Test suites
│   ├── components/                  # Reusable UI React components
│   │   └── ui/
│   │       ├── ConfirmModal.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Pagination.tsx
│   │       ├── SkeletonLoader.tsx
│   │       └── Toast.tsx
│   ├── guard/
│   │   └── AuthGuard.tsx            # React router auth guard
│   ├── pages/                       # Screen routes grouped by module
│   │   ├── admin/                   # Admin pages (AdminStudents.tsx, AdminAnnouncements.tsx, etc.)
│   │   ├── officer/                 # Officer dashboard pages
│   │   ├── student/                 # Student dashboard pages
│   │   ├── shared/                  # Common/shared pages
│   │   └── landing/                 # Public landing page routes
│   └── shared/                      # Shared code
│       ├── api.ts                   # Centralized API layer
│       ├── appwrite.ts              # Appwrite client setup
│       ├── cache.ts                 # Data/Image caching layer
│       ├── constants.ts             # Environment variables & IDs
│       ├── formatters.ts            # Currency, date, time formatters
│       ├── utils.ts                 # Debounce, copy, and helper functions
│       ├── mock/                    # Development mock system
│       └── providers/               # Multi-provider abstraction
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── unlighthouse.config.mjs
```

---

## License
This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for details.
