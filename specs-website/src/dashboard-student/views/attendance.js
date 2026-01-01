import { api } from '../../shared/api.js';

function getAttendanceHTML() {
    return `
        <div class="container-fluid py-4 px-md-5">
            <header class="mb-4 mb-md-5">
                <h1 class="display-6 fw-bold text-dark mb-1">Attendance Record</h1>
                <p class="text-muted mb-0">Track your participation in events and activities.</p>
            </header>

            <!-- Desktop Table View -->
            <div class="card border-0 shadow-sm overflow-hidden rounded-4 desktop-table">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th class="ps-4 py-3">Date Recorded</th>
                                <th class="py-3">Event Name</th>
                                <th class="py-3">Details</th>
                                <th class="text-center py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody id="attendance-table-body">
                            <tr><td colspan="4" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Mobile Card View -->
            <div class="mobile-card-list" id="attendance-mobile-cards">
                <div class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Loading...</div>
            </div>
        </div>
    `;
}

async function attachAttendanceListeners(studentDoc) {
    const tbody = document.getElementById('attendance-table-body');
    const mobileCards = document.getElementById('attendance-mobile-cards');
    
    try {
        if (!studentDoc || !studentDoc.$id) {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Student profile not loaded.</td></tr>';
             mobileCards.innerHTML = '<div class="mobile-data-card"><div class="text-center py-3 text-muted">Student profile not loaded.</div></div>';
             return;
        }

        const response = await api.attendance.listForStudent(studentDoc.$id);

        if (response.documents.length === 0) {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No attendance records found.</td></tr>';
             mobileCards.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><img src="" alt="" style="opacity:0;"></div>
                    <h5>No Attendance</h5>
                    <p>You have no attendance records yet.</p>
                </div>
             `;
             return;
        }

        // Desktop table rendering
        tbody.innerHTML = response.documents.map(record => {
            const date = new Date(record.$createdAt).toLocaleString();
            
            let eventName = 'Unknown Event';
            if (record.events) {
                if (record.events.event_name) eventName = record.events.event_name;
                else eventName = 'Event ID: ' + record.events;
            }

            return `
                <tr>
                    <td class="ps-4 text-secondary fw-medium small">${date}</td>
                    <td class="fw-bold text-dark">${eventName}</td>
                    <td class="text-muted small">${record.name_attendance || '-'}</td>
                    <td class="text-center"><span class="badge bg-success-subtle text-success rounded-pill px-3 py-2 border border-success-subtle">Present</span></td>
                </tr>
            `;
        }).join('');
        
        // Mobile cards rendering
        mobileCards.innerHTML = response.documents.map(record => {
            const date = new Date(record.$createdAt).toLocaleDateString();
            const time = new Date(record.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let eventName = 'Unknown Event';
            if (record.events) {
                if (record.events.event_name) eventName = record.events.event_name;
                else eventName = 'Event ID: ' + record.events;
            }

            return `
                <div class="mobile-data-card">
                    <div class="mobile-card-header">
                        <h6 class="mobile-card-title">${eventName}</h6>
                        <div class="mobile-card-badge">
                            <span class="badge bg-success-subtle text-success rounded-pill px-2 py-1 border border-success-subtle" style="font-size: 0.7rem;">Present</span>
                        </div>
                    </div>
                    <div class="mobile-card-body">
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Date</span>
                            <span class="mobile-data-value">${date}</span>
                        </div>
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Time</span>
                            <span class="mobile-data-value">${time}</span>
                        </div>
                        ${record.name_attendance ? `
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Details</span>
                            <span class="mobile-data-value">${record.name_attendance}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading attendance:", error);
         tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-danger">Failed to load attendance history.</td></tr>';
         mobileCards.innerHTML = '<div class="mobile-data-card"><div class="text-center py-3 text-danger">Failed to load attendance history.</div></div>';
    }
}

export default function renderAttendanceView(studentDoc) {
    return {
        html: getAttendanceHTML(),
        afterRender: () => attachAttendanceListeners(studentDoc)
    };
}
