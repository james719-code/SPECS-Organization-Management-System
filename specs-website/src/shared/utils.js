import boxArrowInRight from 'bootstrap-icons/icons/box-arrow-in-right.svg';
import envelopeFill from 'bootstrap-icons/icons/envelope-fill.svg';
import facebook from 'bootstrap-icons/icons/facebook.svg';
import { Collapse } from 'bootstrap';

// =====================================================
// PERFORMANCE UTILITIES
// =====================================================

/**
 * Debounce function - delays execution until after wait ms since last call
 * Use for search inputs, resize handlers, etc.
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @param {boolean} immediate - Execute on leading edge
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function - ensures function runs at most once per wait period
 * Use for scroll handlers, mouse move, etc.
 * @param {Function} func - Function to throttle
 * @param {number} wait - Minimum time between calls in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, wait = 100) {
    let lastTime = 0;
    let timeout = null;
    
    return function executedFunction(...args) {
        const now = Date.now();
        const remaining = wait - (now - lastTime);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            lastTime = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                lastTime = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

/**
 * Chart instance manager - tracks and cleans up Chart.js instances
 */
const chartInstances = new Map();

export const chartManager = {
    /**
     * Register a chart instance for cleanup
     * @param {string} id - Unique identifier for the chart
     * @param {Object} chart - Chart.js instance
     */
    register(id, chart) {
        this.destroy(id); // Destroy existing if present
        chartInstances.set(id, chart);
    },
    
    /**
     * Destroy a specific chart instance
     * @param {string} id - Chart identifier
     */
    destroy(id) {
        const chart = chartInstances.get(id);
        if (chart) {
            chart.destroy();
            chartInstances.delete(id);
        }
    },
    
    /**
     * Destroy all registered chart instances
     */
    destroyAll() {
        chartInstances.forEach((chart, id) => {
            try {
                chart.destroy();
            } catch (e) {
                console.warn(`Failed to destroy chart ${id}:`, e);
            }
        });
        chartInstances.clear();
    },
    
    /**
     * Get a registered chart instance
     * @param {string} id - Chart identifier
     * @returns {Object|null} Chart instance or null
     */
    get(id) {
        return chartInstances.get(id) || null;
    }
};

/**
 * Animate number counting effect
 * @param {HTMLElement} element - Element to update
 * @param {number} targetValue - Target number
 * @param {number} duration - Animation duration in ms
 * @param {string} prefix - Prefix (e.g., '₱')
 * @param {string} suffix - Suffix (e.g., '%')
 */
export function animateNumber(element, targetValue, duration = 600, prefix = '', suffix = '') {
    if (!element) return;
    
    const startValue = 0;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out quart)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = `${prefix}${currentValue.toLocaleString()}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    } catch (err) {
        console.error('Copy failed:', err);
        return false;
    }
}

// =====================================================
// HEADER & FOOTER COMPONENTS
// =====================================================

export function renderHeader() {
    return `
    <header class="navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="#home">SPECS</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mainNavbar">
                <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                    <li class="nav-item"><a class="nav-link" href="#home">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="#events">Events</a></li>
                    <li class="nav-item"><a class="nav-link" href="#about">About</a></li>
                    <li class="nav-item"><a class="nav-link" href="#resources">Resources</a></li>
                    <li class="nav-item"><a class="nav-link" href="#stories">Stories</a></li>
                </ul>
                <div class="d-flex">
                     <a href="#login" class="btn btn-sm btn-outline-light">
                        <img src="${boxArrowInRight}" alt="Login icon" class="me-2" style="width: 1em; height: 1em; filter: invert(1);">
                        Login / Sign Up
                    </a>
                </div>
            </div>
        </div>
    </header>
    `;
}

export function renderFooter() {
    return `
    <footer id="contact" class="footer text-center py-5">
        <div class="container">
            <h3 class="fw-bold mb-3">Contact Us</h3>
            <p class="mb-4">For inquiries, partnerships, or more information about SPECS, feel free to reach out.</p>
            <div class="d-flex justify-content-center flex-wrap align-items-center gap-4">
                <a href="mailto:parsu.specs@gmail.com" class="link-light text-decoration-none footer-link d-flex align-items-center"><img src="${envelopeFill}" alt="Email icon" style="width: 1.5rem; height: 1.5rem; filter: invert(1);"><span class="ms-2">parsu.specs@gmail.com</span></a>
                <a href="https://www.facebook.com/parsu.specs" target="_blank" class="link-light text-decoration-none footer-link d-flex align-items-center"><img src="${facebook}" alt="Facebook icon" style="width: 1.5rem; height: 1.5rem; filter: invert(1);"><span class="ms-2">facebook.com/psu.specs</span></a>
            </div>
            <hr class="my-4"><p class="mb-0 small">© ${new Date().getFullYear()} SPECS. All Rights Reserved.</p>
        </div>
    </footer>
    `;
}

export function updateActiveNavLink(path) {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    if (!navLinks.length) return;

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).hash;
        if (linkPath === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

export function setupNavbarToggler() {
    const navLinks = document.querySelectorAll('#mainNavbar .nav-link, #mainNavbar .btn');
    const navbarCollapseElement = document.getElementById('mainNavbar');

    if (!navbarCollapseElement) {
        console.warn('Navbar collapse element #mainNavbar not found.');
        return;
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarCollapseElement.classList.contains('show')) {
                const bsCollapse = Collapse.getOrCreateInstance(navbarCollapseElement);
                bsCollapse.hide();
            }
        });
    });
}