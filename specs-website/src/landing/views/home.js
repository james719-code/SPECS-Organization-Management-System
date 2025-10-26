// views/home.js

// --- IMPORTS ---
import logoURL from '../../../public/logo.webp';
import calendarCheck from 'bootstrap-icons/icons/calendar-check.svg';
import journalCode from 'bootstrap-icons/icons/journal-code.svg';

import { Carousel } from 'bootstrap';
import { fetchHighlights } from '../data/data.js';

export async function renderHomePage(container) {
    const { documents: allHighlights } = await fetchHighlights();

    const carouselHighlights = allHighlights.slice(0, 3);

    const carouselIndicatorsHTML = carouselHighlights.map((_, index) => `
        <button 
            type="button" 
            data-bs-target="#highlightsCarousel" 
            data-bs-slide-to="${index}" 
            class="${index === 0 ? 'active' : ''}" 
            aria-current="${index === 0 ? 'true' : 'false'}" 
            aria-label="Slide ${index + 1}"
        ></button>
    `).join('');

    const carouselItemsHTML = carouselHighlights.map((highlight, index) => {
        const maxDescriptionLength = 150;
        let truncatedDescription = highlight.description;
        if (truncatedDescription.length > maxDescriptionLength) {
            truncatedDescription = truncatedDescription.substring(0, maxDescriptionLength) + '...';
        }

        return `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <div 
                class="carousel-image-container" 
                style="background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${highlight.image}')"
            >
                <div class="container">
                    <!-- UPDATED: Added mx-auto to center the caption block -->
                    <div class="carousel-caption text-center text-white mx-auto">
                        <h2 class="fw-bold">${highlight.title}</h2>
                        <p class="lead opacity-75 d-none d-md-block">${truncatedDescription}</p>
                        <a class="btn btn-lg btn-primary" href="#/stories/${highlight.id}">Learn More</a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');


    container.innerHTML = `
        <!-- Hero Section -->
        <section class="hero-section-gradient text-white text-center d-flex align-items-center" style="min-height: calc(100vh - 5rem);">
            <div class="container">
                <h1 class="display-4 fw-bold">Society of Programmers and Enthusiasts in Computer Science</h1>
                <p class="lead col-lg-8 mx-auto">A hub for Computer Science students to get the latest updates on events and activities within the SPECS Organization.</p>
            </div>
        </section>

        <!-- Main Content with Summaries -->
        <div class="content-summaries">
            <!-- About Us Summary -->
            <section id="home-about" class="py-5">
                <div class="container">
                    <div class="row align-items-center g-5">
                        <div class="col-lg-6">
                            <h2 class="fw-bold">Who We Are</h2>
                            <p class="lead text-muted">The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the premier organization for CS students at Partido State University, dedicated to fostering a dynamic environment of learning, innovation, and collaboration.</p>
                            <a href="#about" class="btn btn-primary mt-3">Meet the Team & Learn More</a>
                        </div>
                        <div class="col-lg-6 text-center">
                            <img src="${logoURL}" class="img-fluid rounded shadow-sm" alt="SPECS Organization Logo" style="max-width: 300px;">
                        </div>
                    </div>
                </div>
            </section>

            <!-- Events Summary -->
            <section id="home-events" class="py-5 bg-light">
                <div class="container">
                    <div class="row align-items-center g-5 flex-lg-row-reverse">
                        <div class="col-lg-6">
                            <h2 class="fw-bold">Our Events</h2>
                            <p class="lead text-muted">We organize a variety of events, including coding seminars, workshops, programming competitions, and tech talks from industry professionals to enhance your skills and network.</p>
                            <a href="#events" class="btn btn-primary mt-3">View All Events</a>
                        </div>
                        <div class="col-lg-6 text-center">
                             <img src="${calendarCheck}" class="img-fluid text-primary" alt="Events Icon" style="width: 140px; height: 140px; filter: drop-shadow(0 0.5rem 1rem rgba(0,0,0,0.1));">
                        </div>
                    </div>
                </div>
            </section>
            
            <section id="home-resources" class="py-5">
                 <div class="container">
                     <div class="row align-items-center g-5">
                        <div class="col-lg-6">
                            <h2 class="fw-bold">Valuable Resources</h2>
                            <p class="lead text-muted">Gain access to a wealth of resources, including information on the BSCS program, potential career paths, and a comprehensive FAQ section to guide you on your academic journey.</p>
                            <a href="#resources" class="btn btn-primary mt-3">Explore Resources</a>
                        </div>
                        <div class="col-lg-6 text-center">
                             <img src="${journalCode}" class="img-fluid text-primary" alt="Resources Icon" style="width: 140px; height: 140px; filter: drop-shadow(0 0.5rem 1rem rgba(0,0,0,0.1));">
                        </div>
                    </div>
                </div>
            </section>

            <!-- Highlight Posts Carousel -->
            <section id="home-highlights" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-4">Latest Highlights</h2>
                    <p class="text-center text-muted col-lg-8 mx-auto mb-5">Check out our most recent events, achievements, and success stories from the SPECS community.</p>
                    ${carouselHighlights.length > 0 ? `
                    <div id="highlightsCarousel" class="carousel slide shadow-lg" data-bs-ride="carousel">
                        <div class="carousel-indicators">
                            ${carouselIndicatorsHTML}
                        </div>
                        <div class="carousel-inner rounded overflow-hidden">
                            ${carouselItemsHTML}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#highlightsCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                    ` : ''}

                     <div class="text-center mt-5">
                        <a href="#stories" class="btn btn-primary">View All Highlights</a>
                    </div>
                </div>
            </section>
        </div>
        
        <style>
            .carousel-item {
                height: 65vh; 
                min-height: 400px;
            }
            .carousel-image-container {
                height: 100%;
                width: 100%;
                background-size: cover;
                background-position: center;
                display: flex;
                align-items: center; 
            }
            .carousel-caption {
                position: static;
                padding: 2rem;
                width: 80%;
            }
        </style>
    `;

    const highlightsCarouselElement = document.getElementById('highlightsCarousel');
    if (highlightsCarouselElement) {
        new Carousel(highlightsCarouselElement, {
            interval: 5000,
            wrap: true
        });
    }
}