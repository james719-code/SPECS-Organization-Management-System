import { renderHeader, renderFooter } from '../../shared/utils.js';

export function renderStoriesPage() {
    app.innerHTML = `
    <div class="landing-page">
        ${renderHeader()}
        <main>
            <section id="stories" class="py-5" style="padding-top: 6rem !important;">
                <div class="container">
                    <h2 class="text-center fw-bold mb-3">Member Stories</h2>
                    <p class="text-center text-muted mb-5">Success stories and experiences from our members.</p>
                    <div class="text-center py-5">
                        <h4 class="fw-light">This section is coming soon!</h4>
                        <p class="text-muted">Check back later for inspiring stories from the SPECS community.</p>
                    </div>
                </div>
            </section>
        </main>
        ${renderFooter()}
    </div>
    `;
    setupSmoothScrolling();
}