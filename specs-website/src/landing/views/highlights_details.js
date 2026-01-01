import {fetchHighlightById} from '../data/data.js';
import personFill from 'bootstrap-icons/icons/person-fill.svg';
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import link45deg from 'bootstrap-icons/icons/link-45deg.svg';
import arrowLeft from 'bootstrap-icons/icons/arrow-left.svg';

export async function renderHighlightDetailsPage(container, highlightId) {
    const highlight = await fetchHighlightById(highlightId);

    if (!highlight) {
        container.innerHTML = `
            <div class="container text-center pt-7" style="padding-bottom: 4rem;">
                <h1 class="display-4 fw-bold">Post Not Found</h1>
                <p class="lead text-muted">The highlight you are looking for does not exist or could not be loaded.</p>
                <a href="#/stories" class="btn btn-primary mt-3">
                     <img src="${arrowLeft}" class="me-1" style="filter: brightness(0) invert(1); width: 1em; height: 1em;"/>
                    Back to All Highlights
                </a>
            </div>
        `;
        return;
    }

    const relatedLinksHTML = highlight.links.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="list-group-item list-group-item-action d-flex align-items-center">
             <img src="${link45deg}" class="me-2" style="width: 1.2em; height: 1.2em;"/>
            ${link.name}
        </a>
    `).join('');

    container.innerHTML = `
    <section class="highlight-hero pt-7" style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${highlight.image}');">
        <div class="container text-white text-center">
            <h1 class="display-4 fw-bold">${highlight.title}</h1>
        </div>
    </section>

    <section class="py-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    
                    <!-- Author and Date Meta Data -->
                    <div class="d-flex justify-content-center flex-wrap align-items-center gap-4 text-muted mb-5">
                        <div class="d-flex align-items-center">
                            <img src="${personFill}" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.7;" />
                            <span class="opacity-75 me-2">Authored by</span>
                            <span class="fw-medium text-dark">${highlight.postedBy}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <img src="${calendar3}" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.7;" />
                            <span class="opacity-75 me-2">Posted on</span>
                            <span class="fw-medium text-dark">${highlight.date}</span>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="highlight-content">
                        ${highlight.details}
                    </div>
                    
                    <!-- Related Links -->
                    ${highlight.links.length > 0 ? `
                        <div class="mt-5">
                            <h4 class="fw-bold">Related Links</h4>
                            <div class="list-group">${relatedLinksHTML}</div>
                        </div>
                    ` : ''}

                    <div class="text-center mt-5 border-top pt-4">
                        <a href="#/stories" class="btn btn-outline-primary">
                            <img src="${arrowLeft}" class="me-1"/>
                            Back to All Highlights
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
`;
}