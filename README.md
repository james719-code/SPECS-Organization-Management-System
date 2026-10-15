# SPECS Organization Management System

![Project Banner](https://img.shields.io/badge/SPECS-Organization%20Portal-blue?style=for-the-badge&logo=firebase) ![Status](https://img.shields.io/badge/Status-Maintained-green?style=for-the-badge) ![License](https://img.shields.io/badge/License-BSD%203--Clause-orange?style=for-the-badge) ![Tests](https://img.shields.io/badge/Tests-283%20passed-brightgreen?style=for-the-badge)

A centralized web application built with **React 19**, **TypeScript**, **TailwindCSS**, **Firebase**, and **Supabase Edge Functions** to serve as the central hub for the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**.

The current runtime uses **Firebase Authentication and Firestore** for identity and application data, **Supabase Storage** for files, and the `supabase/functions/specs-api` Edge Function for privileged operations. The Appwrite provider remains only as a compatibility path for older environments; new deployments should use Firebase and Supabase.

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

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (React 19 + TypeScript)"
        UI[UI Components]
        PAGES[Pages & Views]
        CACHE[Cache Layer]
    end

    subgraph "Provider Abstraction Layer"
        AUTH[IAuthProvider]
        DB[IDatabaseProvider]
        STORAGE[IStorageProvider]
    end

    subgraph "Backend Providers"
        FIREBASE[Firebase Auth + Firestore]
        SUPABASE[Supabase Edge Functions + Storage]
        APPWRITE[Appwrite compatibility]
    end

    UI --> PAGES
    PAGES --> CACHE
    CACHE --> AUTH
    CACHE --> DB
    CACHE --> STORAGE
    AUTH --> FIREBASE
    DB --> FIREBASE
    STORAGE --> SUPABASE
    PAGES --> SUPABASE
    APPWRITE -. legacy provider .-> AUTH
    APPWRITE -. legacy provider .-> DB
    APPWRITE -. legacy provider .-> STORAGE
```

## Database Entity Relationships

```mermaid
erDiagram
    accounts ||--o| students : "one-to-one"
    accounts ||--o| officers : "one-to-one"
    accounts ||--o| admins : "one-to-one"
    students ||--o{ payments : "one-to-many"
    students ||--o{ attendance : "one-to-many"
    students ||--o{ stories : "one-to-many"
    officers ||--o| students : "one-to-one"
    officers ||--o{ attendance : "one-to-many"
    officers ||--o{ payments : "one-to-one"
    events ||--o{ attendance : "one-to-many"
    events ||--o{ payments : "one-to-many"
    events ||--o{ expenses : "one-to-many"
    starting_balances {
        string id PK
        number amount
        datetime start_first_sem
        datetime end_first_sem
        datetime start_second_sem
        datetime end_second_sem
    }
    tasks {
        string id PK
        string name
        boolean is_done
    }
```

---

## Design Decisions

In building this application, specific architectural and technical choices were made to balance performance, learning curve, and rapid deployment:

### 1. React 19 & TypeScript
* **Decision:** We migrated from Vanilla JavaScript to React 19 and TypeScript.
* **Reasoning:** As the application grew in size (14+ admin views, shared components, complex state management), Vanilla JS became hard to scale. React provides a component-driven architecture for high reusability, and TypeScript ensures compile-time type safety, minimizing runtime exceptions and ReferenceErrors.

### 2. Firebase and Supabase
* **Decision:** Firebase Authentication and Firestore are the canonical identity and data services. Supabase Edge Functions and Storage provide the privileged server boundary and file storage.
* **Reasoning:** Firestore rules handle normal reads and role isolation, while the Edge Function keeps service-account credentials, account mutations, email dispatch, and signed storage operations off the client.

### 3. TailwindCSS for Styling
* **Decision:** Replaced Plain CSS/SCSS with TailwindCSS.
* **Reasoning:** TailwindCSS enables rapid prototyping and styling consistency through a robust utility-first system. It simplifies layout design, responsive configurations, and custom animations, while keeping CSS output extremely small through purge utilities.

### 4. Multi-Provider Architecture
* **Decision:** Built an abstraction layer with provider interfaces for Auth, Database, and Storage.
* **Reasoning:** To keep the frontend independent from backend details. Firebase/Supabase is the production path, while Appwrite remains available only for compatibility and controlled rollback.

---

## Features

### General
- **User Authentication:** Secure login/signup with university email validation, verification, and session expiry detection.
- **Role-Based Access:** Separated dashboards and permissions for `students`, `officers`, and `admins` using Firebase Auth claims/account projections and Firestore Security Rules.
- **Public Landing Page (7 routes):** Home, Events, About Us, Resources, Stories, Story Detail, Login/Signup.
- **Volunteer System:** Full lifecycle — students request volunteer status, officers approve/reject, volunteers create posts, and can request to leave (`none` → `pending` → `approved`/`rejected`, plus `backout_pending`).
- **Stories & Highlights:** Volunteer-authored blog posts with officer/admin approval workflow (`officerApproval` + `adminApproval`), published to the public landing page.
- **QR Code Scanner:** Fullscreen scanner for quick student lookup and event check-in via `html5-qrcode`.
- **PDF Export:** Report generation and printing with `jspdf` and `html2canvas`.
- **Centralized Caching:** localStorage-based image and data caches with TTL, LRU eviction, stale-while-revalidate, request deduplication, and tag-based invalidation.
- **Structured Error Handling:** Typed `ApiError` classes with Firebase and Supabase error mapping.
- **Toast Notifications:** Custom toast system with 4 types (success, error, warning, info), auto-dismiss, progress bars, and pause-on-hover.
- **Confirmation Modals:** Custom reusable `ConfirmModal` component with 5 visual variants.

### Student Dashboard (5 views)
- **Event Calendar:** View upcoming and past events.
- **Payment Tracking:** See pending and completed payments with payment card summaries; download paid receipts as browser-generated PDFs.
- **Attendance History:** View personal event attendance records.
- **Profile Settings:** Update personal info, request volunteer status, or request to leave the volunteer program.
- **Volunteer Posts:** Create, edit, and delete blog posts with cover images (for approved volunteers only).

### Officer Dashboard (8 views)
- **Finance Overview:** Track revenue and expenses with charts, including starting balance configuration.
- **File Sharing:** Browse and manage shared documents.
- **Event Calendar:** View and manage upcoming events.
- **Student Directory:** Filterable, paginated list of students with verification controls.
- **Payment Management:** View and manage student payments with payment card components.
- **Volunteer Management:** Approve or reject volunteer requests and backout requests with card-based UI.
- **Story Approval:** Review, approve/reject, edit, and delete volunteer posts before publication.
- **Settings:** Manage officer profile, schedule, and picture.

### Admin Panel (13 views)
- **Dashboard Stats:** At-a-glance overview with Chart.js / Recharts visualizations and animated counters.
- **Account Management:** Approve, verify, deactivate/reactivate, and delete accounts. Promote students to officers or demote through the Supabase `specs-api` Edge Function. CSV export.
- **Event Management:** A timeline view to add, edit, and delete events with related links and collaborators.
- **Attendance Management:** Event-based attendance tracking with student search autocomplete and non-member support.
- **Payment Management:** Assign and manage payments (individually or by bulk) with support for non-BSCS students.
- **Finance Overview:** Revenue and expense tracking with charts and starting balance management per school year.
- **Student Directory:** Comprehensive student management.
- **File Management:** View and manage all uploaded files.
- **Volunteer Management:** Full volunteer lifecycle management.
- **Stories Management:** Full CRUD, approval workflow, filtering by status, and statistics.
- **Task Management:** Create and track admin/officer tasks with completion state.
- **Announcements:** Draft and publish in-app notifications for all students, officers, or selected accounts; bulk announcement email is not used.
- **Settings:** Admin profile and preferences.

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | React 19, TypeScript, TailwindCSS v3 | — |
| **Icons** | Lucide React, Bootstrap Icons (SVG) | ^1.22.0 / ^1.13.1 |
| **Charts** | Chart.js, Recharts | ^4.5.0 / ^3.9.0 |
| **PDF / Print** | jspdf, html2canvas | ^4.2.1 / ^1.4.1 |
| **QR Scanner** | html5-qrcode | ^2.3.8 |
| **Authentication / Database** | Firebase Authentication + Firestore | Firebase Web SDK |
| **Server boundary** | Supabase Edge Functions (`specs-api`) | Deno / TypeScript |
| **File storage** | Supabase Storage | Supabase client + signed URLs |
| **Build Tool** | Vite | 7.1.11 |
| **Testing** | Vitest, jsdom, @testing-library/dom, @testing-library/user-event | ^2.1.8 |
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
| `api.students` | `get()`, `update()` |
| `api.stories` | `list()`, `get()`, `create()`, `update()`, `delete()`, `approve()`, `getByStudent()`, `getPending()` |
| `api.officers` | `list()`, `assignStudent()`, `removeStudent()` |
| `api.admins` | `getCurrent()` |
| `api.tasks` | `list()`, `create()`, `update()`, `delete()` |
| `api.files` | `getFilePreview()`, `uploadEventImage()`, `deleteEventImage()`, `upload()`, `listFiles()` |
| `api.finance` | `getOverview()` (revenue, expenses, starting balances) |
| `api.startingBalances` | `list()`, `upsert()` |
| `api.dashboard` | `getStats()` |
| `api.metadata` | `getCollections()`, `getBucketId()` |
| `api.cache` | `clearAll()`, `clearByPattern()`, `clearKey()`, `getStats()` |
| `cachedApi` | Cached wrappers for frequently used read operations with configurable TTL |

### Two-Tier Caching System

```
Request → cache.get(key)
  ├── Hit (fresh) → return data
  ├── Hit (stale) → return stale + background revalidate
  └── Miss → fetch → store → return
                └── deduplication: concurrent same-key requests share one fetch
```

Cache features:
- **Data cache** (`dataCache`): TTL-based with LRU eviction, tag-based invalidation
- **Image cache** (`imageCache`): Separate cache for binary/image data
- **Request deduplication**: Concurrent requests for the same key share a single fetch
- **Stale-while-revalidate**: Serve cached data immediately while refreshing in background

### Shared Components

Reusable UI components in `components/ui/` and `shared/`:

| Component | Description |
|-----------|-------------|
| `EmptyState.tsx` | Empty state displays with multiple pre-configured icon layouts |
| `SkeletonLoader.tsx` | Loading skeletons for layouts, lists, metrics, cards, and tables |
| `Pagination.tsx` | Full pagination controls with page size configuration |
| `ConfirmModal.tsx` | Reusable modal dialog replacing browser native confirm alerts (5 variants) |
| `Toast.tsx` | Toast notification system with auto-dismiss, progress bars, and pause-on-hover |

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
- All API calls return realistic mock data across all 15 collections (accounts, students, officers, admins, events, stories, payments, files, attendance, expenses, revenue, tasks, starting_balances, volunteer_requests)
- Full CRUD operations through the provider abstraction, with Firebase cursor pagination and a compatibility adapter for legacy Appwrite-style filters
- Pagination simulation with 200ms simulated network delay
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

The project includes a comprehensive test suite with **283 passed tests** across both unit (Vitest) and End-to-End (Playwright) layers.

### Unit Tests (Vitest)
There are **212 unit tests** verifying API state, cache eviction, and service layers:

| File | Type | Tests |
|------|------|-------|
| [mockData.test.js](specs-website/src/__tests__/unit/mockData.test.js) | Mock data integrity & schema validation | 40 |
| [mockApiService.test.js](specs-website/src/__tests__/unit/mockApiService.test.js) | Mock API service (auth, CRUD, queries, files) | 49 |
| [api.test.js](specs-website/src/__tests__/unit/api.test.js) | API layer (all namespaces, cache, pagination) | 43 |
| [cache.test.js](specs-website/src/__tests__/unit/cache.test.js) | Data & image caching layer | ~30 |
| [api-cache.test.js](specs-website/src/__tests__/unit/api-cache.test.js) | Cached API integration | ~25 |
| [api-coverage.test.js](specs-website/src/__tests__/unit/api-coverage.test.js) | API coverage edge cases | ~25 |

### End-to-End Tests (Playwright)
There are **71 E2E tests** verifying user paths, routing, role protection, and page navigation under mock state:

| File | Description | Tests |
|------|-------------|-------|
| [auth-flows.spec.ts](specs-website/tests/e2e/auth-flows.spec.ts) | Login/signup redirection, forgot password, validations | 8 |
| [route-protection.spec.ts](specs-website/tests/e2e/route-protection.spec.ts) | Role-Based Access Control redirects, deep route 404s | 7 |
| [public-pages.spec.ts](specs-website/tests/e2e/public-pages.spec.ts) | Landing page, privacy, terms, cookie banners | 11 |
| [admin-dashboard.spec.ts](specs-website/tests/e2e/admin-dashboard.spec.ts) | Navigation to all 17 Admin dashboard sub-routes without errors | 21 |
| [student-dashboard.spec.ts](specs-website/tests/e2e/student-dashboard.spec.ts) | Navigation to all 7 Student dashboard sub-routes without errors | 8 |
| [officer-dashboard.spec.ts](specs-website/tests/e2e/officer-dashboard.spec.ts) | Navigation to all 16 Officer dashboard sub-routes without errors | 17 |

### Running Tests

All test commands must be run from the `specs-website` directory:

```bash
# --- Unit Tests (Vitest) ---
# Run all unit tests in watch mode
npm run test

# Run unit tests in interactive UI
npm run test:ui

# Run unit tests with code coverage
npm run test:coverage

# Run unit tests once (CI mode)
npm run test:run

# --- E2E Tests (Playwright) ---
# Run all E2E tests headlessly
npm run test:e2e

# Run E2E tests in interactive UI
npm run test:e2e:ui

# Open the HTML test report
npm run test:e2e:report
```

---

## Multi-Provider Support

The application supports multiple backend providers through an abstraction layer with formally defined interfaces (`IAuthProvider`, `IDatabaseProvider`, `IStorageProvider`):

### Supported Providers
| Provider | Auth | Database | Storage | Implementation |
|----------|------|----------|---------|---------------|
| Firebase + Supabase | Yes | Yes | Yes | `firebaseProvider.ts`, `supabaseStorageProvider.ts` |
| Appwrite | Yes | Yes | Yes | `appwriteProvider.ts` (legacy compatibility) |

---

## Getting Started for Developers

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)
- A Firebase project with Authentication, Firestore, and authorized web domains
- A Supabase project with Storage and the Supabase CLI linked to the project

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

#### 3. Configure Firebase and Supabase

1. Create or select the Firebase project used by the application.
2. Enable Firebase Email/Password Authentication and Firestore.
3. Add `localhost` and the production domain under Firebase Authentication authorized domains.
4. Deploy the rules from the repository root:

   ```bash
   firebase deploy --only firestore:rules
   ```

5. Link the Supabase project and deploy the privileged function:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
   npx supabase functions deploy specs-api
   ```

6. Add the Edge Function secrets described in [supabase/README.md](supabase/README.md). Keep service-account JSON and provider keys out of the repository.

#### 4. Environment Setup

Create `specs-website/.env` locally from `specs-website/.env.example` and select Firebase for Auth and Firestore, with Supabase for Storage and privileged functions.

```ini
# Firebase web configuration
VITE_FIREBASE_API_KEY="<YOUR_FIREBASE_WEB_API_KEY>"
VITE_FIREBASE_AUTH_DOMAIN="<YOUR_PROJECT_ID>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<YOUR_PROJECT_ID>"
VITE_FIREBASE_STORAGE_BUCKET="<YOUR_PROJECT_ID>.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="<YOUR_MESSAGING_SENDER_ID>"
VITE_FIREBASE_APP_ID="<YOUR_FIREBASE_APP_ID>"

# Supabase public client configuration
VITE_SUPABASE_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
VITE_SUPABASE_FUNCTION_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/specs-api"

# Provider selection
VITE_AUTH_PROVIDER=firebase
VITE_DB_PROVIDER=firebase
VITE_STORAGE_PROVIDER=supabase-edge
```

#### 5. Run the Development Server
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## Database Schema

The production database is **Firestore**, using document collections with `accounts` as the central identity projection. Collection names remain close to the migrated Appwrite schema so existing business logic and reports can be reconciled. The read-model projections and snapshot rules are documented in [FIRESTORE_READ_MODEL.md](FIRESTORE_READ_MODEL.md).

### Active Collections (13)
| # | Collection | Env Variable | Description |
|---|-----------|-------------|-------------|
| 1 | `accounts` | `VITE_COLLECTION_ID_ACCOUNTS` | Central hub linking auth users to role data |
| 2 | `students` | `VITE_COLLECTION_ID_STUDENTS` | Student profiles |
| 3 | `officers` | `VITE_COLLECTION_ID_OFFICERS` | Officer assignments with position & schedule |
| 4 | `admins` | `VITE_COLLECTION_ID_ADMINS` | Admin profiles |
| 5 | `events` | `VITE_COLLECTION_ID_EVENTS` | Event listings with dates, collab, links |
| 6 | `attendance` | `VITE_COLLECTION_ID_ATTENDANCE` | Event attendance records |
| 7 | `payments` | `VITE_COLLECTION_ID_PAYMENTS` | Payment tracking per student/event |
| 8 | `revenue` | `VITE_COLLECTION_ID_REVENUE` | Revenue entries |
| 9 | `expenses` | `VITE_COLLECTION_ID_EXPENSES` | Expense entries |
| 10 | `stories` | `VITE_COLLECTION_ID_STORIES` | Volunteer blog posts & highlights |
| 11 | `files` | `VITE_COLLECTION_ID_FILES` | File metadata records |
| 12 | `tasks` | `VITE_COLLECTION_ID_TASKS` | Admin/officer task tracking |
| 13 | `starting_balances` | `VITE_COLLECTION_ID_STARTING_BALANCES` | Per-school-year budget starting balances |

### Relationship Diagram
```
accounts (central hub)
├── students (one-to-one, onDelete: cascade)
│   ├── payments (one-to-many, onDelete: setNull)
│   ├── attendance (many-to-one, onDelete: setNull)
│   └── stories (many-to-one, onDelete: setNull)
├── officers (one-to-one, onDelete: cascade)
│   └── students (one-to-one, onDelete: cascade)
└── admins (one-to-one, onDelete: cascade)

events
├── attendance (one-to-many, onDelete: setNull)
├── payments (one-to-many, onDelete: setNull)
└── expenses (one-to-many, onDelete: setNull)

officers
├── attendance (one-to-many, onDelete: setNull)
└── payments (one-to-one, onDelete: setNull)

starting_balances, tasks, files, revenue (standalone)
```

For complete collection schemas with all fields, types, constraints, indexes, and relationship details, see [DATABASE.md](DATABASE.md).

### Supabase Storage Buckets
| Bucket | Env Variable | Purpose |
|--------|-------------|---------|
| `specs-events` | `STORAGE_ALLOWED_BUCKETS` | Cover images for events |
| `specs-files` | `STORAGE_ALLOWED_BUCKETS` | General file uploads by officers |
| `specs-picture` | `STORAGE_ALLOWED_BUCKETS` | Officer profile pictures |
| `specs-schedule` | `STORAGE_ALLOWED_BUCKETS` | Officer schedule files |
| `specs-public-files` | `STORAGE_ALLOWED_BUCKETS` | Downloadable resources on the landing page |
| `specs-highlights` | `STORAGE_ALLOWED_BUCKETS` | Cover images for volunteer stories/highlights |

Receipts are generated in the browser and downloaded by the student. They are not uploaded to Supabase Storage or emailed automatically.

---

## Project Structure

```
specs-website/
├── public/                          # Static assets
├── scripts/                         # Database audit & maintenance scripts
│   ├── audit-collections.mjs        # Collection schema auditor → collection-schema.md
│   ├── collection-schema.md         # Auto-generated schema reference
│   ├── collection-schema.json       # Auto-generated schema (JSON)
│   ├── fix-attendance-permissions.mjs
│   ├── fix-metadata-permissions.mjs
│   ├── fix-signup-permissions.mjs
│   ├── align-test-student.mjs
│   ├── inspect-attendance.mjs
│   ├── inspect-permissions.mjs
│   ├── list-events.mjs
│   ├── list-officers.mjs
│   └── list-starting-balances.mjs
├── src/
│   ├── index.html                   # Entry point
│   ├── index.css                    # Tailwind CSS directives
│   ├── __tests__/                   # Test suites (Vitest + jsdom)
│   │   └── unit/
│   │       ├── api.test.js          # API layer integration tests
│   │       ├── api-cache.test.js    # Cached API tests
│   │       ├── api-coverage.test.js # API edge case coverage
│   │       ├── cache.test.js        # Cache layer unit tests
│   │       ├── mockApiService.test.js # Mock API service tests
│   │       └── mockData.test.js     # Mock data integrity tests
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
│   │   ├── admin/                   # Admin pages (13 views)
│   │   ├── officer/                 # Officer dashboard pages (8 views)
│   │   ├── student/                 # Student dashboard pages (5 views)
│   │   ├── shared/                  # Common/shared pages
│   │   └── landing/                 # Public landing page routes (7 routes)
│   └── shared/                      # Shared code
│       ├── api.ts                   # Centralized API layer (15 namespaces)
│       ├── appwrite.ts              # Legacy-compatible client/provider setup
│       ├── cache.ts                 # Data/Image two-tier caching layer
│       ├── constants.ts             # Environment variables & collection IDs
│       ├── formatters.ts            # Currency, date, time formatters
│       ├── utils.ts                 # Debounce, copy, and helper functions
│       ├── mock/                    # Development mock system
│       │   ├── mockApiService.js    # In-memory mock backend for local development
│       │   └── mockData.js          # Mock data for all 15 collections
│       └── providers/               # Multi-provider abstraction layer
│           ├── interface.ts         # IAuthProvider, IDatabaseProvider, IStorageProvider
│           ├── factory.ts           # Provider factory (loads based on .env)
│           ├── appwriteProvider.ts  # Legacy Appwrite compatibility
│           ├── firebaseProvider.ts  # Firebase Auth/Firestore implementation
│           ├── supabaseStorageProvider.ts # Supabase Storage implementation
│           └── firebaseFunctionProvider.ts # Supabase Edge Function client
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── unlighthouse.config.mjs
```

---

## Development Mock Mode & Architecture

To facilitate rapid frontend development and offline testing, this portal includes a provider abstraction and mocking architecture.

### 1. Mock Mode Configuration
In local development mode, you can bypass connection to Firebase and Supabase by setting `VITE_USE_MOCK_DATA="true"` in your local `.env` file.
* This directs the provider factory (`src/shared/providers/factory.ts`) to initialize mock implementations of the `auth`, `database`, and `storage` provider classes.
* All data changes and query filters are simulated in-memory using `src/shared/mock/mockApiService.js`, providing pre-populated relational mocks for all 15 collections (students, officers, events, payments, stories, tasks, starting balances, and more).
* A quick login panel is exposed on the login screen to easily log in as `student`, `officer`, or `admin` accounts.
* Query simulation supports the filtering and pagination patterns used by the Firebase provider.

### 2. Multi-Provider Abstraction
The system code is decoupled from backend services using common interface abstractions located in `src/shared/providers/interface.ts`:
* **`IAuthProvider`**: Controls user state retrieval, user session logins, recovery, and token validations.
* **`IDatabaseProvider`**: Standardizes document read, list, and write queries.
* **`IStorageProvider`**: Manages bucket listings, uploads, downloads, and image previews.

The factory `src/shared/providers/factory.ts` loads the active client module depending on your `.env` settings (`VITE_AUTH_PROVIDER`, `VITE_DB_PROVIDER`, `VITE_STORAGE_PROVIDER`). The production combination is Firebase Auth/Firestore plus Supabase Storage and Edge Functions.

### 3. Supabase Edge Function
For administrative operations requiring elevated server-side privileges (e.g. promoting a student to an officer or bulk verification), requests are sent to the `specs-api` Supabase Edge Function.
* The function verifies Firebase ID tokens and performs privileged Firebase Auth/Firestore and Supabase Storage operations server-side.
* It safely updates roles and active states without exposing service-account or service-role credentials to the client.

---

## License
This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for details.
