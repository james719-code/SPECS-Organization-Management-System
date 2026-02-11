import boxArrowInRight from 'bootstrap-icons/icons/box-arrow-in-right.svg';
import envelopeFill from 'bootstrap-icons/icons/envelope-fill.svg';
import facebook from 'bootstrap-icons/icons/facebook.svg';
import logoURL from '../../public/logo.webp';
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
    <header class="navbar navbar-expand-lg navbar-dark fixed-top" id="mainHeader">
        <div class="container">
            <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="#home">
                <img src="${logoURL}" alt="SPECS Logo" style="width: 34px; height: 34px; object-fit: contain;">
                <span class="fs-5">SPECS</span>
            </a>
            <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mainNavbar">
                <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-1">
                    <li class="nav-item"><a class="nav-link px-3 rounded-pill" href="#home">Home</a></li>
                    <li class="nav-item"><a class="nav-link px-3 rounded-pill" href="#events">Events</a></li>
                    <li class="nav-item"><a class="nav-link px-3 rounded-pill" href="#about">About</a></li>
                    <li class="nav-item"><a class="nav-link px-3 rounded-pill" href="#resources">Resources</a></li>
                    <li class="nav-item"><a class="nav-link px-3 rounded-pill" href="#stories">Stories</a></li>
                </ul>
                <div class="d-flex">
                     <a href="#login" class="btn btn-sm btn-light text-primary fw-semibold rounded-pill px-4 py-2 d-flex align-items-center gap-2 shadow-sm">
                        <img src="${boxArrowInRight}" alt="Login icon" style="width: 1em; height: 1em; filter: invert(33%) sepia(19%) saturate(2256%) hue-rotate(130deg) brightness(95%) contrast(90%);">
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
    <footer id="contact" class="footer">
        <div class="container">
            <div class="row g-5 pb-5 mb-4 border-bottom border-white border-opacity-10 text-start">
                <div class="col-lg-4">
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="d-inline-flex align-items-center justify-content-center rounded-circle" style="width: 40px; height: 40px; background: rgba(244,162,97,0.15);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.125 7.125L12 3.375L13.875 7.125M12 3.375V10.875M16.875 13.875L20.625 12L16.875 10.125M20.625 12H13.125M7.125 10.125L3.375 12L7.125 13.875M3.375 12H10.875M13.875 16.875L12 20.625L10.125 16.875M12 20.625V13.125" stroke="#f4a261" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <h5 class="fw-bold mb-0 text-white">SPECS</h5>
                    </div>
                    <p class="text-white-50 small mb-0 lh-lg">Society of Programmers & Enthusiasts in Computer Science at Partido State University. Fostering innovation, collaboration, and academic excellence.</p>
                </div>
                <div class="col-lg-3 col-md-4">
                    <h6 class="fw-bold text-uppercase text-white-50 small mb-3" style="letter-spacing: 1.5px;">Quick Links</h6>
                    <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
                        <li><a href="#home" class="footer-link">Home</a></li>
                        <li><a href="#events" class="footer-link">Events</a></li>
                        <li><a href="#about" class="footer-link">About Us</a></li>
                        <li><a href="#resources" class="footer-link">Resources</a></li>
                        <li><a href="#stories" class="footer-link">Stories</a></li>
                    </ul>
                </div>
                <div class="col-lg-2 col-md-4">
                    <h6 class="fw-bold text-uppercase text-white-50 small mb-3" style="letter-spacing: 1.5px;">Portal</h6>
                    <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
                        <li><a href="#login" class="footer-link">Login</a></li>
                        <li><a href="#signup" class="footer-link">Sign Up</a></li>
                    </ul>
                </div>
                <div class="col-lg-3 col-md-4">
                    <h6 class="fw-bold text-uppercase text-white-50 small mb-3" style="letter-spacing: 1.5px;">Get in Touch</h6>
                    <div class="d-flex flex-column gap-3">
                        <a href="mailto:parsu.specs@gmail.com" class="footer-link d-flex align-items-center gap-2">
                            <span class="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style="width: 32px; height: 32px; background: rgba(255,255,255,0.08);">
                                <img src="${envelopeFill}" alt="Email" style="width: 14px; height: 14px; filter: invert(1);">
                            </span>
                            <span class="small">parsu.specs@gmail.com</span>
                        </a>
                        <a href="https://www.facebook.com/parsu.specs" target="_blank" class="footer-link d-flex align-items-center gap-2">
                            <span class="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style="width: 32px; height: 32px; background: rgba(255,255,255,0.08);">
                                <img src="${facebook}" alt="Facebook" style="width: 14px; height: 14px; filter: invert(1);">
                            </span>
                            <span class="small">facebook.com/psu.specs</span>
                        </a>
                    </div>
                </div>
            </div>
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 pt-2">
                <p class="mb-0 small text-white-50">© ${new Date().getFullYear()} SPECS. All Rights Reserved.</p>
                <p class="mb-0 small text-white-50">Partido State University — Goa, Camarines Sur</p>
            </div>
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
    const header = document.getElementById('mainHeader');

    if (!navbarCollapseElement) {
        console.warn('Navbar collapse element #mainNavbar not found.');
        return;
    }

    // Scroll-aware navbar background
    if (header) {
        const updateNavbar = () => {
            if (window.scrollY > 50) {
                header.classList.add('navbar-scrolled');
            } else {
                header.classList.remove('navbar-scrolled');
            }
        };
        window.addEventListener('scroll', updateNavbar, { passive: true });
        updateNavbar(); // Set initial state
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