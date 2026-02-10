import { api } from '../../shared/api.js';
import { Modal } from 'bootstrap';

// Icons
import calendar3 from 'bootstrap-icons/icons/calendar3.svg';
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import clockFill from 'bootstrap-icons/icons/clock-fill.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import geoAltFill from 'bootstrap-icons/icons/geo-alt-fill.svg';
import search from 'bootstrap-icons/icons/search.svg';
import linkIcon from 'bootstrap-icons/icons/link-45deg.svg';
import arrowRight from 'bootstrap-icons/icons/arrow-right.svg';
import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import filterIcon from 'bootstrap-icons/icons/funnel.svg';

function createEventCard(event) {
    const imageUrl = api.files.getFilePreview(event.image_file);
    const date = new Date(event.date_to_held);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const isEnded = event.event_ended;

    return `
        <div class="col">
            <div class="student-event-card h-100 ${isEnded ? 'event-ended' : ''}">
                <!-- Image Section with Date Badge -->
                <div class="event-image-wrapper">
                    <img src="${imageUrl}" class="event-image" alt="${event.event_name}">
                    <div class="event-image-overlay"></div>
                    
                    <!-- Date Badge -->
                    <div class="event-date-badge">
                        <span class="date-day">${day}</span>
                        <span class="date-month">${month}</span>
                    </div>
                    
                    <!-- Status Indicator -->
                    <div class="event-status-indicator ${isEnded ? 'ended' : 'upcoming'}">
                        <img src="${isEnded ? xCircleFill : checkCircleFill}" width="12" class="me-1" style="filter: invert(1);">
                        ${isEnded ? 'Ended' : 'Upcoming'}
                    </div>
                </div>
                
                <!-- Content Section -->
                <div class="event-content">
                    <h5 class="event-title">${event.event_name || 'Untitled Event'}</h5>
                    
                    <!-- Meta Info -->
                    <div class="event-meta">
                        <div class="meta-item">
                            <img src="${clockFill}" width="14" class="icon-primary-filter">
                            <span>${formattedTime}</span>
                        </div>
                        ${event.collab && event.collab.length > 0 ? `
                            <div class="meta-item">
                                <img src="${peopleFill}" width="14" class="icon-primary-filter">
                                <span class="text-truncate" style="max-width: 120px;">+${event.collab.length} collab</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Description -->
                    <p class="event-description">${event.description || 'No description available for this event.'}</p>
                    
                    <!-- Action Footer -->
                    <div class="event-footer">
                        <button class="btn-view-event" data-bs-toggle="modal" data-bs-target="#eventModal-${event.$id}">
                            <span>View Details</span>
                            <img src="${arrowRight}" width="16" class="arrow-icon">
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Enhanced Modal -->
            <div class="modal fade" id="eventModal-${event.$id}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content event-modal-content">
                        <!-- Modal Image Header -->
                        <div class="event-modal-header">
                            <img src="${imageUrl}" class="modal-event-image" alt="${event.event_name}">
                            <div class="modal-image-overlay"></div>
                            <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Close"></button>
                            
                            <!-- Floating Date Badge -->
                            <div class="modal-date-badge">
                                <img src="${calendarEvent}" width="20" class="me-2" style="filter: invert(1);">
                                <div>
                                    <div class="fw-bold">${formattedDate}</div>
                                    <div class="small opacity-75">${formattedTime}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-body p-4">
                            <!-- Title & Status -->
                            <div class="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
                                <h4 class="fw-bold mb-0 flex-grow-1">${event.event_name}</h4>
                                <span class="badge ${isEnded ? 'bg-secondary' : 'bg-success'} rounded-pill px-3 py-2">
                                    ${isEnded ? 'Event Ended' : 'Upcoming Event'}
                                </span>
                            </div>
                            
                            <!-- Collaborators -->
                            ${event.collab && event.collab.length > 0 ? `
                                <div class="collab-section mb-4">
                                    <div class="d-flex align-items-center gap-2 mb-2">
                                        <img src="${peopleFill}" width="16" class="icon-primary-filter">
                                        <span class="small fw-bold text-muted text-uppercase">Collaborators</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-2">
                                        ${event.collab.map(c => `<span class="badge bg-light text-dark border px-3 py-2">${c}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Description -->
                            <div class="description-section mb-4">
                                <p class="mb-0" style="white-space: pre-line; line-height: 1.8;">${event.description || 'No description provided.'}</p>
                            </div>
                            
                            <!-- Related Links -->
                            ${event.related_links && event.related_links.length > 0 ? `
                                <div class="links-section">
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <img src="${linkIcon}" width="16" class="icon-primary-filter">
                                        <span class="small fw-bold text-muted text-uppercase">Related Links</span>
                                    </div>
                                    <div class="d-flex flex-column gap-2">
                                        ${event.related_links.map(l => `
                                            <a href="${l}" target="_blank" rel="noopener" class="link-item">
                                                <img src="${linkIcon}" width="14" class="icon-primary-filter">
                                                <span class="text-break">${l}</span>
                                                <img src="${arrowRight}" width="14" class="ms-auto opacity-50">
                                            </a>
                                        `).join('')}
                                    </div>
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
            <!-- Enhanced Header Section -->
            <header class="events-header mb-5">
                <div class="row align-items-center gy-4">
                    <div class="col-12 col-lg-6">
                        <div class="d-flex align-items-center gap-3 mb-2">
                            <div class="header-icon-wrapper">
                                <img src="${calendarEvent}" width="24" style="filter: invert(1);">
                            </div>
                            <h1 class="display-6 fw-bold text-dark mb-0">Events</h1>
                        </div>
                        <p class="text-muted mb-0 ps-5 ms-2">Discover and stay updated with SPECS activities</p>
                    </div>
                    <div class="col-12 col-lg-6">
                        <div class="d-flex gap-2 flex-wrap justify-content-lg-end">
                            <!-- Search Input -->
                            <div class="search-input-wrapper flex-grow-1 flex-lg-grow-0">
                                <img src="${search}" width="18" class="search-icon">
                                <input type="search" id="studentEventSearch" class="form-control" placeholder="Search events...">
                            </div>
                            <!-- Filter Buttons -->
                            <div class="btn-group filter-btn-group" role="group">
                                <button type="button" class="btn btn-filter active" data-filter="all">All</button>
                                <button type="button" class="btn btn-filter" data-filter="upcoming">Upcoming</button>
                                <button type="button" class="btn btn-filter" data-filter="ended">Ended</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Events Grid -->
            <div id="events-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 pb-5">
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted mt-3 mb-0">Loading events...</p>
                </div>
            </div>
        </div>
    `;
}

async function attachEventsListeners() {
    const container = document.getElementById('events-container');
    let allEvents = [];
    let currentFilter = 'all';
    
    const render = (events) => {
        if (events.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-events-state">
                        <div class="empty-icon-wrapper">
                            <img src="${calendarEvent}" width="48" class="icon-primary-filter" style="opacity: 0.3;">
                        </div>
                        <h5 class="fw-bold text-dark mb-2">No Events Found</h5>
                        <p class="text-muted mb-0">There are no events matching your search or filter.</p>
                    </div>
                </div>
            `;
            return;
        }
        container.innerHTML = events.map(createEventCard).join('');
    };
    
    const applyFilters = () => {
        const searchTerm = document.getElementById('studentEventSearch')?.value.toLowerCase() || '';
        let filtered = allEvents;
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(ev => 
                ev.event_name.toLowerCase().includes(searchTerm) || 
                ev.description?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        if (currentFilter === 'upcoming') {
            filtered = filtered.filter(ev => !ev.event_ended);
        } else if (currentFilter === 'ended') {
            filtered = filtered.filter(ev => ev.event_ended);
        }
        
        render(filtered);
    };
    
    try {
        const response = await api.events.list({ limit: 100 });
        allEvents = response.documents;
        render(allEvents);

        // Search listener
        document.getElementById('studentEventSearch')?.addEventListener('input', applyFilters);
        
        // Filter buttons listener
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                applyFilters();
            });
        });

    } catch (error) {
        console.error("Error loading events:", error);
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger border-0 rounded-4 d-flex align-items-center gap-3">
                    <img src="${xCircleFill}" width="24" class="status-rejected-filter">
                    <div>
                        <strong>Failed to load events</strong>
                        <p class="mb-0 small">Please try refreshing the page.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

export default function renderEventsView() {
    return {
        html: getEventsHTML(),
        afterRender: attachEventsListeners
    };
}
