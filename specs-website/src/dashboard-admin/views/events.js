// views/renderAdmin/events.js
import { api } from '../../shared/api.js';
import { imageCache } from '../../shared/cache.js';
import { BUCKET_ID_EVENT_IMAGES } from '../../shared/constants.js';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import { logActivity } from './activity-logs.js';
import { Modal } from 'bootstrap';

// --- SVG Icon Imports ---
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import person from 'bootstrap-icons/icons/person.svg';
import calendarX from 'bootstrap-icons/icons/calendar-x.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import funnelFill from 'bootstrap-icons/icons/funnel-fill.svg';

// --- HTML TEMPLATE FUNCTIONS ---

function createTimelineItemHTML(eventDoc, userLookup) {
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    const imageUrl = imageCache.get(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file, 150, 100);
    const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

    const now = new Date();
    const isEnded = eventDoc.event_ended;
    const isPast = eventDate < now;
    let statusBadge;
    if (isEnded) {
        statusBadge = `<span class="badge bg-secondary-subtle text-secondary rounded-pill">Ended</span>`;
    } else if (isPast) {
        statusBadge = `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill">Past - Not Ended</span>`;
    } else {
        statusBadge = `<span class="badge bg-success-subtle text-success rounded-pill">Upcoming</span>`;
    }

    const markEndedBtn = (!isEnded) ? `
        <button class="btn btn-sm btn-outline-secondary mark-ended-btn rounded-pill px-2 py-1 d-flex align-items-center gap-1" data-doc-id="${eventDoc.$id}" title="Mark as Ended">
            <img src="${checkCircle}" style="width: 0.85em; opacity: 0.6;"> <span class="d-none d-md-inline small">End</span>
        </button>` : '';

    return `
        <li class="timeline-item animate-fade-in-up" data-event-ended="${isEnded}" data-event-past="${isPast}">
            <div class="timeline-icon ${isEnded ? 'bg-secondary' : 'bg-primary'} text-white d-flex justify-content-center align-items-center rounded-circle shadow-sm">
                <img src="${calendarEvent}" alt="Event" style="width: 1.25rem; height: 1.25rem; filter: invert(1);">
            </div>
            <div class="card shadow-sm border-0 hover-lift ${isEnded ? 'opacity-75' : ''}">
                <div class="card-body p-3">
                    <div class="d-flex flex-column flex-sm-row align-items-start">
                        <img src="${imageUrl}" alt="${eventDoc.event_name}" class="rounded me-3 mb-3 mb-sm-0 object-fit-cover shadow-sm" style="width: 100px; height: 75px; min-width: 100px;">
                        <div class="flex-grow-1 w-100">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <div class="d-flex align-items-center gap-2 min-w-0">
                                    <h5 class="card-title fw-bold mb-0 text-truncate" style="max-width: 200px;">${eventDoc.event_name}</h5>
                                    ${statusBadge}
                                </div>
                                <div class="d-flex gap-1 flex-shrink-0">
                                    ${markEndedBtn}
                                    <button class="btn btn-sm btn-outline-danger delete-event-btn rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}" title="Delete Event">
                                        ${trashIconHTML}
                                    </button>
                                </div>
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
                    <h1 class="display-6 fw-bold text-dark mb-1">Events Timeline</h1>
                    <p class="text-muted mb-0">Manage upcoming and past events</p>
                </div>
                <div class="d-flex gap-2">
                    <div class="btn-group btn-group-sm" id="eventFilterGroup">
                        <button class="btn btn-outline-secondary active" data-filter="all">
                            <img src="${funnelFill}" style="width: 0.85em; opacity: 0.5;" class="me-1">All
                        </button>
                        <button class="btn btn-outline-success" data-filter="upcoming">Upcoming</button>
                        <button class="btn btn-outline-secondary" data-filter="past">Past</button>
                    </div>
                    <button id="refreshEventsBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh events">
                        <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                        <span class="d-none d-sm-inline">Refresh</span>
                    </button>
                </div>
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

        <!-- Create Event FAB -->
        <button id="createEventFab" class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; z-index: 1050;" title="Create Event">
            <img src="${plusLg}" style="width: 1.5rem; filter: invert(1);">
        </button>

        <!-- Create Event Modal -->
        <div class="modal fade" id="createEventModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <form id="createEventForm">
                        <div class="modal-header border-0 pt-4 px-4">
                            <h5 class="modal-title fw-bold">Create New Event</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">EVENT NAME</label>
                                <input type="text" id="createEventName" class="form-control" required placeholder="e.g. General Assembly">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">DESCRIPTION</label>
                                <textarea id="createEventDesc" class="form-control" rows="3" placeholder="Brief description of the event..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">DATE & TIME</label>
                                <input type="datetime-local" id="createEventDate" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">EVENT IMAGE</label>
                                <input type="file" id="createEventImage" class="form-control" accept="image/*" required>
                                <div id="imagePreviewContainer" class="mt-2 d-none">
                                    <img id="imagePreview" class="rounded shadow-sm object-fit-cover" style="max-height: 120px;">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pb-4 px-4">
                            <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" id="createEventSubmitBtn" class="btn btn-primary rounded-pill px-4 fw-bold">Create Event</button>
                        </div>
                    </form>
                </div>
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
             .timeline-item.filtered-out { display: none; }
        </style>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachEventsListeners() {
    const timelineContainer = document.getElementById('events-timeline-container');
    const refreshBtn = document.getElementById('refreshEventsBtn');
    const createFab = document.getElementById('createEventFab');
    const createModalEl = document.getElementById('createEventModal');
    const createForm = document.getElementById('createEventForm');
    const filterGroup = document.getElementById('eventFilterGroup');
    let createModalInstance = null;
    let userLookup = {};
    let currentFilter = 'all';

    if (createModalEl) {
        createModalInstance = new Modal(createModalEl);
    }

    // Image preview handler
    const imageInput = document.getElementById('createEventImage');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const container = document.getElementById('imagePreviewContainer');
            const preview = document.getElementById('imagePreview');
            if (file) {
                preview.src = URL.createObjectURL(file);
                container.classList.remove('d-none');
            } else {
                container.classList.add('d-none');
            }
        });
    }

    /**
     * Apply filter to timeline items
     */
    const applyFilter = () => {
        const items = timelineContainer.querySelectorAll('.timeline-item');
        items.forEach(item => {
            const isEnded = item.dataset.eventEnded === 'true';
            const isPast = item.dataset.eventPast === 'true';

            if (currentFilter === 'all') {
                item.classList.remove('filtered-out');
            } else if (currentFilter === 'upcoming') {
                item.classList.toggle('filtered-out', isEnded || isPast);
            } else if (currentFilter === 'past') {
                item.classList.toggle('filtered-out', !isEnded && !isPast);
            }
        });

        // Show empty state if all filtered out
        const visible = timelineContainer.querySelectorAll('.timeline-item:not(.filtered-out)');
        const emptyMsg = timelineContainer.querySelector('.filter-empty-msg');
        if (visible.length === 0 && items.length > 0) {
            if (!emptyMsg) {
                const msg = document.createElement('div');
                msg.className = 'filter-empty-msg text-center text-muted py-4';
                msg.innerHTML = `<p class="mb-0 small">No ${currentFilter} events found.</p>`;
                timelineContainer.appendChild(msg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    };

    // Filter button handlers
    if (filterGroup) {
        filterGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-filter]');
            if (!btn) return;
            filterGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFilter();
        });
    }

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
            const usersResponse = await api.users.listStudents({ limit: 500 });
            userLookup = usersResponse.documents.reduce((map, user) => {
                const studentData = user.students || {};
                map[user.$id] = studentData.name || user.username;
                return map;
            }, {});

            const eventsResponse = await api.events.list({ limit: 100, orderDesc: true });

            if (eventsResponse.documents.length > 0) {
                timelineContainer.innerHTML = eventsResponse.documents.map(doc => createTimelineItemHTML(doc, userLookup)).join('');
                applyFilter();
            } else {
                timelineContainer.innerHTML = `
                    <div class="card border-0 shadow-sm text-center text-muted p-5">
                        <img src="${calendarX}" alt="No Events" class="mx-auto mb-3" style="width: 3rem; height: 3rem; opacity: 0.4;">
                        <h5 class="fw-bold">No Events Found</h5>
                        <p class="mb-0 small">Click the + button to create your first event.</p>
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

    // Create Event FAB
    if (createFab && createModalInstance) {
        createFab.addEventListener('click', () => createModalInstance.show());
    }

    // Create Event form submit
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('createEventSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Creating...`;

            try {
                const imageFile = document.getElementById('createEventImage').files[0];
                if (!imageFile) throw new Error('Please select an image.');

                // Upload image first
                const uploadedFile = await api.files.uploadEventImage(imageFile);

                // Create event document
                await api.events.create({
                    event_name: document.getElementById('createEventName').value.trim(),
                    description: document.getElementById('createEventDesc').value.trim(),
                    date_to_held: new Date(document.getElementById('createEventDate').value).toISOString(),
                    image_file: uploadedFile.$id,
                    event_ended: false
                });

                createModalInstance.hide();
                createForm.reset();
                document.getElementById('imagePreviewContainer').classList.add('d-none');
                toast.success('Event created successfully');
                logActivity('event_created', `Created event "${document.getElementById('createEventName').value.trim()}"`);

                // Clear cache and reload
                api.cache.clearAll();
                await loadEvents();
            } catch (error) {
                console.error('Failed to create event:', error);
                toast.error(error.message || 'Failed to create event. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Event';
            }
        });
    }

    // Timeline click handlers (delete + mark ended)
    timelineContainer.addEventListener('click', async (e) => {
        // Mark as Ended
        const markEndedBtn = e.target.closest('.mark-ended-btn');
        if (markEndedBtn) {
            const docId = markEndedBtn.dataset.docId;
            if (!await confirmAction('Mark Event as Ended', 'This will mark the event as ended. It will still be visible in the timeline.', 'Mark Ended', 'warning')) return;

            markEndedBtn.disabled = true;
            markEndedBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

            try {
                await api.events.markEnded(docId);
                api.cache.clearAll();
                toast.success('Event marked as ended');
                logActivity('event_deleted', `Marked event as ended`);
                await loadEvents();
            } catch (error) {
                console.error('Failed to mark event as ended:', error);
                toast.error('Could not update the event. Please try again.');
                markEndedBtn.disabled = false;
                markEndedBtn.innerHTML = `<img src="${checkCircle}" style="width: 0.85em; opacity: 0.6;"> <span class="d-none d-md-inline small">End</span>`;
            }
            return;
        }

        // Delete Event
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (!deleteBtn) return;

        if (!await confirmAction('Delete Event', 'This will permanently delete this event. This action cannot be undone.', 'Delete', 'danger')) return;

        const docId = deleteBtn.dataset.docId;
        const fileId = deleteBtn.dataset.fileId;
        const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        try {
            await api.events.delete(docId);
            await api.files.deleteEventImage(fileId);
            api.cache.clearAll();

            const item = deleteBtn.closest('.timeline-item');
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => item.remove(), 300);

            toast.success('Event deleted successfully');
            logActivity('event_deleted', 'Deleted an event');
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
