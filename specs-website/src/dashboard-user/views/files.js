// --- IMPORTS ---
import { databases, storage } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

// --- SVG ICON IMPORTS ---
import fileEarmarkText from 'bootstrap-icons/icons/file-earmark-text.svg';
import download from 'bootstrap-icons/icons/download.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import person from 'bootstrap-icons/icons/person.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import cloudArrowUp from 'bootstrap-icons/icons/cloud-arrow-up.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';


// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;
const BUCKET_ID_UPLOADS = import.meta.env.VITE_BUCKET_ID_UPLOADS;
const FILES_PAGE_LIMIT = 10;

/**
 * Creates the HTML for a single, redesigned file card.
 * Features: Better layout, hover effects, and graceful text truncation.
 */
function createFileCard(fileDoc, userLookup, currentUserId) {
    const downloadUrl = storage.getFileDownload(BUCKET_ID_UPLOADS, fileDoc.fileID);
    const uploaderName = userLookup[fileDoc.uploader] || 'Unknown User';
    const canDelete = fileDoc.uploader === currentUserId;

    const shortDescription = fileDoc.description && fileDoc.description.length > 80
        ? `${fileDoc.description.substring(0, 80)}...`
        : fileDoc.description || 'No description provided.';

    // --- Inline styles for SVG icons ---
    const iconStyle = "width: 1em; height: 1em;";
    const whiteIconStyle = `${iconStyle} filter: invert(1);`;
    const dangerIconStyle = `${iconStyle} filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);`;
    const footerIconStyle = `${iconStyle} opacity: 0.6;`;
    const mainIconStyle = "width: 3rem; height: 3rem; filter: invert(39%) sepia(97%) saturate(1450%) hue-rotate(193deg) brightness(101%) contrast(102%);"; // Primary color filter


    return `
        <div class="col">
            <div class="card file-card h-100">
                <div class="card-body d-flex flex-column">
                    <div class="file-icon mb-3">
                        <img src="${fileEarmarkText}" alt="File Icon" style="${mainIconStyle}">
                    </div>
                    <h5 class="card-title" title="${fileDoc.fileName}">
                        <span>${fileDoc.fileName}</span>
                    </h5>
                    <p class="card-text small text-body-secondary flex-grow-1">${shortDescription}</p>
                    <div class="mt-auto pt-3">
                        <a href="${downloadUrl}" class="btn btn-sm btn-primary w-100 mb-2 d-flex align-items-center justify-content-center gap-1" target="_blank">
                            <img src="${download}" alt="Download" style="${whiteIconStyle}"> Download
                        </a>
                        ${canDelete ? `
                        <button class="btn btn-sm btn-outline-danger w-100 delete-file-btn d-flex align-items-center justify-content-center gap-1" data-doc-id="${fileDoc.$id}" data-file-id="${fileDoc.fileID}">
                            <img src="${trash}" alt="Delete" style="${dangerIconStyle}"> Delete
                        </button>` : ''}
                    </div>
                </div>
                <div class="card-footer small text-body-secondary">
                    <div title="Uploaded by ${uploaderName}" class="d-flex align-items-center gap-2">
                        <img src="${person}" alt="Uploader" style="${footerIconStyle}"> ${uploaderName}
                    </div>
                    <div title="Upload date: ${new Date(fileDoc.$createdAt).toLocaleString()}" class="d-flex align-items-center gap-2">
                        <img src="${calendar3}" alt="Date" style="${footerIconStyle}"> ${new Date(fileDoc.$createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    `;
}


/**
 * Returns the main HTML structure for the Files view, including CSS for the new card design.
 */
