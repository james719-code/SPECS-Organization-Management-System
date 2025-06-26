// renderpages/files.js
import { databases, storage } from '../../appwrite.js';
import { Query, ID } from 'appwrite';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;
const BUCKET_ID_UPLOADS = import.meta.env.VITE_BUCKET_ID_UPLOADS;
const FILES_PAGE_LIMIT = 10;

/**
 * Creates the HTML for a single file card.
 */
function createFileCard(fileDoc, userLookup, currentUserId) {
    const downloadUrl = storage.getFileDownload(BUCKET_ID_UPLOADS, fileDoc.fileID);
    const uploaderName = userLookup[fileDoc.uploader] || 'Unknown User';
    const canDelete = fileDoc.uploader === currentUserId;

    return `
        <div class="file-card">
            <div class="file-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <h4 class="file-name">${fileDoc.fileName}</h4>
            <p class="file-description">${fileDoc.description || 'No description provided.'}</p>
            <div class="file-meta">
                <span>Uploaded by: <strong>${uploaderName}</strong></span>
                <span>On: ${new Date(fileDoc.$createdAt).toLocaleDateString()}</span>
            </div>
            <div class="file-actions">
                <a href="${downloadUrl}" class="btn download-btn" target="_blank">Download</a>
                ${canDelete ? `<button class="btn danger-btn delete-file-btn" data-doc-id="${fileDoc.$id}" data-file-id="${fileDoc.fileID}">Delete</button>` : ''}
            </div>
        </div>
    `;
}

/**
 * Returns the main HTML structure for the Files view, now including a search bar.
 */
function getFilesHTML(fileList, totalFiles, userLookup, currentUserId) {
    const showLoadMore = fileList.length < totalFiles;
    const loadMoreButton = showLoadMore ? `<div class="load-more-container"><button id="loadMoreFilesBtn" class="btn primary-btn">Load More</button></div>` : '';
    
    return `
    <style>
        /* --- CORE & CARD STYLES --- */
        .files-view-container h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; }
        .form-group { display: flex; flex-direction: column; margin-bottom: 1rem; }
        .form-group label { color: var(--text-secondary); font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input, .form-group textarea { background-color: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border-dark); padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
        .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
        .primary-btn { background-color: var(--accent-blue); color: var(--text-primary); }
        .primary-btn:hover { background-color: var(--accent-blue-hover); }
        .primary-btn:disabled { background-color: var(--border-dark); cursor: not-allowed; }
        .danger-btn { background-color: var(--status-red); color: white; }
        .danger-btn:hover { background-color: #B91C1C; }
        .download-btn { background-color: #4B5563; color: white; text-decoration: none; }
        .download-btn:hover { background-color: #6B7280; }
        .file-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .file-card { background-color: var(--surface-dark); border: 1px solid var(--border-dark); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .file-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .file-icon svg { width: 36px; height: 36px; color: var(--accent-blue); margin-bottom: 1rem; }
        .file-name { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-primary); word-break: break-all; }
        .file-description { font-size: 0.9rem; color: var(--text-secondary); flex-grow: 1; margin-bottom: 1rem; }
        .file-meta { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .file-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .load-more-container { text-align: center; margin-top: 2rem; }
        
        /* --- SEARCH BAR STYLES --- */
        .search-container {
            margin-bottom: 2rem;
        }
        #fileSearchInput {
            width: 100%;
            padding: 0.8rem 1.2rem;
            font-size: 1rem;
            background-color: var(--surface-dark);
            border: 1px solid var(--border-dark);
            color: var(--text-primary);
            border-radius: 6px;
            box-sizing: border-box;
        }
        #fileSearchInput:focus {
             outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        /* --- STYLES FOR FAB & MODAL --- */
        .fab { position: fixed; bottom: 2rem; right: 2rem; width: 56px; height: 56px; border-radius: 50%; background-color: var(--accent-blue); color: white; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s ease, background-color 0.2s ease; z-index: 999; }
        .fab:hover { background-color: var(--accent-blue-hover); transform: scale(1.05); }
        .fab svg { width: 28px; height: 28px; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; }
        .modal-overlay.open { opacity: 1; visibility: visible; }
        .modal-content { background-color: var(--surface-dark); padding: 2.5rem 2rem 2rem 2rem; border-radius: 8px; max-width: 500px; width: 90%; position: relative; transform: scale(0.95); transition: transform 0.3s ease; }
        .modal-overlay.open .modal-content { transform: scale(1); }
        .modal-content h3 { margin-top: 0; font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
        .modal-close-btn { position: absolute; top: 0.75rem; right: 0.75rem; background: transparent; border: none; color: var(--text-secondary); font-size: 1.75rem; line-height: 1; cursor: pointer; padding: 0.25rem; }
        .modal-close-btn:hover { color: var(--text-primary); }
    </style>
    <div class="files-view-container">
        <h1>Files</h1>
        
        <div class="search-container">
            <input type="search" id="fileSearchInput" placeholder="Search by file name or description...">
        </div>

        <div class="file-cards-grid" id="file-cards-container">
            ${fileList.length > 0 ? fileList.map(doc => createFileCard(doc, userLookup, currentUserId)).join('') : '<p>No uploaded files yet. Press the (+) button to get started!</p>'}
        </div>
        ${loadMoreButton}
        
        <button id="showUploadModalBtn" class="fab" title="Upload New File">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>

        <div id="uploadFileModal" class="modal-overlay">
            <div class="modal-content">
                <button id="closeUploadModalBtn" class="modal-close-btn">×</button>
                <h3>Upload a New File</h3>
                <form id="uploadFileForm">
                    <div class="form-group"><label for="newFileName">File Name</label><input type="text" id="newFileName" name="fileName" placeholder="e.g., Minutes Format" required></div>
                    <div class="form-group"><label for="newFileDescription">Description (Optional)</label><textarea id="newFileDescription" name="description" placeholder="A short description of the file."></textarea></div>
                    <div class="form-group"><label for="fileUpload">File</label><input type="file" id="fileUpload" name="file" required></div>
                    <button type="submit" class="btn primary-btn">Upload File</button>
                </form>
            </div>
        </div>
    </div>
    `;
}

