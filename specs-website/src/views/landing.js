// renderpages/landing.js
import { databases, storage } from '../appwrite.js';
import { Query } from 'appwrite';

// --- CONFIGURATION ---
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const IMAGE_CACHE_KEY = 'eventImageCache';

// --- CACHING & IMAGE PREVIEW FUNCTION ---
function getCachedImageUrl(fileId) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY)) || {};
        if (cache[fileId]) {
            return cache[fileId];
        }

        const newUrl = storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, fileId, 400, 0, 'center', 75);
        cache[fileId] = newUrl; // Store the URL string
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
        return newUrl;
    } catch (error) {
        console.warn("Could not access or write to image cache.", error);
        return storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, fileId, 400, 0, 'center', 75);
    }
}


// --- HTML TEMPLATE FUNCTIONS ---
function createGuestEventCard(eventDoc) {
    const imageUrl = getCachedImageUrl(eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `
        <div class="guest-event-card">
            <div class="guest-event-image-wrapper">
                <div class="image-placeholder" data-src="${imageUrl}" data-alt="${eventDoc.event_name}"></div>
            </div>
            <div class="guest-event-content">
                <div class="guest-event-date">
                    <span class="month">${eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span class="day">${eventDate.getDate()}</span>
                </div>
                <div class="guest-event-details">
                    <h3 class="guest-event-name">${eventDoc.event_name}</h3>
                    <p class="guest-event-time">${formattedDate} at ${formattedTime}</p>
                    <p class="guest-event-description">${eventDoc.description || 'More details coming soon.'}</p>
                </div>
            </div>
        </div>
    `;
}

// --- Renders an initial loading state ---
function getLandingHTML() {
    return `
    <style>
      :root {
          --bg-dark: #111827;
          --surface-dark: #1F2937;
          --border-dark: #374151;
          --text-primary: #F9FAFB;
          --text-secondary: #9CA3AF;
          --accent-blue: #3B82F6;
          --accent-blue-hover: #2563EB;
      }
      .landing-page, .landing-page * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
      .landing-page { color: var(--text-primary); text-align: center; overflow-x: hidden; }
      
      /* --- Header --- */
      .landing-header {
        position: fixed; top: 0; left: 0; width: 100%;
        display: flex; justify-content: space-between; align-items: center;
        padding: 1rem 2rem; z-index: 100;
        background: rgba(17, 24, 39, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border-dark);
      }
      .header-logo { font-size: 1.5rem; font-weight: 700; }
      .header-nav a {
        font-size: 1rem; font-weight: 500; padding: 0.5rem 1.5rem;
        border-radius: 50px; text-decoration: none; color: var(--text-primary);
        background-color: var(--accent-blue); transition: all 0.2s ease;
      }
      .header-nav a:hover { background-color: var(--accent-blue-hover); }

      /* --- Hero Section --- */
      .hero-section {
        display: flex; align-items: center; justify-content: center;
        min-height: 100vh; padding: 2rem;
      }
      .hero-content h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; }
      .hero-content .subtitle { font-size: 1.5rem; margin-bottom: 1rem; color: var(--text-secondary); font-style: italic; }
      .hero-content p { font-size: 1.25rem; margin-bottom: 2.5rem; max-width: 600px; margin-left: auto; margin-right: auto; }
      #start-btn { font-size: 1.1rem; font-weight: bold; padding: 0.8rem 2.5rem; border: 1px solid var(--accent-blue); border-radius: 50px; color: var(--text-primary); background-color: transparent; cursor: pointer; transition: all 0.3s ease; }
      #start-btn:hover { background-color: var(--accent-blue); }

      /* --- Events Section --- */
      .events-section { background-color: var(--surface-dark); padding: 5rem 2rem; }
      .events-section h2 { font-size: 2.5rem; font-weight: 700; margin-bottom: 3rem; }
      .events-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        text-align: left;
      }
      .guest-event-card {
        background-color: var(--bg-dark);
        border-radius: 12px;
        border: 1px solid var(--border-dark);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .guest-event-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      
      .guest-event-image-wrapper {
        width: 100%;
        height: 200px;
        background-color: var(--border-dark);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .guest-event-image-wrapper .fallback-icon {
          width: 64px;
          height: 64px;
          color: var(--text-secondary);
      }
      .guest-event-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.4s ease-in-out;
      }
      .guest-event-image.loaded {
        opacity: 1;
      }

      .guest-event-content { display: flex; padding: 1.5rem; gap: 1.5rem; }
      .guest-event-date { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--accent-blue); font-weight: 700; text-align: center; }
      .guest-event-date .month { font-size: 1rem; }
      .guest-event-date .day { font-size: 2.5rem; line-height: 1; }
      .guest-event-details { display: flex; flex-direction: column; }
      .guest-event-name { font-size: 1.5rem; margin: 0 0 0.5rem 0; color: var(--text-primary); }
      .guest-event-time { font-size: 1rem; color: var(--text-secondary); margin: 0 0 1rem 0; }
      .guest-event-description { font-size: 1rem; color: var(--text-secondary); line-height: 1.6; }
      .no-events-message { font-size: 1.2rem; color: var(--text-secondary); }

      /* --- Footer Section --- */
      .landing-footer { background-color: var(--bg-dark); padding: 4rem 2rem; border-top: 1px solid var(--border-dark); }
      .landing-footer h3 { font-size: 1.5rem; margin-bottom: 1rem; }
      .landing-footer p { font-size: 1rem; color: var(--text-secondary); max-width: 500px; margin: 0 auto 2rem auto; }
      
      @media (max-width: 768px) {
        .header-logo { font-size: 1.2rem; }
        .header-nav a { padding: 0.4rem 1rem; font-size: 0.9rem; }
        .hero-content h1 { font-size: 2.5rem; }
        .hero-content .subtitle { font-size: 1.2rem; }
        .events-grid { grid-template-columns: 1fr; }
      }
    </style>
    <div class="landing-page">
      <header class="landing-header">
        <div class="header-logo">SPECS</div>
        <nav class="header-nav"><a href="#login">Login / Sign Up</a></nav>
      </header>
      <main>
        <section class="hero-section">
          <div class="hero-content">
            <h1>Society of Programmers and Enthusiasts in Computer Science</h1>
            <p class="subtitle">(SPECS)</p>
            <p>A page for Computer Science students for updates on events within the SPECS Organization.</p>
            <button id="start-btn">View Upcoming Events</button>
          </div>
        </section>
        <section id="events" class="events-section">
            <h2>Upcoming Events</h2>
            <div class="events-grid" id="events-grid-container">
                <!-- NEW: Initial loading message -->
                <p class="no-events-message">Loading upcoming events...</p>
            </div>
        </section>
        <footer class="landing-footer">
            <h3>Contact Us</h3>
            <p>For inquiries, partnerships, or more information about SPECS, feel free to reach out.</p>
            <div class="contact-info">
                <p><strong>Email:</strong> (To be updated)</p>
                <p><strong>Social Media:</strong> (To be updated)</p>
            </div>
        </footer>
      </main>
    </div>
  `;
}

// --- Handles loading images ---
function initializeImageLoader() {
    const placeholders = document.querySelectorAll('.image-placeholder');
    const fallbackIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" class="fallback-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    `;
    placeholders.forEach(placeholder => {
        const src = placeholder.dataset.src;
        if (!src) return;
        const img = new Image();
        img.src = src;
        img.alt = placeholder.dataset.alt || 'Event image';
        img.className = 'guest-event-image';
        img.onload = () => {
            placeholder.innerHTML = '';
            placeholder.appendChild(img);
            setTimeout(() => { img.classList.add('loaded'); }, 10);
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            placeholder.innerHTML = fallbackIconSVG;
        };
    });
}

// --- Asynchronous function to fetch and render events ---
async function fetchAndRenderEvents() {
    const container = document.getElementById('events-grid-container');
    try {
        const eventsResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
            Query.orderAsc('date_to_held'),
            Query.greaterThan('date_to_held', new Date().toISOString())
        ]);
        
        const upcomingEvents = eventsResponse.documents.slice(0, 3);

        if (upcomingEvents.length > 0) {
            container.innerHTML = upcomingEvents.map(createGuestEventCard).join('');
        } else {
            container.innerHTML = '<p class="no-events-message">No upcoming events scheduled at the moment. Please check back soon!</p>';
        }

        // We must re-run the image loader for the newly added cards.
        initializeImageLoader();

    } catch (error) {
        console.error("Failed to load events for landing page:", error);
        container.innerHTML = '<p class="no-events-message">Could not load events. Please try refreshing the page.</p>';
    }
}

// --- Main render function ---
export default function renderLanding() {
  // Render the static HTML shell of the page immediately.
  document.getElementById("app").innerHTML = getLandingHTML();

  // Attach event listeners for existing elements.
  document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("events").scrollIntoView({ behavior: "smooth" });
  });

  // Kick off the asynchronous fetch for the events.
  fetchAndRenderEvents();
}