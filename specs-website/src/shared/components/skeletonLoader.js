/**
 * Skeleton Loader Component
 * Provides consistent loading state UI across all dashboard views
 */

/**
 * Generate a skeleton loader element
 * @param {Object} options - Configuration
 * @param {string} options.type - Type: 'text', 'title', 'avatar', 'card', 'stat', 'custom'
 * @param {string} options.width - Custom width (e.g., '100px', '50%')
 * @param {string} options.height - Custom height
 * @param {string} options.className - Additional CSS classes
 * @returns {string} HTML string
 */
export function skeleton({
    type = 'text',
    width = '',
    height = '',
    className = ''
} = {}) {
    const styles = [];
    if (width) styles.push(`width: ${width}`);
    if (height) styles.push(`height: ${height}`);
    
    const styleAttr = styles.length ? `style="${styles.join('; ')}"` : '';
    
    return `<div class="skeleton skeleton-${type} ${className}" ${styleAttr}></div>`;
}

/**
 * Generate a stat card skeleton
 * @returns {string} HTML string
 */
export function statCardSkeleton() {
    return `
        <div class="card h-100 border-0 shadow-sm">
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    ${skeleton({ type: 'text', width: '80px', height: '12px' })}
                    ${skeleton({ type: 'avatar', width: '44px', height: '44px' })}
                </div>
                ${skeleton({ type: 'stat', width: '60px', height: '32px', className: 'mb-2' })}
                ${skeleton({ type: 'text', width: '100px', height: '14px' })}
            </div>
        </div>
    `;
}

/**
 * Generate table row skeletons
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {string} HTML string
 */
export function tableRowSkeleton(rows = 5, cols = 5) {
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const width = c === 0 ? '40%' : c === cols - 1 ? '80px' : '20%';
            html += `<td>${skeleton({ type: 'text', width, height: '16px' })}</td>`;
        }
        html += '</tr>';
    }
    return html;
}

/**
 * Generate account card skeleton
 * @returns {string} HTML string
 */
export function accountCardSkeleton() {
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card account-card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center gap-3 mb-3">
                        ${skeleton({ type: 'avatar', width: '48px', height: '48px' })}
                        <div class="flex-grow-1">
                            ${skeleton({ type: 'text', width: '70%', height: '16px', className: 'mb-2' })}
                            ${skeleton({ type: 'text', width: '90%', height: '12px' })}
                        </div>
                    </div>
                    <div class="d-flex gap-2 mb-3">
                        ${skeleton({ type: 'text', width: '60px', height: '22px' })}
                        ${skeleton({ type: 'text', width: '80px', height: '22px' })}
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        ${skeleton({ type: 'text', width: '100px', height: '12px' })}
                        ${skeleton({ type: 'text', width: '60px', height: '30px' })}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate multiple account card skeletons
 * @param {number} count - Number of cards
 * @returns {string} HTML string
 */
export function accountCardSkeletons(count = 6) {
    return Array(count).fill('').map(() => accountCardSkeleton()).join('');
}

/**
 * Generate event card skeleton
 * @returns {string} HTML string
 */
export function eventCardSkeleton() {
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card event-card h-100">
                ${skeleton({ type: 'custom', width: '100%', height: '160px', className: 'rounded-top' })}
                <div class="card-body">
                    ${skeleton({ type: 'title', width: '80%', height: '20px', className: 'mb-2' })}
                    ${skeleton({ type: 'text', width: '100%', height: '14px', className: 'mb-1' })}
                    ${skeleton({ type: 'text', width: '70%', height: '14px', className: 'mb-3' })}
                    <div class="d-flex justify-content-between">
                        ${skeleton({ type: 'text', width: '80px', height: '24px' })}
                        ${skeleton({ type: 'text', width: '60px', height: '32px' })}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate chart skeleton
 * @param {string} height - Chart height
 * @returns {string} HTML string
 */
export function chartSkeleton(height = '300px') {
    return `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white py-3 border-0">
                ${skeleton({ type: 'text', width: '150px', height: '16px' })}
            </div>
            <div class="card-body">
                ${skeleton({ type: 'custom', width: '100%', height })}
            </div>
        </div>
    `;
}

/**
 * Generate list item skeleton
 * @returns {string} HTML string
 */
export function listItemSkeleton() {
    return `
        <div class="d-flex align-items-center gap-3 p-3 border-bottom">
            ${skeleton({ type: 'avatar', width: '40px', height: '40px' })}
            <div class="flex-grow-1">
                ${skeleton({ type: 'text', width: '60%', height: '14px', className: 'mb-2' })}
                ${skeleton({ type: 'text', width: '40%', height: '12px' })}
            </div>
            ${skeleton({ type: 'text', width: '70px', height: '24px' })}
        </div>
    `;
}

/**
 * Generate full page loading skeleton for dashboard
 * @returns {string} HTML string
 */
export function dashboardSkeleton() {
    return `
        <div class="animate-fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    ${skeleton({ type: 'title', width: '200px', height: '28px', className: 'mb-2' })}
                    ${skeleton({ type: 'text', width: '150px', height: '14px' })}
                </div>
                ${skeleton({ type: 'text', width: '150px', height: '36px' })}
            </div>
            
            <div class="row g-4 mb-4">
                <div class="col-sm-6 col-xl-3">${statCardSkeleton()}</div>
                <div class="col-sm-6 col-xl-3">${statCardSkeleton()}</div>
                <div class="col-sm-6 col-xl-3">${statCardSkeleton()}</div>
                <div class="col-sm-6 col-xl-3">${statCardSkeleton()}</div>
            </div>
            
            <div class="row g-4">
                <div class="col-lg-8">${chartSkeleton('350px')}</div>
                <div class="col-lg-4">${chartSkeleton('350px')}</div>
            </div>
        </div>
    `;
}

export default {
    skeleton,
    statCardSkeleton,
    tableRowSkeleton,
    accountCardSkeleton,
    accountCardSkeletons,
    eventCardSkeleton,
    chartSkeleton,
    listItemSkeleton,
    dashboardSkeleton
};
