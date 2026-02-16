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
1. **Centralizing Records:** A unified relational database with `accounts` as the central hub linking to `students`, `officers`, and `admins`.
2. **Automating Access:** Role-based dashboards ensure officers have the tools they need while students access only what is relevant.
3. **Streamlining Resources:** A dedicated file repository and resources page ensures educational materials are always accessible.

---

## Design Decisions

In building this application, specific architectural and technical choices were made to balance performance, learning curve, and rapid deployment:

### 1. Why Vanilla JavaScript?
* **Decision:** We avoided heavy frontend frameworks (React/Vue) for the initial version.
* **Reasoning:** To ensure a deep understanding of DOM manipulation and core Web APIs without the abstraction overhead. This keeps the bundle size incredibly small and the performance high on lower-end devices often used by students.

### 2. Why Appwrite (BaaS)?
* **Decision:** We utilized Appwrite for the backend instead of building a custom REST API with Node/Express.
* **Reasoning:** As a student-led project with tight deadlines, we needed a secure, production-ready backend immediately. Appwrite handles Authentication, Database (CRUD), File Storage, Cloud Functions, and Teams out-of-the-box, allowing us to focus 100% on the frontend logic and user experience.

### 3. SCSS over Plain CSS
* **Decision:** Used SASS/SCSS with a BEM-like naming convention.
* **Reasoning:** To maintain modularity and use variables for the organization's color themes, making future rebranding or dark mode implementation significantly easier.

### 4. Multi-Provider Architecture
* **Decision:** Built an abstraction layer with provider interfaces for Auth, Database, and Storage.
* **Reasoning:** To allow swapping backend services (e.g., Firebase for auth, Cloudflare R2 for storage) without changing application code. Each provider implements a common interface defined in `providers/interface.js`.

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
- **Confirmation Modals:** Promise-based `confirmAction()` replacing `window.confirm()` with 5 visual variants.

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
- **Dashboard Stats:** At-a-glance overview with Chart.js visualizations and animated counters.
- **Account Management:** Approve, verify, deactivate/reactivate, and delete accounts. Promote students to officers or demote via Appwrite Cloud Functions. CSV export.
- **Event Management:** A timeline view to add, edit, and delete events with related links and collaborators.
- **Attendance Management:** Event-based attendance tracking with student search autocomplete.
- **Payment Management:** Assign and manage payments (individually or by bulk) with support for non-BSCS students.
- **Finance Overview:** Revenue and expense tracking with charts.
- **Student Directory:** Comprehensive student management.
- **File Management:** View and manage all uploaded files.
- **Volunteer Management:** Full volunteer lifecycle management.
- **Stories Management:** Full CRUD, approval workflow, filtering by status, and statistics.
- **Announcements:** Draft composition with recipient targeting (all/students/officers/custom), copy-to-clipboard, and open-in-email-client.
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
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, SASS/SCSS | — |
| **UI** | Bootstrap (via SCSS) | ^5.3.7 |
| **Icons** | Bootstrap Icons (SVG) | ^1.13.1 |
| **Charts** | Chart.js | ^4.5.0 |
| **Backend** | Appwrite Cloud (BaaS) | SDK ^18.1.1 |
| **Server SDK** | node-appwrite (Cloud Functions) | ^17.0.0 |
| **Build Tool** | Vite | 7.1.11 |
| **Testing** | Vitest, @testing-library/dom, @testing-library/user-event | ^2.1.8 |
| **Coverage** | @vitest/coverage-v8 | ^2.1.8 |
| **Quality** | Unlighthouse (Performance & SEO Scanning) | ^0.17.2 |

---

## Architecture

### Centralized API Layer

All backend operations go through a structured `api` object in `shared/api.js`:

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

Reusable UI components in `shared/components/`:

| Component | Description |
|-----------|-------------|
| `emptyState.js` | Empty state displays with 6 icon types (`default`, `search`, `events`, `users`, `files`, `finance`) plus error states with retry |
| `skeletonLoader.js` | Loading skeletons: `statCard`, `tableRow`, `accountCard`, `eventCard`, `chart`, `listItem`, `dashboard` |
| `paginationControls.js` | Full pagination with page size selector, ellipsis, and event listeners |
| `paymentCard.js` | Student payment cards with summary calculations (`totalDue`, `totalPaid`, `pendingCount`) |

### Shared Utilities

