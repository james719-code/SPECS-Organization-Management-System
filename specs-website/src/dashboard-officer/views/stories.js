import { databases, functions, account } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_STORIES,
    COLLECTION_ID_STUDENTS,
    FUNCTION_ID
} from '../../shared/constants.js';
import { Query } from 'appwrite';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';
import eyeIcon from 'bootstrap-icons/icons/eye.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

function createStoryCardHTML(story, studentName = 'Unknown') {
    const createdAt = new Date(story.$createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const statusBadge = story.isAccepted
        ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Approved</span>'
        : '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">Pending</span>';

    const description = story.post_description || '';
    const truncatedDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm story-card">
                <div class="card-body p-4 position-relative">
                    <div class="position-absolute top-0 end-0 m-3">
                        ${statusBadge}
                    </div>
                    
                    <div class="mb-3">
                        <h5 class="fw-bold text-dark mb-2 pe-5" title="${story.title}">${story.title || 'Untitled'}</h5>
                        <p class="text-muted small mb-0" style="line-height: 1.5;">${truncatedDesc || 'No description'}</p>
                    </div>
                    
                    <div class="d-flex flex-column gap-2 border-top border-light pt-3">
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${personIcon}" width="14" style="opacity: 0.6;">
                            <span class="small fw-medium">${studentName}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${calendarIcon}" width="14" style="opacity: 0.6;">
                            <span class="small">${createdAt}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-sm btn-outline-primary flex-fill view-story-btn" data-story-id="${story.$id}">
                            <img src="${eyeIcon}" width="14" class="me-1">
                            View
                        </button>
                        ${!story.isAccepted ? `
                            <button class="btn btn-sm btn-success approve-story-btn" data-story-id="${story.$id}">
                                <img src="${checkCircleFill}" width="14" style="filter: brightness(0) invert(1);">
                            </button>
                            <button class="btn btn-sm btn-outline-danger reject-story-btn" data-story-id="${story.$id}">
                                <img src="${xCircleFill}" width="14">
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

function getStoriesHTML() {
    return `
        <div class="stories-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Story Approval</h1>
                    <p class="text-muted mb-0">Review and approve volunteer posts for public display.</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <select id="storyFilterSelect" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px; cursor: pointer;">
                            <option value="pending" selected>Pending Review</option>
                            <option value="approved">Approved</option>
                            <option value="all">All Stories</option>
                        </select>
                        <div class="input-group shadow-sm rounded-3 overflow-hidden bg-white border-0" style="max-width: 300px;">
                            <span class="input-group-text bg-white border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="storySearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search stories...">
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Stats Row -->
            <div class="row g-4 mb-5">
                <div class="col-6 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-warning mb-1" id="stat-pending-stories">-</div>
                            <div class="text-muted small">Pending Review</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-success mb-1" id="stat-approved-stories">-</div>
                            <div class="text-muted small">Approved</div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-primary mb-1" id="stat-total-stories">-</div>
                            <div class="text-muted small">Total Stories</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="story-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5" style="min-height: 300px;">
                <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
            </div>
        </div>
        
        <!-- Story Detail Modal -->
        <div class="modal fade" id="storyDetailModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold" id="storyModalTitle">Story Title</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-2">
                        <div class="mb-3">
                            <span class="badge bg-light text-secondary border me-2" id="storyModalAuthor">Author</span>
                            <span class="badge bg-light text-secondary border" id="storyModalDate">Date</span>
                        </div>
                        <div class="mb-3">
                            <h6 class="text-muted small mb-2">Description</h6>
                            <p id="storyModalDescription" class="text-dark">-</p>
                        </div>
                        <div>
                            <h6 class="text-muted small mb-2">Full Content</h6>
                            <div id="storyModalContent" class="bg-light rounded-3 p-3" style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;">-</div>
                        </div>
                    </div>
                    <div class="modal-footer border-0" id="storyModalFooter">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachEventListeners(currentUser, profile) {
    const cardsContainer = document.getElementById('story-cards-container');
    const filterSelect = document.getElementById('storyFilterSelect');
    const searchInput = document.getElementById('storySearchInput');

    let allStories = [];
    let studentLookup = {};

    const updateStats = () => {
        const pending = allStories.filter(s => !s.isAccepted).length;
        const approved = allStories.filter(s => s.isAccepted).length;

        document.getElementById('stat-pending-stories').textContent = pending;
        document.getElementById('stat-approved-stories').textContent = approved;
        document.getElementById('stat-total-stories').textContent = allStories.length;
    };

    const updateGridState = (data) => {
        if (data.length === 0) {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${fileTextFill}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No stories found</h4>
                <p class="text-muted">There are no stories matching your criteria.</p>
            `;
        } else {
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5";
            cardsContainer.innerHTML = data.map(story => {
                const studentId = story.students?.$id || story.students;
                const studentName = studentLookup[studentId] || 'Unknown Author';
                return createStoryCardHTML(story, studentName);
            }).join('');
        }
    };

    const applyFilters = () => {
        const filterVal = filterSelect.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = [...allStories];

        // Status Filter
        if (filterVal === 'pending') {
            filtered = filtered.filter(s => !s.isAccepted);
        } else if (filterVal === 'approved') {
            filtered = filtered.filter(s => s.isAccepted);
        }

        // Search Filter
        if (searchTerm) {
            filtered = filtered.filter(s => {
                const title = s.title || '';
                const desc = s.post_description || '';
                return title.toLowerCase().includes(searchTerm) || desc.toLowerCase().includes(searchTerm);
            });
        }

        updateGridState(filtered);
    };

    const loadData = async () => {
        try {
            if (DEV_BYPASS) {
                const { mockStories, mockStudents } = await import('../../shared/mock/mockData.js');
                allStories = [...mockStories];
                studentLookup = mockStudents.reduce((acc, s) => {
                    acc[s.$id] = s.name;
                    return acc;
                }, {});
            } else {
                const [storiesRes, studentsRes] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, [Query.limit(500), Query.orderDesc('$createdAt')]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(500)])
                ]);
                allStories = storiesRes.documents;
                studentLookup = studentsRes.documents.reduce((acc, s) => {
                    acc[s.$id] = s.name;
                    return acc;
                }, {});
            }
            updateStats();
            applyFilters();
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load stories.</div></div>`;
        }
    };

    await loadData();

    // Listeners
    filterSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    // Card Actions
    cardsContainer.addEventListener('click', async (e) => {
        // View Story
        const viewBtn = e.target.closest('.view-story-btn');
        if (viewBtn) {
            const storyId = viewBtn.dataset.storyId;
            const story = allStories.find(s => s.$id === storyId);
            if (story) {
                showStoryModal(story, studentLookup);
            }
        }

        // Approve Story
        const approveBtn = e.target.closest('.approve-story-btn');
        if (approveBtn) {
            const storyId = approveBtn.dataset.storyId;
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.approveStory(storyId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'approve_story',
                            payload: { story_id: storyId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Update local state - officer approval sends to admin queue
                const story = allStories.find(s => s.$id === storyId);
                if (story) {
                    story.officerApproval = true;
                }
                updateStats();
                applyFilters();
                showToast('Story approved! Sent to admin for final review.', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                approveBtn.disabled = false;
                approveBtn.innerHTML = `<img src="${checkCircleFill}" width="14" style="filter: brightness(0) invert(1);">`;
            }
        }

        // Reject Story
        const rejectBtn = e.target.closest('.reject-story-btn');
        if (rejectBtn) {
            const storyId = rejectBtn.dataset.storyId;

            const confirmed = await confirmAction('Reject Story', 'Are you sure you want to reject and delete this story?', 'Reject', 'danger');
            if (!confirmed) {
                return;
            }

            rejectBtn.disabled = true;
            rejectBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.rejectStory(storyId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'reject_story',
                            payload: { story_id: storyId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Remove from local state
                allStories = allStories.filter(s => s.$id !== storyId);
                updateStats();
                applyFilters();
                showToast('Story rejected and removed.', 'warning');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                rejectBtn.disabled = false;
                rejectBtn.innerHTML = `<img src="${xCircleFill}" width="14">`;
            }
        }
    });
}

function showStoryModal(story, studentLookup) {
    const modal = document.getElementById('storyDetailModal');
    const studentId = story.students?.$id || story.students;
    const studentName = studentLookup[studentId] || 'Unknown Author';
    const createdAt = new Date(story.$createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('storyModalTitle').textContent = story.title || 'Untitled';
    document.getElementById('storyModalAuthor').textContent = studentName;
    document.getElementById('storyModalDate').textContent = createdAt;
    document.getElementById('storyModalDescription').textContent = story.post_description || 'No description';
    document.getElementById('storyModalContent').textContent = story.post_details || 'No content';

    // Show modal using Bootstrap
    const bsModal = new (window.bootstrap?.Modal || class { show() { } })(modal);
    bsModal.show();
}

export default function renderStoriesView(user, profile) {
    return {
        html: getStoriesHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}
