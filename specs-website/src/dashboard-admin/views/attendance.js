import { api } from '../../shared/api.js';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import { logActivity } from './activity-logs.js';

import calendarCheck from 'bootstrap-icons/icons/calendar-check.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';
import personPlus from 'bootstrap-icons/icons/person-plus.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';

let allEvents = [];
let allStudents = [];
let currentEventId = null;

function getAttendanceHTML() {
    return `
        <div class="attendance-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">
                        <img src="${calendarCheck}" alt="Attendance" class="me-2" style="width: 2rem; filter: invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%);">
                        Attendance Management
                    </h1>
                    <p class="text-muted mb-0">Track and manage event attendance records</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                        <button id="refreshAttendanceBtn" class="btn btn-light btn-sm rounded-pill shadow-sm px-3 d-flex align-items-center gap-2">
                            <img src="${arrowRepeat}" style="width: 1rem; opacity: 0.6;"> Refresh
                        </button>
                    </div>
                </div>
            </header>

            <!-- Event Selector -->
            <div class="row mb-4">
                <div class="col-12 col-md-6">
                    <label class="form-label small fw-bold text-muted">SELECT EVENT</label>
                    <select id="eventSelector" class="form-select shadow-sm">
                        <option value="">-- Choose an event --</option>
                    </select>
                </div>
                <div class="col-12 col-md-6" id="attendanceStatsCol" style="display: none;">
                    <div class="d-flex gap-3 h-100 align-items-end">
                        <div class="card border-0 shadow-sm flex-fill">
                            <div class="card-body p-3 text-center">
                                <div class="text-muted small fw-bold">ATTENDEES</div>
                                <div class="h4 fw-bold text-primary mb-0" id="attendeeCount">0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Attendance -->
            <div class="card border-0 shadow-sm mb-4" id="addAttendanceCard" style="display: none;">
                <div class="card-body p-4">
                    <h6 class="fw-bold mb-3">Add Attendance</h6>
                    <div class="row g-3 align-items-end">
                        <div class="col-md-5">
                            <label class="form-label small fw-bold text-muted">STUDENT</label>
                            <div class="position-relative">
                                <input type="text" id="studentSearchAttendance" class="form-control" placeholder="Search student name..." autocomplete="off">
                                <div id="attendanceAutocomplete" class="list-group position-absolute w-100 shadow-sm mt-1" style="z-index: 1060; max-height: 200px; overflow-y: auto;"></div>
                            </div>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label small fw-bold text-muted">ATTENDANCE NAME</label>
                            <input type="text" id="attendanceNameInput" class="form-control" placeholder="e.g. Morning Check-in">
                        </div>
                        <div class="col-md-2">
                            <button id="addAttendanceBtn" class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2">
                                <img src="${personPlus}" style="width: 1rem; filter: invert(1);"> Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attendance List -->
            <div id="attendanceListContainer" style="display: none;">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold mb-0">Attendance Records</h6>
                        <div class="input-group" style="max-width: 250px;">
                            <span class="input-group-text bg-white border-end-0">
                                <img src="${searchIcon}" width="14" style="opacity: 0.4;">
                            </span>
                            <input type="search" id="attendanceSearchInput" class="form-control border-start-0 ps-0" placeholder="Search...">
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0 align-middle">
                                <thead class="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th class="ps-4 py-3">Student</th>
                                        <th class="py-3">Attendance Name</th>
                                        <th class="py-3">Date</th>
                                        <th class="text-end pe-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="attendanceTableBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty / Select State -->
            <div id="attendanceEmptyState" class="text-center py-5">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${calendarCheck}" style="width: 50px; opacity: 0.2;">
                </div>
                <h5 class="fw-bold text-dark">Select an Event</h5>
                <p class="text-muted">Choose an event above to view and manage attendance records.</p>
            </div>
        </div>

        <style>
            #refreshAttendanceBtn.refreshing img { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        </style>
    `;
}

