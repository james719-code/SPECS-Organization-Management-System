// --- IMPORTS ---
import { databases } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

// --- SVG ICON IMPORTS ---
import threeDotsVerticalIcon from 'bootstrap-icons/icons/three-dots-vertical.svg';
import pencilFillIcon from 'bootstrap-icons/icons/pencil-fill.svg';
import trashFillIcon from 'bootstrap-icons/icons/trash-fill.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import plusLgIcon from 'bootstrap-icons/icons/plus-lg.svg';
import personPlusFillIcon from 'bootstrap-icons/icons/person-plus-fill.svg';
import peopleFillIcon from 'bootstrap-icons/icons/people-fill.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import envelopeIcon from 'bootstrap-icons/icons/envelope.svg';
import geoAltIcon from 'bootstrap-icons/icons/geo-alt.svg';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_NON_OFFICER_STUDENT = import.meta.env.VITE_COLLECTION_NON_OFFICER_STUDENT;
const COLLECTION_ID_PAYMENTS = import.meta.env.VITE_COLLECTION_ID_PAYMENTS;

// --- HELPERS ---
const YEAR_LEVEL_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
    .map(s => `<option value="BSCS ${s}">BSCS ${s}</option>`).join('');

// --- HTML TEMPLATE FUNCTIONS ---

/**
 * Creates a modern student card with a clean layout and action dropdown.
 */
