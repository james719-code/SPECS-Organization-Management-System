import { api } from '../../shared/api.js';

function getAttendanceHTML() {
    return `
        <div class="container-fluid py-4 px-md-5">
            <header class="mb-5">
                <h1 class="display-6 fw-bold text-dark mb-1">Attendance Record</h1>
                <p class="text-muted mb-0">Track your participation in events and activities.</p>
            </header>

            <div class="card border-0 shadow-sm overflow-hidden rounded-4">
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
        </div>
    `;
}

async function attachAttendanceListeners(studentDoc) {
    const tbody = document.getElementById('attendance-table-body');
    
    try {
        if (!studentDoc || !studentDoc.$id) {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Student profile not loaded.</td></tr>';
             return;
        }

        const response = await api.attendance.listForStudent(studentDoc.$id);

        if (response.documents.length === 0) {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No attendance records found.</td></tr>';
             return;
        }

        tbody.innerHTML = response.documents.map(record => {
            const date = new Date(record.$createdAt).toLocaleString();
            
            let eventName = 'Unknown Event';
            // Resolve event name if relationship is expanded
            if (record.events) {
                if (record.events.event_name) eventName = record.events.event_name;
                // If it's just an ID string, we can't show the name without fetching, 
                // but let's assume it expands or we show "Event ID: ..."
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

    } catch (error) {
        console.error("Error loading attendance:", error);
         tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-danger">Failed to load attendance history.</td></tr>';
    }
}

export default function renderAttendanceView(studentDoc) {
    return {
        html: getAttendanceHTML(),
        afterRender: () => attachAttendanceListeners(studentDoc)
    };
}
