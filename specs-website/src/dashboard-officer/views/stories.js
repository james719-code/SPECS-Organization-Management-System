import { databases, functions, storage } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_STORIES,
    COLLECTION_ID_STUDENTS,
    FUNCTION_ID
} from '../../shared/constants.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';
import eyeIcon from 'bootstrap-icons/icons/eye.svg';
import pencilIcon from 'bootstrap-icons/icons/pencil.svg';
import trashIcon from 'bootstrap-icons/icons/trash.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;
const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES;

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
                <div class="card-body p-4">
                    <div class="mb-2">${statusBadge}</div>
                    
                    <div class="mb-3">
                        <h5 class="fw-bold text-dark mb-2" title="${story.title}">${story.title || 'Untitled'}</h5>
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
                    
                    <div class="d-flex flex-column gap-2 mt-4">
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill view-story-btn" data-story-id="${story.$id}">
                                <img src="${eyeIcon}" width="14" class="me-1">View
                            </button>
                            ${!story.isAccepted ? `
                                <button class="btn btn-sm btn-success flex-fill approve-story-btn" data-story-id="${story.$id}">
                                    <img src="${checkCircleFill}" width="14" style="filter: brightness(0) invert(1);" class="me-1">Approve
                                </button>
                                <button class="btn btn-sm btn-outline-danger flex-fill reject-story-btn" data-story-id="${story.$id}">
                                    <img src="${xCircleFill}" width="14" class="me-1">Reject
                                </button>
                            ` : ''}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary flex-fill edit-story-btn" data-story-id="${story.$id}">
                                <img src="${pencilIcon}" width="14" class="me-1">Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger flex-fill delete-story-btn" data-story-id="${story.$id}">
                                <img src="${trashIcon}" width="14" class="me-1">Delete
                            </button>
                        </div>
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
                        <div class="officer-search-bar d-flex align-items-center" style="max-width: 300px;">
                            <span class="input-group-text bg-transparent border-0 ps-3">
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
                    <div class="card officer-stat-card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-warning mb-1" id="stat-pending-stories">-</div>
                            <div class="text-muted small">Pending Review</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-4">
                    <div class="card officer-stat-card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-success mb-1" id="stat-approved-stories">-</div>
                            <div class="text-muted small">Approved</div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card officer-stat-card border-0 shadow-sm">
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
                        <div id="storyModalImageWrap" class="mb-3 d-none">
                            <img id="storyModalImage" src="" alt="Story image" class="w-100 rounded" style="max-height: 280px; object-fit: cover;">
                        </div>
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

        <!-- Edit Story Modal -->
        <div class="modal fade" id="officerEditStoryModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-bottom-0">
                        <h5 class="modal-title fw-bold">Edit Story</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="officerEditStoryId">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Title</label>
                            <input type="text" class="form-control" id="officerEditStoryTitle" maxlength="200">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Description</label>
                            <textarea class="form-control" id="officerEditStoryDesc" rows="3"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Full Content</label>
                            <textarea class="form-control" id="officerEditStoryContent" rows="6"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Cover Image (optional)</label>
                            <input type="file" class="form-control" id="officerEditStoryImage" accept="image/jpeg,image/png,image/webp">
                            <div class="form-text">Recommended: 1200×630px, JPG/PNG/WebP, max 5 MB</div>
                            <div id="officerEditImagePreview" class="mt-2 d-none">
                                <img id="officerEditImagePreviewImg" src="" alt="Preview" class="rounded border" style="max-height: 160px; max-width: 100%; object-fit: cover;">
                                <button type="button" class="btn btn-sm btn-outline-danger ms-2" id="officerRemoveEditImage">Remove</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="officerSaveStoryBtn">Save Changes</button>
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

    // Image upload state for edit modal
    let officerPendingImageFile = null;
    let officerExistingImageId = null;

    const setupOfficerImageHandlers = () => {
        const imageInput = document.getElementById('officerEditStoryImage');
        const previewWrap = document.getElementById('officerEditImagePreview');
        const previewImg = document.getElementById('officerEditImagePreviewImg');
        const removeBtn = document.getElementById('officerRemoveEditImage');

        imageInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image must be under 5 MB.', 'error');
                imageInput.value = '';
                return;
            }
            officerPendingImageFile = file;
            previewImg.src = URL.createObjectURL(file);
            previewWrap.classList.remove('d-none');
        });

        removeBtn?.addEventListener('click', () => {
            officerPendingImageFile = null;
            officerExistingImageId = null;
            imageInput.value = '';
            previewWrap.classList.add('d-none');
            previewImg.src = '';
        });
    };

    const resetOfficerImageState = () => {
        officerPendingImageFile = null;
        officerExistingImageId = null;
        const imageInput = document.getElementById('officerEditStoryImage');
        const previewWrap = document.getElementById('officerEditImagePreview');
        const previewImg = document.getElementById('officerEditImagePreviewImg');
        if (imageInput) imageInput.value = '';
        if (previewWrap) previewWrap.classList.add('d-none');
        if (previewImg) previewImg.src = '';
    };

    setupOfficerImageHandlers();

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

                // Update local state
                const story = allStories.find(s => s.$id === storyId);
                if (story) {
                    story.isAccepted = true;
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
                            payload: { story_id: storyId, collection_id: COLLECTION_ID_STORIES },
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

        // Edit Story
        const editBtn = e.target.closest('.edit-story-btn');
        if (editBtn) {
            const storyId = editBtn.dataset.storyId;
            const story = allStories.find(s => s.$id === storyId);
            if (!story) return;

            document.getElementById('officerEditStoryId').value = story.$id;
            document.getElementById('officerEditStoryTitle').value = story.title || '';
            document.getElementById('officerEditStoryDesc').value = story.post_description || '';
            document.getElementById('officerEditStoryContent').value = story.post_details || '';

            // Show existing image
            resetOfficerImageState();
            if (story.image_bucket && BUCKET_ID_HIGHLIGHT_IMAGES) {
                try {
                    officerExistingImageId = story.image_bucket;
                    const previewImg = document.getElementById('officerEditImagePreviewImg');
                    const previewWrap = document.getElementById('officerEditImagePreview');
                    previewImg.src = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 600, 320);
                    previewWrap.classList.remove('d-none');
                } catch { /* skip */ }
            }

            const editModal = Modal.getOrCreateInstance(document.getElementById('officerEditStoryModal'));
            editModal.show();
        }

        // Delete Story
        const deleteBtn = e.target.closest('.delete-story-btn');
        if (deleteBtn) {
            const storyId = deleteBtn.dataset.storyId;

            const confirmed = await confirmAction(
                'Delete Story',
                'Are you sure you want to permanently delete this story? This action cannot be undone.',
                'Delete',
                'danger'
            );
            if (!confirmed) return;

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.rejectStory(storyId, currentUser.$id);
                } else {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId);
                }

                allStories = allStories.filter(s => s.$id !== storyId);
                updateStats();
                applyFilters();
                showToast('Story deleted successfully.', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<img src="${trashIcon}" width="14">`;
            }
        }
    });

    // Save edit handler
    document.getElementById('officerSaveStoryBtn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('officerSaveStoryBtn');
        const storyId = document.getElementById('officerEditStoryId').value;
        const title = document.getElementById('officerEditStoryTitle').value.trim();
        const description = document.getElementById('officerEditStoryDesc').value.trim();
        const content = document.getElementById('officerEditStoryContent').value.trim();

        if (!title) {
            showToast('Title is required.', 'warning');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

        try {
            // Handle image upload if a new file was selected
            let imageBucketId = officerExistingImageId || null;
            if (officerPendingImageFile && BUCKET_ID_HIGHLIGHT_IMAGES) {
                try {
                    const uploadRes = await storage.createFile(
                        BUCKET_ID_HIGHLIGHT_IMAGES,
                        ID.unique(),
                        officerPendingImageFile
                    );
                    imageBucketId = uploadRes.$id;
                } catch (uploadErr) {
                    console.error('Image upload failed:', uploadErr);
                    showToast('Image upload failed: ' + uploadErr.message, 'error');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Save Changes';
                    return;
                }
            }

            const updatePayload = {
                title,
                post_description: description,
                post_details: content
            };
            if (imageBucketId !== undefined) updatePayload.image_bucket = imageBucketId;
            if (DEV_BYPASS) {
                // Mock update - just update local state
                const story = allStories.find(s => s.$id === storyId);
                if (story) {
                    story.title = title;
                    story.post_description = description;
                    story.post_details = content;
                    if (imageBucketId !== undefined) story.image_bucket = imageBucketId;
                }
            } else {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId, updatePayload);

                const story = allStories.find(s => s.$id === storyId);
                if (story) {
                    story.title = title;
                    story.post_description = description;
                    story.post_details = content;
                    if (imageBucketId !== undefined) story.image_bucket = imageBucketId;
                }
            }

            Modal.getInstance(document.getElementById('officerEditStoryModal')).hide();
            applyFilters();
            showToast('Story updated successfully.', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
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

    // Show story image if available
    const imageWrap = document.getElementById('storyModalImageWrap');
    const imageEl = document.getElementById('storyModalImage');
    if (story.image_bucket && BUCKET_ID_HIGHLIGHT_IMAGES) {
        try {
            imageEl.src = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 800, 400);
            imageWrap.classList.remove('d-none');
        } catch {
            imageWrap.classList.add('d-none');
        }
    } else {
        imageWrap.classList.add('d-none');
    }

    // Show modal using Bootstrap
    const bsModal = Modal.getOrCreateInstance(modal);

    // Fix aria-hidden focus issue: blur active element before modal hides
    if (!modal._blurListenerAttached) {
        modal.addEventListener('hide.bs.modal', () => {
            if (modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
        modal._blurListenerAttached = true;
    }

    bsModal.show();
}

export default function renderStoriesView(user, profile) {
    return {
        html: getStoriesHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}
