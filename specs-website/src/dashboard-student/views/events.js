import { api } from '../../shared/api.js';
import { Modal } from 'bootstrap';

// Icons
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import person from 'bootstrap-icons/icons/person.svg';
import search from 'bootstrap-icons/icons/search.svg';

function createEventCard(event) {
    const imageUrl = api.files.getFilePreview(event.image_file);
    const date = new Date(event.date_to_held);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const isEnded = event.event_ended;

    return `
        <div class="col">
            <div class="card event-card h-100 ${isEnded ? 'opacity-75' : ''}">
                <div class="position-relative overflow-hidden" style="border-radius: 12px 12px 0 0;">
                    <img src="${imageUrl}" class="card-img-top" alt="${event.event_name}" style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="status-badge ${isEnded ? 'status-rejected' : 'status-approved'}">
                            ${isEnded ? 'Ended' : 'Upcoming'}
                        </span>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="fw-bold mb-1 text-truncate" title="${event.event_name}">${event.event_name || 'Untitled'}</h5>
                    
                    <div class="d-flex align-items-center gap-2 mb-3 text-primary small fw-semibold">
                        <img src="${calendar3}" class="icon-primary-filter" style="width: 14px;">
                        <span>${formattedDate} • ${formattedTime}</span>
                    </div>

                    <p class="card-text text-muted small flex-grow-1 line-clamp-3">
                        ${event.description || 'No description provided.'}
                    </p>

                    ${event.collab && event.collab.length > 0 ? `
                        <div class="mt-3 py-2 border-top border-light">
                            <div class="d-flex align-items-center gap-2">
                                <img src="${peopleFill}" style="width: 14px; opacity: 0.5;">
                                <span class="small text-muted text-truncate">With ${event.collab.join(', ')}</span>
                            </div>
                        </div>
                    ` : ''}

                    <div class="mt-auto pt-3">
                         <button class="btn btn-primary w-100 rounded-pill btn-sm fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#eventModal-${event.$id}">
                            Read More
                         </button>
                    </div>
                </div>
            </div>
            
            <!-- Modal -->
            <div class="modal fade" id="eventModal-${event.$id}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                        <div class="modal-header border-0 pt-4 px-4">
                            <h5 class="modal-title fw-bold">${event.event_name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4">
                             <img src="${imageUrl}" class="w-100 rounded-3 mb-4 shadow-sm" style="max-height: 400px; object-fit: cover;">
                             
                             <div class="d-flex align-items-center gap-2 mb-3 text-primary fw-semibold">
                                <img src="${calendar3}" class="icon-primary-filter" style="width: 16px;">
                                <span>${date.toLocaleString()}</span>
                             </div>
                             
                             <p class="lead" style="font-size: 1rem; white-space: pre-line;">${event.description || ''}</p>
                             
                             ${event.related_links && event.related_links.length > 0 ? `
                                <div class="bg-light p-3 rounded-3 mt-4">
                                    <h6 class="fw-bold mb-2">Related Links</h6>
                                    <ul class="mb-0 ps-3">
                                        ${event.related_links.map(l => `<li><a href="${l}" target="_blank" class="text-break">${l}</a></li>`).join('')}
                                    </ul>
                                </div>
                             ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getEventsHTML() {
    return `
        <div class="container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-7">
                    <h1 class="display-6 fw-bold text-dark mb-1">Upcoming Events</h1>
                    <p class="text-muted mb-0">Stay updated with the latest activities and gatherings.</p>
                </div>
                 <div class="col-12 col-lg-5">
                    <div class="input-group shadow-sm rounded-3 overflow-hidden border-0 bg-white">
                        <span class="input-group-text bg-white border-0 ps-3"><img src="${search}" width="18" style="opacity:0.4"></span>
                        <input type="search" id="studentEventSearch" class="form-control border-0 py-2 ps-2" placeholder="Search events...">
                    </div>
                </div>
            </header>
            
            <div id="events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5">
                <div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>
            </div>
        </div>
    `;
}

async function attachEventsListeners() {
    const container = document.getElementById('events-container');
    try {
        const response = await api.events.list(100); // Defaults to desc
        const allEvents = response.documents;
        
        const render = (events) => {
             if (events.length === 0) {
                container.innerHTML = '<div class="col-12 text-center text-muted py-5 border border-dashed rounded-3">No events found.</div>';
                return;
            }
            container.innerHTML = events.map(createEventCard).join('');
        };

        render(allEvents);

        // Search
        document.getElementById('studentEventSearch').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allEvents.filter(ev => ev.event_name.toLowerCase().includes(term) || ev.description?.toLowerCase().includes(term));
            render(filtered);
        });

    } catch (error) {
        console.error("Error loading events:", error);
        container.innerHTML = '<div class="col-12 text-danger text-center py-5">Failed to load events.</div>';
    }
}

export default function renderEventsView() {
    return {
        html: getEventsHTML(),
        afterRender: attachEventsListeners
    };
}
