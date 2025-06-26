# SPECS Student & Admin Portal

A modern web application built with Vanilla JavaScript and Appwrite to serve as a central hub for the Society of Programmers and Enthusiasts in Computer Science (SPECS). It provides features for event management, file sharing, financial tracking, and user administration.

## ✨ Features

- **User Authentication:** Secure login, signup, and email verification flow.
- **Role-Based Access:** Distinct dashboard views and permissions for `students` and `admins`.
- **Student Dashboard:**
  - **File Sharing:** Upload, download, and search for shared documents.
  - **Event Calendar:** View and search for upcoming organization events.
  - **Finance Overview:** A dashboard to track revenues and expenses for various activities (restricted access).
  - **Profile Settings:** Update personal information and upload documents like resumes and class schedules.
- **Admin Panel:**
  - **User Management:** A dedicated interface to view, search, accept (verify), and delete student accounts.
  - **Admin Settings:** A simplified settings page for admin profile management.
- **Public Landing Page:** A welcoming page that showcases upcoming events to visitors.
- **Responsive Design:** A modern, mobile-friendly layout for both the public site and the internal dashboards.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** [Appwrite Cloud](https://appwrite.io/) (Backend as a Service)
- **Build Tool:** [Vite](https://vitejs.dev/)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](httpss://nodejs.org/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Git](https://git-scm.com/) for version control

### Local Development Setup

1.  **Fork the Repository**
    First, create a fork of the main project repository on GitHub. This gives you your own copy to work with.

2.  **Clone Your Fork**
    Clone your forked repository to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/the-repo-name.git
    ```

3.  **Navigate to Project Directory**
    ```bash
    cd the-repo-name
    ```

4.  **Install Dependencies**
    Install all the required npm packages.
    ```bash
    npm install
    ```

5.  **Set Up Environment Variables**
    This is the most important step for connecting to the Appwrite Cloud project.

    - Create a new file named `.env.local` in the root of the project directory.
    - Copy the contents of `.env.example` (or the template below) into your new `.env.local` file.

    ```ini
    # .env.local

    # -------------------------------------
    # --- CORE APPWRITE PROJECT CONFIG  ---
    # -------------------------------------
    # ⚠️ IMPORTANT: You must get these values from the project administrator.
    # Do NOT commit this file to Git.
    VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
    VITE_APPWRITE_PROJECT_ID="<PROJECT_ID_FROM_ADMIN>"


    # -------------------------------------
    # ---      DATABASE & COLLECTIONS   ---
    # -------------------------------------
    VITE_DATABASE_ID="<DATABASE_ID_FROM_ADMIN>"
    VITE_COLLECTION_ID_STUDENTS="<STUDENTS_COLLECTION_ID_FROM_ADMIN>"
    VITE_COLLECTION_ID_EVENTS="<EVENTS_COLLECTION_ID_FROM_ADMIN>"
    VITE_COLLECTION_ID_FILES="<FILES_COLLECTION_ID_FROM_ADMIN>"
    VITE_COLLECTION_ID_REVENUE="<REVENUE_COLLECTION_ID_FROM_ADMIN>"
    VITE_COLLECTION_ID_EXPENSES="<EXPENSES_COLLECTION_ID_FROM_ADMIN>"


    # -------------------------------------
    # ---       STORAGE BUCKETS         ---
    # -------------------------------------
    VITE_BUCKET_ID_EVENT_IMAGES="<EVENT_IMAGES_BUCKET_ID_FROM_ADMIN>"
    VITE_BUCKET_ID_UPLOADS="<UPLOADS_BUCKET_ID_FROM_ADMIN>"
    VITE_BUCKET_ID_RESUMES="<RESUMES_BUCKET_ID_FROM_ADMIN>"
    VITE_BUCKET_ID_SCHEDULES="<SCHEDULES_BUCKET_ID_FROM_ADMIN>"
    ```
    > **Security Note:** You **must** request the actual values for the placeholders from the project administrator. These are secrets and should never be hardcoded or committed to the repository.

6.  **Run the Development Server**
    Start the Vite development server.
    ```bash
    npm run dev
    ```

7.  **Open the App**
    Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal). The application should now be running locally and connected to the shared Appwrite Cloud backend.

---

## 🤝 Contribution Workflow

We welcome contributions! Please follow this workflow to submit your changes.

1.  **Create a New Branch**
    Create a feature branch from the `main` or `develop` branch.
    ```bash
    # Example: git checkout -b feature/add-user-profile-picture
    git checkout -b <type>/<short-description>
    ```

2.  **Make Your Changes**
    Implement your new feature or bug fix. Write clean, readable code.

3.  **Commit Your Changes**
    Commit your work with a clear and descriptive commit message.
    ```bash
    git commit -m "feat: Add profile picture upload functionality"
    ```

4.  **Push to Your Fork**
    Push your feature branch to your forked repository on GitHub.
    ```bash
    git push origin feature/add-user-profile-picture
    ```

5.  **Open a Pull Request**
    Go to the main project repository on GitHub and open a new Pull Request from your feature branch to the main repository's `main` branch. Provide a clear description of your changes. The project administrator will then review your code.

---

## ⚙️ Appwrite Project Configuration (For Admin Reference)

<details>
<summary><strong>Click to view required Appwrite setup</strong></summary>

This section is a reference for the project administrator to ensure the Appwrite Cloud project is configured correctly.

### Databases

- **Database Name:** Main
- **Database ID:** `(as in .env)`

#### Collections

1.  **Collection: `students`**
    - **Attributes:**
      - `username` (string, required)
      - `fullname` (string, required)
      - `yearLevel` (string, required)
      - `gender` (string, required)
      - `type` (string, required, default: `student`)
      - `verified` (boolean, required, default: `false`)
      - `haveResume` (boolean, required, default: `false`)
      - `resumeId` (string)
      - `haveSchedule` (boolean, required, default: `false`)
      - `scheduleId` (string)
      - `email` (string, required)
2.  **Collection: `events`**
    - **Attributes:**
      - `event_name` (string, required)
      - `date_to_held` (datetime, required)
      - `image_file` (string, required)
      - `description` (string)
      - `added_by` (string, required)
    - **Indexes:**
      - A **full-text** index on `event_name` and `description` is required for search functionality.
3.  **Collection: `files`**
    - **Attributes:**
      - `fileName` (string, required)
      - `description` (string)
      - `uploader` (string, required)
      - `fileID` (string, required)
    - **Indexes:**
      - A **full-text** index on `fileName` and `description` is required for search functionality.
4.  **Collection: `revenue`**
    - **Attributes:**
      - `name` (string, required)
      - `price` (double, required)
      - `quantity` (integer, required)
      - `date_earned` (datetime, required)
      - `recorder` (string, required)
      - `isEvent` (boolean, required, default: `false`)
      - `event` (string)
      - `activity` (string)
5.  **Collection: `expenses`**
    - **Attributes:**
      - `name` (string, required)
      - `price` (double, required)
      - `quantity` (integer, required)
      - `date_buy` (datetime, required)
      - `recorder` (string, required)
      - `isEvent` (boolean, required, default: `false`)
      - `event` (string)
      - `activity_name` (string)

### Storage

- **Bucket: `Event Images`** (ID as in .env)
- **Bucket: `User Uploads`** (ID as in .env)
- **Bucket: `Resumes`** (ID as in .env)
- **Bucket: `Schedules`** (ID as in .env)

</details>
