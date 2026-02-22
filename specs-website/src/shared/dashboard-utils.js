/**
 * Shared dashboard utilities
 * Common functions used across admin, officer, and student dashboards
 */

/**
 * Close an offcanvas sidebar programmatically
 * Used to close mobile sidebar when navigating between views
 * @param {HTMLElement} sidebarEl - The sidebar element with offcanvas class
 */
export function closeSidebar(sidebarEl) {
    if (!sidebarEl) return;
    if (window.innerWidth >= 992) return;

    import('bootstrap').then(({ Offcanvas }) => {
        const instance = Offcanvas.getInstance(sidebarEl);
        if (instance) instance.hide();
    });
}

/**
 * Create a loading spinner HTML
 * @param {string} size - Bootstrap spinner size (sm, default, lg)
 * @returns {string} HTML string for the spinner
 */
export function createLoadingSpinner(size = 'default') {
    const sizeStyle = size === 'lg' ? 'width: 3rem; height: 3rem;' : 
                      size === 'sm' ? 'width: 1rem; height: 1rem;' : 
                      'width: 2rem; height: 2rem;';
    
    return `
        <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
            <div class="spinner-border text-primary" style="${sizeStyle}" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

/**
 * Create an error alert HTML
 * @param {string} title - Alert title
 * @param {string} message - Error message
 * @param {Error} error - Optional error object for details
 * @returns {string} HTML string for the error alert
 */
export function createErrorAlert(title, message, error = null) {
    const errorDetails = error ? `<pre class="small mt-2 mb-0">${error.message || error}</pre>` : '';
    
    return `
        <div class="alert alert-danger mx-4">
            <h4><i class="bi bi-exclamation-triangle-fill me-2"></i>${title}</h4>
            <p class="mb-0">${message}</p>
            ${errorDetails}
        </div>
    `;
}

/**
 * Generic content renderer for dashboard views
 * Handles loading state, dynamic imports, and error handling
 * 
 * @param {Object} options - Renderer options
 * @param {HTMLElement} options.contentEl - The container element to render into
 * @param {string} options.viewName - Name of the view to render
 * @param {Object} options.viewModules - Map of view names to import functions
 * @param {Map} options.loadedModules - Cache of already loaded modules
 * @param {NodeList} options.viewLinks - Navigation links to update active state
 * @param {string} options.sidebarSelector - CSS selector for sidebar (for active link)
 * @param {Object} options.context - Additional context to pass to render function (user, profile, etc.)
 * @returns {Promise<void>}
 */
export async function renderDashboardContent({
    contentEl,
    viewName,
    viewModules,
    loadedModules,
    viewLinks,
    sidebarSelector = '#sidebar',
    context = {}
}) {
    // Show loading spinner
    contentEl.innerHTML = createLoadingSpinner('lg');

    // Update active link state
    viewLinks.forEach(link => link.classList.remove('active', 'bg-primary'));
    const activeLink = document.querySelector(`${sidebarSelector} [data-view="${viewName}"]`);
    if (activeLink) {
        activeLink.classList.add('active', 'bg-primary');
    }

    try {
        // Use cached module or load dynamically
        let module;
        if (loadedModules.has(viewName)) {
            module = loadedModules.get(viewName);
        } else {
            const importFn = viewModules[viewName];
            if (!importFn) {
                throw new Error(`Unknown view: ${viewName}`);
            }
            module = await importFn();
            loadedModules.set(viewName, module);
        }

        // Get the render function
        const renderFn = module.default;
        if (typeof renderFn !== 'function') {
            throw new Error(`View ${viewName} does not export a default render function`);
        }

        // Call render function with context
        const view = renderFn(context.user, context.profile, context);

        // Render the HTML
        contentEl.innerHTML = view.html;

        // Run afterRender if provided
        if (view.afterRender && typeof view.afterRender === 'function') {
            await view.afterRender();
        }

    } catch (error) {
        console.error(`Error rendering '${viewName}' view:`, error);
        contentEl.innerHTML = createErrorAlert(
            'Error',
            `Could not load the ${viewName} page.`,
            error
        );
    }
}

/**
 * Setup navigation event handlers for dashboard
 * @param {Object} options - Setup options
 * @param {NodeList} options.viewLinks - Navigation links with data-view attributes
 * @param {HTMLElement} options.sidebar - Sidebar element
 * @param {Function} options.onNavigate - Callback when navigation occurs
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupDashboardNavigation({ viewLinks, sidebar, onNavigate }) {
    const handleClick = (e) => {
        e.preventDefault();
        const viewName = e.currentTarget.dataset.view;
        if (viewName) {
            closeSidebar(sidebar);
            onNavigate(viewName);
        }
    };

    viewLinks.forEach(link => {
        link.addEventListener('click', handleClick);
    });

    // Return cleanup function
    return () => {
        viewLinks.forEach(link => {
            link.removeEventListener('click', handleClick);
        });
    };
}

/**
 * Initialize dev bypass mode and get mock user data
 * @param {string} userType - Type of user (admin, officer, student)
 * @returns {Promise<Object>} Mock user and profile data
 */
export async function initDevBypass(userType) {
    const { getDevUser } = await import('./mock/devUtils.js');
    const mockUser = getDevUser(userType);
    
    console.log(`[DEV] Using mock ${userType} user:`, mockUser.email);
    
    return {
        user: { 
            $id: mockUser.$id, 
            email: mockUser.email, 
            name: mockUser.name 
        },
        profile: mockUser
    };
}

/**
 * Check if running in dev bypass mode
 * @returns {boolean}
 */
export function isDevBypass() {
    const IS_DEV = import.meta.env.DEV;
    const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    return IS_DEV && USE_MOCK_DATA;
}
