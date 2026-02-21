// views/renderAdmin/stories.js (Admin)
import { databases, storage, functions, account } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_STORIES, COLLECTION_ID_STUDENTS, FUNCTION_ID } from '../../shared/constants.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import pencilIcon from 'bootstrap-icons/icons/pencil.svg';
import trashIcon from 'bootstrap-icons/icons/trash.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES;

export default function renderStoriesView() {
    const html = `
    <div class="admin-stories-container animate-fade-in-up">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
             <div class="mb-2 mb-md-0">
                <h1 class="display-6 fw-bold text-dark mb-1">Manage Stories</h1>
                <p class="text-muted mb-0">Approve, edit, and manage all stories.</p>
            </div>
            <div class="d-flex flex-column flex-sm-row gap-3 align-items-start align-items-sm-center">
                <select id="adminStoryFilter" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px; cursor: pointer;">
                    <option value="pending" selected>Pending Approval</option>
                    <option value="approved">Published</option>
                    <option value="all">All Stories</option>
                </select>
                <div class="d-flex align-items-center bg-white shadow-sm rounded" style="max-width: 260px;">
                    <span class="ps-3"><img src="${searchIcon}" width="14" style="opacity:0.4"></span>
                    <input type="search" id="adminStorySearch" class="form-control border-0 shadow-none py-2 ps-2" placeholder="Search stories...">
                </div>
            </div>
        </div>

        <!-- Stats -->
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-4">
                <div class="card border-0 shadow-sm"><div class="card-body text-center py-3">
                    <div class="fs-4 fw-bold text-warning" id="admin-stat-pending">-</div>
                    <div class="text-muted small">Pending</div>
                </div></div>
            </div>
            <div class="col-6 col-md-4">
                <div class="card border-0 shadow-sm"><div class="card-body text-center py-3">
                    <div class="fs-4 fw-bold text-success" id="admin-stat-published">-</div>
                    <div class="text-muted small">Published</div>
                </div></div>
            </div>
            <div class="col-12 col-md-4">
                <div class="card border-0 shadow-sm"><div class="card-body text-center py-3">
                    <div class="fs-4 fw-bold text-primary" id="admin-stat-total">-</div>
                    <div class="text-muted small">Total</div>
                </div></div>
            </div>
        </div>

        <div id="admin-stories-container" class="row g-4">
             <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
        </div>
    </div>

    <!-- Edit Story Modal -->
    <div class="modal fade" id="adminEditStoryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header border-bottom-0">
                    <h5 class="modal-title fw-bold">Edit Story</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="adminEditStoryId">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Title</label>
                        <input type="text" class="form-control" id="adminEditStoryTitle" maxlength="200">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Description</label>
                        <textarea class="form-control" id="adminEditStoryDesc" rows="3"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Full Content</label>
                        <textarea class="form-control" id="adminEditStoryContent" rows="6"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Cover Image (optional)</label>
                        <input type="file" class="form-control" id="adminEditStoryImage" accept="image/jpeg,image/png,image/webp">
                        <div class="form-text">Recommended: 1200×630px, JPG/PNG/WebP, max 5 MB</div>
                        <div id="adminEditImagePreview" class="mt-2 d-none">
                            <img id="adminEditImagePreviewImg" src="" alt="Preview" class="rounded border" style="max-height: 160px; max-width: 100%; object-fit: cover;">
                            <button type="button" class="btn btn-sm btn-outline-danger ms-2" id="adminRemoveEditImage">Remove</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top-0">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="adminSaveStoryBtn">Save Changes</button>
                </div>
            </div>
        </div>
    </div>
    `;

    const afterRender = async () => {
        const container = document.getElementById('admin-stories-container');
        const filterSelect = document.getElementById('adminStoryFilter');
        const searchInput = document.getElementById('adminStorySearch');

        let currentUser;
        try {
            currentUser = await account.get();
        } catch (err) {
            console.error('Failed to get current user:', err);
        }

        let allStories = [];
        let studentLookup = {};

        const updateStats = () => {
            const pending = allStories.filter(s => !s.isAccepted).length;
            const published = allStories.filter(s => s.isAccepted).length;
            document.getElementById('admin-stat-pending').textContent = pending;
            document.getElementById('admin-stat-published').textContent = published;
            document.getElementById('admin-stat-total').textContent = allStories.length;
        };

        const renderCards = (stories) => {
            if (stories.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-5 text-muted">
                            <i class="bi bi-journal-text display-1 opacity-25"></i>
                            <p class="mt-3">No stories found.</p>
                        </div>
                    </div>`;
                return;
            }

            container.innerHTML = stories.map(story => {
                const studentId = story.students?.$id || story.students;
                const authorName = studentLookup[studentId] || story.author || 'Unknown';
                const statusBadge = story.isAccepted
                    ? '<span class="badge bg-success-subtle text-success border border-success-subtle mb-2">Published</span>'
                    : story.officerApproval
                        ? '<span class="badge bg-info-subtle text-info border border-info-subtle mb-2">Officer Approved</span>'
                        : '<span class="badge bg-warning-subtle text-warning border border-warning-subtle mb-2">Pending</span>';
                const description = story.post_description || '';
                const truncatedDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;

                let imageHtml = '';
                if (story.image_bucket) {
                    try {
                        const imageUrl = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 400, 250);
                        imageHtml = `<img src="${imageUrl}" class="card-img-top" alt="${story.title}" style="height: 180px; object-fit: cover;">`;
                    } catch { /* skip image */ }
                }

                return `
                <div class="col-md-6 col-xl-4">
                    <div class="card h-100 border-0 shadow-sm">
                        ${imageHtml}
                        <div class="card-body">
                            ${statusBadge}
                            <h5 class="card-title fw-bold mb-1">${story.title || 'Untitled'}</h5>
                            <h6 class="card-subtitle mb-2 text-muted small">By: ${authorName}</h6>
                            <p class="card-text text-muted small line-clamp-3">${truncatedDesc || 'No description'}</p>
                            <div class="d-flex flex-column gap-2 mt-3">
                                ${!story.isAccepted ? `
                                <button class="btn btn-primary btn-sm w-100 approve-btn" data-id="${story.$id}">
                                    <img src="${checkCircle}" style="width: 1em; filter: invert(1);" class="me-1">Publish Story
                                </button>` : ''}
                                <div class="d-flex gap-2">
                                    <button class="btn btn-outline-secondary btn-sm flex-fill edit-story-btn" data-id="${story.$id}">
                                        <img src="${pencilIcon}" style="width: 1em;" class="me-1">Edit
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm flex-fill delete-story-btn" data-id="${story.$id}">
                                        <img src="${trashIcon}" style="width: 1em;" class="me-1">Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        };

        const applyFilters = () => {
            const filterVal = filterSelect.value;
            const searchTerm = searchInput.value.toLowerCase().trim();
            let filtered = [...allStories];

            if (filterVal === 'pending') {
                filtered = filtered.filter(s => !s.isAccepted);
            } else if (filterVal === 'approved') {
                filtered = filtered.filter(s => s.isAccepted);
            }

            if (searchTerm) {
                filtered = filtered.filter(s => {
                    const title = (s.title || '').toLowerCase();
                    const desc = (s.post_description || '').toLowerCase();
                    return title.includes(searchTerm) || desc.includes(searchTerm);
                });
            }

            renderCards(filtered);
        };

        const loadStories = async () => {
            try {
                const [storiesRes, studentsRes] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, [Query.limit(500), Query.orderDesc('$createdAt')]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(500)])
                ]);
                allStories = storiesRes.documents;
                studentLookup = studentsRes.documents.reduce((acc, s) => {
                    acc[s.$id] = s.name;
                    return acc;
                }, {});
                updateStats();
                applyFilters();
            } catch (error) {
                console.error("Failed to fetch stories", error);
                container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load stories.</div></div>`;
            }
        };

        await loadStories();

        // Filter & search listeners
        filterSelect.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);

        // Delegated event listeners on the card container
        container.addEventListener('click', async (e) => {
            // --- Publish / Approve ---
            const approveBtn = e.target.closest('.approve-btn');
            if (approveBtn) {
                const storyId = approveBtn.dataset.id;
                approveBtn.disabled = true;
                approveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Publishing...';
                try {
                    if (FUNCTION_ID) {
                        await functions.createExecution(
                            FUNCTION_ID,
                            JSON.stringify({
                                action: 'approve_story',
                                payload: { story_id: storyId },
                                requestingUserId: currentUser?.$id
                            }),
                            false
                        );
                    } else {
                        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId, {
                            adminApproval: true,
                            isAccepted: true
                        });
                    }
                    toast.success('Story published successfully!', { title: 'Published' });
                    await loadStories();
                } catch (err) {
                    console.error("Publish failed:", err);
                    toast.error('Failed to publish story. Please try again.');
                    approveBtn.disabled = false;
                    approveBtn.innerHTML = 'Publish';
                }
            }

            // --- Edit ---
            const editBtn = e.target.closest('.edit-story-btn');
            if (editBtn) {
                const storyId = editBtn.dataset.id;
                const story = allStories.find(s => s.$id === storyId);
                if (!story) return;

                document.getElementById('adminEditStoryId').value = story.$id;
                document.getElementById('adminEditStoryTitle').value = story.title || '';
                document.getElementById('adminEditStoryDesc').value = story.post_description || '';
                document.getElementById('adminEditStoryContent').value = story.post_details || '';

                // Show existing image
                resetAdminImageState();
                if (story.image_bucket && BUCKET_ID_HIGHLIGHT_IMAGES) {
                    try {
                        adminExistingImageId = story.image_bucket;
                        const previewImg = document.getElementById('adminEditImagePreviewImg');
                        const previewWrap = document.getElementById('adminEditImagePreview');
                        previewImg.src = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 600, 320);
                        previewWrap.classList.remove('d-none');
                    } catch { /* skip */ }
                }

                const editModal = Modal.getOrCreateInstance(document.getElementById('adminEditStoryModal'));
                editModal.show();
            }

            // --- Delete ---
            const deleteBtn = e.target.closest('.delete-story-btn');
            if (deleteBtn) {
                const storyId = deleteBtn.dataset.id;
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
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId);
                    allStories = allStories.filter(s => s.$id !== storyId);
                    updateStats();
                    applyFilters();
                    toast.success('Story deleted successfully.');
                } catch (err) {
                    console.error("Delete failed:", err);
                    toast.error('Failed to delete story. Please try again.');
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = `<img src="${trashIcon}" style="width: 1em;">`;
                }
            }
        });

        // --- Save edit handler ---
        document.getElementById('adminSaveStoryBtn').addEventListener('click', async () => {
            const saveBtn = document.getElementById('adminSaveStoryBtn');
            const storyId = document.getElementById('adminEditStoryId').value;
            const title = document.getElementById('adminEditStoryTitle').value.trim();
            const description = document.getElementById('adminEditStoryDesc').value.trim();
            const content = document.getElementById('adminEditStoryContent').value.trim();

            if (!title) {
                toast.warning('Title is required.');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

            try {
                // Handle image upload if a new file was selected
                let imageBucketId = adminExistingImageId || null;
                if (adminPendingImageFile && BUCKET_ID_HIGHLIGHT_IMAGES) {
                    try {
                        const uploadRes = await storage.createFile(
                            BUCKET_ID_HIGHLIGHT_IMAGES,
                            ID.unique(),
                            adminPendingImageFile
                        );
                        imageBucketId = uploadRes.$id;
                    } catch (uploadErr) {
                        console.error('Image upload failed:', uploadErr);
                        toast.error('Image upload failed: ' + uploadErr.message);
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

                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId, updatePayload);

                // Update local state
                const story = allStories.find(s => s.$id === storyId);
                if (story) {
                    story.title = title;
                    story.post_description = description;
                    story.post_details = content;
                    if (imageBucketId !== undefined) story.image_bucket = imageBucketId;
                }

                Modal.getInstance(document.getElementById('adminEditStoryModal')).hide();
                applyFilters();
                toast.success('Story updated successfully.');
            } catch (err) {
                console.error("Update failed:", err);
                toast.error('Failed to update story. Please try again.');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save Changes';
            }
        });
    };

    return { html, afterRender };
}
