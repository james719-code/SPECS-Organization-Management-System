// --- IMPORTS ---
import { databases, storage } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

// --- SVG ICON IMPORTS ---
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import pencilSquare from 'bootstrap-icons/icons/pencil-square.svg';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import person from 'bootstrap-icons/icons/person.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import plusCircle from 'bootstrap-icons/icons/plus-circle.svg';
import calendarX from 'bootstrap-icons/icons/calendar-x.svg';
import calendar2Plus from 'bootstrap-icons/icons/calendar2-plus.svg';
import search from 'bootstrap-icons/icons/search.svg';
import xLg from 'bootstrap-icons/icons/x-lg.svg';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;

function createEventCard(eventDoc, userLookup, currentUserId) {
    const imageUrl = storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file, 400, 250);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const canManage = eventDoc.added_by === currentUserId;
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';
    const isEnded = eventDoc.event_ended === true;

    // SVG icon styles
    const iconStyle = "width: 1.1em; height: 1.1em; opacity: 0.7;";
    const btnIconStyleSecondary = "width: 1em; height: 1em; filter: invert(39%) sepia(11%) saturate(306%) hue-rotate(174deg) brightness(95%) contrast(91%);";
    const btnIconStyleSuccess = "width: 1em; height: 1em; filter: invert(54%) sepia(55%) saturate(511%) hue-rotate(85deg) brightness(96%) contrast(88%);";
    const btnIconStyleDanger = "width: 1em; height: 1em; filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);";

    const collaboratorsHTML = (eventDoc.collab && eventDoc.collab.length > 0)
        ? `<div class="small text-muted mb-2 mt-2 d-flex align-items-center gap-1"><img src="${peopleFill}" alt="Collaborators" style="${iconStyle}"> <strong>Collaborators:</strong> ${eventDoc.collab.join(', ')}</div>` : '';

    const actionButtons = canManage ? `
        <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary edit-event-btn" data-doc-id="${eventDoc.$id}" title="Edit this event"><img src="${pencilSquare}" alt="Edit" style="${btnIconStyleSecondary}"></button>
            ${!isEnded ? `<button class="btn btn-sm btn-outline-success mark-ended-btn" data-doc-id="${eventDoc.$id}" title="Mark as ended"><img src="${checkCircle}" alt="Mark as ended" style="${btnIconStyleSuccess}"></button>` : ''}
            <button class="btn btn-sm btn-outline-danger delete-event-btn" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}" title="Delete this event"><img src="${trash}" alt="Delete" style="${btnIconStyleDanger}"></button>
        </div>` : '';

    return `
        <div class="col"><div class="card h-100 ${isEnded ? 'opacity-75' : ''}">
            <img src="${imageUrl}" class="card-img-top" alt="${eventDoc.event_name}" style="height: 200px; object-fit: cover;">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">${eventDoc.event_name}</h5>
                <div class="card-subtitle mb-2 text-body-secondary small d-flex align-items-center gap-1"><img src="${calendar3}" alt="Date" style="${iconStyle}"> ${formattedDate}</div>
                ${collaboratorsHTML}
                <p class="card-text flex-grow-1 small">${eventDoc.description || 'No description provided.'}</p>
                <div class="d-flex justify-content-between align-items-center mt-auto pt-2">
                    <small class="text-body-secondary d-flex align-items-center gap-1"><img src="${person}" alt="Creator" style="${iconStyle}"> ${creatorName}</small>
                    ${actionButtons}
                </div>
            </div>
        </div></div>`;
}