async function attachAttendanceListeners() {
    const eventSelector = document.getElementById('eventSelector');
    const attendanceStatsCol = document.getElementById('attendanceStatsCol');
    const attendeeCount = document.getElementById('attendeeCount');
    const addAttendanceCard = document.getElementById('addAttendanceCard');
    const attendanceListContainer = document.getElementById('attendanceListContainer');
    const attendanceEmptyState = document.getElementById('attendanceEmptyState');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const refreshBtn = document.getElementById('refreshAttendanceBtn');
    const addBtn = document.getElementById('addAttendanceBtn');
    const studentSearchInput = document.getElementById('studentSearchAttendance');
    const attendanceNameInput = document.getElementById('attendanceNameInput');
    const autocompleteResults = document.getElementById('attendanceAutocomplete');
    const searchInput = document.getElementById('attendanceSearchInput');

    let selectedStudentId = null;
    let currentAttendance = [];
    let studentLookup = {};

    // Load events and students
    const loadInitialData = async () => {
        try {
            const [eventsRes, studentsRes] = await Promise.all([
                api.events.list({ limit: 500 }),
                api.users.listStudents({ limit: 500 })
            ]);

            allEvents = eventsRes.documents;
            allStudents = studentsRes.documents;

            // Build student lookup
            studentLookup = {};
            allStudents.forEach(acc => {
                const sData = acc.students || {};
                const sId = sData.$id || acc.students;
                if (sId) {
                    studentLookup[sId] = sData.name || acc.username;
                }
            });

            // Populate event selector
            eventSelector.innerHTML = '<option value="">-- Choose an event --</option>' +
                allEvents.map(e => `<option value="${e.$id}">${e.event_name} (${new Date(e.date_to_held).toLocaleDateString()})</option>`).join('');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            toast.error('Failed to load events and students');
        }
    };

    const loadAttendance = async (eventId) => {
        if (!eventId) {
            attendanceStatsCol.style.display = 'none';
            addAttendanceCard.style.display = 'none';
            attendanceListContainer.style.display = 'none';
            attendanceEmptyState.style.display = 'block';
            return;
        }

        attendanceEmptyState.style.display = 'none';
        attendanceStatsCol.style.display = 'block';
        addAttendanceCard.style.display = 'block';
        attendanceListContainer.style.display = 'block';

        attendanceTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;

        try {
            const res = await api.attendance.listForEvent(eventId, { limit: 500 });
            currentAttendance = res.documents;
            attendeeCount.textContent = currentAttendance.length;
            renderAttendanceTable(currentAttendance);
        } catch (error) {
            console.error('Failed to load attendance:', error);
            toast.error('Failed to load attendance records');
            attendanceTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Failed to load records</td></tr>`;
        }
    };

    const renderAttendanceTable = (records) => {
        if (records.length === 0) {
            attendanceTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-5">No attendance records for this event yet.</td></tr>`;
            return;
        }

        attendanceTableBody.innerHTML = records.map(record => {
            const studentName = record.students
                ? (studentLookup[record.students.$id || record.students] || record.students.$id || 'Unknown')
                : 'Unknown';
            const date = new Date(record.$createdAt).toLocaleString();
            const trashHTML = `<img src="${trash}" style="width: 0.9em; pointer-events: none;">`;

            return `
                <tr>
                    <td class="ps-4 fw-medium">${studentName}</td>
                    <td class="text-muted">${record.name_attendance || '-'}</td>
                    <td class="text-muted small">${date}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger delete-attendance-btn rounded-circle p-2" style="width: 32px; height: 32px;" data-id="${record.$id}" title="Remove">
                            ${trashHTML}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    await loadInitialData();

    // Event selector change
    eventSelector.addEventListener('change', () => {
        currentEventId = eventSelector.value;
        loadAttendance(currentEventId);
    });

    // Refresh
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
            await loadInitialData();
            if (currentEventId) await loadAttendance(currentEventId);
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
            toast.success('Attendance data refreshed');
        });
    }

    // Student search autocomplete
    studentSearchInput.addEventListener('input', () => {
        const term = studentSearchInput.value.toLowerCase();
        selectedStudentId = null;
        if (term.length < 2) { autocompleteResults.innerHTML = ''; return; }

        const matches = allStudents.filter(acc => {
            const sData = acc.students || {};
            const name = sData.name || acc.username;
            return name.toLowerCase().includes(term);
        }).slice(0, 5);

        autocompleteResults.innerHTML = matches.map(acc => {
            const sData = acc.students || {};
            const name = sData.name || acc.username;
            const sId = sData.$id || acc.students;
            return `<a href="#" class="list-group-item list-group-item-action" data-student-id="${sId}" data-name="${name}">${name}</a>`;
        }).join('');
    });

    autocompleteResults.addEventListener('click', (e) => {
        e.preventDefault();
        const item = e.target.closest('a');
        if (!item) return;
        selectedStudentId = item.dataset.studentId;
        studentSearchInput.value = item.dataset.name;
        autocompleteResults.innerHTML = '';
    });

    // Add attendance
    addBtn.addEventListener('click', async () => {
        if (!currentEventId) { toast.warning('Select an event first'); return; }
        if (!selectedStudentId) { toast.warning('Select a student'); return; }

        const attendanceName = attendanceNameInput.value.trim() || 'Attendance';

        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            await api.attendance.create(currentEventId, selectedStudentId, null, attendanceName);
            toast.success('Attendance recorded');
            logActivity('other', `Added attendance for event`);

            studentSearchInput.value = '';
            attendanceNameInput.value = '';
            selectedStudentId = null;

            await loadAttendance(currentEventId);
        } catch (error) {
            console.error('Failed to add attendance:', error);
            toast.error('Failed to record attendance');
        } finally {
            addBtn.disabled = false;
            addBtn.innerHTML = `<img src="${personPlus}" style="width: 1rem; filter: invert(1);"> Add`;
        }
    });

    // Delete attendance
    attendanceTableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-attendance-btn');
        if (!deleteBtn) return;

        if (!await confirmAction('Remove Attendance', 'Remove this attendance record?', 'Remove', 'danger')) return;

        const recordId = deleteBtn.dataset.id;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            await api.attendance.delete(recordId);
            toast.success('Attendance record removed');
            await loadAttendance(currentEventId);
        } catch (error) {
            console.error('Failed to delete attendance:', error);
            toast.error('Failed to remove record');
        }
    });

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase().trim();
            if (!term) {
                renderAttendanceTable(currentAttendance);
                return;
            }
            const filtered = currentAttendance.filter(r => {
                const name = r.students ? (studentLookup[r.students.$id || r.students] || '') : '';
                return name.toLowerCase().includes(term) || (r.name_attendance || '').toLowerCase().includes(term);
            });
            renderAttendanceTable(filtered);
        });
    }
}

export default function renderAttendanceView() {
    return {
        html: getAttendanceHTML(),
        afterRender: attachAttendanceListeners
    };
}
