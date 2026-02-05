/**
 * Toast Notification System
 * Provides a modern, non-intrusive notification system for the dashboard
 */

const TOAST_TYPES = {
    success: {
        bgClass: 'bg-success',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>`
    },
    error: {
        bgClass: 'bg-danger',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/>
        </svg>`
    },
    warning: {
        bgClass: 'bg-warning',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>`
    },
    info: {
        bgClass: 'bg-primary',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
        </svg>`
    }
};

let toastContainer = null;

/**
 * Ensures the toast container exists in the DOM
 */
function ensureContainer() {
    if (toastContainer && document.body.contains(toastContainer)) {
        return toastContainer;
    }

    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.cssText = 'z-index: 9999; max-width: 380px;';
    document.body.appendChild(toastContainer);
    
    return toastContainer;
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'|'info'} type - The type of toast
 * @param {Object} options - Additional options
 * @param {number} options.duration - Duration in ms (default: 4000)
 * @param {string} options.title - Optional title
 * @param {boolean} options.dismissible - Whether to show close button (default: true)
 */
export function showToast(message, type = 'info', options = {}) {
    const { duration = 4000, title = '', dismissible = true } = options;
    const container = ensureContainer();
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = `toast-notification ${config.bgClass} text-white rounded-3 shadow-lg mb-2`;
    toastEl.style.cssText = `
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 1rem 1.25rem;
        min-width: 280px;
    `;
    
    toastEl.innerHTML = `
        <div class="d-flex align-items-start gap-3">
            <div class="toast-icon flex-shrink-0 mt-1" style="opacity: 0.9;">
                ${config.icon}
            </div>
            <div class="flex-grow-1">
                ${title ? `<div class="fw-bold mb-1" style="font-size: 0.9rem;">${title}</div>` : ''}
                <div style="font-size: 0.875rem; line-height: 1.4; opacity: 0.95;">${message}</div>
            </div>
            ${dismissible ? `
                <button type="button" class="btn-close btn-close-white flex-shrink-0" style="font-size: 0.7rem; opacity: 0.7;" aria-label="Close"></button>
            ` : ''}
        </div>
        <div class="toast-progress" style="
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255,255,255,0.4);
            border-radius: 0 0 0.5rem 0.5rem;
            width: 100%;
            transform-origin: left;
            animation: toast-progress ${duration}ms linear forwards;
        "></div>
    `;
    
    container.appendChild(toastEl);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toastEl.style.opacity = '1';
        toastEl.style.transform = 'translateX(0)';
    });
    
    // Close button handler
    const closeBtn = toastEl.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeToast(toastEl));
    }
    
    // Auto-remove after duration
    const timeoutId = setTimeout(() => removeToast(toastEl), duration);
    
    // Pause on hover
    toastEl.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        const progress = toastEl.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
    });
    
    toastEl.addEventListener('mouseleave', () => {
        const progress = toastEl.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'running';
        setTimeout(() => removeToast(toastEl), 1500);
    });
    
    return toastId;
}

/**
 * Removes a toast with animation
 */
function removeToast(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
        if (toastEl.parentNode) {
            toastEl.parentNode.removeChild(toastEl);
        }
    }, 300);
}

// Convenience methods
export const toast = {
    success: (message, options) => showToast(message, 'success', options),
    error: (message, options) => showToast(message, 'error', options),
    warning: (message, options) => showToast(message, 'warning', options),
    info: (message, options) => showToast(message, 'info', options),
};

// Add CSS for progress animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }
    
    .toast-notification {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

export default toast;
