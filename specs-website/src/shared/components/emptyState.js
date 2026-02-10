/**
 * Empty State Component
 * Provides consistent empty state UI across all dashboard views
 */

import inboxFill from 'bootstrap-icons/icons/inbox-fill.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import calendarXFill from 'bootstrap-icons/icons/calendar-x-fill.svg';
import peopleIcon from 'bootstrap-icons/icons/people.svg';
import fileEarmarkX from 'bootstrap-icons/icons/file-earmark-x.svg';
import walletIcon from 'bootstrap-icons/icons/wallet2.svg';

// Pre-defined icons for common scenarios
const ICONS = {
    default: inboxFill,
    search: searchIcon,
    events: calendarXFill,
    users: peopleIcon,
    files: fileEarmarkX,
    finance: walletIcon
};

/**
 * Generate empty state HTML
 * @param {Object} options - Configuration options
 * @param {string} options.icon - Icon key or custom SVG path
 * @param {string} options.title - Main title text
 * @param {string} options.description - Supporting description text
 * @param {Object} options.action - Optional action button config
 * @param {string} options.action.label - Button text
 * @param {string} options.action.id - Button ID for event listener
 * @param {string} options.action.variant - Button variant (primary, secondary)
 * @param {boolean} options.compact - Use compact sizing
 * @returns {string} HTML string for empty state
 */
export function emptyState({
    icon = 'default',
    title = 'No data found',
    description = '',
    action = null,
    compact = false
} = {}) {
    const iconSrc = ICONS[icon] || icon;
    const paddingClass = compact ? 'py-4 px-3' : 'py-5 px-4';
    const iconSize = compact ? '48px' : '72px';
    const innerIconSize = compact ? '24px' : '32px';
    
    let actionButton = '';
    if (action) {
        const variant = action.variant || 'primary';
        actionButton = `
            <button 
                id="${action.id || 'empty-state-action'}" 
                class="btn btn-${variant} btn-sm mt-3"
            >
                ${action.label}
            </button>
        `;
    }
    
    return `
        <div class="empty-state-container ${paddingClass}">
            <div class="empty-state-icon" style="width: ${iconSize}; height: ${iconSize};">
                <img src="${iconSrc}" alt="" style="width: ${innerIconSize}; height: ${innerIconSize}; opacity: 0.6;">
            </div>
            <h5 class="empty-state-title">${title}</h5>
            ${description ? `<p class="empty-state-description">${description}</p>` : ''}
            ${actionButton}
        </div>
    `;
}

/**
 * Generate search no results state
 * @param {string} query - The search query that returned no results
 * @returns {string} HTML string
 */
export function searchEmptyState(query) {
    return emptyState({
        icon: 'search',
        title: 'No results found',
        description: query 
            ? `No matches found for "${query}". Try adjusting your search terms.`
            : 'Try searching with different keywords.',
        compact: true
    });
}

/**
 * Generate loading error state
 * @param {Object} options - Configuration options
 * @param {string} options.title - Error title
 * @param {string} options.message - Error message
 * @param {Function} options.onRetry - Retry callback ID
 * @returns {string} HTML string
 */
export function errorState({
    title = 'Unable to load data',
    message = 'Something went wrong. Please try again.',
    retryId = 'error-retry-btn'
} = {}) {
    return `
        <div class="error-state-container">
            <div class="error-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
            </div>
            <h5 class="error-title">${title}</h5>
            <p class="error-message">${message}</p>
            <button id="${retryId}" class="btn btn-primary btn-sm">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                Try Again
            </button>
        </div>
    `;
}

export default { emptyState, searchEmptyState, errorState };
