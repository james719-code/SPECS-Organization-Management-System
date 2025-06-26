// --- IMPORTS ---
import { account, databases } from "../appwrite.js";
import { Query } from "appwrite";
import renderFinanceView from "./renderpages/finance.js";
import renderFilesView from "./renderpages/files.js";
import renderEventsView from "./renderpages/events.js";
import renderSettingsView from "./renderpages/settings.js";

// --- DATABASE CONFIG ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const FILES_PAGE_LIMIT = 10;

// --- MAIN DASHBOARD COMPONENT ---
export default async function renderDashboard() {
  const app = document.getElementById("app");

  try {
    // Get Core User Data ---
    const user = await account.get();
    const profile = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_ID_STUDENTS,
      user.$id
    );
    
    // Concurrently Fetch Initial Data for Views ---
    const [filesResponse, eventsResponse, studentsResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
            Query.orderDesc('$createdAt'),
            Query.limit(FILES_PAGE_LIMIT)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
            Query.orderDesc('date_to_held')
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)])
    ]);

    const initialFilesData = {
        files: filesResponse.documents,
        total: filesResponse.total,
    };
    
    // The initial data for the events view is now the full list of documents
    const initialEventsData = eventsResponse.documents;

    const userLookup = studentsResponse.documents.reduce((map, student) => {
        map[student.$id] = student.fullname || student.username;
        return map;
    }, {});


    app.innerHTML = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      
      <style>
        /* --- GLOBAL & LAYOUT SHELL STYLES --- */
        :root {
          --bg-dark: #111827;
          --surface-dark: #3a3a3a;
          --border-dark: #374151;
          --text-primary: #F9FAFB;
          --text-secondary: #9CA3AF;
          --accent-blue: #3B82F6;
          --accent-blue-hover: #2563EB;
          --status-red: #EF4444;
        }
        
        .dashboard-layout, .dashboard-layout * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        .dashboard-layout {
          display: grid; 
          grid-template-columns: 250px 1fr; 
          grid-template-rows: auto 1fr;
          grid-template-areas: "drawer header" "drawer content"; 
          min-height: 100vh; 
          color: var(--text-primary);
          height: 100vh;
          overflow: hidden;
        }
        
        .dashboard-header {
          grid-area: header; 
          display: flex; 
          align-items: center; 
          gap: 1rem;
          padding: 1rem 1.5rem; 
          background-color: var(--surface-dark); 
          border-bottom: 1px solid var(--border-dark);
        }
        .dashboard-header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
        #mobile-menu-toggle { display: none; background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer; }
        #logout-btn {
            background-color: transparent; color: var(--text-secondary); border: none; padding: 0.5rem; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s, color 0.2s;
            margin-left: auto;
        }
        #logout-btn:hover { background-color: var(--border-dark); color: var(--text-primary); }
        #logout-btn svg { width: 22px; height: 22px; }
        
        .nav-drawer {
          grid-area: drawer; 
          background-color: var(--surface-dark); 
          padding: 1rem 0; 
          border-right: 1px solid var(--border-dark);
          display: flex; 
          flex-direction: column;
        }
        .nav-drawer .nav-title { padding: 0.5rem 1.5rem; font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
        .nav-drawer ul { list-style: none; padding: 0; margin: 0; }
        .nav-drawer a {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: var(--text-secondary);
          text-decoration: none; font-weight: 500; border-left: 3px solid transparent; transition: all 0.2s ease;
        }
        .nav-drawer a:hover { background-color: var(--bg-dark); color: var(--text-primary); }
        .nav-drawer a.active { border-left-color: var(--accent-blue); background-color: var(--bg-dark); color: var(--text-primary); }
        .nav-drawer svg { width: 20px; height: 20px; }
        
        .dashboard-content { 
          grid-area: content; 
          padding: 2rem; 
          overflow-y: auto;
        }
        
        .content-card { 
          background-color: var(--surface-dark); 
          border: 1px solid var(--border-dark);
          border-radius: 8px; 
          padding: 2rem; 
        }

        @media (max-width: 768px) {
          .dashboard-layout {
            grid-template-columns: 1fr; 
            grid-template-areas: "header" "content";
          }
          #mobile-menu-toggle { display: block; }
          .nav-drawer {
            position: fixed; top: 0; left: 0; bottom: 0; width: 250px;
            transform: translateX(-100%); transition: transform 0.3s ease-in-out; z-index: 1000;
          }
          .dashboard-layout.drawer-open .nav-drawer { transform: translateX(0); }
          .dashboard-layout.drawer-open::before {
             content: ''; position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); z-index: 999;
          }
        }
      </style>

      <div class="dashboard-layout">
        <nav class="nav-drawer">
          <div class="nav-title">SPECS</div>
          <ul>
            <li><a href="#" data-view="finance" class="active">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Finance</span>
            </a></li>
            <li><a href="#" data-view="files">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              <span>Files</span>
            </a></li>
            <li><a href="#" data-view="events">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Events</span>
            </a></li>
            <li><a href="#" data-view="settings">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>Settings</span>
            </a></li>
          </ul>
        </nav>
        <header class="dashboard-header">
          <button id="mobile-menu-toggle">☰</button>
          <h1>Dashboard</h1>
          <button id="logout-btn" title="Logout">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </header>
        <main id="dashboard-content" class="dashboard-content"></main>
      </div>
    `;

    // --- LOGIC AND EVENT HANDLING ---
    const contentEl = document.getElementById("dashboard-content");
    const navLinks = document.querySelectorAll(".nav-drawer a");
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const layoutEl = document.querySelector(".dashboard-layout");

    const renderContent = async (viewName) => {
      contentEl.innerHTML = `<div class="content-card"><p>Loading...</p></div>`;
      navLinks.forEach((link) => link.classList.remove("active"));
      const activeLink = document.querySelector(
        `.nav-drawer a[data-view="${viewName}"]`
      );
      if (activeLink) activeLink.classList.add("active");

      try {
        switch (viewName) {
          case "finance":
            await renderFinanceView(userLookup, user);
            break;
          case "files":
            const filesView = renderFilesView(initialFilesData, userLookup, user);
            contentEl.innerHTML = filesView.html;
            filesView.afterRender();
            break;
          case "events":
            // Pass the pre-fetched data to the render function
            const eventsView = renderEventsView(initialEventsData, user, userLookup);
            contentEl.innerHTML = eventsView.html;
            eventsView.afterRender();
            break;
          case "settings":
            const settingsView = renderSettingsView(user, profile);
            contentEl.innerHTML = settingsView.html;
            settingsView.afterRender();
            break;
          default:
            await renderFinanceView(userLookup, user);
        }
      } catch (error) {
          console.error(`Error rendering ${viewName} view:`, error);
          contentEl.innerHTML = `<div class="content-card"><h2>Error</h2><p>Could not load the ${viewName} page.</p></div>`;
      }
    };

    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        renderContent(view);
        layoutEl.classList.remove("drawer-open");
      });
    });

    mobileMenuToggle.addEventListener("click", () => {
      layoutEl.classList.toggle("drawer-open");
    });

    document
      .getElementById("logout-btn")
      .addEventListener("click", async () => {
        await account.deleteSession("current");
        window.location.hash = "login";
      });

    renderContent("finance");
  } catch (err) {
    console.error("Failed to render dashboard:", err);
    await account.deleteSession("current").catch(() => {});
    window.location.hash = "login";
  }
}