| Module | Description |
|--------|-------------|
| `cache.js` | Image cache (7-day TTL, 50MB max, LRU eviction) and data cache (5-min TTL, stale-while-revalidate) |
| `cache-tools.js` | Developer debugging via `window.cacheTools` — `stats()`, `listKeys()`, `inspect()`, `clear()`, `search()`, `stress()` |
| `errors.js` | `ApiError` class, `ErrorCodes` enum (17 codes), `mapAppwriteError()`, `createApiError()` |
| `toast.js` | Toast notifications — `showToast()` and `toast.success/error/warning/info()` |
| `confirmModal.js` | `confirmAction(title, message, confirmLabel, variant)` → `Promise<boolean>` |
| `formatters.js` | `formatCurrency()` (₱), `formatDate()`, `formatDateTime()`, `formatRelativeTime()` |
| `dashboard-utils.js` | `renderDashboardContent()`, `setupDashboardNavigation()`, `createLoadingSpinner()`, `createErrorAlert()` |
| `lazyLoadHelper.js` | `lazyLoadComponent()`, `lazyImage()`, `initLazyImages()`, `prefetchModule()`, `createViewLoader()` |
| `utils.js` | `debounce()`, `throttle()`, `chartManager`, `animateNumber()`, `copyToClipboard()` |

---

## Performance Optimizations

### Code Splitting & Lazy Loading
- **Dynamic Imports:** All dashboard views and landing page routes are lazily loaded using `import()` to reduce initial bundle size.
- **Route Prefetching:** Commonly visited pages are prefetched via `requestIdleCallback`.
- **IntersectionObserver:** Utility for lazy loading images and below-the-fold components with placeholder SVGs.
- **Module Caching:** View modules are cached after first load in `renderDashboardContent()`.

### Caching System
- **Image Cache:** localStorage-based with 7-day TTL, 50MB max capacity, and automatic LRU cleanup at 80% threshold.
- **Data Cache:** localStorage-based with 5-minute default TTL and stale-while-revalidate pattern via `getOrFetch()`.
- **Cached API:** Pre-built cached wrappers for events, payments, and user profile reads.
- **Developer Tools:** `window.cacheTools` provides runtime cache inspection, search, and stress testing.

### Build Optimizations
- **Vendor Chunking:** Libraries are split into 10+ separate chunks (`vendor-appwrite`, `vendor-bootstrap`, `vendor-chart`, `vendor-firebase`, `vendor-icons`, `vendor-aws`, `shared-utils`, `views-admin`, `views-officer`, `views-student`, `views-landing`).
- **Console Removal:** Production builds strip `console.log`, `console.debug`, and `console.info` via Terser.
- **Tree Shaking:** Unused code is automatically removed from production bundles.
- **SCSS Optimization:** Deprecation silencing for `import`, `mixed-decls`, `color-functions`, `global-builtin`.

### Code Quality
- **Clean Codebase:** Unnecessary comments removed for improved readability. The code is self-documenting through clear naming conventions.
- **JSDoc Comments:** Preserved where they provide meaningful API documentation (e.g., `cache.js`, `cachedApi` wrapper, provider interfaces).
- **Path Aliases:** `@` → `./src`, `@shared` → `./src/shared` for clean imports.

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
- All API calls return realistic mock data (6 accounts, 5 students, events, stories, payments, files, attendance, expenses, revenue)
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

### Test Structure
```
src/__tests__/
  setup.js                  # Global test setup and mocks
  unit/
    cache.test.js            # Cache utility tests
    lazyLoadHelper.test.js   # Lazy loading tests
  integration/
    router.test.js           # Router integration tests
```

### Test Configuration
- **Environment:** jsdom
- **Coverage:** v8 provider with text, JSON, and HTML reporters
- **Timeout:** 10,000ms
- **Path aliases:** Same as build (`@`, `@shared`)

---

## Multi-Provider Support

The application supports multiple backend providers through an abstraction layer with formally defined interfaces (`IAuthProvider`, `IDatabaseProvider`, `IStorageProvider`):

### Supported Providers
| Provider | Auth | Database | Storage | Implementation |
|----------|------|----------|---------|---------------|
| Appwrite | Yes | Yes | Yes | `appwriteProvider.js` |
| Firebase | Yes | Yes | No | `firebaseProvider.js` (lazy SDK loading) |
| Cloudflare R2 | No | No | Yes | `cloudflareR2Provider.js` (pre-signed URLs) |

The factory (`providers/factory.js`) uses a singleton pattern with lazy initialization and environment-based provider selection.

### Configuration
Set providers in your `.env` file:

```bash
# Provider Selection
VITE_AUTH_PROVIDER=appwrite     # appwrite or firebase
VITE_DB_PROVIDER=appwrite       # appwrite or firebase
VITE_STORAGE_PROVIDER=appwrite  # appwrite or cloudflare-r2
```

### Provider-Specific Configuration

**Firebase (optional):**
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