function getFilesHTML(fileList, totalFiles, userLookup, currentUserId) {
    const showLoadMore = fileList.length < totalFiles;
    const loadMoreButton = showLoadMore ? `
        <div class="text-center mt-4" id="loadMoreContainer">
            <button id="loadMoreFilesBtn" class="btn btn-primary">Load More</button>
        </div>` : '';

    let filesGridContent;
    let gridClasses = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xxl-5 g-4";
    const whitePlusIcon = `<img src="${plusLg}" alt="Add" style="width:0.8rem; height:0.8rem; filter:invert(1);">`;

    if (fileList.length > 0) {
        filesGridContent = fileList.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
    } else {
        gridClasses += " flex-grow-1 align-items-center justify-content-center";
        filesGridContent = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    <div class="mb-4">
                        <img src="${cloudArrowUp}" alt="No files" style="width: 6rem; height: 6rem; opacity: 0.3;">
                    </div>
                    <h2 class="fw-light">Your File Storage is Empty</h2>
                    <p class="lead text-body-secondary">Ready to get started? Upload your first file.</p>
                    <p>Click the <span class="btn btn-primary pe-none rounded-circle mx-1 d-inline-flex align-items-center justify-content-center" style="width:1.5rem; height:1.5rem;">${whitePlusIcon}</span> button to share a document.</p>
                </div>
            </div>
        `;
    }

    return `
    <style>
        .file-card {
            border: 1px solid var(--bs-border-color-translucent);
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
            border-radius: .75rem;
        }
        .file-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
        }
        .file-card .card-body {
            text-align: center;
        }
        .file-card .file-icon img { /* Adjusted selector */
            color: var(--bs-primary);
        }
        .file-card .card-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            height: 48px;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .file-card .card-title span {
             white-space: normal;
        }
        .file-card .card-footer {
            background-color: var(--bs-tertiary-bg);
            border-top: 1px solid var(--bs-border-color-translucent);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.75rem;
        }
    </style>
    <div class="files-view-container d-flex flex-column" style="min-height: calc(100vh - 120px);">
        <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4">
            <h1 class="mb-3 mb-md-0">Files</h1>
            <form id="fileSearchForm">
                <input type="search" id="fileSearchInput" class="form-control" style="max-width: 400px;" placeholder="Search files and press Enter...">
            </form>
        </div>
        <div class="${gridClasses}" id="file-cards-container">
            ${filesGridContent}
        </div>
        ${loadMoreButton}
        
        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#uploadFileModal" title="Upload New File">
             <img src="${plusLg}" alt="Add" style="width:1.5rem; height:1.5rem; filter:invert(1);">
        </button>

        <div class="modal fade" id="uploadFileModal" tabindex="-1" aria-labelledby="uploadFileModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <form id="uploadFileForm">
                    <div class="modal-header"><h5 class="modal-title" id="uploadFileModalLabel">Upload a New File</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                    <div class="modal-body">
                        <div class="mb-3"><label for="newFileName" class="form-label">File Name</label><input type="text" id="newFileName" class="form-control" placeholder="e.g., Q1 Meeting Minutes" required></div>
                        <div class="mb-3"><label for="newFileDescription" class="form-label">Description (Optional)</label><textarea id="newFileDescription" class="form-control" rows="3" placeholder="A short description of the file's content."></textarea></div>
                        <div class="mb-3"><label for="fileUpload" class="form-label">File</label><input type="file" id="fileUpload" class="form-control" required></div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Upload File</button></div>
                </form>
            </div></div>
        </div>
    </div>
    `;
}


/**
 * Fetches the first page of files and re-renders the grid or empty state.
 */
async function refreshFileList(gridContainer, userLookup, currentUserId, renderEmptyState) {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
        Query.orderDesc('$createdAt'),
        Query.limit(FILES_PAGE_LIMIT)
    ]);

    if (response.documents.length > 0) {
        gridContainer.className = 'row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xxl-5 g-4';
        gridContainer.innerHTML = response.documents.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
    } else {
        renderEmptyState('initial');
    }
}


/**
 * Attaches all event listeners for the files view.
 */
function attachEventListeners(currentUser, userLookup, totalFiles) {
    let loadedFilesCount = document.querySelectorAll('#file-cards-container .col').length;
    const currentUserId = currentUser.$id;
    const uploadModal = new Modal(document.getElementById('uploadFileModal'));

    const viewContainer = document.querySelector('.files-view-container');
    if (!viewContainer) {
        console.error("Files view container not found.");
        return;
    }
    const gridContainer = document.getElementById('file-cards-container');

    const renderEmptyState = (type, searchTerm = '') => {
        let icon, title, text;
        const whitePlusIcon = `<img src="${plusLg}" alt="Add" style="width:0.8rem; height:0.8rem; filter:invert(1);">`;

        if (type === 'initial') {
            icon = cloudArrowUp;
            title = 'Your File Storage is Empty';
            text = `Click the <span class="btn btn-primary pe-none rounded-circle mx-1 d-inline-flex align-items-center justify-content-center" style="width:1.5rem; height:1.5rem;">${whitePlusIcon}</span> button to upload your first file.`;
        } else { // 'search'
            icon = searchIcon;
            title = 'No Files Found';
            text = `Your search for "<strong>${searchTerm}</strong>" didn't match any files. Try different keywords.`;
        }
        gridContainer.className = 'row flex-grow-1 align-items-center justify-content-center';
        gridContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    <div class="mb-4"><img src="${icon}" alt="${title}" style="width: 6rem; height: 6rem; opacity: 0.3;"></div>
                    <h2 class="fw-light">${title}</h2>
                    <p class="lead text-body-secondary">${text}</p>
                </div>
            </div>`;
    };

    const searchForm = document.getElementById('fileSearchForm');
    const searchInput = document.getElementById('fileSearchInput');
    const performSearch = async (searchTerm) => {
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadMoreContainer) {
            loadMoreContainer.style.display = searchTerm ? 'none' : 'block';
        }

        gridContainer.className = 'row flex-grow-1 align-items-center justify-content-center';
        gridContainer.innerHTML = `<div class="col-auto"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"><span class="visually-hidden">Searching...</span></div></div>`;

        try {
            if (!searchTerm) {
                await refreshFileList(gridContainer, userLookup, currentUserId, renderEmptyState);
                const refreshedCount = gridContainer.querySelectorAll('.col').length;
                if (loadMoreContainer) {
                    loadMoreContainer.style.display = refreshedCount < totalFiles && refreshedCount > 0 ? 'block' : 'none';
                }
                return;
            }
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.search('fileName', searchTerm)]);

            if (response.documents.length > 0) {
                gridContainer.className = 'row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xxl-5 g-4';
                gridContainer.innerHTML = response.documents.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
            } else {
                renderEmptyState('search', searchTerm);
            }
        } catch (error) {
            console.error('File search failed:', error);
            gridContainer.className = 'row';
            gridContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Search failed. Please ensure a search index is configured.</div></div>`;
        }
    };

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch(searchInput.value.trim());
        });
    }

    const uploadForm = document.getElementById('uploadFileForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('fileUpload');
            if (!fileInput.files[0]) { alert('Please select a file.'); return; }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Uploading...`;

            try {
                if (gridContainer.classList.contains('justify-content-center')) {
                    gridContainer.className = 'row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xxl-5 g-4';
                    gridContainer.innerHTML = '';
                }

                const file = fileInput.files[0];
                const uploadedFile = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
                const newFileDoc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_FILES, ID.unique(), {
                    fileName: document.getElementById('newFileName').value.trim(),
                    description: document.getElementById('newFileDescription').value.trim(),
                    uploader: currentUserId,
                    fileID: uploadedFile.$id,
                });

                gridContainer.insertAdjacentHTML('afterbegin', createFileCard(newFileDoc, userLookup, currentUserId));
                totalFiles++;
                loadedFilesCount++;
                uploadModal.hide();
                uploadForm.reset();

            } catch (error) {
                console.error('File upload failed:', error);
                alert('Upload failed. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload File';
            }
        });
    }

    viewContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-file-btn');
        if (deleteBtn) {
            if (!confirm('Are you sure you want to permanently delete this file?')) return;

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_FILES, deleteBtn.dataset.docId);
                await storage.deleteFile(BUCKET_ID_UPLOADS, deleteBtn.dataset.fileId);
                deleteBtn.closest('.col').remove();
                totalFiles--;
                loadedFilesCount--;

                if (gridContainer.children.length === 0) {
                    renderEmptyState('initial');
                    document.getElementById('loadMoreContainer')?.remove();
                }
            } catch (error) {
                console.error('Failed to delete file:', error);
                alert('Could not delete the file.');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<img src="${trash}" alt="Delete" style="width: 1em; height: 1em; filter: invert(32%) sepia(70%) saturate(2311%) hue-rotate(336deg) brightness(90%) contrast(98%);"> Delete`;
            }
            return;
        }

        const loadMoreBtn = e.target.closest('#loadMoreFilesBtn');
        if (loadMoreBtn) {
            const originalText = loadMoreBtn.textContent;
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Loading...`;
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(FILES_PAGE_LIMIT),
                    Query.offset(loadedFilesCount)
                ]);
                const newCardsHTML = response.documents.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
                gridContainer.insertAdjacentHTML('beforeend', newCardsHTML);
                loadedFilesCount += response.documents.length;

                if (loadedFilesCount >= totalFiles) {
                    loadMoreBtn.parentElement.remove();
                }
            } catch (error) {
                console.error("Failed to load more files:", error);
                loadMoreBtn.textContent = 'Error. Try Again?';
            } finally {
                if (loadMoreBtn && loadMoreBtn.parentElement) {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.textContent = originalText;
                }
            }
        }
    });
}


/**
 * Main render function for the Files view.
 */
export default function renderFilesView(initialData, userLookup, user) {
    return {
        html: getFilesHTML(initialData.files, initialData.total, userLookup, user.$id),
        afterRender: () => attachEventListeners(user, userLookup, initialData.total)
    };
}