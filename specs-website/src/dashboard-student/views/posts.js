import { databases, storage } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_STORIES,
    BUCKET_ID_EVENT_IMAGES
} from '../../shared/constants.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

import plusCircle from 'bootstrap-icons/icons/plus-circle.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';
import pencilSquare from 'bootstrap-icons/icons/pencil-square.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import clockIcon from 'bootstrap-icons/icons/clock.svg';
import xCircle from 'bootstrap-icons/icons/x-circle.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

function getStatusBadge(story) {
    if (story.isAccepted) {
        return `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
            <img src="${checkCircle}" width="12" class="me-1" style="opacity: 0.8;"> Published
        </span>`;
    }
    return `<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
        <img src="${clockIcon}" width="12" class="me-1" style="opacity: 0.8;"> Pending Review
    </span>`;
}

function createPostCardHTML(story) {
    const createdAt = new Date(story.$createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const description = story.post_description || '';
    const truncatedDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm post-card">
                <div class="card-body p-4 position-relative">
                    <div class="position-absolute top-0 end-0 m-3">
                        ${getStatusBadge(story)}
                    </div>
                    
                    <div class="mb-3">
                        <h5 class="fw-bold text-dark mb-2 pe-5" title="${story.title}">${story.title || 'Untitled'}</h5>
                        <p class="text-muted small mb-0" style="line-height: 1.5;">${truncatedDesc || 'No description'}</p>
                    </div>
                    
                    <div class="d-flex align-items-center gap-2 text-secondary border-top border-light pt-3">
                        <img src="${calendarIcon}" width="14" style="opacity: 0.6;">
                        <span class="small">${createdAt}</span>
                    </div>
                    
                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-sm btn-outline-primary flex-fill edit-post-btn" data-story-id="${story.$id}">
                            <img src="${pencilSquare}" width="14" class="me-1">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-post-btn" data-story-id="${story.$id}" data-story-title="${story.title}">
                            <img src="${trash}" width="14">
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getPostsHTML(isVolunteer) {
    if (!isVolunteer) {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-lg-6 text-center">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-5">
                                <div class="bg-warning-subtle rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style="width: 80px; height: 80px;">
                                    <img src="${fileTextFill}" style="width: 36px; opacity: 0.6;">
                                </div>
                                <h4 class="fw-bold text-dark mb-3">Volunteer Access Required</h4>
                                <p class="text-muted mb-4">You need to be a volunteer to create and publish posts. Request volunteer status from your profile settings.</p>
                                <a href="#profile" class="btn btn-primary px-4">Go to Profile Settings</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="posts-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">My Posts</h1>
                    <p class="text-muted mb-0">Create and manage your volunteer posts.</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex justify-content-lg-end">
                        <button id="createPostBtn" class="btn btn-primary px-4 py-2 shadow-sm">
                            <img src="${plusCircle}" width="18" class="me-2" style="filter: brightness(0) invert(1);">
                            Create Post
                        </button>
                    </div>
                </div>
            </header>
            
            <!-- Stats Row -->
            <div class="row g-4 mb-5">
                <div class="col-6 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-primary mb-1" id="stat-total-posts">-</div>
                            <div class="text-muted small">Total Posts</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-success mb-1" id="stat-published-posts">-</div>
                            <div class="text-muted small">Published</div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-warning mb-1" id="stat-pending-posts">-</div>
                            <div class="text-muted small">Pending Review</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="posts-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5" style="min-height: 300px;">
                <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
            </div>
        </div>
        
        <!-- Create/Edit Post Modal -->
        <div class="modal fade" id="postModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0">
                        <h5 class="modal-title fw-bold" id="postModalTitle">Create New Post</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="postForm">
                        <div class="modal-body">
                            <input type="hidden" id="postId" value="">
                            
                            <div class="mb-4">
                                <label for="postTitleInput" class="form-label fw-medium">Title <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="postTitleInput" placeholder="Enter a compelling title for your post" required maxlength="200">
                                <div class="form-text d-flex justify-content-between">
                                    <span>Create a clear, descriptive title</span>
                                    <span id="titleCharCount" class="fw-medium">0/200</span>
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label for="postDescriptionInput" class="form-label fw-medium">Short Description <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="postDescriptionInput" rows="2" placeholder="Write a brief summary that appears in previews and search results" required maxlength="500"></textarea>
                                <div class="form-text d-flex justify-content-between">
                                    <span>This summary appears in post previews</span>
                                    <span id="descCharCount" class="fw-medium">0/500</span>
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label for="postContentInput" class="form-label fw-medium">Full Content <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="postContentInput" rows="8" placeholder="Share your story, experience, or information with the SPECS community. Be detailed and engaging!" required></textarea>
                                <div class="form-text d-flex justify-content-between">
                                    <span>Write the full post content here</span>
                                    <span id="contentCharCount" class="fw-medium">0 characters</span>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="postLinksInput" class="form-label fw-medium">Related Links (optional)</label>
                                <input type="text" class="form-control" id="postLinksInput" placeholder="Enter URLs separated by commas">
                                <div class="form-text">Separate multiple URLs with commas</div>
                            </div>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="postSubmitBtn">
                                Create Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function attachEventListeners(studentDoc, currentUser) {
    const isVolunteer = studentDoc?.is_volunteer === true;

    if (!isVolunteer) {
        return; // No event listeners needed for non-volunteers
    }

    const cardsContainer = document.getElementById('posts-cards-container');
    const createPostBtn = document.getElementById('createPostBtn');
    const postForm = document.getElementById('postForm');
    const postModal = document.getElementById('postModal');

    let myPosts = [];
    let modalInstance = null;

    const updateStats = () => {
        const total = myPosts.length;
        const published = myPosts.filter(s => s.isAccepted).length;
        const pending = myPosts.filter(s => !s.isAccepted).length;

        document.getElementById('stat-total-posts').textContent = total;
        document.getElementById('stat-published-posts').textContent = published;
        document.getElementById('stat-pending-posts').textContent = pending;
    };

    const updateGridState = () => {
        if (myPosts.length === 0) {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${fileTextFill}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No posts yet</h4>
                <p class="text-muted mb-4">Create your first post to share with the community!</p>
                <button class="btn btn-primary px-4" id="emptyStateCreateBtn">
                    <img src="${plusCircle}" width="18" class="me-2" style="filter: brightness(0) invert(1);">
                    Create Your First Post
                </button>
            `;

            // Attach listener to empty state button
            const emptyBtn = document.getElementById('emptyStateCreateBtn');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', openCreateModal);
            }
        } else {
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5";
            cardsContainer.innerHTML = myPosts.map(createPostCardHTML).join('');
        }
    };

    const loadData = async () => {
        try {
            if (DEV_BYPASS) {
                const { mockStories } = await import('../../shared/mock/mockData.js');
                myPosts = mockStories.filter(s => s.students?.$id === studentDoc.$id);
            } else {
                const res = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID_STORIES,
                    [
                        Query.equal('students', studentDoc.$id),
                        Query.orderDesc('$createdAt'),
                        Query.limit(100)
                    ]
                );
                myPosts = res.documents;
            }
            updateStats();
            updateGridState();
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load posts.</div></div>`;
        }
    };

    const openCreateModal = () => {
        document.getElementById('postModalTitle').textContent = 'Create New Post';
        document.getElementById('postSubmitBtn').textContent = 'Create Post';
        document.getElementById('postId').value = '';
        postForm.reset();
        updateCharCounters();

        modalInstance = new Modal(postModal);
        modalInstance.show();
    };

    const openEditModal = (story) => {
        document.getElementById('postModalTitle').textContent = 'Edit Post';
        document.getElementById('postSubmitBtn').textContent = 'Save Changes';
        document.getElementById('postId').value = story.$id;
        document.getElementById('postTitleInput').value = story.title || '';
        document.getElementById('postDescriptionInput').value = story.post_description || '';
        document.getElementById('postContentInput').value = story.post_details || '';
        document.getElementById('postLinksInput').value = (story.related_links || []).join(', ');
        updateCharCounters();

        modalInstance = new Modal(postModal);
        modalInstance.show();
    };

    // Character counter helper
    const updateCharCounters = () => {
        const titleInput = document.getElementById('postTitleInput');
        const descInput = document.getElementById('postDescriptionInput');
        const contentInput = document.getElementById('postContentInput');

        const titleCount = document.getElementById('titleCharCount');
        const descCount = document.getElementById('descCharCount');
        const contentCount = document.getElementById('contentCharCount');

        if (titleCount && titleInput) {
            titleCount.textContent = `${titleInput.value.length}/200`;
            titleCount.className = titleInput.value.length > 180 ? 'fw-medium text-warning' : 'fw-medium';
        }
        if (descCount && descInput) {
            descCount.textContent = `${descInput.value.length}/500`;
            descCount.className = descInput.value.length > 450 ? 'fw-medium text-warning' : 'fw-medium';
        }
        if (contentCount && contentInput) {
            contentCount.textContent = `${contentInput.value.length} characters`;
        }
    };

    // Attach character counter event listeners
    document.getElementById('postTitleInput')?.addEventListener('input', updateCharCounters);
    document.getElementById('postDescriptionInput')?.addEventListener('input', updateCharCounters);
    document.getElementById('postContentInput')?.addEventListener('input', updateCharCounters);

    await loadData();

    // Create Post Button
    createPostBtn.addEventListener('click', openCreateModal);

    // Form Submit
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('postSubmitBtn');
        const postId = document.getElementById('postId').value;
        const isEdit = !!postId;

        const title = document.getElementById('postTitleInput').value.trim();
        const description = document.getElementById('postDescriptionInput').value.trim();
        const content = document.getElementById('postContentInput').value.trim();
        const linksStr = document.getElementById('postLinksInput').value.trim();
        const links = linksStr ? linksStr.split(',').map(l => l.trim()).filter(l => l) : [];

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const postData = {
                title,
                post_description: description,
                post_details: content,
                related_links: links,
                meaning: []
            };

            if (DEV_BYPASS) {
                const { mockApi } = await import('../../shared/mock/mockApiService.js');
                if (isEdit) {
                    await mockApi.updateStory(postId, postData);
                    const idx = myPosts.findIndex(p => p.$id === postId);
                    if (idx !== -1) {
                        myPosts[idx] = { ...myPosts[idx], ...postData };
                    }
                } else {
                    const newStory = await mockApi.createStory({
                        ...postData,
                        studentId: studentDoc.$id
                    });
                    myPosts.unshift(newStory);
                }
            } else {
                if (isEdit) {
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, postId, postData);
                    const idx = myPosts.findIndex(p => p.$id === postId);
                    if (idx !== -1) {
                        myPosts[idx] = { ...myPosts[idx], ...postData };
                    }
                } else {
                    const newStory = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTION_ID_STORIES,
                        ID.unique(),
                        {
                            ...postData,
                            students: studentDoc.$id,
                            isAccepted: false,
                            image_bucket: null
                        }
                    );
                    myPosts.unshift(newStory);
                }
            }

            modalInstance?.hide();
            updateStats();
            updateGridState();
            showToast(isEdit ? 'Post updated!' : 'Post created and submitted for review!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Post';
        }
    });

    // Card Actions (Edit, Delete)
    cardsContainer.addEventListener('click', async (e) => {
        // Edit Post
        const editBtn = e.target.closest('.edit-post-btn');
        if (editBtn) {
            const storyId = editBtn.dataset.storyId;
            const story = myPosts.find(s => s.$id === storyId);
            if (story) {
                openEditModal(story);
            }
        }

        // Delete Post
        const deleteBtn = e.target.closest('.delete-post-btn');
        if (deleteBtn) {
            const storyId = deleteBtn.dataset.storyId;
            const storyTitle = deleteBtn.dataset.storyTitle;

            if (!confirm(`Are you sure you want to delete "${storyTitle}"? This cannot be undone.`)) {
                return;
            }

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.deleteStory(storyId);
                } else {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId);
                }

                myPosts = myPosts.filter(s => s.$id !== storyId);
                updateStats();
                updateGridState();
                showToast('Post deleted.', 'warning');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'danger');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<img src="${trash}" width="14">`;
            }
        }
    });
}

function showToast(message, type = 'primary') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastEl = document.getElementById(toastId);
    const toast = new (window.bootstrap?.Toast || class { show() { } hide() { } })(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

export default function renderPostsView(studentDoc, currentUser) {
    const isVolunteer = studentDoc?.is_volunteer === true;

    return {
        html: getPostsHTML(isVolunteer),
        afterRender: () => attachEventListeners(studentDoc, currentUser)
    };
}
