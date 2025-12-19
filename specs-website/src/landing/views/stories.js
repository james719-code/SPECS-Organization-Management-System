import { renderHeader } from '../../shared/utils.js';
import { fetchHighlights } from '../data/data.js';
import personFill from 'bootstrap-icons/icons/person-fill.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import clockFill from 'bootstrap-icons/icons/clock-fill.svg';
import imageFill from 'bootstrap-icons/icons/image-fill.svg';

function createHighlightCardHTML({ id, title, description, date, postedBy, image, category = 'Event', readTime = '3 min' }) {
    const truncateText = (text, maxLength = 150) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    };

    return `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
            <div class="card highlight-card h-100 border-0 rounded-3 overflow-hidden bg-white">
                <div class="highlight-card-image position-relative" style="background-image: url('${image}'); height: 180px;">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="badge bg-primary bg-opacity-90 text-white rounded-pill px-3 py-1 small">
                            <i class="bi bi-tag me-1"></i>${category}
                        </span>
                    </div>
                </div>
                <div class="card-body p-4 d-flex flex-column">
                    <h5 class="card-title fw-bold text-dark mb-2">${title}</h5>
                    
                    <div class="d-flex align-items-center text-muted small mb-3 flex-wrap gap-3">
                        <div class="d-flex align-items-center">
                            <img src="${calendar3}" class="me-2" style="width: 14px; height: 14px; opacity: 0.7;"/>
                            <span>${date}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <img src="${personFill}" class="me-2" style="width: 14px; height: 14px; opacity: 0.7;"/>
                            <span>${postedBy}</span>
                        </div>
                    </div>
                    
                    <p class="card-text text-muted flex-grow-1 mb-4">${truncateText(description, 120)}</p>
                    
                    <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                        <span class="d-flex align-items-center text-muted small">
                            <img src="${clockFill}" class="me-2" style="width: 14px; height: 14px; opacity: 0.7;"/>
                            ${readTime} read
                        </span>
                        <a href="#/stories/${id}" class="btn btn-primary btn-sm rounded-pill px-3">
                            Read More <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createPaginationHTML(currentPage, totalItems, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return '';

    const pages = [];
    const windowSize = 2;

    let lastPage = 0;
    for (let i = 1; i <= totalPages; i++) {
        const shouldShowPage = (i === 1) || (i === totalPages) ||
            (i >= currentPage - windowSize && i <= currentPage + windowSize) ||
            (currentPage <= 3 && i <= 5) ||
            (currentPage >= totalPages - 2 && i >= totalPages - 4);

        if (shouldShowPage) {
            if (i > lastPage + 1) {
                pages.push(`<span class="pagination-item ellipsis">...</span>`);
            }
            pages.push(`
                <a href="#/stories?page=${i}" class="pagination-item ${i === currentPage ? 'active' : ''}" 
                   ${i === currentPage ? 'aria-current="page"' : ''}>
                    ${i}
                </a>
            `);
            lastPage = i;
        }
    }

    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    const prevButton = prevDisabled
        ? `<span class="pagination-item disabled" aria-disabled="true">
              <i class="bi bi-chevron-left"></i>
           </span>`
        : `<a href="#/stories?page=${currentPage - 1}" class="pagination-item" aria-label="Previous page">
              <i class="bi bi-chevron-left"></i>
           </a>`;

    const nextButton = nextDisabled
        ? `<span class="pagination-item disabled" aria-disabled="true">
              <i class="bi bi-chevron-right"></i>
           </span>`
        : `<a href="#/stories?page=${currentPage + 1}" class="pagination-item" aria-label="Next page">
              <i class="bi bi-chevron-right"></i>
           </a>`;

    return `
        <div class="row mt-5 pt-4">
            <div class="col-12">
                <nav aria-label="Highlights pagination" class="d-flex flex-column align-items-center">
                    <div class="pagination-nav mb-2">
                        ${prevButton}
                        ${pages.join('')}
                        ${nextButton}
                    </div>
                    <p class="text-muted small mb-0">
                        Page ${currentPage} of ${totalPages}
                    </p>
                </nav>
            </div>
        </div>
    `;
}

function createEmptyStateHTML() {
    return `
        <div class="col-12">
            <div class="text-center py-5 px-3">
                <div class="mb-4">
                    <div class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle p-4 mb-4">
                        <img src="${imageFill}" alt="No stories" style="width: 48px; height: 48px; filter: var(--bs-primary-text-emphasis); opacity: 0.5;">
                    </div>
                    <h4 class="fw-bold text-dark mb-3">No highlights yet</h4>
                    <p class="text-muted col-lg-6 mx-auto mb-4">
                        We're working on sharing amazing stories and achievements from our community. Check back soon for updates!
                    </p>
                </div>
            </div>
        </div>
    `;
}

export async function renderStoriesPage(app, page = 1) {
    const storiesPerPage = 9;
    const { documents: highlightsData, total } = await fetchHighlights(page, storiesPerPage);

    const contentHTML = highlightsData.length > 0
        ? highlightsData.map(createHighlightCardHTML).join('')
        : createEmptyStateHTML();

    const paginationHTML = createPaginationHTML(page, total, storiesPerPage);

    app.innerHTML = `
    <div class="stories-page">
        ${renderHeader()}
        <main>
            <!-- Hero Section -->
            <section class="hero-section-gradient py-5 py-md-6 pt-7 pt-md-8">
                <div class="container pt-3 pt-md-4 pt-lg-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-10 col-xl-8 text-center">
                            <h1 class="display-6 fw-bold mb-3 pt-2">Organization Highlights</h1>
                            <p class="lead fs-6 mb-4 opacity-75 px-2">
                                Celebrating our achievements, milestones, and collaborative successes that define the SPECS community.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Main Content -->
            <section class="py-5 bg-light-subtle">
                <div class="container">
                    <div class="row mb-5">
                        <div class="col-12">
                            <h2 class="fw-bold mb-2 fs-3">Latest Stories</h2>
                            <p class="text-muted mb-0 mt-2">Discover what's happening in our community</p>
                        </div>
                    </div>

                    <div class="row" id="highlights-container">
                        ${contentHTML}
                    </div>

                    ${paginationHTML}
                </div>
            </section>
        </main>
    </div>
    `;
}