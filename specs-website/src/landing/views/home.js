// views/home.js

import logoURL from '../../../public/logo.webp';

// Icons
import calendarCheck from 'bootstrap-icons/icons/calendar-check.svg';
import arrowRight from 'bootstrap-icons/icons/arrow-right.svg';
import chevronRight from 'bootstrap-icons/icons/chevron-right.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import laptop from 'bootstrap-icons/icons/laptop.svg';

// Icons for Resources
import mortarboard from 'bootstrap-icons/icons/mortarboard.svg';
import briefcase from 'bootstrap-icons/icons/briefcase.svg';
import folder2Open from 'bootstrap-icons/icons/folder2-open.svg';
import questionCircle from 'bootstrap-icons/icons/question-circle.svg';
import journalCode from 'bootstrap-icons/icons/journal-code.svg';

import { Carousel } from 'bootstrap';
import { fetchHighlights, fetchEvents } from '../data/data.js';

// --- HELPER: Build Carousel Items ---
const buildCarouselHTML = (highlights) => {
    if (!highlights || highlights.length === 0) {
        return '<div class="text-center py-5 text-muted bg-light rounded-4 border border-dashed">No highlights available at the moment.</div>';
    }

    return highlights.slice(0, 5).map((highlight, index) => {
        const truncatedDesc = highlight.description.length > 120
            ? highlight.description.substring(0, 120) + '...'
            : highlight.description;

        return `
        <div class="carousel-item ${index === 0 ? 'active' : ''} h-100">
            <div class="position-relative h-100 w-100 overflow-hidden rounded-4 border border-light-subtle shadow-sm group">
                <div class="position-absolute top-0 start-0 w-100 h-100 bg-cover transition-transform duration-700 group-hover-scale" 
                     style="background-image: url('${highlight.image}');">
                </div>
                <div class="position-absolute bottom-0 start-0 w-100 p-4 p-lg-5 text-white" 
                     style="background: linear-gradient(to top, rgba(13, 27, 42, 0.9) 0%, rgba(13, 27, 42, 0.6) 50%, transparent 100%);">
                    <span class="badge bg-white text-primary mb-2 text-uppercase fw-bold shadow-sm" style="letter-spacing: 1px; font-size: 0.65rem;">Highlight</span>
                    <h3 class="fw-bold mb-2 text-truncate">${highlight.title}</h3>
                    <p class="small opacity-90 mb-3 d-none d-md-block text-light" style="max-width: 600px;">${truncatedDesc}</p>
                    <a href="#/stories/${highlight.id}" class="btn btn-sm btn-light text-primary rounded-pill px-4 fw-bold shadow-sm">Read Story</a>
                </div>
            </div>
        </div>`;
    }).join('');
};

// --- HELPER: Build Calendar Logic ---
const buildCalendarHTML = (events) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const eventsInMonth = events.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    let calendarHTML = '';
    let dayCount = 1;

    for (let i = 0; i < 6; i++) {
        let rowHTML = '<tr>';
        for (let j = 0; j < 7; j++) {
            if ((i === 0 && j < firstDayIndex) || dayCount > daysInMonth) {
                rowHTML += '<td></td>';
            } else {
                const dayEvents = eventsInMonth.filter(e => new Date(e.date).getDate() === dayCount);
                const isToday = dayCount === today.getDate() && currentMonth === today.getMonth();
                const hasEvent = dayEvents.length > 0;

                let circleClass = '';
                let textClass = 'text-secondary';
                if (isToday) {
                    circleClass = 'bg-primary text-white shadow-sm';
                    textClass = 'text-white fw-bold';
                } else if (hasEvent) {
                    circleClass = 'bg-primary-subtle text-primary fw-bold';
                    textClass = 'text-primary';
                }

                rowHTML += `
                <td class="text-center py-2 position-relative">
                    <div class="d-flex align-items-center justify-content-center mx-auto rounded-circle ${circleClass}" 
                         style="width: 32px; height: 32px; font-size: 0.85rem; transition: all 0.2s ease;">
                        <span class="${textClass}">${dayCount}</span>
                    </div>
                    ${hasEvent && !isToday ? '<div class="position-absolute bottom-0 start-50 translate-middle-x bg-secondary rounded-circle" style="width: 4px; height: 4px; margin-bottom: 4px;"></div>' : ''}
                </td>`;
                dayCount++;
            }
        }
        rowHTML += '</tr>';
        if (dayCount > daysInMonth) { calendarHTML += rowHTML; break; }
        calendarHTML += rowHTML;
    }
    return { html: calendarHTML, eventsInMonth };
};