function createStudentCardHTML(studentDoc) {
    const studentData = JSON.stringify(studentDoc).replace(/'/g, "\\'");

    // Generate initials for avatar
    const initials = studentDoc.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm student-card group">
                <div class="card-body p-4 position-relative">
                    <div class="position-absolute top-0 end-0 p-3">
                        <div class="dropdown">
                            <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="opacity: 0.6;">
                                <img src="${threeDotsVerticalIcon}" width="20">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end border-0 shadow-lg rounded-3 p-2">
                                <li>
                                    <button class="dropdown-item d-flex align-items-center gap-2 rounded-2 py-2 edit-student-btn" type="button" data-student='${studentData}'>
                                        <img src="${pencilFillIcon}" width="14" class="opacity-50"> <span class="small fw-semibold">Edit Details</span>
                                    </button>
                                </li>
                                <li><hr class="dropdown-divider my-2"></li>
                                <li>
                                    <button class="dropdown-item d-flex align-items-center gap-2 rounded-2 py-2 text-danger delete-student-btn" type="button" data-id="${studentDoc.$id}" data-name="${studentDoc.name}">
                                        <img src="${trashFillIcon}" width="14" class="status-rejected-filter"> <span class="small fw-semibold">Delete Student</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="d-flex align-items-center mb-4">
                        <div class="file-icon-wrapper bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 56px; height: 56px; font-weight: 700; font-size: 1.2rem;">
                            ${initials}
                        </div>
                        <div style="max-width: calc(100% - 80px);">
                            <h6 class="fw-bold text-dark mb-1 text-truncate" title="${studentDoc.name}">${studentDoc.name}</h6>
                            <span class="badge status-badge status-approved border border-success-subtle bg-success-subtle text-success px-2 py-1" style="font-size: 0.65rem;">${studentDoc.section}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex flex-column gap-2 border-top border-light pt-3">
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${studentDoc.email}">
                            <div class="bg-light rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                                <img src="${envelopeIcon}" width="12" style="opacity: 0.6;">
                            </div>
                            <span class="small text-truncate flex-grow-1">${studentDoc.email}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${studentDoc.address || 'No address'}">
                            <div class="bg-light rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                                <img src="${geoAltIcon}" width="12" style="opacity: 0.6;">
                            </div>
                            <span class="small text-truncate flex-grow-1">${studentDoc.address || '<span class="text-muted fst-italic">No address provided</span>'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function getStudentHTML() {
    return `
        <div class="student-directory-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Student Directory</h1>
                    <p class="text-muted mb-0">Manage non-officer student records efficiently.</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <select id="sectionFilter" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px; cursor: pointer;">
                            <option value="all">All Sections</option>
                            ${YEAR_LEVEL_OPTIONS}
                        </select>
                        <div class="input-group shadow-sm rounded-3 overflow-hidden bg-white border-0" style="max-width: 300px;">
                            <span class="input-group-text bg-white border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search by name or email...">
                        </div>
                    </div>
                </div>
            </header>
            
            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5" style="min-height: 300px;">
                 </div>
        </div>

        <button class="btn btn-primary rounded-pill position-fixed bottom-0 end-0 m-4 shadow-lg px-4 py-3 d-flex align-items-center gap-2" style="z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addStudentModal">
            <img src="${plusLgIcon}" alt="Add" style="width: 1.2rem; filter: invert(1);">
            <span class="fw-bold">Add Student</span>
        </button>

        <div class="modal fade" id="addStudentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pt-4 px-4">
                        <h5 class="modal-title fw-bold">Add Student(s)</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        
                        <div id="add-student-choice-view">
                            <p class="text-muted small text-center mb-4">Choose a method to add students to the directory.</p>
                            <div class="d-grid gap-3">
                                <button class="btn btn-outline-light text-dark text-start p-3 border shadow-sm hover-shadow transition-all d-flex align-items-center gap-3 rounded-3" id="show-single-add-btn">
                                    <div class="bg-primary-subtle text-primary p-3 rounded-circle"><img src="${personPlusFillIcon}" width="20" class="icon-primary-filter"></div>
                                    <div>
                                        <div class="fw-bold">Add Single Student</div>
                                        <div class="small text-muted">Manually enter details for one student.</div>
                                    </div>
                                </button>
                                <button class="btn btn-outline-light text-dark text-start p-3 border shadow-sm hover-shadow transition-all d-flex align-items-center gap-3 rounded-3" id="show-bulk-add-btn">
                                    <div class="bg-warning-subtle text-warning p-3 rounded-circle"><img src="${peopleFillIcon}" width="20"></div>
                                    <div>
                                        <div class="fw-bold">Bulk Import</div>
                                        <div class="small text-muted">Copy-paste a list of students to add at once.</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <form id="add-single-student-form" class="d-none">
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Full Name</label><input type="text" id="singleStudentName" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Email</label><input type="email" id="singleStudentEmail" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Address</label><input type="text" id="singleStudentAddress" class="form-control" placeholder="e.g., Brgy. Sample, City" required></div>
                            <div class="mb-4"><label class="form-label fw-bold small text-muted text-uppercase">Section</label><select id="singleStudentSection" class="form-select" required><option value="" disabled selected>-- Select --</option>${YEAR_LEVEL_OPTIONS}</select></div>
                            <div class="d-flex justify-content-between pt-2 border-top">
                                <button type="button" class="btn btn-light back-to-choice-btn rounded-pill px-4">Back</button>
                                <button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Add Student</button>
                            </div>
                        </form>

                        <form id="add-bulk-student-form" class="d-none">
                            <div class="mb-3">
                                <label class="form-label fw-bold small text-muted text-uppercase">Raw Data Input</label>
                                <textarea id="bulkStudentData" class="form-control font-monospace small" rows="8" placeholder="Format:&#10;BSCS 1A&#10;&#10;Doe, John A. - john@email.com - 123 Street&#10;Smith, Jane B. - jane@email.com - 456 Ave" required></textarea>
                            </div>
                            <div class="alert alert-light border small text-muted">
                                <strong class="text-dark">Instructions:</strong> First line is the Section. Leave a blank line. Then list students: <code>Name - Email - Address</code>.
                            </div>
                            <div class="d-flex justify-content-between pt-2 border-top">
                                <button type="button" class="btn btn-light back-to-choice-btn rounded-pill px-4">Back</button>
                                <button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Process Import</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="editStudentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <form id="editStudentForm">
                        <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">Edit Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body p-4">
                            <input type="hidden" id="editStudentId">
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Full Name</label><input type="text" id="editStudentName" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Email</label><input type="email" id="editStudentEmail" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Address</label><input type="text" id="editStudentAddress" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase">Section</label><select id="editStudentSection" class="form-select" required>${YEAR_LEVEL_OPTIONS}</select></div>
                        </div>
                        <div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Save Changes</button></div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// --- LOGIC ---
async function attachEventListeners(currentUser, profile) {
    const container = document.querySelector('.student-directory-container');
    if (!container) return;

    const cardsContainer = document.getElementById('student-cards-container');
    const sectionFilter = document.getElementById('sectionFilter');
    const searchInput = document.getElementById('studentSearchInput');
    const addStudentModal = new Modal(document.getElementById('addStudentModal'));
    const editStudentModal = new Modal(document.getElementById('editStudentModal'));

    let allStudents = [];
    const currentUserSection = profile.yearLevel;

    // Helper: State-Based Grid Rendering
    const updateGridState = (state, data = []) => {
        if (state === 'loading') {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5";
            cardsContainer.innerHTML = `<div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"></div>`;
        } else if (state === 'empty') {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${funnelIcon}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No students found</h4>
                <p class="text-muted">Try adjusting your filters or add a new student.</p>
            `;
        } else {
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5";
            cardsContainer.innerHTML = data.map(createStudentCardHTML).join('');
        }
    };

    // Filter Logic
    const applyFilters = () => {
        const selectedSection = sectionFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allStudents;
        if (selectedSection !== 'all') filtered = filtered.filter(s => s.section === selectedSection);
        if (searchTerm) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm) || s.email.toLowerCase().includes(searchTerm));

        updateGridState(filtered.length > 0 ? 'success' : 'empty', filtered);
    };

    const loadData = async () => {
        updateGridState('loading');
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, [Query.orderAsc('name'), Query.limit(5000)]);
            allStudents = res.documents;
            applyFilters();
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load directory.</div></div>`;
        }
    };

    // Init
    await loadData();
    if (sectionFilter.querySelector(`[value="${currentUserSection}"]`)) sectionFilter.value = currentUserSection;
    applyFilters();

    // Listeners
    sectionFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') applyFilters(); }); // Search on Enter
    searchInput.addEventListener('search', applyFilters); // Clear 'x' button support

    // Modal UI Toggles
    const choiceView = document.getElementById('add-student-choice-view');
    const singleView = document.getElementById('add-single-student-form');
    const bulkView = document.getElementById('add-bulk-student-form');
    const resetAddModal = () => {
        choiceView.classList.remove('d-none');
        singleView.classList.add('d-none');
        bulkView.classList.add('d-none');
        singleView.reset(); bulkView.reset();
    };

    document.getElementById('addStudentModal').addEventListener('hidden.bs.modal', resetAddModal);
    document.getElementById('show-single-add-btn').addEventListener('click', () => { choiceView.classList.add('d-none'); singleView.classList.remove('d-none'); });
    document.getElementById('show-bulk-add-btn').addEventListener('click', () => { choiceView.classList.add('d-none'); bulkView.classList.remove('d-none'); });
    document.querySelectorAll('.back-to-choice-btn').forEach(btn => btn.addEventListener('click', resetAddModal));

    // Card Actions (Edit / Delete)
    container.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-student-btn');
        const deleteBtn = e.target.closest('.delete-student-btn');

        if (editBtn) {
            const s = JSON.parse(editBtn.dataset.student.replace(/\\'/g, "'"));
            document.getElementById('editStudentId').value = s.$id;
            document.getElementById('editStudentName').value = s.name;
            document.getElementById('editStudentEmail').value = s.email;
            document.getElementById('editStudentAddress').value = s.address || '';
            document.getElementById('editStudentSection').value = s.section;
            editStudentModal.show();
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            deleteBtn.disabled = true;

            try {
                // Pre-check for payments
                const payments = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.equal('student_id', id), Query.equal('isPaid', false), Query.limit(1)]);
                if (payments.total > 0) {
                    alert(`Cannot delete ${name}. Outstanding payments found.`);
                    deleteBtn.disabled = false;
                    return;
                }

                if (confirm(`Delete ${name}? This cannot be undone.`)) {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, id);
                    allStudents = allStudents.filter(s => s.$id !== id); // Optimistic Update
                    applyFilters();
                }
            } catch (err) {
                alert(`Error: ${err.message}`);
            } finally {
                deleteBtn.disabled = false;
            }
        }
    });

    // Form Submissions
    singleView.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = singleView.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = 'Adding...';
        try {
            const newStudent = await databases.createDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, ID.unique(), {
                name: document.getElementById('singleStudentName').value,
                email: document.getElementById('singleStudentEmail').value,
                address: document.getElementById('singleStudentAddress').value,
                section: document.getElementById('singleStudentSection').value,
            });
            allStudents.push(newStudent);
            allStudents.sort((a, b) => a.name.localeCompare(b.name));
            applyFilters();
            addStudentModal.hide();
        } catch (err) { alert(`Error: ${err.message}`); } finally { btn.disabled = false; btn.innerHTML = 'Add Student'; }
    });

    bulkView.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = bulkView.querySelector('button[type="submit"]');
        const raw = document.getElementById('bulkStudentData').value;
        const parts = raw.split('\n\n');

        if (parts.length < 2) { alert('Invalid format. Section, empty line, then list.'); return; }

        const section = parts[0].trim();
        const list = parts[1].split('\n').filter(l => l.trim()).map(l => {
            const [n, e, a] = l.split(' - ').map(s => s.trim());
            return (n && e && a) ? { name: n, email: e, address: a, section } : null;
        }).filter(Boolean);

        if(!list.length) { alert('No valid entries found.'); return; }

        btn.disabled = true; btn.innerHTML = 'Processing...';
        try {
            // Filter out duplicates locally first to save API calls
            const existing = new Set(allStudents.map(s => s.name.toLowerCase()));
            const toAdd = list.filter(s => !existing.has(s.name.toLowerCase()));

            if(toAdd.length) {
                const results = await Promise.all(toAdd.map(s => databases.createDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, ID.unique(), s)));
                allStudents.push(...results);
                allStudents.sort((a, b) => a.name.localeCompare(b.name));
                applyFilters();
                alert(`Added ${results.length} students. ${list.length - results.length} duplicates skipped.`);
            } else {
                alert('All students listed already exist.');
            }
            addStudentModal.hide();
        } catch(err) { alert(`Error: ${err.message}`); } finally { btn.disabled = false; btn.innerHTML = 'Process Import'; }
    });

    document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const id = document.getElementById('editStudentId').value;
        btn.disabled = true; btn.innerHTML = 'Saving...';
        try {
            const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, id, {
                name: document.getElementById('editStudentName').value,
                email: document.getElementById('editStudentEmail').value,
                address: document.getElementById('editStudentAddress').value,
                section: document.getElementById('editStudentSection').value,
            });
            const idx = allStudents.findIndex(s => s.$id === id);
            if(idx !== -1) allStudents[idx] = updated;
            applyFilters();
            editStudentModal.hide();
        } catch(err) { alert(`Error: ${err.message}`); } finally { btn.disabled = false; btn.innerHTML = 'Save Changes'; }
    });
}

export default function renderStudentView(user, profile) {
    return {
        html: getStudentHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}