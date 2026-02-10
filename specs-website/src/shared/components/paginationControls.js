/**
 * Pagination Controls Component
 * Provides consistent pagination UI with page size selector
 */

/**
 * Generate pagination controls HTML
 * @param {Object} options - Configuration
 * @param {number} options.currentPage - Current page number (1-indexed)
 * @param {number} options.totalPages - Total number of pages
 * @param {number} options.totalItems - Total number of items
 * @param {number} options.pageSize - Current page size
 * @param {number[]} options.pageSizeOptions - Available page size options
 * @param {string} options.containerId - Container ID for event delegation
 * @returns {string} HTML string
 */
export function paginationControls({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 25,
    pageSizeOptions = [10, 25, 50, 100],
    containerId = 'pagination-container'
} = {}) {
    if (totalPages <= 1 && totalItems <= pageSizeOptions[0]) {
        return ''; // No pagination needed
    }
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    // Generate page numbers with ellipsis
    const pages = generatePageNumbers(currentPage, totalPages);
    
    const pageButtons = pages.map(page => {
        if (page === '...') {
            return '<li class="page-item disabled"><span class="page-link">…</span></li>';
        }
        const activeClass = page === currentPage ? 'active' : '';
        return `
            <li class="page-item ${activeClass}">
                <a class="page-link" href="#" data-page="${page}">${page}</a>
            </li>
        `;
    }).join('');
    
    return `
        <div id="${containerId}" class="pagination-container">
            <div class="pagination-info">
                Showing <strong>${startItem}</strong>-<strong>${endItem}</strong> of <strong>${totalItems}</strong> items
            </div>
            
            <nav aria-label="Page navigation">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                            </svg>
                        </a>
                    </li>
                    ${pageButtons}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </a>
                    </li>
                </ul>
            </nav>
            
            <div class="page-size-selector">
                <label for="page-size-select">Show:</label>
                <select id="page-size-select" class="form-select form-select-sm">
                    ${pageSizeOptions.map(size => `
                        <option value="${size}" ${size === pageSize ? 'selected' : ''}>${size}</option>
                    `).join('')}
                </select>
            </div>
        </div>
    `;
}

/**
 * Generate page number array with ellipsis
 * @param {number} current - Current page
 * @param {number} total - Total pages
 * @returns {(number|string)[]} Array of page numbers and ellipsis strings
 */
function generatePageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const pages = [];
    const showEllipsisStart = current > 4;
    const showEllipsisEnd = current < total - 3;
    
    // Always show first page
    pages.push(1);
    
    if (showEllipsisStart) {
        pages.push('...');
    }
    
    // Calculate range around current page
    let rangeStart = Math.max(2, current - 1);
    let rangeEnd = Math.min(total - 1, current + 1);
    
    // Adjust range based on position
    if (current <= 4) {
        rangeStart = 2;
        rangeEnd = 5;
    } else if (current >= total - 3) {
        rangeStart = total - 4;
        rangeEnd = total - 1;
    }
    
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }
    
    if (showEllipsisEnd) {
        pages.push('...');
    }
    
    // Always show last page
    pages.push(total);
    
    return pages;
}

/**
 * Attach pagination event listeners
 * @param {string} containerId - Container element ID
 * @param {Function} onPageChange - Callback when page changes (page) => void
 * @param {Function} onPageSizeChange - Callback when page size changes (size) => void
 */
export function attachPaginationListeners(containerId, onPageChange, onPageSizeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Page click handler
    container.addEventListener('click', (e) => {
        const pageLink = e.target.closest('[data-page]');
        if (pageLink && !pageLink.closest('.disabled')) {
            e.preventDefault();
            const page = parseInt(pageLink.dataset.page, 10);
            if (!isNaN(page) && onPageChange) {
                onPageChange(page);
            }
        }
    });
    
    // Page size change handler
    const sizeSelect = container.querySelector('#page-size-select');
    if (sizeSelect && onPageSizeChange) {
        sizeSelect.addEventListener('change', (e) => {
            const size = parseInt(e.target.value, 10);
            if (!isNaN(size)) {
                onPageSizeChange(size);
            }
        });
    }
}

/**
 * Calculate pagination state from data
 * @param {Array} items - All items
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Object} Pagination state
 */
export function paginateData(items, page = 1, pageSize = 25) {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentPage = Math.min(Math.max(1, page), totalPages || 1);
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = items.slice(startIndex, endIndex);
    
    return {
        items: pageItems,
        currentPage,
        totalPages,
        totalItems,
        pageSize,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
}

export default {
    paginationControls,
    attachPaginationListeners,
    paginateData
};
