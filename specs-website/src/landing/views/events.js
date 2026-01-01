import { databases, Query } from '../../shared/appwrite.js';
import { 
    DATABASE_ID, 
    COLLECTION_ID_EVENTS, 
    BUCKET_ID_EVENT_IMAGES 
} from '../../shared/constants.js';
import { imageCache, dataCache, generateCacheKey } from '../../shared/cache.js';

import calendar from 'bootstrap-icons/icons/calendar2-week.svg';
import clockHistory from 'bootstrap-icons/icons/clock-history.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import imageAlt from 'bootstrap-icons/icons/image-alt.svg';

// Use centralized image cache
function getCachedImageUrl(fileId, width = 400, height = 250) {
    return imageCache.get(BUCKET_ID_EVENT_IMAGES, fileId, width, height, 'center', 80);
}

function createEventCardSkeletonHTML() {
    return `
        <div class="col">
            <div class="card h-100 shadow-sm" aria-hidden="true">
                <div class="bg-light" style="height: 200px;"></div>
                <div class="card-body">
                    <h5 class="card-title placeholder-glow"><span class="placeholder col-8"></span></h5>
                    <p class="card-text placeholder-glow"><span class="placeholder col-12"></span><span class="placeholder col-7"></span><span class="placeholder col-9"></span></p>
                    <div class="mt-auto small text-muted placeholder-glow"><span class="placeholder col-10"></span></div>
                </div>
            </div>
        </div>
    `;
}

function createGuestEventCard(eventDoc, isPastEvent = false) {
    const imageUrl = getCachedImageUrl(eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const collaboratorsHTML = (eventDoc.collab && eventDoc.collab.length > 0)
        ? `<div class="small text-muted mb-2 d-flex align-items-center"><img src="${peopleFill}" alt="Collaboration icon" class="me-1" style="width: 1.1em; height: 1.1em; filter: invert(50%);"><strong>In collaboration with:</strong>&nbsp;${eventDoc.collab.join(', ')}</div>` : '';

    return `
        <div class="col">
            <div class="card h-100 shadow-sm overflow-hidden card-hover-grow ${isPastEvent ? 'past-event-card' : ''}">
                <div class="event-image-placeholder bg-light" ${imageUrl ? `data-src="${imageUrl}"` : ''} data-alt="${eventDoc.event_name}"></div>
                <div class="card-body d-flex">
                    <div class="text-center border-end pe-3 me-3">
                        <div class="h5 ${isPastEvent ? 'text-muted' : 'text-primary'}">${eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div class="display-6 fw-bold ${isPastEvent ? 'text-muted' : ''}">${eventDate.getDate()}</div>
                    </div>
                    <div class="d-flex flex-column">
                        <h5 class="card-title fw-bold">${eventDoc.event_name}</h5>
                        <p class="card-text small text-body-secondary flex-grow-1">${eventDoc.description || 'More details coming soon.'}</p>
                        ${collaboratorsHTML}
                        <div class="mt-auto small text-muted d-flex align-items-center"><img src="${clock}" alt="Clock icon" class="me-1" style="width: 1em; height: 1em; filter: invert(50%);"> ${formattedDate} at ${formattedTime}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function fetchUpcomingEvents() {
    const container = document.getElementById('upcoming-events-grid-container');
    if (!container) return;
    container.innerHTML = Array(3).fill(createEventCardSkeletonHTML()).join('');

    try {
        const cacheKey = generateCacheKey('events_upcoming', { limit: 3 });
        const response = await dataCache.getOrFetch(
            cacheKey,
            async () => await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
                Query.equal('event_ended', false),
                Query.orderAsc('date_to_held'),
                Query.limit(3)
            ]),
            2 * 60 * 1000 // Cache for 2 minutes
        );
        
        if (response.documents.length > 0) {
            container.innerHTML = response.documents.map(doc => createGuestEventCard(doc, false)).join('');
        } else {
            container.innerHTML = `<div class="col-12 text-center text-muted py-5">
                <img src="${calendar}" alt="Calendar icon" style="width: 4rem; height: 4rem; opacity: 0.5;"/>
                <h4 class="fw-light mt-3">No Upcoming Events</h4>
                <p>New events will be posted here. Please check back soon!</p>
            </div>`;
        }
    } catch (error) {
        console.error("Failed to load upcoming events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load upcoming events. Please try refreshing the page.</div></div>';
    }
}

async function fetchPastEvents() {
    const container = document.getElementById('past-events-grid-container');
    if (!container) return;
    container.innerHTML = Array(3).fill(createEventCardSkeletonHTML()).join('');

    try {
        const cacheKey = generateCacheKey('events_past', { limit: 3 });
        const response = await dataCache.getOrFetch(
            cacheKey,
            async () => await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
                Query.equal('event_ended', true),
                Query.orderDesc('date_to_held'),
                Query.limit(3)
            ]),
            5 * 60 * 1000 // Cache for 5 minutes
        );
        
        container.innerHTML = (response.documents.length > 0)
            ? response.documents.map(doc => createGuestEventCard(doc, true)).join('')
            : `<div class="col-12 text-center text-muted py-5"><img src="${clockHistory}" alt="Past events icon" style="width: 4rem; height: 4rem; opacity: 0.5;"><h4 class="fw-light mt-3">No Past Events Yet</h4><p>Our event history will appear here once events conclude.</p></div>`;
    } catch (error) {
        console.error("Failed to load past events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load past events. Please try refreshing the page.</div></div>';
    }
}

function initializeImageLoader() {
    document.querySelectorAll('.event-image-placeholder').forEach(placeholder => {
        placeholder.style.height = '100%';
        placeholder.style.minHeight = '200px';
        const src = placeholder.dataset.src;
        const defaultIcon = `<div class="d-flex w-100 h-100 justify-content-center align-items-center bg-secondary-subtle"><img src="${imageAlt}" alt="Default image placeholder" style="width: 4rem; height: 4rem; opacity: 0.3;"></div>`;
        if (!src) {
            placeholder.innerHTML = defaultIcon;
            return;
        }
        const img = new Image();
        img.src = src;
        img.alt = placeholder.dataset.alt || 'Event image';
        img.className = 'w-100 h-100 object-fit-cover';
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease-in-out';
        img.onload = () => {
            placeholder.innerHTML = '';
            placeholder.appendChild(img);
            setTimeout(() => { img.style.opacity = '1'; }, 50);
        };
        img.onerror = () => { placeholder.innerHTML = defaultIcon; };
    });
}

export function renderEventsPage(container) {
    container.innerHTML = `
        <section id="events" class="py-5 pt-7">
            <div class="container">
                <h2 class="text-center fw-bold mb-3">Our Events</h2>
                <p class="text-center text-muted mb-5">Stay updated with our latest activities and workshops.</p>
                <h3 class="fw-bold mb-4">Upcoming Events</h3>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="upcoming-events-grid-container"></div>
                <hr class="my-5">
                <h3 class="fw-bold mb-4">Past Events</h3>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="past-events-grid-container"></div>
            </div>
        </section>
    `;

    Promise.all([fetchUpcomingEvents(), fetchPastEvents()]).then(() => {
        initializeImageLoader();
    });
    
    // Check if smooth scrolling function is imported or available in utils, 
    // if not we skip it or assume it's global.
    // setupSmoothScrolling(); // Removing as it's not defined in this scope
}
