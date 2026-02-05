// views/renderAdmin/events.js
import { api } from '../../shared/api.js';
import { imageCache } from '../../shared/cache.js';
import { BUCKET_ID_EVENT_IMAGES } from '../../shared/constants.js';
import toast from '../../shared/toast.js';

// --- SVG Icon Imports ---
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import person from 'bootstrap-icons/icons/person.svg';
import calendarX from 'bootstrap-icons/icons/calendar-x.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';

// --- HTML TEMPLATE FUNCTIONS ---

function createTimelineItemHTML(eventDoc, userLookup) {
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    // Use centralized image cache
    const imageUrl = imageCache.get(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file, 150, 100);
    const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

    return `
        <li class="timeline-item animate-fade-in-up">
            <div class="timeline-icon bg-primary text-white d-flex justify-content-center align-items-center rounded-circle shadow-sm">
                <img src="${calendarEvent}" alt="Event" style="width: 1.25rem; height: 1.25rem; filter: invert(1);">
            </div>
            <div class="card shadow-sm border-0 hover-lift">
                <div class="card-body p-3">
                    <div class="d-flex flex-column flex-sm-row align-items-start">
                        <img src="${imageUrl}" alt="${eventDoc.event_name}" class="rounded me-3 mb-3 mb-sm-0 object-fit-cover shadow-sm" style="width: 100px; height: 75px; min-width: 100px;">
                        <div class="flex-grow-1 w-100">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h5 class="card-title fw-bold mb-0 text-truncate" style="max-width: 200px;">${eventDoc.event_name}</h5>
                                <button class="btn btn-sm btn-outline-danger delete-event-btn rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}" title="Delete Event">
                                    ${trashIconHTML}
                                </button>
                            </div>
                            <div class="small text-muted mb-2 d-flex flex-wrap gap-2">
                                <span class="badge bg-light text-dark border"><img src="${clock}" class="me-1" style="width: 0.9em; filter: invert(0.5);">${formattedDate}</span>
                                <span class="badge bg-light text-dark border"><img src="${person}" class="me-1" style="width: 0.9em; filter: invert(0.5);">${creatorName}</span>
                            </div>
                            <p class="card-text small text-secondary mb-0 text-truncate-2">${eventDoc.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    `;
}

function getEventsHTML() {
    return `
        <div class="admin-events-container animate-fade-in-up">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold m-0 text-primary">Events Timeline</h2>
                    <p class="text-muted m-0 small">Manage upcoming and past events</p>
                </div>
                <button id="refreshEventsBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh events">
                    <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                    <span class="d-none d-sm-inline">Refresh</span>
                </button>
            </div>
            
            <div class="timeline-wrapper position-relative ps-4 py-2">
                 <div class="timeline-line position-absolute top-0 bottom-0 start-0 border-start border-2 border-primary-subtle ms-4" style="z-index: 0;"></div>
                 <ul class="timeline list-unstyled position-relative" id="events-timeline-container" style="z-index: 1;">
                    <div class="text-center p-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden"></span>
                        </div>
                    </div>
                </ul>
            </div>
        </div>
        <style>
             .text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
             .timeline-item { position: relative; padding-bottom: 2rem; padding-left: 2rem; }
             .timeline-icon { position: absolute; left: -1.25rem; top: 0; width: 2.5rem; height: 2.5rem; z-index: 2; border: 4px solid #fff; }
             .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
             .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1) !important; }
             .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
             @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
             #refreshEventsBtn.refreshing img { animation: spin 1s linear infinite; }
             @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        </style>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachEventsListeners() {
    const timelineContainer = document.getElementById('events-timeline-container');
    const refreshBtn = document.getElementById('refreshEventsBtn');
    let userLookup = {};

    /**
     * Load events with optional refresh
     */
    const loadEvents = async (isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        if (!isRefresh) {
            timelineContainer.innerHTML = `
                <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden"></span>
                    </div>
                </div>
            `;
        }

        try {
            // Use api wrapper with pagination - fetch students for user lookup
            const usersResponse = await api.users.listStudents({ limit: 500 });
            userLookup = usersResponse.documents.reduce((map, user) => {
                const studentData = user.students || {};
                map[user.$id] = studentData.name || user.username;
                return map;
            }, {});

            // Fetch events using the api wrapper
            const eventsResponse = await api.events.list({ limit: 100, orderDesc: true });

            if (eventsResponse.documents.length > 0) {
                timelineContainer.innerHTML = eventsResponse.documents.map(doc => createTimelineItemHTML(doc, userLookup)).join('');
            } else {
                timelineContainer.innerHTML = `
                    <div class="card border-0 shadow-sm text-center text-muted p-5">
                        <img src="${calendarX}" alt="No Events" class="mx-auto mb-3" style="width: 3rem; height: 3rem; opacity: 0.4;">
                        <h5 class="fw-bold">No Events Found</h5>
                        <p class="mb-0 small">Events created by you or other admins will appear here.</p>
                    </div>`;
            }

            if (isRefresh) {
                toast.success('Events refreshed successfully');
            }
        } catch (error) {
            console.error("Failed to fetch events for timeline:", error);
            timelineContainer.innerHTML = `
                <div class="alert alert-danger shadow-sm border-0 d-flex align-items-center justify-content-between">
                    <span>Could not load event timeline. Please try again later.</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Retry</button>
                </div>`;
            toast.error('Failed to load events');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    // Initial load
    await loadEvents();

    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadEvents(true));
    }

    timelineContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (!deleteBtn) return;

        if (!confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) return;

        const docId = deleteBtn.dataset.docId;
        const fileId = deleteBtn.dataset.fileId;
        const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        try {
            // Use api wrapper for delete operations
            await api.events.delete(docId);
            await api.files.deleteEventImage(fileId);
            
            // Animate removal
            const item = deleteBtn.closest('.timeline-item');
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => item.remove(), 300);
            
            toast.success('Event deleted successfully');

        } catch (error) {
            console.error('Failed to delete event:', error);
            toast.error('Could not delete the event. Please try again.');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = trashIconHTML;
        }
    });
}

// --- Main export ---
export default function renderEventsTimelineView() {
    return {
        html: getEventsHTML(),
        afterRender: attachEventsListeners
    };
}
