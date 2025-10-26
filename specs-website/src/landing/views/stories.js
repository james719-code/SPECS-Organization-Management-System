import { renderHeader, renderFooter } from '../../shared/utils.js'; // Assuming renderFooter exists
import { fetchHighlights } from '../data/data.js';
import personFill from 'bootstrap-icons/icons/person-fill.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';

function createHighlightCardHTML({ id, title, description, date, postedBy, image }) {
    return `
        <div class="col-lg-6 mb-4">
            <div class="card highlight-card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                <div class="row g-0 h-100">
                    <div class="col-md-5 highlight-card-image" style="background-image: url('${image}');">
                    </div>
                    <div class="col-md-7 d-flex flex-column">
                        <div class="card-body d-flex flex-column p-4">
                            <h5 class="card-title fw-bold mb-2">${title}</h5>
                            <div class="d-flex small text-muted mb-3">
                                <div class="me-3 d-flex align-items-center">
                                    <img src="${calendar3}" class="me-1" style="width: 1em; height: 1em;"/>
                                    <span>${date}</span>
                                </div>
                                <div class="d-flex align-items-center">
                                     <img src="${personFill}" class="me-1" style="width: 1em; height: 1em;"/>
                                     <span>${postedBy}</span>
                                </div>
                            </div>
                            <p class="card-text flex-grow-1">${description}</p>
                            <a href="#/stories/${id}" class="btn btn-primary align-self-start mt-auto">Read More <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- NEW HORIZONTAL PAGINATION HELPER ---
function createPaginationHTML(currentPage, totalItems, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return '';

    const pages = [];
    const windowSize = 1;

    let lastPage = 0;
    for (let i = 1; i <= totalPages; i++) {
        const shouldShowPage = (i === 1) || (i === totalPages) || (i >= currentPage - windowSize && i <= currentPage + windowSize);
        if (shouldShowPage) {
            if (i > lastPage + 1) {
                // Add ellipsis if there's a gap
                pages.push(`<span class="pagination-item ellipsis">...</span>`);
            }
            pages.push(`
                <a href="#/stories?page=${i}" class="pagination-item ${i === currentPage ? 'active' : ''}" ${i === currentPage ? 'aria-current="page"' : ''}>
                    ${i}
                </a>
            `);
            lastPage = i;
        }
    }

    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    const prevButton = prevDisabled
        ? `<span class="pagination-item disabled">&laquo;</span>`
        : `<a href="#/stories?page=${currentPage - 1}" class="pagination-item">&laquo;</a>`;

    const nextButton = nextDisabled
        ? `<span class="pagination-item disabled">&raquo;</span>`
        : `<a href="#/stories?page=${currentPage + 1}" class="pagination-item">&raquo;</a>`;

    return `
        <nav aria-label="Highlights pagination" class="pagination-nav">
            ${prevButton}
            ${pages.join('')}
            ${nextButton}
        </nav>
    `;
}


export async function renderStoriesPage(app, page = 1) {
    const storiesPerPage = 10;
    const { documents: highlightsData, total } = await fetchHighlights(page, storiesPerPage);

    const contentHTML = highlightsData.length > 0
        ? highlightsData.map(createHighlightCardHTML).join('')
        : `<div class="col-12 text-center py-5">
               <h4 class="fw-light">No highlights have been posted yet.</h4>
               <p class="text-muted">Check back soon for updates!</p>
           </div>`;

    const paginationHTML = createPaginationHTML(page, total, storiesPerPage);

    app.innerHTML = `
    <div class="landing-page">
        ${renderHeader()}
        <main>
            <section id="highlights" class="py-5 bg-light" style="padding-top: 6rem !important;">
                <div class="container">
                    <div class="text-center mb-5">
                        <h2 class="fw-bold">Organization Highlights</h2>
                        <p class="text-muted col-lg-8 mx-auto">Celebrating our achievements, milestones, and collaborative successes that define the SPECS community.</p>
                    </div>
                    <div class="row">
                        ${contentHTML} 
                    </div>
                    
                    ${paginationHTML}
                </div>
            </section>
        </main>
    </div>
    
    <style>
        .highlight-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .highlight-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1) !important;
        }
        .highlight-card-image {
            background-size: cover;
            background-position: center;
            min-height: 200px;
        }
        .pagination-nav {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem; /* Space between items */
            margin-top: 2.5rem;
        }
        .pagination-item {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            height: 40px;
            padding: 0 0.5rem;
            border: 1px solid var(--bs-border-color);
            border-radius: var(--bs-border-radius);
            background-color: var(--bs-body-bg);
            color: var(--bs-primary);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .pagination-item:hover {
            background-color: var(--bs-primary-bg-subtle);
            border-color: var(--bs-primary-border-subtle);
        }
        .pagination-item.active {
            background-color: var(--bs-primary);
            color: white;
            border-color: var(--bs-primary);
            cursor: default;
        }
        .pagination-item.disabled, .pagination-item.ellipsis {
            color: var(--bs-secondary-color);
            background-color: var(--bs-tertiary-bg);
            pointer-events: none;
            border-color: var(--bs-border-color);
        }
        .pagination-item.ellipsis {
            border: none;
            background: none;
        }
    </style>
    `;
}