import toast from '../../shared/toast.js';
import { Modal } from 'bootstrap';
import { api } from '../../shared/api.js';
import { confirmAction } from '../../shared/confirmModal.js';

import megaphone from 'bootstrap-icons/icons/megaphone.svg';
import envelope from 'bootstrap-icons/icons/envelope.svg';
import bell from 'bootstrap-icons/icons/bell.svg';
import eyeFill from 'bootstrap-icons/icons/eye-fill.svg';
import clipboardIcon from 'bootstrap-icons/icons/clipboard.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import clockHistory from 'bootstrap-icons/icons/clock-history.svg';

/**
 * Announcements Compose & Copy View
 * Compose announcements, copy to clipboard, or open in email client
 */

const ANNOUNCEMENTS_STORAGE_KEY = 'admin_announcements_drafts';
const MAX_DRAFTS = 50;

function getDrafts() {
    try {
        const stored = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to retrieve drafts:', error);
        return [];
    }
}

function saveDraft(announcement) {
    try {
        const drafts = getDrafts();
        const existingIndex = drafts.findIndex(d => d.id === announcement.id);

        if (existingIndex >= 0) {
            drafts[existingIndex] = announcement;
        } else {
            drafts.unshift(announcement);
        }

        // Keep only the latest MAX_DRAFTS entries
        if (drafts.length > MAX_DRAFTS) {
            drafts.splice(MAX_DRAFTS);
        }

        localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(drafts));
        toast.success('Draft saved successfully');
    } catch (error) {
        console.error('Failed to save draft:', error);
        toast.error('Failed to save draft');
    }
}

function deleteDraft(id) {
    try {
        let drafts = getDrafts();
        drafts = drafts.filter(d => d.id !== id);
        localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(drafts));
        toast.success('Draft deleted');
    } catch (error) {
        console.error('Failed to delete draft:', error);
        toast.error('Failed to delete draft');
    }
}

