// views/renderAdmin/stories.js (Admin)
import { databases, storage, functions, account } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_STORIES, FUNCTION_ID } from '../../shared/constants.js';
import { Query } from 'appwrite';
import toast from '../../shared/toast.js';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES;

export default function renderStoriesView() {
    const html = `
    <div class="admin-stories-container animate-fade-in-up">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
             <div class="mb-2 mb-md-0">
                <h2 class="fw-bold m-0 text-primary">Story Approvals</h2>
                <p class="text-muted m-0 small">Final approval for stories already verified by officers.</p>
            </div>
        </div>

        <div id="admin-stories-container" class="row g-4">
             <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
        </div>
    </div>
    `;

    const afterRender = async () => {
        const container = document.getElementById('admin-stories-container');

        let currentUser;
        try {
            currentUser = await account.get();
        } catch (err) {
            console.error('Failed to get current user:', err);
        }

        const fetchPendingStories = async () => {
            try {
                // Admin needs to see stories where:
                // officerApproval is true AND adminApproval is false (or not true)
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID_STORIES,
                    [
                        Query.equal('officerApproval', true),
                        Query.equal('adminApproval', false), // Assuming default is false
                        Query.orderDesc('$createdAt')
                    ]
                );

                if (response.documents.length === 0) {
                    container.innerHTML = `
                        <div class="col-12">
                            <div class="text-center py-5 text-muted">
                                <i class="bi bi-check-all display-1 opacity-25"></i>
                                <p class="mt-3">No pending stories awaiting final approval.</p>
                            </div>
                        </div>`;
                    return;
                }

                container.innerHTML = response.documents.map(story => {
                    const imageUrl = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 400, 250);
                    return `
                    <div class="col-md-6 col-xl-4">
                        <div class="card h-100 border-0 shadow-sm">
                            <img src="${imageUrl}" class="card-img-top" alt="${story.title}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <span class="badge bg-success-subtle text-success border border-success-subtle mb-2">Officer Approved</span>
                                <h5 class="card-title fw-bold mb-2">${story.title}</h5>
                                <h6 class="card-subtitle mb-2 text-muted small">By: ${story.author}</h6>
                                <p class="card-text text-muted small line-clamp-3">${story.post_description}</p>
                                <button class="btn btn-primary w-100 mt-3 approve-btn" data-id="${story.$id}">
                                    <img src="${checkCircle}" style="width: 1em; filter: invert(1);" class="me-2">Publish Story
                                </button>
                            </div>
                        </div>
                    </div>`;
                }).join('');

                // Attach listeners
                document.querySelectorAll('.approve-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const storyId = e.currentTarget.dataset.id;
                        e.currentTarget.disabled = true;
                        e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publishing...';
                        
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
                                // Fallback: direct DB update if function not configured
                                await databases.updateDocument(
                                    DATABASE_ID,
                                    COLLECTION_ID_STORIES,
                                    storyId,
                                    {
                                        adminApproval: true,
                                        isAccepted: true
                                    }
                                );
                            }
                            toast.success('Story published successfully!', { title: 'Published' });
                            // Refresh
                            await fetchPendingStories();
                        } catch (err) {
                            console.error("Publish failed:", err);
                            toast.error('Failed to publish story. Please try again.');
                            e.currentTarget.disabled = false;
                            e.currentTarget.innerHTML = 'Publish Story';
                        }
                    });
                });

            } catch (error) {
                console.error("Failed to fetch pending stories", error);
                container.innerHTML = `<div class="alert alert-danger">Failed to load stories.</div>`;
            }
        };

        fetchPendingStories();
    };

    return { html, afterRender };
}
