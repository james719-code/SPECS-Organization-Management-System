import { api } from '../../shared/api.js';
import { ID } from 'appwrite';
import { Modal } from 'bootstrap';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import pencilSquare from 'bootstrap-icons/icons/pencil-square.svg';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import person from 'bootstrap-icons/icons/person.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import search from 'bootstrap-icons/icons/search.svg';
import xLg from 'bootstrap-icons/icons/x-lg.svg';
import listCheck from 'bootstrap-icons/icons/list-check.svg';

/**
 * Creates an event card using your defined .card and Deep Teal styles.
 */
function createEventCard(eventDoc, userLookup, currentUserId) {
    const imageUrl = api.files.getFilePreview(eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const canManage = eventDoc.added_by === currentUserId;
    const isEnded = eventDoc.event_ended === true;

    const statusClass = isEnded ? 'status-rejected' : 'status-approved';
    const statusText = isEnded ? 'Ended' : 'Upcoming';

    return `
        <div class="col">
            <div class="card event-card h-100 ${isEnded ? 'opacity-75' : ''}">
                <div class="position-relative overflow-hidden" style="border-radius: 12px 12px 0 0;">
                    <img src="${imageUrl}" class="card-img-top" alt="${eventDoc.event_name}" style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="fw-bold mb-1 text-truncate" title="${eventDoc.event_name}">${eventDoc.event_name}</h5>
                    
                    <div class="d-flex align-items-center gap-2 mb-3 text-primary small fw-semibold">
                        <img src="${calendar3}" class="icon-primary-filter" style="width: 14px;">
                        <span>${formattedDate} • ${formattedTime}</span>
                    </div>

                    <p class="card-text text-muted small flex-grow-1 line-clamp-3">
                        ${eventDoc.description || 'No description provided.'}
                    </p>

                    ${eventDoc.collab?.length > 0 ? `
                        <div class="mt-3 py-2 border-top border-light">
                            <div class="d-flex align-items-center gap-2">
                                <img src="${peopleFill}" style="width: 14px; opacity: 0.5;">
                                <span class="small text-muted text-truncate">With ${eventDoc.collab.join(', ')}</span>
                            </div>
                        </div>
                    ` : ''}

                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                        <div class="d-flex align-items-center gap-2">
                            <div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;">
                                <img src="${person}" style="width: 14px; opacity: 0.7;">
                            </div>
                            <span class="small text-secondary fw-semibold">${userLookup[eventDoc.added_by] || 'Member'}</span>
                        </div>
                        
                        ${canManage ? `
                            <div class="btn-group-custom">
                                <button class="btn take-attendance-btn" data-doc-id="${eventDoc.$id}" data-event-name="${eventDoc.event_name}" title="Attendance"><img src="${listCheck}" width="14"></button>
                                <button class="btn edit-event-btn" data-doc-id="${eventDoc.$id}"><img src="${pencilSquare}" width="14"></button>
                                ${!isEnded ? `<button class="btn mark-ended-btn" data-doc-id="${eventDoc.$id}"><img src="${checkCircle}" width="14" class="text-success"></button>` : ''}
                                <button class="btn delete-event-btn" data-doc-id="${eventDoc.$id}" data-file-id="${eventDoc.image_file}"><img src="${trash}" width="14" class="text-danger"></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

function getEventsHTML() {
    return `
    <div class="events-view-container container-fluid py-4 px-md-5">
        <header class="row align-items-center mb-5 gy-4">
            <div class="col-12 col-lg-7">
                    <h1 class="display-6 fw-bold text-dark mb-1">Events</h1>
                    <p class="text-muted mb-0">Manage and browse upcoming community activities.</p>
            </div>
            <div class="col-12 col-lg-5">
                <div class="officer-search-bar d-flex align-items-center">
                    <span class="input-group-text bg-transparent border-0 ps-3"><img src="${search}" width="18" style="opacity:0.4"></span>
                    <input type="search" id="eventSearchInput" class="form-control border-0 py-2 ps-2" placeholder="Search events...">
                </div>
            </div>
        </header>
        
        <div id="events-list-wrapper">
            <div class="d-flex justify-content-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
        
        <button class="btn btn-primary rounded-pill position-fixed bottom-0 end-0 m-4 shadow-lg px-4 py-3 d-flex align-items-center gap-2" style="z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addEventModal">
            <img src="${plusLg}" alt="Add" style="width: 1.2rem; filter: invert(1);">
            <span class="fw-bold">New Event</span>
        </button>

        <!-- ADD EVENT MODAL -->
        <div class="modal fade" id="addEventModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    <form id="addEventForm">
                        <div class="modal-header border-0 pt-4 px-4">
                            <h5 class="modal-title fw-bold">Create Event</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="row g-3">
                                <div class="col-md-8"><label class="form-label fw-bold small">Event Name</label><input type="text" id="eventName" class="form-control" required></div>
                                <div class="col-md-4"><label class="form-label fw-bold small">Date & Time</label><input type="datetime-local" id="eventDate" class="form-control" required></div>
                                <div class="col-12"><label class="form-label fw-bold small">Banner Image</label><input type="file" id="eventImage" class="form-control" accept="image/*" required></div>
                                <div class="col-12"><label class="form-label fw-bold small">Description</label><textarea id="eventDescription" class="form-control" rows="3"></textarea></div>
                                <div class="col-12"><label class="form-label fw-bold small">Collaborators</label><div id="collaborators-list"></div><button type="button" id="add-collaborator-btn" class="btn btn-sm btn-outline-primary mt-2">+ Add</button></div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pb-4 px-4">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Event</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- EDIT EVENT MODAL -->
        <div class="modal fade" id="editEventModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    <form id="editEventForm">
                        <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">Edit Event</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body p-4">
                            <input type="hidden" id="editEventId"><input type="hidden" id="editEventFileId">
                            <div class="row g-3">
                                <div class="col-md-8"><label class="form-label fw-bold small">Event Name</label><input type="text" id="editEventName" class="form-control" required></div>
                                <div class="col-md-4"><label class="form-label fw-bold small">Date & Time</label><input type="datetime-local" id="editEventDate" class="form-control" required></div>
                                <div class="col-12"><label class="form-label fw-bold small">New Banner (Optional)</label><input type="file" id="editEventImage" class="form-control" accept="image/*"></div>
                                <div class="col-12"><label class="form-label fw-bold small">Description</label><textarea id="editEventDescription" class="form-control" rows="3"></textarea></div>
                                <div class="col-12"><label class="form-label fw-bold small">Collaborators</label><div id="edit-collaborators-list"></div><button type="button" id="edit-add-collaborator-btn" class="btn btn-sm btn-outline-primary mt-2">+ Add</button></div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- ATTENDANCE MODAL -->
        <div class="modal fade" id="attendanceModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    <div class="modal-header border-0 pt-4 px-4">
                        <div>
                            <h5 class="modal-title fw-bold">Attendance</h5>
                            <p class="text-muted small mb-0" id="attendanceEventName">Event Name</p>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-4">
                            <div class="input-group shadow-sm rounded-3 overflow-hidden border-0">
                                <span class="input-group-text bg-white border-0 ps-3"><img src="${search}" width="16" style="opacity:0.4"></span>
                                <input type="text" id="studentAttendanceSearch" class="form-control border-0 py-2 ps-2" placeholder="Search student name to mark present...">
                            </div>
                            <div id="attendance-autocomplete" class="list-group mt-1 shadow-sm position-absolute" style="z-index: 1060; width: calc(100% - 3rem); display:none; max-height:200px; overflow-y:auto;"></div>
                        </div>
                        
                        <h6 class="fw-bold text-muted small text-uppercase mb-3">Present Students</h6>
                        <div class="table-responsive rounded-3 border">
                            <table class="table table-hover mb-0 align-middle">
                                <thead class="bg-light text-secondary small"><tr><th class="ps-3 border-0">Name</th><th class="text-end pe-3 border-0">Action</th></tr></thead>
                                <tbody id="attendanceListBody">
                                    <tr><td colspan="2" class="text-center text-muted small py-3">No students marked present yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>`;
}

function renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId) {
    wrapper.innerHTML = `
        <div class="mb-5">
            <div class="d-flex align-items-center gap-2 mb-4"><h2 class="h4 fw-bold mb-0">Upcoming</h2><span class="badge bg-primary rounded-pill">${upcoming.length}</span></div>
            <div id="upcoming-events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4"></div>
        </div>
        <div class="opacity-75">
            <div class="d-flex align-items-center gap-2 mb-4"><h2 class="h4 fw-bold mb-0 text-secondary">Ended</h2><span class="badge bg-secondary rounded-pill">${ended.length}</span></div>
            <div id="ended-events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4"></div>
        </div>`;
    renderEventsToContainer(upcoming, document.getElementById('upcoming-events-container'), userLookup, currentUserId);
    renderEventsToContainer(ended, document.getElementById('ended-events-container'), userLookup, currentUserId);
}

function renderEventsToContainer(events, container, userLookup, currentUserId) {
    if (events.length > 0) {
        container.innerHTML = events.map(doc => createEventCard(doc, userLookup, currentUserId)).join('');
    } else {
        container.innerHTML = `<div class="col-12"><div class="text-center text-muted p-5 bg-white rounded-3 border border-dashed">No events found.</div></div>`;
    }
}

function attachEventListeners(currentUser, userLookup, initialEvents) {
    const currentUserId = currentUser.$id;
    const addEventEl = document.getElementById('addEventModal');
    const editEventEl = document.getElementById('editEventModal');
    const attendanceEl = document.getElementById('attendanceModal');
    const addEventModal = new Modal(addEventEl);
    const editEventModal = new Modal(editEventEl);
    const attendanceModal = new Modal(attendanceEl);

    // Fix aria-hidden focus issue: blur active element before modal hides
    [addEventEl, editEventEl, attendanceEl].forEach(el => {
        if (el) {
            el.addEventListener('hide.bs.modal', () => {
                if (el.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            });
        }
    });

    const eventsViewContainer = document.querySelector('.events-view-container');
    const searchInput = document.getElementById('eventSearchInput');

    let allEventsCache = [];
    let allStudentsCache = [];
    let currentAttendanceEventId = null;

    const loadAllEvents = async () => {
        const wrapper = document.getElementById('events-list-wrapper');
        try {
            const response = await api.events.list({ limit: 5000 });
            allEventsCache = response.documents;
            const upcoming = allEventsCache.filter(e => !e.event_ended);
            const ended = allEventsCache.filter(e => e.event_ended);
            renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId);
        } catch (error) {
            console.error(error);
            wrapper.innerHTML = `<div class="alert alert-danger">Failed to load events.</div>`;
        }
    };

    // Pre-fetch students for attendance search
    api.users.listStudents().then(res => { allStudentsCache = res.documents; });

    // Use prefetched events when available to avoid redundant fetch
    if (initialEvents && initialEvents.length > 0) {
        allEventsCache = initialEvents;
        const wrapper = document.getElementById('events-list-wrapper');
        const upcoming = allEventsCache.filter(e => !e.event_ended);
        const ended = allEventsCache.filter(e => e.event_ended);
        renderEventLists(wrapper, upcoming, ended, userLookup, currentUserId);
    } else {
        loadAllEvents();
    }

    // ATTENDANCE LOGIC
    const refreshAttendanceList = async (eventId) => {
        const tbody = document.getElementById('attendanceListBody');
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const res = await api.attendance.listForEvent(eventId);
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted small py-3">No students marked present yet.</td></tr>`;
                return;
            }
            // Fetch student names (or use pre-fetched lookup if optimized, but here we might have IDs)
            // Attendance record has `students` relationship. It expands to student profile doc.
            tbody.innerHTML = res.documents.map(rec => {
                let name = "Unknown";
                if (rec.students) {
                    name = rec.students.name || "Student";
                }
                return `<tr>
                    <td class="ps-3 border-bottom border-light">${name}</td>
                    <td class="text-end pe-3 border-bottom border-light">
                        <button class="btn btn-sm btn-light text-danger delete-attendance-btn" data-id="${rec.$id}">&times;</button>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) { console.error(e); tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger small py-3">Error loading list.</td></tr>`; }
    };

    // DELEGATED CLICKS
    eventsViewContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-event-btn');
        const markEndedBtn = e.target.closest('.mark-ended-btn');
        const deleteBtn = e.target.closest('.delete-event-btn');
        const attendanceBtn = e.target.closest('.take-attendance-btn');

        // Collab logic
        const addCollabBtn = e.target.closest('#add-collaborator-btn, #edit-add-collaborator-btn');
        const removeCollabBtn = e.target.closest('.remove-collaborator-btn');

        if (addCollabBtn) {
            const list = addCollabBtn.previousElementSibling;
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group mb-2 shadow-sm rounded-3 overflow-hidden';
            inputGroup.innerHTML = `<input type="text" class="form-control border-0 bg-light collaborator-input" placeholder="Name"><button class="btn btn-light border-0 remove-collaborator-btn" type="button"><img src="${xLg}" width="12"></button>`;
            list.appendChild(inputGroup);
            inputGroup.querySelector('input').focus();
        }

        if (removeCollabBtn) removeCollabBtn.closest('.input-group').remove();

        if (attendanceBtn) {
            currentAttendanceEventId = attendanceBtn.dataset.docId;
            document.getElementById('attendanceEventName').textContent = attendanceBtn.dataset.eventName;
            document.getElementById('studentAttendanceSearch').value = '';
            document.getElementById('attendance-autocomplete').style.display = 'none';
            attendanceModal.show();
            refreshAttendanceList(currentAttendanceEventId);
        }

        if (editBtn) {
            const ev = allEventsCache.find(x => x.$id === editBtn.dataset.docId);
            if (!ev) return;
            document.getElementById('editEventId').value = ev.$id;
            document.getElementById('editEventFileId').value = ev.image_file;
            document.getElementById('editEventName').value = ev.event_name;
            document.getElementById('editEventDate').value = new Date(ev.date_to_held).toISOString().slice(0, 16);
            document.getElementById('editEventDescription').value = ev.description || '';
            const escapeAttr = (str) => String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            document.getElementById('edit-collaborators-list').innerHTML = (ev.collab || []).map(n => `<div class="input-group mb-2 shadow-sm rounded-3 overflow-hidden"><input type="text" class="form-control border-0 bg-light collaborator-input" value="${escapeAttr(n)}"><button class="btn btn-light border-0 remove-collaborator-btn" type="button"><img src="${xLg}" width="12"></button></div>`).join('');
            editEventModal.show();
        }

        if (markEndedBtn) {
            const confirmed = await confirmAction('End Event', 'Are you sure you want to mark this event as ended?', 'End Event', 'warning');
            if (confirmed) {
                await api.events.markEnded(markEndedBtn.dataset.docId);
                api.cache.clearAll();
                showToast('Event marked as ended', 'success');
                loadAllEvents();
            }
        }

        if (deleteBtn) {
            const confirmed = await confirmAction('Delete Event', 'Are you sure you want to permanently delete this event?', 'Delete', 'danger');
            if (confirmed) {
                await api.events.delete(deleteBtn.dataset.docId);
                await api.files.deleteEventImage(deleteBtn.dataset.fileId);
                api.cache.clearAll();
                showToast('Event deleted', 'success');
                loadAllEvents();
            }
        }
    });

    // ATTENDANCE SEARCH & ADD
    const attSearch = document.getElementById('studentAttendanceSearch');
    const attResults = document.getElementById('attendance-autocomplete');

    attSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) { attResults.style.display = 'none'; return; }

        const matches = allStudentsCache.filter(s => {
            const name = (s.students && s.students.name) ? s.students.name : s.username;
            return name.toLowerCase().includes(term);
        }).slice(0, 5);

        attResults.innerHTML = matches.map(s => {
            const name = (s.students && s.students.name) ? s.students.name : s.username;
            // Need Student Profile ID
            const sId = (s.students && s.students.$id) ? s.students.$id : s.students;
            return `<a href="#" class="list-group-item list-group-item-action" data-sid="${sId}" data-name="${name}">${name}</a>`;
        }).join('');
        attResults.style.display = matches.length ? 'block' : 'none';
    });

    attResults.addEventListener('click', async (e) => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (!link) return;

        const sId = link.dataset.sid;
        const name = link.dataset.name;

        const confirmed = await confirmAction('Mark Present', `Mark ${name} as present?`, 'Mark Present', 'success');
        if (confirmed) {
            try {
                await api.attendance.create(currentAttendanceEventId, sId, currentUserId, "Present");
                api.cache.clearAll();
                attSearch.value = '';
                attResults.style.display = 'none';
                refreshAttendanceList(currentAttendanceEventId);
                showToast(`${name} marked as present`, 'success');
            } catch (err) { showToast(err.message, 'error'); }
        }
    });

    document.getElementById('attendanceListBody').addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-attendance-btn');
        if (btn) {
            const confirmed = await confirmAction('Remove Attendance', 'Remove this attendance record?', 'Remove', 'danger');
            if (confirmed) {
                await api.attendance.delete(btn.dataset.id);
                api.cache.clearAll();
                refreshAttendanceList(currentAttendanceEventId);
                showToast('Attendance record removed', 'success');
            }
        }
    });

    // Submissions
    document.getElementById('addEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const uploadedImage = await api.files.uploadEventImage(document.getElementById('eventImage').files[0]);
            await api.events.create({
                event_name: document.getElementById('eventName').value,
                date_to_held: document.getElementById('eventDate').value,
                description: document.getElementById('eventDescription').value,
                image_file: uploadedImage.$id,
                added_by: currentUserId,
                collab: Array.from(document.querySelectorAll('#collaborators-list .collaborator-input')).map(i => i.value.trim()).filter(Boolean),
                event_ended: false
            });
            addEventModal.hide(); e.target.reset(); api.cache.clearAll(); await loadAllEvents();
            showToast('Event created successfully', 'success');
        } catch (error) { showToast('Failed to create event', 'error'); } finally { submitBtn.disabled = false; }
    });

    document.getElementById('editEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            let data = {
                event_name: document.getElementById('editEventName').value,
                date_to_held: document.getElementById('editEventDate').value,
                description: document.getElementById('editEventDescription').value,
                collab: Array.from(document.querySelectorAll('#edit-collaborators-list .collaborator-input')).map(i => i.value.trim()).filter(Boolean),
            };
            const newImg = document.getElementById('editEventImage').files[0];
            if (newImg) {
                const uploaded = await api.files.uploadEventImage(newImg);
                data.image_file = uploaded.$id;
                await api.files.deleteEventImage(document.getElementById('editEventFileId').value);
            }
            await api.events.update(document.getElementById('editEventId').value, data);
            editEventModal.hide(); api.cache.clearAll(); await loadAllEvents();
            showToast('Event updated successfully', 'success');
        } catch (error) { showToast('Update failed', 'error'); } finally { submitBtn.disabled = false; }
    });

    // Search
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    searchInput.addEventListener('input', debounce((e) => {
        const term = e.target.value.toLowerCase().trim();
        const wrapper = document.getElementById('events-list-wrapper');
        if (!term) return loadAllEvents();
        const filtered = allEventsCache.filter(ev => ev.event_name.toLowerCase().includes(term) || ev.description?.toLowerCase().includes(term) || ev.collab?.some(c => c.toLowerCase().includes(term)));
        renderEventLists(wrapper, filtered.filter(e => !e.event_ended), filtered.filter(e => e.event_ended), userLookup, currentUserId);
    }, 300));
}

export default function renderEventsView(initialEvents, user, userLookup) {
    return {
        html: getEventsHTML(),
        afterRender: () => attachEventListeners(user, userLookup, initialEvents)
    };
}
