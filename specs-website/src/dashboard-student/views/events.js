import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_EVENTS, BUCKET_ID_EVENT_IMAGES } from '../../shared/constants.js';
import { Query } from 'appwrite';

function getEventsHTML() {
    return `
        <div class="container-fluid">
            <div id="events-container" class="row g-4">
                <!-- Events will be loaded here -->
            </div>
        </div>
    `;
}

function createEventCard(event) {
    // Assuming image_file is a file ID or URL. If file ID, construct view URL.
    // If not set, use placeholder.
    let imageUrl = 'https://via.placeholder.com/400x200?text=No+Image';
    // Logic to fetch image url if bucket logic is known or if it's a direct URL
    // schema says `image_file` string(30) -> likely file ID.
    // We don't have storage instance imported here, but we can construct URL if we had storage. 
    // Let's assume it's a file ID and we leave it for now or import storage.
    
    const date = new Date(event.date_to_held).toLocaleDateString();
    
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm border-0">
                <div class="card-body">
                    <h5 class="card-title fw-bold">${event.event_name || 'Untitled Event'}</h5>
                    <h6 class="card-subtitle mb-2 text-muted"><i class="bi bi-calendar-event me-2"></i>${date}</h6>
                    <p class="card-text text-truncate" style="max-height: 3em;">${event.description || 'No description provided.'}</p>
                    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#eventModal-${event.$id}">Read More</button>
                </div>
            </div>
            
            <!-- Modal -->
            <div class="modal fade" id="eventModal-${event.$id}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">${event.event_name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                             <p class="text-muted mb-4"><i class="bi bi-calendar-event me-2"></i>${new Date(event.date_to_held).toLocaleString()}</p>
                             <p>${event.description || ''}</p>
                             ${event.related_links && event.related_links.length > 0 ? `<h6>Related Links:</h6><ul>${event.related_links.map(l => `<li><a href="${l}" target="_blank">${l}</a></li>`).join('')}</ul>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachEventsListeners() {
    const container = document.getElementById('events-container');
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_EVENTS,
            [
                Query.orderDesc('$createdAt')
            ]
        );
        
        if (response.documents.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">No upcoming events found.</div>';
            return;
        }

        container.innerHTML = response.documents.map(createEventCard).join('');
        
    } catch (error) {
        console.error("Error loading events:", error);
        container.innerHTML = '<div class="col-12 text-danger">Failed to load events.</div>';
    }
}

export default function renderEventsView() {
    return {
        html: getEventsHTML(),
        afterRender: attachEventsListeners
    };
}
