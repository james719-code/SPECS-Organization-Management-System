
import logoURL from '../../../public/logo.webp';

import calendarCheck from 'bootstrap-icons/icons/calendar-check.svg';
import arrowRight from 'bootstrap-icons/icons/arrow-right.svg';
import chevronRight from 'bootstrap-icons/icons/chevron-right.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import laptop from 'bootstrap-icons/icons/laptop.svg';

import mortarboard from 'bootstrap-icons/icons/mortarboard.svg';
import briefcase from 'bootstrap-icons/icons/briefcase.svg';
import folder2Open from 'bootstrap-icons/icons/folder2-open.svg';
import questionCircle from 'bootstrap-icons/icons/question-circle.svg';
import journalCode from 'bootstrap-icons/icons/journal-code.svg';

import { Carousel } from 'bootstrap';
import { fetchHighlights, fetchEvents } from '../data/data.js';

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
                     style="min-height: 90vh; background: radial-gradient(ellipse at 20% 50%, #0d6b66 0%, #264653 50%, #1a2c38 100%);">
                <!-- Decorative background elements -->
                <div class="position-absolute w-100 h-100" style="pointer-events: none;">
                    <div class="position-absolute hero-glow" style="width: 400px; height: 400px; top: 10%; left: -5%; background: radial-gradient(circle, rgba(244,162,97,0.12) 0%, transparent 70%); border-radius: 50%;"></div>
                    <div class="position-absolute hero-glow-delayed" style="width: 500px; height: 500px; bottom: -10%; right: -10%; background: radial-gradient(circle, rgba(42,157,143,0.15) 0%, transparent 70%); border-radius: 50%;"></div>
                    <div class="position-absolute" style="top: 15%; right: 12%; width: 6px; height: 6px; background: rgba(244,162,97,0.5); border-radius: 50%; animation: float 6s ease-in-out infinite;"></div>
                    <div class="position-absolute" style="top: 70%; left: 8%; width: 4px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 50%; animation: float 8s ease-in-out 1s infinite;"></div>
                    <div class="position-absolute" style="top: 30%; right: 25%; width: 3px; height: 3px; background: rgba(42,157,143,0.4); border-radius: 50%; animation: float 7s ease-in-out 2s infinite;"></div>
                    <div class="position-absolute d-none d-lg-block" style="top: 20%; left: 15%; opacity: 0.04;">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <div class="position-absolute d-none d-lg-block" style="bottom: 20%; right: 12%; opacity: 0.03;">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="white"><rect x="3" y="3" width="18" height="18" rx="3" stroke="white" stroke-width="1.5" fill="none"/><path d="M8 12l3 3 5-5" stroke="white" stroke-width="1.5" fill="none"/></svg>
                    </div>
                </div>
                
                <div class="container position-relative z-1 text-white">
                    <div class="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill mb-4 animate-fade-in-up" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(8px);">
                        <span class="badge rounded-pill px-2 py-1" style="background: linear-gradient(135deg, #f4a261, #e76f51); font-size: 0.65rem;">OFFICIAL</span>
                        <span class="small fw-medium text-white-50" style="letter-spacing: 0.5px;">Society of Programmers & Enthusiasts</span>
                    </div>
                    <h1 class="display-2 fw-bold mb-4 animate-fade-in-up delay-100 lh-1" style="letter-spacing: -1.5px;">
                        Build the Future.<br><span class="text-gradient-secondary">Code the World.</span>
                    </h1>
                    <p class="lead mb-5 mx-auto animate-fade-in-up delay-200" style="max-width: 600px; color: rgba(255,255,255,0.6); line-height: 1.7;">
                        The premier CS organization at Partido State University — fostering innovation, collaboration, and academic excellence since day one.
                    </p>
                    <div class="d-flex flex-column flex-sm-row justify-content-center gap-3 animate-fade-in-up delay-300">
                        <a href="#about" class="btn btn-lg rounded-pill px-5 fw-bold shadow-lg hover-lift" style="background: linear-gradient(135deg, #f4a261, #e76f51); border: none; color: white;">Get Started</a>
                        <a href="#events" class="btn btn-outline-light btn-lg rounded-pill px-5 fw-bold hover-lift" style="border-width: 2px;">Upcoming Events</a>
                    </div>
                </div>
            </section>

            <section id="home-about" class="py-6 section-spacing bg-white">
                <div class="container">
                    <div class="row align-items-center gx-5 gy-5">
                        <div class="col-lg-6 order-lg-2">
                            <div class="p-5 rounded-4 text-center position-relative overflow-hidden" style="background: linear-gradient(145deg, #f0faf9 0%, #e8f4f3 100%); border: 1px solid rgba(13,107,102,0.08);">
                                <div class="position-absolute" style="width: 180px; height: 180px; top: -40px; right: -40px; background: radial-gradient(circle, rgba(244,162,97,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                                <div class="position-absolute" style="width: 120px; height: 120px; bottom: -30px; left: -20px; background: radial-gradient(circle, rgba(13,107,102,0.08) 0%, transparent 70%); border-radius: 50%;"></div>
                                <img src="${logoURL}" alt="SPECS Logo" class="img-fluid hover-scale transition-all position-relative z-1" style="max-width: 220px; filter: drop-shadow(0 20px 40px rgba(13,107,102,0.15));">
                            </div>
                        </div>
                        <div class="col-lg-6 order-lg-1">
                            <span class="badge rounded-pill px-3 py-2 mb-3" style="background: rgba(13,107,102,0.08); color: #0d6b66; font-size: 0.75rem; letter-spacing: 1px; font-weight: 600;">OUR MISSION</span>
                            <h2 class="display-5 fw-bold mb-4 text-dark" style="letter-spacing: -0.5px;">Empowering the Next Generation of <span class="text-gradient-secondary">Tech Leaders.</span></h2>
                            <p class="lead text-secondary mb-5" style="line-height: 1.7;">We bridge the gap between academic theory and real-world application through workshops, mentorship, and collaborative projects.</p>
                            <div class="d-flex flex-column gap-4">
                                <div class="d-flex gap-3 p-3 rounded-3 hover-lift transition-all" style="background: rgba(13,107,102,0.03);">
                                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background: linear-gradient(135deg, #0d6b66, #2a9d8f);">
                                        <img src="${peopleFill}" width="20" style="filter: brightness(0) invert(1);">
                                    </div>
                                    <div>
                                        <h5 class="fw-bold mb-1">Community First</h5>
                                        <p class="text-muted small mb-0">Join a network of passionate peers and alumni mentors.</p>
                                    </div>
                                </div>
                                <div class="d-flex gap-3 p-3 rounded-3 hover-lift transition-all" style="background: rgba(244,162,97,0.04);">
                                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background: linear-gradient(135deg, #f4a261, #e76f51);">
                                        <img src="${laptop}" width="20" style="filter: brightness(0) invert(1);">
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

            <section id="home-events" class="py-6 section-spacing" style="background: linear-gradient(180deg, #f8fafa 0%, #ffffff 100%);">
                <div class="container">
                    <div class="row gx-5 gy-5">
                        <div class="col-lg-5">
                            <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100" style="border: 1px solid rgba(13,107,102,0.06) !important;">
                                <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="d-inline-flex align-items-center justify-content-center rounded-circle" style="width: 32px; height: 32px; background: rgba(13,107,102,0.08);">
                                            <img src="${calendarCheck}" width="16" style="filter: invert(33%) sepia(19%) saturate(2256%) hue-rotate(130deg) brightness(95%) contrast(90%);">
                                        </span>
                                        <span class="fw-bold fs-5 text-dark">${monthNames[today.getMonth()]} ${today.getFullYear()}</span>
                                    </div>
                                </div>
                                <div class="card-body p-3">
                                    <table class="table table-borderless mb-0 w-100" style="table-layout: fixed;">
                                        <thead>
                                            <tr class="text-uppercase text-center" style="font-size: 0.7rem; color: #9ca3af; letter-spacing: 0.5px;">
                                                <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th>
                                            </tr>
                                        </thead>
                                        <tbody>${calendarBody}</tbody>
                                    </table>
                                </div>
                                <div class="card-footer bg-white border-top p-3">
                                    <a href="#events" class="btn btn-primary w-100 rounded-pill fw-bold btn-sm" style="background: linear-gradient(135deg, #0d6b66, #2a9d8f); border: none;">View Full Calendar</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-7">
                            <div class="ps-lg-4">
                                <div class="d-flex justify-content-between align-items-end mb-4">
                                    <div>
                                        <span class="badge rounded-pill px-3 py-2 mb-2" style="background: rgba(13,107,102,0.08); color: #0d6b66; font-size: 0.7rem; letter-spacing: 1px; font-weight: 600;">EVENTS</span>
                                        <h2 class="fw-bold m-0 text-dark">Upcoming Activities</h2>
                                    </div>
                                    <a href="#events" class="text-decoration-none text-primary fw-bold small d-flex align-items-center gap-1 hover-lift">
                                        View All <img src="${arrowRight}" width="16">
                                    </a>
                                </div>
                                <div class="d-flex flex-column gap-3">
                                    ${eventsInMonth.slice(0, 3).map(e => `
                                        <div class="card border-0 shadow-sm hover-lift transition-all rounded-3 overflow-hidden">
                                            <div class="card-body p-0 d-flex align-items-stretch">
                                                <div class="text-center px-3 py-3 d-flex flex-column justify-content-center" style="min-width: 70px; background: linear-gradient(135deg, #0d6b66, #2a9d8f);">
                                                    <div class="fw-bold text-white h4 mb-0">${new Date(e.date).getDate()}</div>
                                                    <div class="text-uppercase fw-bold" style="font-size: 0.6rem; color: rgba(255,255,255,0.7); letter-spacing: 1px;">${monthNames[today.getMonth()].substring(0, 3)}</div>
                                                </div>
                                                <div class="flex-grow-1 overflow-hidden p-3 d-flex align-items-center">
                                                    <div class="flex-grow-1">
                                                        <h6 class="fw-bold text-dark mb-1 text-truncate">${e.title}</h6>
                                                        <p class="small text-muted mb-0 text-truncate">${e.description}</p>
                                                    </div>
                                                    <a href="#events" class="btn btn-sm rounded-circle flex-shrink-0 ms-2" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(13,107,102,0.06);">
                                                        <img src="${chevronRight}" width="14" style="opacity: 0.6">
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                    ${eventsInMonth.length === 0 ? `
                                        <div class="p-5 rounded-4 text-center" style="background: rgba(13,107,102,0.03); border: 1px dashed rgba(13,107,102,0.15);">
                                            <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(13,107,102,0.06);">
                                                <img src="${calendarCheck}" width="24" style="opacity: 0.4;">
                                            </div>
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
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 gap-3">
                        <div style="max-width: 600px;">
                            <span class="badge rounded-pill px-3 py-2 mb-2" style="background: rgba(244,162,97,0.1); color: #e76f51; font-size: 0.7rem; letter-spacing: 1px; font-weight: 600; border: 1px solid rgba(244,162,97,0.2);">COMMUNITY</span>
                            <h2 class="fw-bold mb-2" style="letter-spacing: -0.3px;">Recent Stories</h2>
                            <p class="text-muted mb-0">Celebrating the achievements, memories, and milestones of the SPECS family.</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn rounded-circle p-0 d-flex align-items-center justify-content-center carousel-nav-btn" style="width: 42px; height: 42px; background: rgba(13,107,102,0.06); border: 1px solid rgba(13,107,102,0.12);" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="prev">
                                <img src="${chevronRight}" width="16" style="transform: rotate(180deg); filter: invert(33%) sepia(19%) saturate(2256%) hue-rotate(130deg) brightness(95%) contrast(90%);">
                            </button>
                            <button class="btn rounded-circle p-0 d-flex align-items-center justify-content-center carousel-nav-btn" style="width: 42px; height: 42px; background: rgba(13,107,102,0.06); border: 1px solid rgba(13,107,102,0.12);" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="next">
                                <img src="${chevronRight}" width="16" style="filter: invert(33%) sepia(19%) saturate(2256%) hue-rotate(130deg) brightness(95%) contrast(90%);">
                            </button>
                        </div>
                    </div>
                    <div id="highlightsCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner" style="height: 420px;">
                            ${carouselHTML}
                        </div>
                    </div>
                </div>
            </section>

            <section id="home-volunteer" class="py-6 section-spacing" style="background: linear-gradient(180deg, #ffffff 0%, #f0faf9 100%);">
                <div class="container">
                    <div class="text-center mb-5">
                        <span class="badge rounded-pill px-3 py-2 mb-2" style="background: rgba(244,162,97,0.1); color: #e76f51; font-size: 0.7rem; letter-spacing: 1px; font-weight: 600; border: 1px solid rgba(244,162,97,0.2);">GET INVOLVED</span>
                        <h2 class="fw-bold mb-3" style="letter-spacing: -0.3px;">Why Volunteer with SPECS?</h2>
                        <p class="text-muted mx-auto" style="max-width: 600px;">Members may volunteer for various tasks and earn certificates of recognition based on their verified level of involvement.</p>
                    </div>
                    <div class="row g-4 justify-content-center mb-5">
                        <div class="col-md-6 col-lg-3">
                            <div class="card border-0 shadow-sm h-100 rounded-4 hover-lift text-center p-4">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style="width: 56px; height: 56px; background: linear-gradient(135deg, #0d6b66, #2a9d8f);">
                                    <svg width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>
                                </div>
                                <h6 class="fw-bold mb-2">Event Setup & Logistics</h6>
                                <p class="text-muted small mb-0">Help organize and manage events, from planning to execution.</p>
                            </div>
                        </div>
                        <div class="col-md-6 col-lg-3">
                            <div class="card border-0 shadow-sm h-100 rounded-4 hover-lift text-center p-4">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style="width: 56px; height: 56px; background: linear-gradient(135deg, #f4a261, #e76f51);">
                                    <svg width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/><path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2zM14 2H2a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V2z"/></svg>
                                </div>
                                <h6 class="fw-bold mb-2">Media & Documentation</h6>
                                <p class="text-muted small mb-0">Capture moments and create content for the organization.</p>
                            </div>
                        </div>
                        <div class="col-md-6 col-lg-3">
                            <div class="card border-0 shadow-sm h-100 rounded-4 hover-lift text-center p-4">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style="width: 56px; height: 56px; background: linear-gradient(135deg, #0d6b66, #2a9d8f);">
                                    <svg width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>
                                </div>
                                <h6 class="fw-bold mb-2">Hosting & Coordination</h6>
                                <p class="text-muted small mb-0">Emcee events and coordinate activities for smooth operations.</p>
                            </div>
                        </div>
                        <div class="col-md-6 col-lg-3">
                            <div class="card border-0 shadow-sm h-100 rounded-4 hover-lift text-center p-4">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style="width: 56px; height: 56px; background: linear-gradient(135deg, #f4a261, #e76f51);">
                                    <svg width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/></svg>
                                </div>
                                <h6 class="fw-bold mb-2">Technical Support</h6>
                                <p class="text-muted small mb-0">Provide programming and tech support for org projects.</p>
                            </div>
                        </div>
                    </div>
                    <div class="text-center">
                        <div class="d-inline-flex align-items-center gap-3 px-4 py-3 rounded-4" style="background: rgba(13,107,102,0.04); border: 1px solid rgba(13,107,102,0.1);">
                            <svg width="28" height="28" fill="#0d6b66" viewBox="0 0 16 16"><path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3zM3 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H3z"/><path d="M5.255 5.786a.237.237 0 0 0-.241.247v.394c0 .066.026.13.073.179l2.487 2.442a.237.237 0 0 0 .332 0l2.487-2.442a.254.254 0 0 0 .073-.179v-.394a.237.237 0 0 0-.405-.168L8 7.63 5.66 5.618a.237.237 0 0 0-.164-.068h-.069a.237.237 0 0 0-.172.236z"/></svg>
                            <div class="text-start">
                                <p class="fw-bold mb-0 text-dark">Earn Certificates of Contribution</p>
                                <p class="text-muted small mb-0">Volunteers receive official certificates of recognition based on their verified level of involvement.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="py-6 text-center position-relative overflow-hidden" style="background: linear-gradient(135deg, #264653 0%, #0d6b66 50%, #2a9d8f 100%);">
                <div class="position-absolute w-100 h-100" style="top: 0; left: 0; pointer-events: none;">
                    <div class="position-absolute" style="width: 300px; height: 300px; top: -80px; right: -60px; background: radial-gradient(circle, rgba(244,162,97,0.12) 0%, transparent 70%); border-radius: 50%;"></div>
                    <div class="position-absolute" style="width: 200px; height: 200px; bottom: -40px; left: -30px; background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); border-radius: 50%;"></div>
                </div>
                <div class="container position-relative">
                    <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-4" style="width: 72px; height: 72px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);">
                        <img src="${journalCode}" style="width: 30px; filter: invert(1);">
                    </div>
                    <h2 class="display-6 fw-bold text-white mb-3">Student Resources</h2>
                    <p class="lead mb-5 mx-auto" style="max-width: 600px; color: rgba(255,255,255,0.6);">
                        Everything you need to navigate your academic journey and organizational requirements in one place.
                    </p>

                    <div class="row justify-content-center g-4 mb-5">
                        <div class="col-md-3 col-6">
                            <div class="p-4 rounded-4 h-100 d-flex flex-column align-items-center justify-content-center hover-lift resource-glass-card">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(244,162,97,0.15);">
                                    <img src="${mortarboard}" width="26" class="filter-white">
                                </div>
                                <h6 class="text-white mb-1 small fw-bold">BSCS Program</h6>
                                <p class="text-white-50 mb-0" style="font-size: 0.7rem;">Curriculum & courses</p>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-4 rounded-4 h-100 d-flex flex-column align-items-center justify-content-center hover-lift resource-glass-card">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(42,157,143,0.2);">
                                    <img src="${briefcase}" width="26" class="filter-white">
                                </div>
                                <h6 class="text-white mb-1 small fw-bold">Careers</h6>
                                <p class="text-white-50 mb-0" style="font-size: 0.7rem;">Job opportunities</p>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-4 rounded-4 h-100 d-flex flex-column align-items-center justify-content-center hover-lift resource-glass-card">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(244,162,97,0.15);">
                                    <img src="${folder2Open}" width="26" class="filter-white">
                                </div>
                                <h6 class="text-white mb-1 small fw-bold">Public Files</h6>
                                <p class="text-white-50 mb-0" style="font-size: 0.7rem;">Documents & forms</p>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="p-4 rounded-4 h-100 d-flex flex-column align-items-center justify-content-center hover-lift resource-glass-card">
                                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(42,157,143,0.2);">
                                    <img src="${questionCircle}" width="26" class="filter-white">
                                </div>
                                <h6 class="text-white mb-1 small fw-bold">Help & FAQ</h6>
                                <p class="text-white-50 mb-0" style="font-size: 0.7rem;">Common questions</p>
                            </div>
                        </div>
                    </div>

                    <a href="#resources" class="btn btn-light text-primary rounded-pill px-5 py-3 fw-bold shadow-lg hover-lift">
                        Explore Resources
                    </a>

                    <div class="mt-5 pt-4 border-top border-white border-opacity-25">
                        <div class="d-flex justify-content-center align-items-center gap-4 flex-wrap">
                            <a href="#resources" class="text-white text-decoration-none small fw-medium hover-lift d-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-white bg-opacity-10 transition-all" style="backdrop-filter: blur(10px);">
                                <svg width="14" height="14" fill="currentColor" class="opacity-75" viewBox="0 0 16 16">
                                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                                    <path d="M5 7a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5z"/>
                                </svg>
                                Terms of Service
                            </a>
                            <span class="text-white-50">•</span>
                            <a href="#resources" class="text-white text-decoration-none small fw-medium hover-lift d-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-white bg-opacity-10 transition-all" style="backdrop-filter: blur(10px);">
                                <svg width="14" height="14" fill="currentColor" class="opacity-75" viewBox="0 0 16 16">
                                    <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
                                    <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                                </svg>
                                Privacy Policy
                            </a>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    `;

    const carEl = document.getElementById('highlightsCarousel');
    if (carEl && allHighlights.length > 0) {
        new Carousel(carEl, { interval: 6000, touch: true });
    }
}