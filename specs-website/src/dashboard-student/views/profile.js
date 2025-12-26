import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS } from '../../shared/constants.js';

function getProfileHTML() {
    return `
        <div class="container max-w-2xl mx-auto">
            <div class="card border-0 shadow-sm">
                <div class="card-body p-5">
                    <div class="text-center mb-5">
                        <div id="profile-avatar" class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow" style="width: 100px; height: 100px; font-size: 2.5rem; font-weight: bold;">
                            ?
                        </div>
                        <h3 id="profile-name" class="fw-bold mb-1">Loading...</h3>
                        <p id="profile-username" class="text-muted">@username</p>
                         <span id="profile-status" class="badge bg-secondary">Loading Status</span>
                    </div>

                    <div class="row g-4">
                        <div class="col-md-6">
                            <label class="small text-muted fw-bold text-uppercase">Student ID</label>
                            <p id="profile-student-id" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                        <div class="col-md-6">
                            <label class="small text-muted fw-bold text-uppercase">Section</label>
                            <p id="profile-section" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                         <div class="col-md-6">
                            <label class="small text-muted fw-bold text-uppercase">Year Level</label>
                            <p id="profile-year" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                         <div class="col-md-6">
                            <label class="small text-muted fw-bold text-uppercase">Email</label>
                            <p id="profile-email" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                        <div class="col-12">
                            <label class="small text-muted fw-bold text-uppercase">Address</label>
                            <p id="profile-address" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachProfileListeners(accountProfile) {
    // accountProfile is passed from the dashboard init. 
    // It is the document from 'accounts' collection.
    // It should have 'students' relationship expanded if we fetched it that way, 
    // BUT the dashboard init might not have expanded it. 
    // Let's refetch to be safe or check if it exists.
    
    try {
        // If we need to fetch student details:
        // accountProfile.students might be an ID or an object.
        let studentData = null;

        // If 'students' is just an ID (standard if not expanded), fetch it.
        // If it's an object, use it.
        // Or if it's null, handle it.
        
        if (accountProfile.students) {
            if (typeof accountProfile.students === 'string') {
                 studentData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, accountProfile.students);
            } else if (typeof accountProfile.students === 'object') {
                studentData = accountProfile.students;
            }
        }

        const name = studentData ? studentData.name : accountProfile.username;
        const username = accountProfile.username;
        const verified = accountProfile.verified;
        
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('profile-username').textContent = '@' + username;
        
        const statusEl = document.getElementById('profile-status');
        if (verified) {
            statusEl.className = 'badge bg-success';
            statusEl.textContent = 'Verified Student';
        } else {
            statusEl.className = 'badge bg-warning text-dark';
            statusEl.textContent = 'Verification Pending';
        }

        if (studentData) {
            document.getElementById('profile-student-id').textContent = studentData.student_id || 'N/A';
            document.getElementById('profile-section').textContent = studentData.section || 'N/A';
            document.getElementById('profile-year').textContent = studentData.yearLevel || 'N/A';
            document.getElementById('profile-email').textContent = studentData.email || 'N/A';
             document.getElementById('profile-address').textContent = studentData.address || 'N/A';
        } else {
             // If no student data linked yet
             document.getElementById('profile-student-id').innerHTML = '<span class="text-muted fst-italic">Profile incomplete</span>';
        }

    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

export default function renderProfileView(accountProfile) {
    return {
        html: getProfileHTML(),
        afterRender: () => attachProfileListeners(accountProfile)
    };
}
