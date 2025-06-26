// renderpages/events.js
import { databases, storage } from '../../appwrite.js';
import { Query, ID } from 'appwrite';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;

/**
 * Creates the HTML for a single event card.
 */
function createEventCard(eventDoc, userLookup, currentUserId) {
    const imageUrl = storage.getFileView(BUCKET_ID_EVENT_IMAGES, eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    const canDelete = eventDoc.added_by === currentUserId;
    const creatorName = userLookup[eventDoc.added_by] || 'Unknown';

    // This function's returned HTML is correct for a grid card
    return `
        <div class="event-card">
            <img src="${imageUrl}" alt="${eventDoc.event_name}" class="event-image">
            <div class="event-content">
                <h3 class="event-name">${eventDoc.event_name}</h3>
                <div class="event-meta">
                    <span class="event-date">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ${formattedDate}
                    </span>
                    <span class="event-creator">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        Added by: ${creatorName}
                    </span>
                </div>
                <p class="event-description">${eventDoc.description || 'No description provided.'}</p>
                ${canDelete ? `<button class="btn danger-btn delete-event-btn" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}">Delete Event</button>` : ''}
            </div>
        </div>
    `;
}

/**
 * Returns the main HTML structure for the Events view.
 */
function getEventsHTML(eventList, userLookup, currentUserId) {
    return `
    <style>
        /* --- EVENT VIEW STYLES  --- */
        .events-view-container h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; }
        
        #event-cards-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
        }

        .event-card {
            background-color: var(--surface-dark);
            border: 1px solid var(--border-dark);
            border-radius: 8px;
            overflow: hidden;
            transition: box-shadow 0.2s, transform 0.2s;
            display: flex;
            flex-direction: column; /* Stacks image on top of content */
        }
        .event-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .event-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .event-content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            flex-grow: 1; /* Allows content to fill the card */
        }
        .event-name { margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-primary); }
        .event-meta { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; }
        .event-meta span { display: flex; align-items: center; gap: 0.5rem; }
        .event-meta svg { width: 16px; height: 16px; }
        .event-description { flex-grow: 1; color: var(--text-secondary); }
        .delete-event-btn { align-self: flex-end; margin-top: 1rem; }
        
        /* --- SHARED STYLES (for forms, buttons, etc.) --- */
        .form-group { display: flex; flex-direction: column; margin-bottom: 1rem; }
        .form-group label { color: var(--text-secondary); font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input, .form-group textarea { background-color: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border-dark); padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
        .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
        .primary-btn { background-color: var(--accent-blue); color: var(--text-primary); }
        .primary-btn:hover { background-color: var(--accent-blue-hover); }
        .primary-btn:disabled { background-color: var(--border-dark); cursor: not-allowed; }
        .danger-btn { background-color: var(--status-red); color: white; }
        .danger-btn:hover { background-color: #B91C1C; }

        /* --- SEARCH, FAB, & MODAL STYLES --- */
        .search-container { margin-bottom: 2rem; }
        #eventSearchInput { width: 100%; padding: 0.8rem 1.2rem; font-size: 1rem; background-color: var(--surface-dark); border: 1px solid var(--border-dark); color: var(--text-primary); border-radius: 6px; box-sizing: border-box; }
        #eventSearchInput:focus { outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
        .fab { position: fixed; bottom: 2rem; right: 2rem; width: 56px; height: 56px; border-radius: 50%; background-color: var(--accent-blue); color: white; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s ease, background-color 0.2s ease; z-index: 999; }
        .fab:hover { background-color: var(--accent-blue-hover); transform: scale(1.05); }
        .fab svg { width: 28px; height: 28px; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; }
        .modal-overlay.open { opacity: 1; visibility: visible; }
        .modal-content { background-color: var(--surface-dark); padding: 2.5rem 2rem 2rem 2rem; border-radius: 8px; max-width: 500px; width: 90%; position: relative; transform: scale(0.95); transition: transform 0.3s ease; }
        .modal-overlay.open .modal-content { transform: scale(1); }
        .modal-content h3 { margin-top: 0; font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
        .modal-close-btn { position: absolute; top: 0.75rem; right: 0.75rem; background: transparent; border: none; color: var(--text-secondary); font-size: 1.75rem; line-height: 1; cursor: pointer; padding: 0.25rem; }
    </style>
    <div class="events-view-container">
        <h1>Upcoming Events</h1>
        
        <div class="search-container">
            <input type="search" id="eventSearchInput" placeholder="Search by event name or description...">
        </div>

        <div id="event-cards-container">
            ${eventList.length > 0 ? eventList.map(doc => createEventCard(doc, userLookup, currentUserId)).join('') : '<p>No upcoming events. Press the (+) button to add one!</p>'}
        </div>
        
        <button id="showAddEventModalBtn" class="fab" title="Add New Event">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>

        <div id="addEventModal" class="modal-overlay">
            <div class="modal-content">
                <button id="closeAddEventModalBtn" class="modal-close-btn">×</button>
                <h3>Add a New Event</h3>
                <form id="addEventForm">
                    <div class="form-group"><label for="eventName">Event Name</label><input type="text" id="eventName" required></div>
                    <div class="form-group"><label for="eventDate">Date & Time</label><input type="datetime-local" id="eventDate" required></div>
                    <div class="form-group"><label for="eventImage">Event Image</label><input type="file" id="eventImage" accept="image/png, image/jpeg, image/gif" required></div>
                    <div class="form-group"><label for="eventDescription">Description</label><textarea id="eventDescription" placeholder="Details about the event..."></textarea></div>
                    <button type="submit" class="btn primary-btn">Create Event</button>
                </form>
            </div>
        </div>
    </div>
    `;
}

/**
 * Attaches event listeners for the events view.
 */
function attachEventListeners(currentUser, userLookup) {
    const currentUserId = currentUser.$id;
    const cardsContainer = document.getElementById('event-cards-container');

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const renderEventList = (events) => {
        if (events.length > 0) {
            cardsContainer.innerHTML = events.map(doc => createEventCard(doc, userLookup, currentUserId)).join('');
        } else {
            cardsContainer.innerHTML = '<p>No events found matching your search.</p>';
        }
    };

    const searchInput = document.getElementById('eventSearchInput');
    const performSearch = async (searchTerm) => {
        cardsContainer.innerHTML = '<p>Searching...</p>';
        try {
            if (searchTerm) {
                const [nameMatches, descMatches] = await Promise.all([
                    databases.listDocuments(COLLECTION_ID_EVENTS, [Query.search('event_name', searchTerm)]),
                    databases.listDocuments(COLLECTION_ID_EVENTS, [Query.search('description', searchTerm)])
                ]);
                const allMatches = new Map();
                nameMatches.documents.forEach(doc => allMatches.set(doc.$id, doc));
                descMatches.documents.forEach(doc => allMatches.set(doc.$id, doc));
                const uniqueResults = Array.from(allMatches.values()).sort((a, b) => new Date(b.date_to_held) - new Date(a.date_to_held));
                renderEventList(uniqueResults);
            } else {
                const response = await databases.listDocuments(COLLECTION_ID_EVENTS, [Query.orderDesc('date_to_held')]);
                renderEventList(response.documents);
            }
        } catch (error) {
            console.error('Event search failed:', error);
            if (error.code === 400 && error.message.includes('index')) {
                cardsContainer.innerHTML = `<p style="color: var(--status-red);"><strong>Search Error:</strong> Please ask an admin to add full-text indexes to the 'event_name' and 'description' attributes.</p>`;
            } else {
                cardsContainer.innerHTML = '<p>An error occurred during search.</p>';
            }
        }
    };

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => performSearch(e.target.value.trim()), 400));
    }

    const modal = document.getElementById('addEventModal');
    const fab = document.getElementById('showAddEventModalBtn');
    const closeModalBtn = document.getElementById('closeAddEventModalBtn');
    if (modal && fab && closeModalBtn) {
        fab.addEventListener('click', () => modal.classList.add('open'));
        closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addEventForm.querySelector('button[type="submit"]');
            const imageFile = document.getElementById('eventImage').files[0];
            if (!imageFile) { alert('Please select an image for the event.'); return; }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            try {
                const uploadedImage = await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), imageFile);
                const eventData = {
                    event_name: document.getElementById('eventName').value,
                    date_to_held: document.getElementById('eventDate').value,
                    description: document.getElementById('eventDescription').value,
                    image_file: uploadedImage.$id,
                    added_by: currentUserId
                };
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), eventData);
                alert('Event created successfully!');
                window.location.reload();
            } catch (error) {
                console.error('Failed to create event:', error);
                alert('Failed to create event. Please check all fields and try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Event';
            }
        });
    }

    if (cardsContainer) {
        cardsContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-event-btn');
            if (!deleteBtn) return;
            if (!confirm('Are you sure you want to permanently delete this event?')) return;
            
            const docId = deleteBtn.dataset.docId;
            const fileId = deleteBtn.dataset.fileId;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, docId);
                await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
                deleteBtn.closest('.event-card').remove();
            } catch (error) {
                console.error('Failed to delete event:', error);
                alert('Could not delete the event. Please try again.');
            }
        });
    }
}

/**
 * Main render function for the Events view.
 */
export default function renderEventsView(initialEvents, user, userLookup) {
    return {
        html: getEventsHTML(initialEvents, userLookup, user.$id),
        afterRender: () => attachEventListeners(user, userLookup)
    };
}