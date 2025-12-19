// views/renderAdmin/files.js
import fileEarmarkArrowUpFill from 'bootstrap-icons/icons/file-earmark-arrow-up-fill.svg';

function getFilesHTML() {
    return `
        <div class="admin-files-container animate-fade-in-up">
            <div class="d-flex justify-content-between align-items-center mb-4">
                 <div>
                    <h2 class="fw-bold m-0 text-primary">File Management</h2>
                    <p class="text-muted m-0 small">View and manage uploaded resources</p>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4">
                <div class="card-body text-center text-muted p-5 d-flex flex-column align-items-center justify-content-center" style="min-height: 400px;">
                     <div class="bg-secondary-subtle rounded-circle p-4 mb-3">
                         <img 
                            src="${fileEarmarkArrowUpFill}" 
                            alt="Uploaded Files Icon" 
                            style="width: 3rem; height: 3rem; opacity: 0.6;"
                         >
                     </div>
                     <h4 class="fw-bold text-dark">File Gallery Coming Soon</h4>
                     <p class="mt-2 mb-4 text-secondary" style="max-width: 400px;">
                        We are building a robust file manager to help you organize, search, and filter student uploads and resources efficiently.
                     </p>
                     <button class="btn btn-primary px-4 rounded-pill disabled">Browse Files (Beta)</button>
                </div>
            </div>
        </div>
        <style>
             .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
             @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
        </style>
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
