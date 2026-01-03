/**
 * Lazy Loading Helper Utilities
 * Provides IntersectionObserver-based lazy loading for components
 */

/**
 * Lazy load a component when it comes into view
 * @param {HTMLElement} element - Element to observe
 * @param {Function} loadFn - Function to call when element is visible
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver} - The observer instance for cleanup
 */
export function lazyLoadComponent(element, loadFn, options = {}) {
    const defaultOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadFn(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { ...defaultOptions, ...options });

    observer.observe(element);
    return observer;
}

/**
 * Lazy load multiple elements with the same load function
 * @param {NodeList|Array} elements - Elements to observe
 * @param {Function} loadFn - Function to call for each visible element
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver} - The observer instance for cleanup
 */
export function lazyLoadAll(elements, loadFn, options = {}) {
    const defaultOptions = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadFn(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { ...defaultOptions, ...options });

    elements.forEach(el => observer.observe(el));
    return observer;
}

/**
 * Create a lazy-loaded image placeholder
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @returns {string} - HTML string for lazy image
 */
export function lazyImage(src, alt = '', className = '') {
    return `
    <img 
      data-lazy-src="${src}" 
      alt="${alt}" 
      class="${className} lazy-image" 
      loading="lazy"
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
    >
  `;
}

/**
 * Initialize lazy loading for all images with data-lazy-src
 * @param {HTMLElement} container - Container to search within
 */
export function initLazyImages(container = document) {
    const lazyImages = container.querySelectorAll('img[data-lazy-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.lazySrc;
                    img.removeAttribute('data-lazy-src');
                    img.classList.remove('lazy-image');
                    img.classList.add('lazy-loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        lazyImages.forEach(img => imageObserver.observe(img));
        return imageObserver;
    } else {
        // Fallback for browsers without IntersectionObserver
        lazyImages.forEach(img => {
            img.src = img.dataset.lazySrc;
            img.removeAttribute('data-lazy-src');
        });
        return null;
    }
}

/**
 * Prefetch a module for faster loading later
 * @param {Function} importFn - Dynamic import function
 */
export function prefetchModule(importFn) {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => importFn());
    } else {
        setTimeout(() => importFn(), 2000);
    }
}

/**
 * Create a view loader with loading state management
 * @param {Object} viewModules - Map of view names to import functions
 * @returns {Function} - Async function to load and render views
 */
export function createViewLoader(viewModules) {
    const loadedModules = new Map();

    return async function loadView(viewName, ...args) {
        // Check cache first
        if (loadedModules.has(viewName)) {
            const module = loadedModules.get(viewName);
            return module.default(...args);
        }

        // Load module
        const importFn = viewModules[viewName];
        if (!importFn) {
            throw new Error(`Unknown view: ${viewName}`);
        }

        const module = await importFn();
        loadedModules.set(viewName, module);
        return module.default(...args);
    };
}