function getEventsHTML() {
    return `
    <div class="events-view-container d-flex flex-column" style="min-height: calc(100vh - 120px);">
        <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4">
            <h1 class="mb-3 mb-md-0">Events Management</h1>
            <input type="search" id="eventSearchInput" class="form-control" style="max-width: 400px;" placeholder="Search all events...">
        </div>
        
        <div id="events-list-wrapper" class="flex-grow-1 d-flex flex-column">
            <div class="flex-grow-1 d-flex align-items-center justify-content-center">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading events...</span>
                </div>
            </div>
        </div>
        
        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addEventModal" title="Add New Event">
            <img src="${plusLg}" alt="Add Event" style="width: 1.5rem; height: 1.5rem; filter: invert(1);">
        </button>

        <div class="modal fade" id="addEventModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="addEventForm">
            <div class="modal-header"><h5 class="modal-title">Add a New Event</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label for="eventName" class="form-label">Event Name</label><input type="text" id="eventName" class="form-control" required></div>
                <div class="mb-3"><label for="eventDate" class="form-label">Date & Time</label><input type="datetime-local" id="eventDate" class="form-control" required></div>
                <div class="mb-3"><label for="eventImage" class="form-label">Event Image</label><input type="file" id="eventImage" class="form-control" accept="image/*" required></div>
                <div class="mb-3"><label for="eventDescription" class="form-label">Description</label><textarea id="eventDescription" class="form-control" rows="3"></textarea></div>
                <div class="mb-3"><label class="form-label">Collaborators</label><div id="collaborators-list"></div><button type="button" id="add-collaborator-btn" class="btn btn-sm btn-outline-secondary mt-2 d-flex align-items-center gap-1"><img src="${plusCircle}" alt="Add" style="width:1.1em; height:1.1em; filter: invert(39%) sepia(11%) saturate(306%) hue-rotate(174deg) brightness(95%) contrast(91%);"> Add Collaborator</button></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Create Event</button></div>
        </form></div></div></div>

        <div class="modal fade" id="editEventModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="editEventForm">
            <div class="modal-header"><h5 class="modal-title">Edit Event</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" id="editEventId">
                <input type="hidden" id="editEventFileId">
                <div class="mb-3"><label for="editEventName" class="form-label">Event Name</label><input type="text" id="editEventName" class="form-control" required></div>
                <div class="mb-3"><label for="editEventDate" class="form-label">Date & Time</label><input type="datetime-local" id="editEventDate" class="form-control" required></div>
                <div class="mb-3"><label for="editEventImage" class="form-label">New Event Image (Optional)</label><input type="file" id="editEventImage" class="form-control" accept="image/*"></div>
                <div class="mb-3"><label for="editEventDescription" class="form-label">Description</label><textarea id="editEventDescription" class="form-control" rows="3"></textarea></div>
                <div class="mb-3"><label class="form-label">Collaborators</label><div id="edit-collaborators-list"></div><button type="button" id="edit-add-collaborator-btn" class="btn btn-sm btn-outline-secondary mt-2 d-flex align-items-center gap-1"><img src="${plusCircle}" alt="Add" style="width:1.1em; height:1.1em; filter: invert(39%) sepia(11%) saturate(306%) hue-rotate(174deg) brightness(95%) contrast(91%);"> Add Collaborator</button></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
        </form></div></div></div>
    </div>`;
}

// --- RENDER HELPERS ---
function renderEventsToContainer(events, container, userLookup, currentUserId) {
    if (events.length > 0) {
        container.innerHTML = events.map(doc => createEventCard(doc, userLookup, currentUserId)).join('');
    } else {
        const message = container.id.includes('upcoming') ? 'No upcoming events found.' : 'No ended events found.';
        container.innerHTML = `<div class="col-12"><div class="text-center text-muted p-4"><img src="${calendarX}" alt="No events" style="width: 2.5rem; height: 2.5rem; opacity: 0.6;"><p class="mt-2 mb-0">${message}</p></div></div>`;
    }
}

function renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId) {
    wrapper.innerHTML = `
        <h2 class="h4">Upcoming Events</h2><hr>
        <div id="upcoming-events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 mb-5"></div>
        <h2 class="h4">Ended Events</h2><hr>
        <div id="ended-events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4"></div>
    `;
    renderEventsToContainer(upcoming, document.getElementById('upcoming-events-container'), userLookup, currentUserId);
    renderEventsToContainer(ended, document.getElementById('ended-events-container'), userLookup, currentUserId);
}

