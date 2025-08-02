import { databases } from '../../appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_NON_OFFICER_STUDENT = import.meta.env.VITE_COLLECTION_NON_OFFICER_STUDENT;
const COLLECTION_ID_PAYMENTS = import.meta.env.VITE_COLLECTION_ID_PAYMENTS; // For delete check

// --- HELPERS ---
const YEAR_LEVEL_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
    .map(section => `<option value="BSCS ${section}">BSCS ${section}</option>`).join('');

// --- HTML TEMPLATE FUNCTIONS ---
function createStudentCardHTML(studentDoc) {
    const studentData = JSON.stringify(studentDoc).replace(/'/g, "\\'");
    return `
        <div class="col"><div class="card h-100">
            <div class="card-body">
                <div class="position-absolute top-0 end-0 p-2">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More options">
                            <i class="bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item edit-student-btn" type="button" data-student='${studentData}'><i class="bi-pencil-fill me-2"></i>Edit</button></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item delete-student-btn text-danger" type="button" data-id="${studentDoc.$id}" data-name="${studentDoc.name}"><i class="bi-trash-fill me-2"></i>Delete</button></li>
                        </ul>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <i class="bi-person-circle fs-2 me-3 text-secondary"></i>
                    <div>
                        <h6 class="card-title fw-bold mb-0">${studentDoc.name}</h6>
                        <p class="card-text small text-muted mb-0">${studentDoc.email}</p>
                    </div>
                </div>
            </div>
            <div class="card-footer bg-light small"><strong>Section:</strong> ${studentDoc.section}</div>
        </div></div>`;
}

function getStudentHTML() {
    return `
        <div class="student-directory-container d-flex flex-column" style="min-height: calc(100vh - 120px);">
            <div class="d-flex flex-column flex-lg-row justify-content-lg-between align-items-lg-center mb-4">
                <h1 class="mb-3 mb-lg-0">Student Directory</h1>
                <div class="d-flex flex-column flex-sm-row gap-2">
                    <select id="sectionFilter" class="form-select" style="min-width: 200px;"><option value="all">All Sections</option>${YEAR_LEVEL_OPTIONS}</select>
                    <input type="search" id="studentSearchInput" class="form-control" placeholder="Search by name or email...">
                </div>
            </div>
            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 flex-grow-1"></div>
        </div>

        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addStudentModal" title="Add New Student">
            <i class="bi bi-plus-lg fs-4"></i>
        </button>

        <div class="modal fade" id="addStudentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Add Student(s)</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div id="add-student-choice-view">
                    <p>How would you like to add students?</p>
                    <div class="d-grid gap-3">
                        <button class="btn btn-outline-primary p-3" id="show-single-add-btn"><i class="bi-person-plus-fill fs-4 me-2"></i>Add a Single Student</button>
                        <button class="btn btn-outline-secondary p-3" id="show-bulk-add-btn"><i class="bi-people-fill fs-4 me-2"></i>Add Students in Bulk</button>
                    </div>
                </div>
                <form id="add-single-student-form" class="d-none">
                    <div class="mb-3"><label for="singleStudentName" class="form-label">Full Name</label><input type="text" id="singleStudentName" class="form-control" required></div>
                    <div class="mb-3"><label for="singleStudentEmail" class="form-label">Email</label><input type="email" id="singleStudentEmail" class="form-control" required></div>
                    <div class="mb-3"><label for="singleStudentAddress" class="form-label">Address</label><input type="text" id="singleStudentAddress" class="form-control" placeholder="e.g., Brgy. Sample, Sample City" required></div>
                    <div class="mb-3"><label for="singleStudentSection" class="form-label">Section</label><select id="singleStudentSection" class="form-select" required><option value="" disabled selected>-- Select a section --</option>${YEAR_LEVEL_OPTIONS}</select></div>
                    <div class="d-flex justify-content-between mt-4">
                        <button type="button" class="btn btn-secondary back-to-choice-btn">← Back</button>
                        <button type="submit" class="btn btn-primary">Add Student</button>
                    </div>
                </form>
                <form id="add-bulk-student-form" class="d-none">
                    <div class="mb-3"><label for="bulkStudentData" class="form-label">Student Data</label><textarea id="bulkStudentData" class="form-control" rows="8" placeholder="Enter student data here..." required></textarea><div class="form-text">
                        <strong>Required Pattern:</strong><br>
                        <pre class="mb-0">SECTION (e.g., BSCS 1A)\n\nLastname, Firstname M.I. - email@example.com - Brgy, City, Province\nLastname, Firstname M.I. - email@example.com - Brgy, City, Province</pre>
                    </div></div>
                    <div class="d-flex justify-content-between mt-4">
                        <button type="button" class="btn btn-secondary back-to-choice-btn">← Back</button>
                        <button type="submit" class="btn btn-primary">Process & Add Students</button>
                    </div>
                </form>
            </div>
        </div></div></div>

        <div class="modal fade" id="editStudentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
            <form id="editStudentForm">
                <div class="modal-header"><h5 class="modal-title">Edit Student Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <input type="hidden" id="editStudentId">
                    <div class="mb-3"><label for="editStudentName" class="form-label">Full Name</label><input type="text" id="editStudentName" class="form-control" required></div>
                    <div class="mb-3"><label for="editStudentEmail" class="form-label">Email</label><input type="email" id="editStudentEmail" class="form-control" required></div>
                    <div class="mb-3"><label for="editStudentAddress" class="form-label">Address</label><input type="text" id="editStudentAddress" class="form-control" required></div>
                    <div class="mb-3"><label for="editStudentSection" class="form-label">Section</label><select id="editStudentSection" class="form-select" required>${YEAR_LEVEL_OPTIONS}</select></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
            </form>
        </div></div></div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachEventListeners(currentUser, profile) {
    const container = document.querySelector('.student-directory-container');
    if (!container) return;

    const cardsContainer = document.getElementById('student-cards-container');
    const sectionFilter = document.getElementById('sectionFilter');
    const searchInput = document.getElementById('studentSearchInput');
    const addStudentModal = new Modal(document.getElementById('addStudentModal'));
    const editStudentModal = new Modal(document.getElementById('editStudentModal'));

    const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this,a), delay); }; };

    let allStudents = [];
    const currentUserSection = profile.yearLevel;

    cardsContainer.innerHTML = `<div class="d-flex h-100 align-items-center justify-content-center"><div class="spinner-border text-primary" role="status"></div></div>`;

    const renderStudentList = (students, reason = 'initial') => {
        if (students.length > 0) {
            cardsContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4';
            cardsContainer.innerHTML = students.map(createStudentCardHTML).join('');
        } else {
            cardsContainer.className = 'row flex-grow-1 align-items-center justify-content-center';
            let icon, title, text;
            if (reason === 'filter') {
                icon = 'bi-funnel';
                title = 'No Students Found';
                text = 'Your search or section filter did not match any students in the directory.';
            } else {
                icon = 'bi-people';
                title = 'Student Directory is Empty';
                text = 'Add your first student by clicking the (+) button below.';
            }
            cardsContainer.innerHTML = `<div class="col-12"><div class="text-center text-muted py-5">
                <div class="mb-3"><i class="bi ${icon}" style="font-size: 5rem; color: var(--bs-secondary-color);"></i></div>
                <h4 class="fw-light">${title}</h4><p>${text}</p>
            </div></div>`;
        }
    };

    const applyFilters = () => {
        const selectedSection = sectionFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();
        let filteredList = allStudents;
        if (selectedSection !== 'all') {
            filteredList = filteredList.filter(s => s.section === selectedSection);
        }
        if (searchTerm) {
            filteredList = filteredList.filter(s => s.name.toLowerCase().includes(searchTerm) || s.email.toLowerCase().includes(searchTerm));
        }
        const reason = allStudents.length > 0 ? 'filter' : 'initial';
        renderStudentList(filteredList, reason);
    };

    const refreshAllStudents = async () => {
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, [Query.orderAsc('name'), Query.limit(5000)]);
            allStudents = response.documents;
            applyFilters();
        } catch (error) {
            console.error("Failed to refresh student list:", error);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Could not load directory. Please refresh the page.</div></div>`;
        }
    };

    await refreshAllStudents();
    if (sectionFilter.querySelector(`[value="${currentUserSection}"]`)) {
        sectionFilter.value = currentUserSection;
    }
    applyFilters();

    sectionFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', debounce(applyFilters, 300));

    const choiceView = document.getElementById('add-student-choice-view');
    const singleView = document.getElementById('add-single-student-form');
    const bulkView = document.getElementById('add-bulk-student-form');
    const resetAddModal = () => {
        choiceView.classList.remove('d-none');
        singleView.classList.add('d-none');
        bulkView.classList.add('d-none');
        singleView.reset();
        bulkView.reset();
    };
    document.getElementById('addStudentModal').addEventListener('hidden.bs.modal', resetAddModal);
    document.getElementById('show-single-add-btn').addEventListener('click', () => { choiceView.classList.add('d-none'); singleView.classList.remove('d-none'); });
    document.getElementById('show-bulk-add-btn').addEventListener('click', () => { choiceView.classList.add('d-none'); bulkView.classList.remove('d-none'); });
    document.querySelectorAll('.back-to-choice-btn').forEach(btn => btn.addEventListener('click', resetAddModal));

    container.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-student-btn');
        const deleteBtn = e.target.closest('.delete-student-btn');

        if (editBtn) {
            const student = JSON.parse(editBtn.dataset.student.replace(/\\'/g, "'"));
            document.getElementById('editStudentId').value = student.$id;
            document.getElementById('editStudentName').value = student.name;
            document.getElementById('editStudentEmail').value = student.email;
            document.getElementById('editStudentAddress').value = student.address || '';
            document.getElementById('editStudentSection').value = student.section;
            editStudentModal.show();
        }

        if (deleteBtn) {
            const studentId = deleteBtn.dataset.id;
            const studentName = deleteBtn.dataset.name;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Checking...`;
            try {
                const unpaidPaymentsRes = await databases.listDocuments(
                    DATABASE_ID, COLLECTION_ID_PAYMENTS,
                    [Query.equal('student_id', studentId), Query.equal('isPaid', false), Query.limit(1)]
                );
                if (unpaidPaymentsRes.total > 0) {
                    alert(`Cannot delete ${studentName}. This student has outstanding payments.`);
                    return;
                }
                if (confirm(`Are you sure you want to delete ${studentName}? This student has no outstanding payments. This action cannot be undone.`)) {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, studentId);
                    await refreshAllStudents();
                    alert(`${studentName} was deleted successfully!`);
                }
            } catch (error) {
                console.error("Error during pre-delete check or deletion:", error);
                alert(`An error occurred: ${error.message}`);
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<i class="bi-trash-fill me-2"></i>Delete`;
            }
        }
    });

    singleView.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = singleView.querySelector('button[type="submit"]');
        submitBtn.disabled = true; submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Adding...`;
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, ID.unique(), {
                name: document.getElementById('singleStudentName').value,
                email: document.getElementById('singleStudentEmail').value,
                address: document.getElementById('singleStudentAddress').value,
                section: document.getElementById('singleStudentSection').value,
            });
            addStudentModal.hide();
            await refreshAllStudents();
        } catch (error) {
            console.error("Failed to add single student:", error); alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false; submitBtn.innerHTML = 'Add Student';
        }
    });

    bulkView.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = bulkView.querySelector('button[type="submit"]');
        const data = document.getElementById('bulkStudentData').value.trim();
        const parts = data.split('\n\n');

        if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
            alert('Invalid format. Please provide a section, a double newline, and then the student list.'); return;
        }

        const section = parts[0].trim();
        const studentLines = parts[1].split('\n').filter(line => line.trim() !== '');

        const parsedStudents = studentLines.map(line => {
            const studentParts = line.split(' - ').map(s => s.trim());
            if (studentParts.length !== 3) return null;
            const [name, email, address] = studentParts;
            if (!name || !email || !address) return null;
            return { name, email, address, section };
        }).filter(Boolean);

        if (parsedStudents.length === 0) {
            alert('No valid student entries found to process. Please check the format for each line.'); return;
        }

        submitBtn.disabled = true; submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing ${parsedStudents.length}...`;

        try {
            const existingNames = new Set(allStudents.map(s => s.name.toLowerCase()));
            const studentsToCreate = [];
            const skippedStudents = [];

            for (const student of parsedStudents) {
                if (existingNames.has(student.name.toLowerCase())) {
                    skippedStudents.push(student);
                } else {
                    studentsToCreate.push(student);
                }
            }

            if (studentsToCreate.length > 0) {
                const creationPromises = studentsToCreate.map(student =>
                    databases.createDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, ID.unique(), student)
                );
                await Promise.all(creationPromises);
            }

            let summaryMessage = '';
            if (studentsToCreate.length > 0) {
                summaryMessage += `${studentsToCreate.length} students were added successfully.\n`;
            }
            if (skippedStudents.length > 0) {
                summaryMessage += `\n${skippedStudents.length} students were skipped because they already exist:\n- ${skippedStudents.map(s => s.name).join('\n- ')}`;
            }
            if (summaryMessage === '') {
                summaryMessage = 'No new students to add. All parsed students already exist in the directory.';
            }

            alert(summaryMessage.trim());

            addStudentModal.hide();
            await refreshAllStudents();

        } catch (error) {
            console.error("Failed to bulk add students:", error);
            alert(`Bulk add failed: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Process & Add Students';
        }
    });

    document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const studentId = document.getElementById('editStudentId').value;
        const updatedData = {
            name: document.getElementById('editStudentName').value,
            email: document.getElementById('editStudentEmail').value,
            address: document.getElementById('editStudentAddress').value,
            section: document.getElementById('editStudentSection').value,
        };
        submitBtn.disabled = true; submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, studentId, updatedData);
            editStudentModal.hide();
            await refreshAllStudents();
        } catch (error) {
            console.error("Failed to update student:", error);
            alert(`Error updating student: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Changes';
        }
    });
}

// --- Main export ---
export default function renderStudentView(user, profile) {
    return {
        html: getStudentHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}