// views/renderAdmin/events.js
import { databases, storage } from '../../appwrite.js';
import { Query } from 'appwrite';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;

// --- HTML TEMPLATE FUNCTIONS ---

/**
 * Creates the HTML for a single item in the timeline.
 */
function createTimelineItemHTML(eventDoc, userLookup) {
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    const imageUrl = storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file, 150, 100);

    return `
        <li class="timeline-item">
            <div class="timeline-icon">
                <i class="bi-calendar-event"></i>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <img src="${imageUrl}" alt="${eventDoc.event_name}" class="rounded me-3" style="width: 150px; height: 100px; object-fit: cover;">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-1">${eventDoc.event_name}</h5>
                                <button class="btn btn-sm btn-outline-danger delete-event-btn" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}" title="Delete Event">
                                    <i class="bi-trash"></i>
                                </button>
                            </div>
                            <div class="small text-muted mb-2">
                                <i class="bi-clock me-1"></i> ${formattedDate} | <i class="bi-person mx-1"></i> Added by: <strong>${creatorName}</strong>
                            </div>
                            <p class="card-text small">${eventDoc.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    `;
}

/**
 * Renders the main shell for the timeline view.
 */
function getEventsHTML() {
    return `
        <div class="admin-events-container">
            <h2 class="mb-4">Events & Activities Timeline</h2>
            
            <ul class="timeline" id="events-timeline-container">
                <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading events...</span>
                    </div>
                </div>
            </ul>
        </div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachEventsListeners() {
    const timelineContainer = document.getElementById('events-timeline-container');

    try {
        const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]);
        const userLookup = usersResponse.documents.reduce((map, user) => {
            map[user.$id] = user.fullname || user.username;
            return map;
        }, {});

        const eventsResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
            Query.orderDesc('date_to_held'),
            Query.limit(100) // Limit to the latest 100 events for performance
        ]);

        if (eventsResponse.documents.length > 0) {
            timelineContainer.innerHTML = eventsResponse.documents.map(doc => createTimelineItemHTML(doc, userLookup)).join('');
        } else {
            timelineContainer.innerHTML = `
                <div class="card card-body text-center text-muted">
                    <i class="bi-calendar-x fs-1"></i>
                    <p class="mt-3 mb-0">No events found in the database.</p>
                </div>`;
        }
    } catch (error) {
        console.error("Failed to fetch events for timeline:", error);
        timelineContainer.innerHTML = `<div class="alert alert-danger">Could not load event timeline. ${error.message}</div>`;
    }

    timelineContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (!deleteBtn) return;

        if (!confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) return;

        const docId = deleteBtn.dataset.docId;
        const fileId = deleteBtn.dataset.fileId;

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, docId);
            await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
            deleteBtn.closest('.timeline-item').remove();
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('Could not delete the event.');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `<i class="bi-trash"></i>`;
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