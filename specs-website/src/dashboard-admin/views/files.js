import { databases, storage } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import { logActivity } from './activity-logs.js';

import fileEarmarkText from 'bootstrap-icons/icons/file-earmark-text.svg';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import trashIcon from 'bootstrap-icons/icons/trash.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';
import cloudArrowUp from 'bootstrap-icons/icons/cloud-arrow-up.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import infoCircle from 'bootstrap-icons/icons/info-circle.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;
const COLLECTION_ID_ACCOUNTS = import.meta.env.VITE_COLLECTION_ID_ACCOUNTS;
const BUCKET_ID_UPLOADS = import.meta.env.VITE_BUCKET_ID_UPLOADS;
const FILES_PAGE_LIMIT = 24;

/**
 * Creates a file card with admin controls (can delete any file)
 */
function createFileCard(fileDoc, userLookup) {
    const downloadUrl = storage.getFileDownload(BUCKET_ID_UPLOADS, fileDoc.fileID);
    const uploaderName = userLookup[fileDoc.uploader] || 'Unknown User';
    const uploadDate = new Date(fileDoc.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
        <div class="col">
            <div class="card dashboard-card file-card h-100 transition-all border-0 shadow-sm" data-doc-id="${fileDoc.$id}">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="file-icon-wrapper bg-light rounded-3 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                            <img src="${fileEarmarkText}" class="icon-primary-filter" style="width: 20px;">
                        </div>
                        <button class="btn btn-link p-0 view-details-trigger" title="View Details" style="z-index: 10;">
                            <img src="${infoCircle}" width="18" style="opacity: 0.5;">
                        </button>
                    </div>

                    <h6 class="fw-bold text-dark mb-1 text-truncate" title="${fileDoc.fileName}">${fileDoc.fileName}</h6>
                    <p class="text-muted small line-clamp-2 mb-2">
                        ${fileDoc.description || 'No description provided.'}
                    </p>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <small class="text-secondary"><img src="${personIcon}" width="12" class="me-1" style="opacity: 0.5;">${uploaderName}</small>
                        <small class="text-secondary"><img src="${calendarIcon}" width="12" class="me-1" style="opacity: 0.5;">${uploadDate}</small>
                    </div>

                    <div class="mt-auto pt-3 border-top border-light">
                        <div class="d-flex flex-wrap gap-2">
                            <a href="${downloadUrl}" class="btn btn-primary btn-sm rounded-pill flex-grow-1 d-flex align-items-center justify-content-center gap-2 px-3" target="_blank" style="z-index: 10;">
                                <img src="${downloadIcon}" width="14" style="filter: invert(1);"> 
                                <span class="small fw-bold">Download</span>
                            </a>
                            <button class="btn btn-outline-danger btn-sm rounded-pill delete-file-btn px-3" data-doc-id="${fileDoc.$id}" data-file-id="${fileDoc.fileID}" style="z-index: 10;">
                                <img src="${trashIcon}" width="14" class="status-rejected-filter">
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-click-overlay view-details-trigger"></div>
            </div>
        </div>
    `;
}

function getFilesHTML() {
    return `
    <div class="files-view-container container-fluid py-4 px-md-5">
        <header class="row align-items-center mb-5 gy-4">
            <div class="col-12 col-lg-5">
                <h1 class="display-6 fw-bold text-dark mb-1">File Management</h1>
                <p class="text-muted mb-0">View, search, and manage all uploaded organization documents.</p>
            </div>
            <div class="col-12 col-lg-7">
                <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                    <button id="refreshFilesBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh files">
                        <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                    </button>
                    <div class="input-group shadow-sm rounded-3 overflow-hidden border-0 bg-white" style="max-width: 300px;">
                        <span class="input-group-text bg-white border-0 ps-3">
                            <img src="${searchIcon}" width="18" style="opacity:0.4">
                        </span>
                        <input type="search" id="fileSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search files by name...">
                    </div>
                </div>
            </div>
        </header>

        <div id="file-cards-container" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4" style="min-height: 300px;">
            <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
        </div>

        <button class="btn btn-primary rounded-pill position-fixed bottom-0 end-0 m-4 shadow-lg px-4 py-3 d-flex align-items-center gap-2" style="z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#uploadFileModal">
            <img src="${plusLg}" alt="Add" style="width: 1.2rem; filter: invert(1);">
            <span class="fw-bold">Upload</span>
        </button>

        <div class="modal fade" id="fileDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">File Information</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body p-4">
                        <div class="text-center mb-4"><div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px;"><img src="${fileEarmarkText}" class="icon-primary-filter" width="32"></div><h5 id="detailFileName" class="fw-bold text-dark mb-0 text-break px-3"></h5></div>
                        <div class="mb-4"><label class="form-label fw-bold small text-muted text-uppercase mb-2">Description</label><p id="detailDescription" class="text-dark bg-light p-3 rounded-3 mb-0" style="white-space: pre-wrap; font-size: 0.95rem;"></p></div>
                        <div class="row g-3"><div class="col-6"><label class="form-label fw-bold small text-muted text-uppercase">Uploader</label><div class="d-flex align-items-center gap-2"><img src="${personIcon}" width="14" style="opacity:0.5"><span id="detailUploader" class="small fw-semibold"></span></div></div><div class="col-6"><label class="form-label fw-bold small text-muted text-uppercase">Shared On</label><div class="d-flex align-items-center gap-2"><img src="${calendarIcon}" width="14" style="opacity:0.5"><span id="detailDate" class="small fw-semibold"></span></div></div></div>
                    </div>
                    <div class="modal-footer border-0 pb-4 px-4"><a id="detailDownloadBtn" href="#" class="btn btn-primary rounded-pill w-100 py-2 fw-bold" target="_blank">Download File</a></div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="uploadFileModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4"><form id="uploadFileForm"><div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">Upload Document</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body p-4"><div class="mb-3"><label class="form-label fw-bold small">Title</label><input type="text" id="newFileName" class="form-control" required></div><div class="mb-3"><label class="form-label fw-bold small">Description</label><textarea id="newFileDescription" class="form-control" rows="3"></textarea></div><div class="mb-3"><label class="form-label fw-bold small">File</label><input type="file" id="fileUpload" class="form-control" required></div></div><div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Upload</button></div></form></div></div>
        </div>
    </div>
    
    <style>
        #refreshFilesBtn.refreshing img { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .file-card { transition: all 0.3s ease; }
        .file-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.1) !important; }
    </style>`;
}

async function attachFilesListeners() {
    let allFiles = [];
    let userLookup = {};
    const detailModal = new Modal(document.getElementById('fileDetailsModal'));
    const uploadModal = new Modal(document.getElementById('uploadFileModal'));
    const grid = document.getElementById('file-cards-container');
    const searchInput = document.getElementById('fileSearchInput');
    const refreshBtn = document.getElementById('refreshFilesBtn');

    // Load user lookup for uploader names
    try {
        const accountsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(5000)]);
        userLookup = accountsRes.documents.reduce((map, acc) => {
            const name = (acc.students && acc.students.name) ? acc.students.name : acc.username;
            map[acc.$id] = name;
            return map;
        }, {});
    } catch (err) {
        console.error('Failed to load users for lookup:', err);
    }

    const updateGridLayout = (isEmpty) => {
        if (isEmpty) {
            grid.className = "d-flex flex-column align-items-center justify-content-center text-center py-5";
        } else {
            grid.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4";
        }
    };

    const renderGrid = (files) => {
        if (files.length === 0) {
            updateGridLayout(true);
            grid.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${cloudArrowUp}" style="width: 50px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No files found</h4>
                <p class="text-muted">Try adjusting your search or upload a new file.</p>
            `;
            return;
        }
        updateGridLayout(false);
        grid.innerHTML = files.map(doc => createFileCard(doc, userLookup)).join('');
    };

    const loadFiles = async (searchTerm = '', isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        updateGridLayout(true);
        grid.innerHTML = `<div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;"></div>`;

        try {
            const queries = [Query.orderDesc('$createdAt'), Query.limit(FILES_PAGE_LIMIT)];
            if (searchTerm) {
                queries.push(Query.search('fileName', searchTerm));
            }

            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, queries);
            allFiles = res.documents;
            renderGrid(allFiles);
            
            if (isRefresh) {
                toast.success('Files refreshed successfully');
            }
        } catch (error) {
            console.error("Search failed:", error);
            updateGridLayout(true);
            grid.innerHTML = `
                <div class="text-danger fw-bold mb-3">Failed to load files.</div>
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">Retry</button>
            `;
            toast.error('Failed to load files');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    // Initial Load
    await loadFiles();

    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadFiles(searchInput.value.trim(), true));
    }

    // Real-time search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadFiles(e.target.value.trim());
        }, 300);
    });

    // Delegated Event Listeners
    document.querySelector('.files-view-container').addEventListener('click', async (e) => {
        const detailsTrigger = e.target.closest('.view-details-trigger');
        const delBtn = e.target.closest('.delete-file-btn');

        if (detailsTrigger) {
            const card = detailsTrigger.closest('.file-card');
            const file = allFiles.find(f => f.$id === card.dataset.docId);
            if (!file) return;

            document.getElementById('detailFileName').textContent = file.fileName;
            document.getElementById('detailDescription').textContent = file.description || 'No description provided.';
            document.getElementById('detailUploader').textContent = userLookup[file.uploader] || 'Unknown';
            document.getElementById('detailDate').textContent = new Date(file.$createdAt).toLocaleDateString();
            document.getElementById('detailDownloadBtn').href = storage.getFileDownload(BUCKET_ID_UPLOADS, file.fileID);
            detailModal.show();
        }

        if (delBtn && await confirmAction('Delete File', 'This will permanently delete this file. This action cannot be undone.', 'Delete', 'danger')) {
            delBtn.disabled = true;
            const card = delBtn.closest('.col');
            
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_FILES, delBtn.dataset.docId);
                await storage.deleteFile(BUCKET_ID_UPLOADS, delBtn.dataset.fileId);

                // Animate card removal
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    
                    setTimeout(() => {
                        allFiles = allFiles.filter(f => f.$id !== delBtn.dataset.docId);
                        renderGrid(allFiles);
                    }, 300);
                } else {
                    allFiles = allFiles.filter(f => f.$id !== delBtn.dataset.docId);
                    renderGrid(allFiles);
                }
                
                toast.success('File deleted successfully');
                logActivity('file_deleted', 'Deleted a file');
            } catch (err) {
                console.error('Delete failed:', err);
                toast.error('Failed to delete file');
                delBtn.disabled = false;
            }
        }
    });

    // Upload Form
    document.getElementById('uploadFileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const fileInput = document.getElementById('fileUpload');

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Uploading...`;

        try {
            const file = fileInput.files[0];
            const uploaded = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);

            // Get current user for uploader field
            const { account } = await import('../../shared/appwrite.js');
            const currentUser = await account.get();

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_FILES, ID.unique(), {
                fileName: document.getElementById('newFileName').value.trim(),
                description: document.getElementById('newFileDescription').value.trim(),
                uploader: currentUser.$id,
                fileID: uploaded.$id,
            });
            uploadModal.hide();
            e.target.reset();
            await loadFiles(searchInput.value.trim());
            toast.success('File uploaded successfully!', { title: 'Upload Complete' });
            logActivity('file_uploaded', 'Uploaded a new file');
        } catch (err) {
            console.error(err);
            toast.error('Upload failed. Please check the file and try again.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload';
        }
    });
}

export default function renderUploadedFilesView() {
    return {
        html: getFilesHTML(),
        afterRender: attachFilesListeners
    };
}