function renderEmptyState(wrapper, type, searchTerm = '') {
    let icon, title, text;
    if (type === 'initial') {
        icon = calendar2Plus;
        title = 'No Events Yet';
        text = `Click the <span class="btn btn-sm btn-primary pe-none rounded-circle d-inline-flex align-items-center justify-content-center" style="width:1.5rem; height:1.5rem;"><img src="${plusLg}" alt="Add" style="width:0.8rem; height:0.8rem; filter: invert(1);"></span> button to create the first event.`;
    } else { // 'search'
        icon = search;
        title = 'No Events Found';
        text = `Your search for "<strong>${searchTerm}</strong>" did not match any events.`;
    }
    wrapper.innerHTML = `
        <div class="flex-grow-1 d-flex align-items-center justify-content-center text-center text-muted">
            <div>
                <img src="${icon}" alt="${title}" style="width: 5rem; height: 5rem; opacity: 0.5;">
                <h4 class="fw-light mt-3">${title}</h4>
                <p>${text}</p>
            </div>
        </div>`;
}

// --- EVENT LISTENERS ---
function attachEventListeners(currentUser, userLookup) {
    const currentUserId = currentUser.$id;
    const addEventModal = new Modal(document.getElementById('addEventModal'));
    const editEventModal = new Modal(document.getElementById('editEventModal'));
    const eventsViewContainer = document.querySelector('.events-view-container');
    const searchInput = document.getElementById('eventSearchInput');
    const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this,a), delay); }; };

    let allEventsCache = [];

    const loadAllEvents = async () => {
        const wrapper = document.getElementById('events-list-wrapper');
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.limit(5000), Query.orderDesc('date_to_held')]);
            allEventsCache = response.documents;

            if (allEventsCache.length === 0) {
                renderEmptyState(wrapper, 'initial');
            } else {
                const upcoming = allEventsCache.filter(e => !e.event_ended);
                const ended = allEventsCache.filter(e => e.event_ended);
                renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
            wrapper.innerHTML = `<div class="alert alert-danger">Failed to load events.</div>`;
        }
    };
    loadAllEvents();

    // --- FORM SUBMISSION LISTENERS ---
    document.getElementById('addEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const imageFile = document.getElementById('eventImage').files[0];
        const collaborators = Array.from(document.querySelectorAll('#collaborators-list .collaborator-input')).map(i => i.value.trim()).filter(Boolean);

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating...`;
        try {
            const uploadedImage = await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), imageFile);
            const data = {
                event_name: document.getElementById('eventName').value,
                date_to_held: document.getElementById('eventDate').value,
                description: document.getElementById('eventDescription').value,
                image_file: uploadedImage.$id,
                added_by: currentUserId,
                collab: collaborators,
                event_ended: false
            };
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), data);
            addEventModal.hide();
            e.target.reset();
            document.getElementById('collaborators-list').innerHTML = '';
            await loadAllEvents();
        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event. Please check the console for details.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Event';
        }
    });

    document.getElementById('editEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const docId = document.getElementById('editEventId').value;
        const currentFileId = document.getElementById('editEventFileId').value;
        const newImageFile = document.getElementById('editEventImage').files[0];
        const collaborators = Array.from(document.querySelectorAll('#edit-collaborators-list .collaborator-input')).map(i => i.value.trim()).filter(Boolean);

        let updatedData = {
            event_name: document.getElementById('editEventName').value,
            date_to_held: document.getElementById('editEventDate').value,
            description: document.getElementById('editEventDescription').value,
            collab: collaborators,
        };

        submitBtn.disabled = true; submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;
        try {
            if (newImageFile) {
                const uploadedImage = await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), newImageFile);
                updatedData.image_file = uploadedImage.$id;
                await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, currentFileId);
            }
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, docId, updatedData);
            editEventModal.hide();
            loadAllEvents();
        } catch (error) {
            console.error('Failed to update event:', error); alert('Failed to update event.');
        } finally {
            submitBtn.disabled = false; submitBtn.textContent = 'Save Changes';
        }
    });

    eventsViewContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-event-btn');
        const markEndedBtn = e.target.closest('.mark-ended-btn');
        const deleteBtn = e.target.closest('.delete-event-btn');
        const addCollabBtn = e.target.closest('#add-collaborator-btn, #edit-add-collaborator-btn');
        const removeCollabBtn = e.target.closest('.remove-collaborator-btn');

        if (addCollabBtn) {
            const list = addCollabBtn.previousElementSibling;
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group mb-2';
            inputGroup.innerHTML = `<input type="text" class="form-control collaborator-input" placeholder="Name of collaborator"><button class="btn btn-outline-danger remove-collaborator-btn" type="button"><img src="${xLg}" alt="Remove" style="width:0.8em; height:0.8em; filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);"></button>`;
            list.appendChild(inputGroup);
        }

        if (removeCollabBtn) {
            removeCollabBtn.closest('.input-group').remove();
        }

        if (editBtn) {
            const docId = editBtn.dataset.docId;
            const eventData = allEventsCache.find(event => event.$id === docId);
            if (!eventData) return;

            document.getElementById('editEventId').value = docId;
            document.getElementById('editEventFileId').value = eventData.image_file;
            document.getElementById('editEventName').value = eventData.event_name;
            document.getElementById('editEventDate').value = new Date(eventData.date_to_held).toISOString().slice(0, 16);
            document.getElementById('editEventDescription').value = eventData.description || '';
            document.getElementById('editEventImage').value = '';

            const editCollabList = document.getElementById('edit-collaborators-list');
            editCollabList.innerHTML = '';
            (eventData.collab || []).forEach(name => {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group mb-2';
                inputGroup.innerHTML = `<input type="text" class="form-control collaborator-input" value="${name}"><button class="btn btn-outline-danger remove-collaborator-btn" type="button"><img src="${xLg}" alt="Remove" style="width:0.8em; height:0.8em; filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);"></button>`;
                editCollabList.appendChild(inputGroup);
            });
            editEventModal.show();
        }

        if (markEndedBtn) {
            if (!confirm('Are you sure you want to mark this event as ended?')) return;
            markEndedBtn.disabled = true;
            markEndedBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, markEndedBtn.dataset.docId, { event_ended: true });
                loadAllEvents();
            } catch (error) {
                console.error('Failed to mark event as ended:', error);
                alert('Could not update the event.');
                markEndedBtn.disabled = false;
                markEndedBtn.innerHTML = `<img src="${checkCircle}" alt="Mark as ended" style="width: 1em; height: 1em; filter: invert(54%) sepia(55%) saturate(511%) hue-rotate(85deg) brightness(96%) contrast(88%);">`;
            }
        }

        if (deleteBtn) {
            if (!confirm('Are you sure you want to permanently delete this event? This cannot be undone.')) return;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, deleteBtn.dataset.docId);
                await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, deleteBtn.dataset.fileId);
                loadAllEvents();
            } catch (error) {
                console.error('Failed to delete event:', error);
                alert('Could not delete the event.');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);">`;
            }
        }
    });

    // --- Search Logic ---
    const performSearch = (searchTerm) => {
        const wrapper = document.getElementById('events-list-wrapper');
        if (!searchTerm) {
            loadAllEvents();
            return;
        }

        const filtered = allEventsCache.filter(e =>
            e.event_name.toLowerCase().includes(searchTerm) ||
            (e.description && e.description.toLowerCase().includes(searchTerm)) ||
            (e.collab && e.collab.some(c => c.toLowerCase().includes(searchTerm)))
        );

        if (filtered.length === 0) {
            renderEmptyState(wrapper, 'search', searchTerm);
        } else {
            const upcoming = filtered.filter(e => !e.event_ended);
            const ended = filtered.filter(e => e.event_ended);
            renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId);
        }
    };
    searchInput.addEventListener('input', debounce((e) => performSearch(e.target.value.toLowerCase().trim()), 300));
}

// --- Main export ---
export default function renderEventsView(initialEvents, user, userLookup) {
    return {
        html: getEventsHTML(),
        afterRender: () => attachEventListeners(user, userLookup)
    };
}