function createDraftCardHTML(draft) {
    const date = new Date(draft.updatedAt || draft.createdAt).toLocaleString();
    const recipientLabel = draft.recipients === 'all' ? 'All Users' :
        draft.recipients === 'students' ? 'All Students' :
            draft.recipients === 'officers' ? 'All Officers' : 'Custom Selection';

    return `
        <div class="col">
            <div class="card draft-card h-100 shadow-sm border-0 hover-lift" data-draft-id="${draft.id}">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center gap-2">
                            <div class="icon-wrapper bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                                <i class="bi bi-file-text" style="font-size: 1rem;"></i>
                            </div>
                            <span class="badge bg-info-subtle text-info-emphasis">Draft</span>
                        </div>
                        <button class="btn btn-link text-danger p-0 delete-draft-btn" data-draft-id="${draft.id}" title="Delete draft">
                            <img src="${trash}" style="width: 1.1rem;">
                        </button>
                    </div>

                    <h6 class="fw-bold text-dark mb-2 text-truncate">${draft.subject || 'Untitled'}</h6>
                    <p class="text-secondary small mb-3 line-clamp-2">${draft.message || 'No message'}</p>

                    <div class="d-flex align-items-center justify-content-between text-muted small mb-3">
                        <span><i class="bi bi-people me-1"></i>${recipientLabel}</span>
                        <span><i class="bi bi-clock me-1"></i>${date}</span>
                    </div>

                    <button class="btn btn-primary btn-sm w-100 edit-draft-btn" data-draft-id="${draft.id}">
                        <i class="bi bi-pencil me-2"></i>Edit Draft
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getAnnouncementsHTML() {
    return `
        <div class="announcements-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Compose & Share</h1>
                    <p class="text-muted mb-0">Draft announcements, copy to clipboard, or open in your email client</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                        <button id="newAnnouncementBtn" class="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2">
                            <i class="bi bi-plus-lg"></i> New Announcement
                        </button>
                    </div>
                </div>
            </header>

            <!-- Quick Actions -->
            <div class="row g-4 mb-5">
                <div class="col-md-6 col-xl-4">
                    <div class="card border-0 shadow-sm hover-lift h-100" role="button" data-action="email-all">
                        <div class="card-body p-4 text-center">
                            <div class="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                <img src="${envelope}" style="width: 1.8rem;">
                            </div>
                            <h6 class="fw-bold mb-1">Email All Users</h6>
                            <p class="text-muted small mb-0">Compose for all members</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-xl-4">
                    <div class="card border-0 shadow-sm hover-lift h-100" role="button" data-action="email-students">
                        <div class="card-body p-4 text-center">
                            <div class="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                <i class="bi bi-mortarboard" style="font-size: 1.8rem;"></i>
                            </div>
                            <h6 class="fw-bold mb-1">Email Students</h6>
                            <p class="text-muted small mb-0">Compose for students only</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-xl-4">
                    <div class="card border-0 shadow-sm hover-lift h-100" role="button" data-action="email-officers">
                        <div class="card-body p-4 text-center">
                            <div class="bg-info-subtle text-info rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                <i class="bi bi-person-badge" style="font-size: 1.8rem;"></i>
                            </div>
                            <h6 class="fw-bold mb-1">Email Officers</h6>
                            <p class="text-muted small mb-0">Compose for officers only</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Drafts Section -->
            <div class="mb-4 d-flex justify-content-between align-items-center">
                <h4 class="fw-bold m-0">
                    <img src="${clockHistory}" alt="Drafts" class="me-2" style="width: 1.5rem; opacity: 0.7;">
                    Saved Drafts
                </h4>
                <span class="badge bg-light text-dark px-3 py-2" id="draftsCount">0 drafts</span>
            </div>

            <div id="draftsContainer" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 mb-5">
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                </div>
            </div>

            <div id="emptyDraftsState" class="text-center py-5" style="display: none;">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${megaphone}" style="width: 50px; opacity: 0.2;">
                </div>
                <h5 class="fw-bold text-dark">No Drafts</h5>
                <p class="text-muted">Create a new announcement to get started.</p>
            </div>
        </div>

        <!-- Composer Modal -->
        <div class="modal fade" id="composerModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pt-4 px-4 pb-0">
                        <h5 class="modal-title fw-bold">Compose Announcement</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="composerForm">
                            <input type="hidden" id="draftId">

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">RECIPIENTS</label>
                                <select id="recipientsSelect" class="form-select" required>
                                    <option value="all">All Users</option>
                                    <option value="students">All Students</option>
                                    <option value="officers">All Officers</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">SUBJECT / TITLE</label>
                                <input type="text" id="subjectInput" class="form-control" placeholder="Enter announcement title" required>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">MESSAGE</label>
                                <textarea id="messageInput" class="form-control" rows="6" placeholder="Write your message here..." required></textarea>
                                <div class="form-text">
                                    <span id="charCount">0</span> characters
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-0 pb-4 px-4 d-flex justify-content-between flex-wrap gap-2">
                        <button type="button" id="saveDraftBtn" class="btn btn-light rounded-pill px-4">
                            <i class="bi bi-floppy me-2"></i>Save Draft
                        </button>
                        <div class="d-flex gap-2 flex-wrap">
                            <button type="button" id="previewBtn" class="btn btn-outline-primary rounded-pill px-4">
                                <img src="${eyeFill}" style="width: 1rem; opacity: 0.7;"> Preview
                            </button>
                            <button type="button" id="copyClipboardBtn" class="btn btn-success rounded-pill px-4">
                                <img src="${clipboardIcon}" style="width: 1rem; filter: brightness(0) invert(1);"> Copy to Clipboard
                            </button>
                            <button type="button" id="openEmailBtn" class="btn btn-primary rounded-pill px-4">
                                <img src="${envelope}" style="width: 1rem; filter: brightness(0) invert(1);"> Open in Email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preview Modal -->
        <div class="modal fade" id="previewModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pt-4 px-4">
                        <h5 class="modal-title fw-bold">Preview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div id="previewContent" class="border rounded-3 p-4 bg-light">
                        </div>
                    </div>
                    <div class="modal-footer border-0 pb-4 px-4">
                        <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

    `;
}

async function attachAnnouncementsListeners() {
    const draftsContainer = document.getElementById('draftsContainer');
    const emptyDraftsState = document.getElementById('emptyDraftsState');
    const draftsCountBadge = document.getElementById('draftsCount');
    const newAnnouncementBtn = document.getElementById('newAnnouncementBtn');
    const composerModal = new Modal(document.getElementById('composerModal'));
    const previewModal = new Modal(document.getElementById('previewModal'));

    const composerForm = document.getElementById('composerForm');
    const draftIdInput = document.getElementById('draftId');
    const subjectInput = document.getElementById('subjectInput');
    const messageInput = document.getElementById('messageInput');
    const recipientsSelect = document.getElementById('recipientsSelect');
    const charCount = document.getElementById('charCount');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const previewBtn = document.getElementById('previewBtn');
    const copyClipboardBtn = document.getElementById('copyClipboardBtn');
    const openEmailBtn = document.getElementById('openEmailBtn');

    let currentDrafts = [];
    let emailCache = { all: [], students: [], officers: [] };

    // Fetch emails from accounts for mailto functionality
    const fetchEmails = async () => {
        try {
            const res = await api.users.listStudents({ limit: 500 });
            const accounts = res.documents;
            emailCache.all = accounts.map(a => a.email).filter(Boolean);
            emailCache.students = accounts.filter(a => a.type === 'student').map(a => a.email).filter(Boolean);
            emailCache.officers = accounts.filter(a => a.type === 'officer').map(a => a.email).filter(Boolean);
        } catch (error) {
            console.error('Failed to fetch emails:', error);
        }
    };

    fetchEmails();

    const renderDrafts = () => {
        currentDrafts = getDrafts();
        draftsCountBadge.textContent = `${currentDrafts.length} draft${currentDrafts.length !== 1 ? 's' : ''}`;

        if (currentDrafts.length === 0) {
            draftsContainer.style.display = 'none';
            emptyDraftsState.style.display = 'block';
        } else {
            draftsContainer.style.display = 'flex';
            draftsContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 mb-5';
            emptyDraftsState.style.display = 'none';
            draftsContainer.innerHTML = currentDrafts.map(createDraftCardHTML).join('');
        }
    };

    renderDrafts();

    // Character counter
    messageInput.addEventListener('input', () => {
        charCount.textContent = messageInput.value.length;
    });

    // New announcement button
    newAnnouncementBtn.addEventListener('click', () => {
        composerForm.reset();
        draftIdInput.value = '';
        charCount.textContent = '0';
        composerModal.show();
    });

    // Quick action cards
    document.querySelectorAll('[data-action]').forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.action;
            composerForm.reset();
            draftIdInput.value = '';
            charCount.textContent = '0';

            if (action === 'email-all') {
                recipientsSelect.value = 'all';
            } else if (action === 'email-students') {
                recipientsSelect.value = 'students';
            } else if (action === 'email-officers') {
                recipientsSelect.value = 'officers';
            }

            composerModal.show();
        });
    });

    // Edit draft
    draftsContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-draft-btn');
        const deleteBtn = e.target.closest('.delete-draft-btn');

        if (editBtn) {
            const draftId = editBtn.dataset.draftId;
            const draft = currentDrafts.find(d => d.id === draftId);

            if (draft) {
                draftIdInput.value = draft.id;
                subjectInput.value = draft.subject || '';
                messageInput.value = draft.message || '';
                recipientsSelect.value = draft.recipients || 'all';
                charCount.textContent = (draft.message || '').length;
                composerModal.show();
            }
        }

        if (deleteBtn) {
            e.stopPropagation();
            const draftId = deleteBtn.dataset.draftId;
            if (!await confirmAction('Delete Draft', 'Delete this draft? This action cannot be undone.', 'Delete', 'danger')) return;
            deleteDraft(draftId);
            renderDrafts();
        }
    });

    // Save draft
    saveDraftBtn.addEventListener('click', () => {
        const recipients = recipientsSelect.value;
        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();

        if (!subject || !message) {
            toast.warning('Please fill in subject and message');
            return;
        }

        const draft = {
            id: draftIdInput.value || Date.now().toString(),
            recipients,
            subject,
            message,
            createdAt: draftIdInput.value ? currentDrafts.find(d => d.id === draftIdInput.value)?.createdAt || new Date().toISOString() : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        saveDraft(draft);
        renderDrafts();
        composerModal.hide();
    });

    // Preview
    previewBtn.addEventListener('click', () => {
        const recipients = recipientsSelect.value;
        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();

        const recipientLabel = recipients === 'all' ? 'All Users' :
            recipients === 'students' ? 'All Students' :
                recipients === 'officers' ? 'All Officers' : recipients;

        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <div class="mb-3">
                <small class="text-muted"><strong>To:</strong> ${recipientLabel}</small>
            </div>
            <h4 class="fw-bold mb-3">${subject || '(No subject)'}</h4>
            <div class="border-top pt-3">
                <p class="mb-0" style="white-space: pre-wrap;">${message || '(No message)'}</p>
            </div>
        `;

        previewModal.show();
    });

    // Copy to Clipboard
    copyClipboardBtn.addEventListener('click', async () => {
        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();

        if (!subject || !message) {
            toast.warning('Please fill in subject and message');
            return;
        }

        const formatted = `Subject: ${subject}\n\n${message}`;

        try {
            await navigator.clipboard.writeText(formatted);
            toast.success('Announcement copied to clipboard');
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = formatted;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            toast.success('Announcement copied to clipboard');
        }
    });

    // Open in Email
    openEmailBtn.addEventListener('click', () => {
        const recipients = recipientsSelect.value;
        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();

        if (!subject || !message) {
            toast.warning('Please fill in subject and message');
            return;
        }

        const emails = emailCache[recipients] || emailCache.all;

        if (emails.length === 0) {
            toast.warning('No email addresses found for selected recipients. Emails are still loading or no accounts exist.');
            return;
        }

        // Use bcc to avoid exposing all email addresses
        const mailtoUrl = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.open(mailtoUrl, '_blank');
        toast.info(`Opening email client with ${emails.length} recipients`);
    });
}

export default function renderAnnouncementsView() {
    return {
        html: getAnnouncementsHTML(),
        afterRender: attachAnnouncementsListeners
    };
}
