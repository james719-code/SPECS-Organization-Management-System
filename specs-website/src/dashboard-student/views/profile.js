import { databases } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_STUDENTS
} from '../../shared/constants.js';

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
                        <p id="profile-email-display" class="text-muted">...</p>
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
                            <label class="small text-muted fw-bold text-uppercase">Address</label>
                            <p id="profile-address" class="fs-5 text-dark border-bottom pb-2">--</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachProfileListeners(currentUser) {
    console.log("🔹 [Profile] Attempting to find Student Document with ID:", currentUser.$id);

    try {
        // --- DIRECT FETCH: Look for Student Document using Auth ID ---
        const studentData = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_STUDENTS,
            currentUser.$id  // <--- USING AUTH ID DIRECTLY
        );

        console.log("✅ [Profile] Student Document Found:", studentData);

        // --- Update UI ---
        // Prefer name from database, fallback to auth name
        const name = studentData.name || currentUser.name || "User";

        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('profile-email-display').textContent = studentData.email || currentUser.email;

        // Since we aren't checking 'accounts', we don't have a verified status
        // We can hide it or set it based on some other logic
        const statusEl = document.getElementById('profile-status');
        if (statusEl) {
            statusEl.style.display = 'none'; // Hide status since it's in the other collection
        }

        // Fill in Student Details
        document.getElementById('profile-student-id').textContent = studentData.student_id || 'N/A';
        document.getElementById('profile-section').textContent = studentData.section || 'N/A';
        document.getElementById('profile-year').textContent = studentData.yearLevel || 'N/A';
        document.getElementById('profile-address').textContent = studentData.address || 'N/A';

    } catch (error) {
        console.error("❌ [Profile] Error:", error);

        if (error.code === 404) {
            document.getElementById('profile-name').innerHTML = "<span class='text-danger'>Profile Not Found</span>";
            document.getElementById('profile-student-id').innerHTML =
                "<span class='text-danger text-sm'>No student document matches your Login ID.<br>Make sure the Student Doc ID was created using your Auth ID.</span>";
        } else {
            document.getElementById('profile-name').textContent = "Error loading data";
        }
    }
}

export default function renderProfileView(currentUser) {
    return {
        html: getProfileHTML(),
        afterRender: () => attachProfileListeners(currentUser)
    };
}