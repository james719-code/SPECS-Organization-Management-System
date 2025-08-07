// views/renderAdmin/events.js
import { databases, storage } from '../../shared/appwrite.js';
import { Query } from 'appwrite';

// --- SVG Icon Imports ---
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import person from 'bootstrap-icons/icons/person.svg';
import calendarX from 'bootstrap-icons/icons/calendar-x.svg';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;

// --- HTML TEMPLATE FUNCTIONS ---

function createTimelineItemHTML(eventDoc, userLookup) {
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    const imageUrl = storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file, 150, 100);
    const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

    return `
        <li class="timeline-item">
            <div class="timeline-icon">
                <img src="${calendarEvent}" alt="Event" style="width: 1.5rem; height: 1.5rem; filter: invert(1);">
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <img src="${imageUrl}" alt="${eventDoc.event_name}" class="rounded me-3" style="width: 150px; height: 100px; object-fit: cover;">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-1">${eventDoc.event_name}</h5>
                                <button class="btn btn-sm btn-outline-danger delete-event-btn" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}" title="Delete Event">
                                    ${trashIconHTML}
                                </button>
                            </div>
                            <div class="small text-muted mb-2">
                                <img src="${clock}" alt="Time" class="me-1" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;"> ${formattedDate} | <img src="${person}" alt="User" class="mx-1" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;"> Added by: <strong>${creatorName}</strong>
                            </div>
                            <p class="card-text small">${eventDoc.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    `;
}

function getEventsHTML() {
    return `
        <div class="admin-events-container">
            <h2 class="mb-4">Events & Activities Timeline</h2>
            
            <ul class="timeline" id="events-timeline-container">
                <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden"></span>
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
                    <img src="${calendarX}" alt="No Events" class="mx-auto" style="width: 3rem; height: 3rem; opacity: 0.6;">
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
        const trashIconHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; pointer-events: none;">`;

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
            deleteBtn.innerHTML = trashIconHTML; // Reset to SVG icon on failure
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