/**
 * Attaches all event listeners for the files view, now including search.
 */
function attachEventListeners(currentUser, userLookup, totalFiles) {
    let loadedFilesCount = document.querySelectorAll('.file-card').length;
    const currentUserId = currentUser.$id;
    const gridContainer = document.getElementById('file-cards-container');
    const loadMoreContainer = document.querySelector('.load-more-container');
    
    const renderFileList = (files) => {
        if (files.length > 0) {
            gridContainer.innerHTML = files.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
        } else {
            gridContainer.innerHTML = '<p>No files found matching your search.</p>';
        }
    };
    
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const searchInput = document.getElementById('fileSearchInput');
    const performSearch = async (searchTerm) => {
        gridContainer.innerHTML = '<p>Searching...</p>';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';

        try {
            if (searchTerm) {
                // To search both name and description, we run two queries concurrently
                const [nameMatches, descMatches] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.search('fileName', searchTerm)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.search('description', searchTerm)])
                ]);

                // Merge and de-duplicate the results using a Map
                const allMatches = new Map();
                nameMatches.documents.forEach(doc => allMatches.set(doc.$id, doc));
                descMatches.documents.forEach(doc => allMatches.set(doc.$id, doc));
                
                const uniqueResults = Array.from(allMatches.values());
                uniqueResults.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

                renderFileList(uniqueResults);
            } else {
                // If search is cleared, reset to the initial paginated view
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(FILES_PAGE_LIMIT)
                ]);
                renderFileList(response.documents);
                if (loadMoreContainer) loadMoreContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('File search failed:', error);
            if (error.code === 400 && error.message.includes('index')) {
                gridContainer.innerHTML = `<p style="color: var(--status-red);"><strong>Search Configuration Error:</strong><br>A full-text index is required on the 'fileName' and 'description' attributes in the Files collection. Please ask the administrator to add them in the Appwrite console.</p>`;
            } else {
                gridContainer.innerHTML = '<p>An error occurred during search. Please try again.</p>';
            }
        }
    };

    if (searchInput) {
        const debouncedSearch = debounce(performSearch, 400);
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }

    // --- MODAL HANDLING LOGIC ---
    const modal = document.getElementById('uploadFileModal');
    const fab = document.getElementById('showUploadModalBtn');
    const closeModalBtn = document.getElementById('closeUploadModalBtn');
    if (modal && fab && closeModalBtn) {
        fab.addEventListener('click', () => modal.classList.add('open'));
        closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    // --- FILE UPLOAD LOGIC ---
    const uploadForm = document.getElementById('uploadFileForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('fileUpload');
            if (!fileInput.files[0]) { alert('Please select a file.'); return; }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';
            try {
                const file = fileInput.files[0];
                const uploadedFile = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_FILES, ID.unique(), {
                    fileName: document.getElementById('newFileName').value,
                    description: document.getElementById('newFileDescription').value,
                    uploader: currentUserId,
                    fileID: uploadedFile.$id,
                });
                alert('File uploaded successfully!');
                window.location.reload();
            } catch (error) {
                console.error('File upload failed:', error);
                alert('Upload failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload File';
            }
        });
    }

    // --- FILE DELETION LOGIC ---
    if (gridContainer) {
        gridContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-file-btn');
            if (!deleteBtn) return;
            if (!confirm('Are you sure you want to delete this file?')) return;
            const docId = deleteBtn.dataset.docId;
            const fileId = deleteBtn.dataset.fileId;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_FILES, docId);
                await storage.deleteFile(BUCKET_ID_UPLOADS, fileId);
                deleteBtn.closest('.file-card').remove();
            } catch (error) {
                console.error('Failed to delete file:', error);
                alert('Could not delete the file.');
            }
        });
    }

    // --- PAGINATION LOGIC ---
    const loadMoreBtn = document.getElementById('loadMoreFilesBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Loading...';
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(FILES_PAGE_LIMIT),
                    Query.offset(loadedFilesCount)
                ]);
                const newFiles = response.documents;
                const newCardsHTML = newFiles.map(doc => createFileCard(doc, userLookup, currentUserId)).join('');
                gridContainer.insertAdjacentHTML('beforeend', newCardsHTML);
                loadedFilesCount += newFiles.length;
                if (loadedFilesCount >= totalFiles) {
                    loadMoreBtn.parentElement.remove();
                } else {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.textContent = 'Load More';
                }
            } catch (error) {
                console.error("Failed to load more files:", error);
                loadMoreBtn.textContent = 'Error. Try Again?';
                loadMoreBtn.disabled = false;
            }
        });
    }
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