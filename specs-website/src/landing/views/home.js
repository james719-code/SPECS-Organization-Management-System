// views/home.js

// --- IMPORTS ---
import logoURL from '../../../public/logo.webp';
import calendarCheck from 'bootstrap-icons/icons/calendar-check.svg';
import journalCode from 'bootstrap-icons/icons/journal-code.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';

import { Carousel } from 'bootstrap';

export function renderHomePage(container) {
    container.innerHTML = `
        <!-- (HTML sections remain the same) -->

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

            <!-- Resources Summary -->
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

            <!-- Highlight Posts Carousel (Bootstrap 5 Syntax) -->
            <section id="home-stories" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-4">Member Highlights</h2>
                    <p class="text-center text-muted col-lg-8 mx-auto mb-5">Hear from our members about their experiences, projects, and successes within the SPECS community.</p>

                    <!-- NOTE: data-bs-ride attribute is correctly removed -->
                    <div id="storiesCarousel" class="carousel slide shadow-lg rounded">
                        <div class="carousel-indicators">
                            <button type="button" data-bs-target="#storiesCarousel" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
                            <button type="button" data-bs-target="#storiesCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
                            <button type="button" data-bs-target="#storiesCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
                        </div>
                        <div class="carousel-inner p-4 p-md-5 rounded text-center">
                            <!-- Slides -->
                            <div class="carousel-item active">
                                <div class="col-lg-8 d-inline-block">
                                    <img src="${personCircle}" class="rounded-circle mb-3 bg-white p-1" alt="Member Photo" style="width: 80px; height: 80px; opacity: 0.8;">
                                    <figure>
                                        <blockquote class="blockquote">
                                            <p>"Joining SPECS was the best decision of my college life. The workshops helped me land my first internship!"</p>
                                        </blockquote>
                                        <figcaption class="blockquote-footer text-success fw-semibold">
                                            Juan Dela Cruz, <cite title="Source Title">4th Year BSCS</cite>
                                        </figcaption>
                                    </figure>
                                </div>
                            </div>
                            <div class="carousel-item">
                                <div class="col-lg-8 d-inline-block">
                                    <img src="${personCircle}" class="rounded-circle mb-3 bg-white p-1" alt="Member Photo" style="width: 80px; height: 80px; opacity: 0.8;">
                                    <figure>
                                        <blockquote class="blockquote">
                                            <p>"The programming competition was intense but incredibly rewarding. I learned so much from my peers."</p>
                                        </blockquote>
                                        <figcaption class="blockquote-footer text-success fw-semibold">
                                            Maria Clara, <cite title="Source Title">3rd Year BSCS</cite>
                                        </figcaption>
                                    </figure>
                                </div>
                            </div>
                            <div class="carousel-item">
                               <div class="col-lg-8 d-inline-block">
                                    <img src="${personCircle}" class="rounded-circle mb-3 bg-white p-1" alt="Member Photo" style="width: 80px; height: 80px; opacity: 0.8;">
                                    <figure>
                                        <blockquote class="blockquote">
                                            <p>"The sense of community is amazing. There's always someone willing to help you with a tough coding problem."</p>
                                        </blockquote>
                                        <figcaption class="blockquote-footer text-success fw-semibold">
                                            Andres Bonifacio, <cite title="Source Title">2nd Year BSCS</cite>
                                        </figcaption>
                                    </figure>
                                </div>
                            </div>
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#storiesCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#storiesCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                     <div class="text-center mt-5">
                        <a href="#stories" class="btn btn-primary">Read More Inspiring Stories</a>
                    </div>
                </div>
            </section>
        </div>
    `;

    // --- PROPER BOOTSTRAP 5 INITIALIZATION ---
    const storiesCarouselElement = document.getElementById('storiesCarousel');
    if (storiesCarouselElement) {
        // Step 1: Create the carousel instance with your desired options.
        const storiesCarousel = new Carousel(storiesCarouselElement, {
            interval: 3000,
            pause: false,
            ride: "carousel",
            wrap: true
        });
    }
}