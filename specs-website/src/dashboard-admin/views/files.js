// views/renderAdmin/files.js
import fileEarmarkArrowUpFill from 'bootstrap-icons/icons/file-earmark-arrow-up-fill.svg';

function getFilesHTML() {
    return `
        <div class="admin-files-container">
            <h2 class="mb-4">All Uploaded Files</h2>
            <div class="card">
                <div class="card-body text-center text-muted p-5">
                     <img 
                        src="${fileEarmarkArrowUpFill}" 
                        alt="Uploaded Files Icon" 
                        class="mb-3" 
                        style="width: 4rem; height: 4rem; opacity: 0.6;"
                     >
                     <p class="mt-3">A gallery or table of all user-uploaded files will be implemented here, with search and filter capabilities.</p>
                </div>
            </div>
        </div>
    `;
}

function attachFilesListeners() {
    console.log("Admin Uploaded Files listeners attached.");
}

export default function renderUploadedFilesView() {
    return {
        html: getFilesHTML(),
        afterRender: attachFilesListeners
    };
}