**Cloudflare R2 (optional):**
```bash
VITE_R2_ENDPOINT=
VITE_R2_BUCKET_NAME=
VITE_R2_PUBLIC_URL=
```

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

# Optional: Multi-Provider Support
# VITE_AUTH_PROVIDER=appwrite
# VITE_DB_PROVIDER=appwrite
# VITE_STORAGE_PROVIDER=appwrite

# Optional: Mock Data (for local development without backend)
# VITE_USE_MOCK_DATA=true
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
│   ├── __tests__/                   # Test suites
│   │   ├── setup.js
│   │   ├── unit/
│   │   └── integration/
│   ├── guard/
│   │   └── auth.js                  # Auth guard with role-based routing
│   ├── landing/                     # Public-facing pages
│   │   ├── landing.js               # Router & initialization
│   │   ├── data/data.js             # Static content data
│   │   └── views/                   # 7 route views
│   ├── dashboard-admin/             # Admin panel
│   │   ├── dashboardAdmin.js        # Router & navigation
│   │   └── views/                   # 14 view modules
│   ├── dashboard-officer/           # Officer dashboard
│   │   ├── dashboardOfficer.js      # Router & navigation
│   │   └── views/                   # 8 view modules
│   ├── dashboard-student/           # Student dashboard
│   │   ├── dashboardStudent.js      # Router & navigation
│   │   └── views/                   # 5 view modules
│   └── shared/                      # Shared code
│       ├── api.js                   # Centralized API layer
│       ├── appwrite.js              # Appwrite client setup
│       ├── cache.js                 # Image & data caching
│       ├── cache-tools.js           # Developer cache debugging
│       ├── cache-examples.js        # Cache usage documentation
│       ├── confirmModal.js          # Promise-based confirmation dialogs
│       ├── constants.js             # Environment variables & IDs
│       ├── dashboard-utils.js       # Dashboard rendering utilities
│       ├── errors.js                # Structured error handling
│       ├── formatters.js            # Currency, date, time formatters
│       ├── lazyLoadHelper.js        # Lazy loading & prefetching
│       ├── toast.js                 # Toast notification system
│       ├── utils.js                 # Debounce, throttle, chart manager
│       ├── components/              # Reusable UI components
│       │   ├── emptyState.js
│       │   ├── paginationControls.js
│       │   ├── paymentCard.js
│       │   └── skeletonLoader.js
│       ├── mock/                    # Development mock system
│       │   ├── devUtils.js
│       │   ├── mockApiService.js
│       │   └── mockData.js
│       └── providers/               # Multi-provider abstraction
│           ├── interface.js
│           ├── factory.js
│           ├── appwriteProvider.js
│           ├── firebaseProvider.js
│           └── cloudflareR2Provider.js
├── package.json
├── vite.config.js
├── vitest.config.js
└── unlighthouse.config.mjs
```

---

## Project Quality

### Site-wide Performance Scanning
This project uses **Unlighthouse** to scan the entire site (9 routes including all dashboards) for performance, accessibility, and SEO issues using Microsoft Edge in mobile device mode.

```bash
npm run audit
```

---

## Limitations & Known Issues

While functional, the current iteration has the following constraints:

* **Scalability of Vanilla JS:** As the codebase has grown to include 14+ admin views, shared components, and a provider abstraction layer, state management in Vanilla JS adds complexity. The project mitigates this with structured utilities (`dashboard-utils.js`, `chartManager`, etc.) but a component-based framework may be warranted for future growth.
* **Manual Payments:** The system tracks payments but does not *process* them. Students must still pay physically or via external e-wallets, then an admin manually updates the record.
* **Internet Dependency:** The app requires an active internet connection to fetch data from Appwrite; there is currently no offline/PWA support. The caching layer mitigates this for recently viewed data.
* **Client-Side Activity Logs:** Activity logs are stored in localStorage (max 500 entries) rather than server-side, meaning they are per-device and not shared across admin sessions.
* **Announcements:** Currently draft-based with copy-to-clipboard and email client integration rather than in-app push notifications.

## Roadmap & Future Improvements
* [ ] **Payment Gateway Integration:** Integration with PayMongo or Xendit for real-time, automated payment verification.
* [ ] **QR Code Attendance:** Generate QR codes for events to automate the existing attendance tracking system.
* [ ] **Real-time Notifications:** Use Appwrite Realtime to notify students of new events or cleared payments instantly.
* [ ] **Server-Side Activity Logs:** Move activity logs to an Appwrite collection for cross-device persistence.
* [ ] **PWA Support:** Add service worker and offline capabilities leveraging the existing cache infrastructure.

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
This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for details.