// --- MAIN RENDER FUNCTION ---
export async function renderHomePage(container) {
    const { documents: allHighlights } = await fetchHighlights();
    const upcomingEvents = await fetchEvents('upcoming');
    const today = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const carouselHTML = buildCarouselHTML(allHighlights);
    const { html: calendarBody, eventsInMonth } = buildCalendarHTML(upcomingEvents);

    container.innerHTML = `
        <div class="home-container bg-white">
            
            <section class="hero-section position-relative overflow-hidden d-flex align-items-center justify-content-center text-center pt-7" 
                     style="min-height: 85vh; background: radial-gradient(circle at center, #264653 0%, #1a2c38 100%);">
                <div class="position-absolute w-100 h-100" 
                     style="background: linear-gradient(135deg, rgba(13, 107, 102, 0.25) 0%, rgba(0,0,0,0) 60%); pointer-events: none;"></div>
                
                <div class="container position-relative z-1 text-white">
                    <div class="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-10 mb-4 animate-fade-in-up glass-effect">
                        <span class="badge bg-primary rounded-pill">OFFICIAL</span>
                        <span class="small fw-medium">Society of Programmers & Enthusiasts</span>
                    </div>
                    <h1 class="display-2 fw-bold mb-4 animate-fade-in-up delay-100 lh-1" style="letter-spacing: -1px;">
                        Build the Future.<br><span class="text-gradient-secondary">Code the World.</span>
                    </h1>
                    <p class="lead text-white-50 mb-5 mx-auto animate-fade-in-up delay-200" style="max-width: 650px;">
                        The premier student organization for Computer Science at Partido State University. Fostering innovation, collaboration, and academic excellence.
                    </p>
                    <div class="d-flex flex-column flex-sm-row justify-content-center gap-3 animate-fade-in-up delay-300">
                        <a href="#about" class="btn btn-primary btn-lg rounded-pill px-5 fw-bold shadow hover-lift">Get Started</a>
                        <a href="#events" class="btn btn-outline-light btn-lg rounded-pill px-5 fw-bold hover-lift">Upcoming Events</a>
                    </div>
                </div>
            </section>

            <section id="home-about" class="py-6 section-spacing bg-white">
                <div class="container">
                    <div class="row align-items-center gx-5 gy-5">
                        <div class="col-lg-6 order-lg-2">
                            <div class="p-5 bg-light rounded-4 border border-light-subtle text-center position-relative overflow-hidden">
                                <div class="position-absolute top-50 start-50 translate-middle bg-primary opacity-10 rounded-circle" style="width: 200px; height: 200px; filter: blur(50px);"></div>
                                <img src="${logoURL}" alt="SPECS Logo" class="img-fluid drop-shadow-md hover-scale transition-all position-relative z-1" style="max-width: 240px;">
                            </div>
                        </div>
                        <div class="col-lg-6 order-lg-1">
                            <h6 class="text-primary fw-bold text-uppercase mb-2" style="letter-spacing: 1px;">Our Mission</h6>
                            <h2 class="display-5 fw-bold mb-4 text-dark">Empowering Tech Leaders.</h2>
                            <p class="lead text-secondary mb-5">We bridge the gap between academic theory and real-world application through workshops, mentorship, and collaborative projects.</p>
                            <div class="d-flex flex-column gap-4">
                                <div class="d-flex gap-3">
                                    <div class="flex-shrink-0 bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <img src="${peopleFill}" width="20" class="filter-primary">
                                    </div>
                                    <div>
                                        <h5 class="fw-bold mb-1">Community First</h5>
                                        <p class="text-muted small mb-0">Join a network of passionate peers and alumni mentors.</p>
                                    </div>
                                </div>
                                <div class="d-flex gap-3">
                                    <div class="flex-shrink-0 bg-secondary bg-opacity-10 text-secondary rounded-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <img src="${laptop}" width="20" class="filter-secondary">
                                    </div>
                                    <div>
                                        <h5 class="fw-bold mb-1">Skill Development</h5>
                                        <p class="text-muted small mb-0">Hands-on coding bootcamps, hackathons, and seminars.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="home-events" class="py-6 bg-light section-spacing">
                <div class="container">
                    <div class="row gx-5 gy-5">
                        <div class="col-lg-5">
                            <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
                                <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                    <span class="fw-bold fs-5 text-dark">${monthNames[today.getMonth()]} ${today.getFullYear()}</span>
                                    <img src="${calendarCheck}" width="20" class="opacity-50">
                                </div>
                                <div class="card-body p-3">
                                    <table class="table table-borderless mb-0 w-100" style="table-layout: fixed;">
                                        <thead>
                                            <tr class="text-secondary text-uppercase text-center" style="font-size: 0.75rem;">
                                                <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th>
                                            </tr>
                                        </thead>
                                        <tbody>${calendarBody}</tbody>
                                    </table>
                                </div>
                                <div class="card-footer bg-white border-top p-3">
                                    <a href="#events" class="btn btn-outline-primary w-100 rounded-pill fw-bold btn-sm">Full Calendar</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-7">
                            <div class="ps-lg-4">
                                <div class="d-flex justify-content-between align-items-end mb-4">
                                    <div>
                                        <h6 class="text-primary fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">Events</h6>
                                        <h2 class="fw-bold m-0 text-dark">Upcoming Activities</h2>
                                    </div>
                                    <a href="#events" class="text-decoration-none text-primary fw-bold small d-flex align-items-center">
                                        View All <img src="${arrowRight}" width="16" class="ms-1">
                                    </a>
                                </div>
                                <div class="d-flex flex-column gap-3">
                                    ${eventsInMonth.slice(0, 3).map(e => `
                                        <div class="card border-0 shadow-sm hover-lift transition-all">
                                            <div class="card-body p-3 d-flex align-items-center gap-3">
                                                <div class="bg-light rounded-3 text-center px-3 py-2 border" style="min-width: 60px;">
                                                    <div class="fw-bold text-dark h5 mb-0">${new Date(e.date).getDate()}</div>
                                                    <div class="small text-uppercase text-secondary" style="font-size: 0.65rem;">${monthNames[today.getMonth()].substring(0,3)}</div>
                                                </div>
                                                <div class="flex-grow-1 overflow-hidden">
                                                    <h6 class="fw-bold text-dark mb-1 text-truncate">${e.title}</h6>
                                                    <p class="small text-muted mb-0 text-truncate">${e.description}</p>
                                                </div>
                                                <a href="#events" class="btn btn-sm btn-light rounded-circle" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                                                    <img src="${chevronRight}" width="14" style="opacity: 0.6">
                                                </a>
                                            </div>
                                        </div>
                                    `).join('')}
                                    ${eventsInMonth.length === 0 ? `
                                        <div class="p-4 bg-white rounded-3 border border-dashed text-center">
                                            <p class="text-muted mb-0 small">No events scheduled for the rest of ${monthNames[today.getMonth()]}.</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="home-highlights" class="py-6 bg-white section-spacing">
                <div class="container">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-end mb-5 gap-3">
                        <div style="max-width: 600px;">
                            <span class="badge bg-secondary bg-opacity-10 text-secondary mb-2 rounded-pill px-3 py-2 border border-secondary border-opacity-25">Community</span>
                            <h2 class="fw-bold mb-2">Recent Stories</h2>
                            <p class="text-muted mb-0">Celebrating the achievements, memories, and milestones of the SPECS family.</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="prev">
                                <img src="${chevronRight}" width="16" style="transform: rotate(180deg);">
                            </button>
                            <button class="btn btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="next">
                                <img src="${chevronRight}" width="16">
                            </button>
                        </div>
                    </div>
                    <div id="highlightsCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner" style="height: 400px;">
                            ${carouselHTML}
                        </div>
                    </div>
                </div>
            </section>

            <section class="py-6 bg-primary text-center">
                <div class="container">
                    <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-white bg-opacity-10 mb-4" style="width: 64px; height: 64px;">
                        <img src="${journalCode}" style="width: 28px; filter: invert(1);">
                    </div>
                    <h2 class="display-6 fw-bold text-white mb-3">Student Resources</h2>
                    <p class="lead text-white-50 mb-5 mx-auto" style="max-width: 600px;">
                        Everything you need to navigate your academic journey and organizational requirements in one place.
                    </p>

                    <div class="row justify-content-center g-4 mb-5">
                        <div class="col-md-3 col-6">
                            <div class="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 h-100 d-flex flex-column align-items-center justify-content-center hover-lift">
                                <img src="${mortarboard}" width="32" class="mb-3 filter-white opacity-75">
                                <h6 class="text-white mb-0 small fw-bold">BSCS Program</h6>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 h-100 d-flex flex-column align-items-center justify-content-center hover-lift">
                                <img src="${briefcase}" width="32" class="mb-3 filter-white opacity-75">
                                <h6 class="text-white mb-0 small fw-bold">Careers</h6>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 h-100 d-flex flex-column align-items-center justify-content-center hover-lift">
                                <img src="${folder2Open}" width="32" class="mb-3 filter-white opacity-75">
                                <h6 class="text-white mb-0 small fw-bold">Public Files</h6>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 h-100 d-flex flex-column align-items-center justify-content-center hover-lift">
                                <img src="${questionCircle}" width="32" class="mb-3 filter-white opacity-75">
                                <h6 class="text-white mb-0 small fw-bold">Help & FAQ</h6>
                            </div>
                        </div>
                    </div>

                    <a href="#resources" class="btn btn-light text-primary rounded-pill px-5 py-3 fw-bold shadow-lg hover-lift">
                        Explore Resources
                    </a>

                    <div class="mt-5 pt-4 border-top border-white border-opacity-25">
                        <ul class="list-inline mb-0">
                            <li class="list-inline-item mx-3">
                                <a href="#terms" class="text-white-50 text-decoration-none small hover-white">Terms of Service</a>
                            </li>
                            <li class="list-inline-item mx-3">
                                <a href="#privacy" class="text-white-50 text-decoration-none small hover-white">Privacy Policy</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

        </div>
    `;

    const carEl = document.getElementById('highlightsCarousel');
    if(carEl && allHighlights.length > 0) {
        new Carousel(carEl, { interval: 6000, touch: true });
    }
}