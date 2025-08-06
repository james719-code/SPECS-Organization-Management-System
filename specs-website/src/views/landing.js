import { databases, storage } from '../appwrite.js';
import { Query } from 'appwrite';

// --- CONFIGURATION ---
const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;
const BUCKET_ID_PICTURES = import.meta.env.VITE_BUCKET_ID_PICTURES;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const IMAGE_CACHE_KEY = 'eventImageCache';
const PICTURE_CACHE_KEY = 'pictureImageCache';

// --- CACHING & IMAGE PREVIEW FUNCTIONS ---
function getCachedImageUrl(fileId, width = 400, height = 250) {
    if (!fileId) return null;
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY)) || {};
        if (cache[fileId] && cache[fileId][`${width}x${height}`]) {
            return cache[fileId][`${width}x${height}`];
        }
        const newUrl = storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, fileId, width, height, 'center', 80);
        if (!cache[fileId]) cache[fileId] = {};
        cache[fileId][`${width}x${height}`] = newUrl;
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
        return newUrl;
    } catch (error) {
        console.warn("Could not access event image cache.", error);
        return storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, fileId, width, height, 'center', 80);
    }
}

function getPictureUrl(fileId, size = 150) {
    if (!fileId) return null;
    try {
        const cache = JSON.parse(localStorage.getItem(PICTURE_CACHE_KEY)) || {};
        if (cache[fileId]) {
            return cache[fileId];
        }
        const newUrl = storage.getFilePreview(BUCKET_ID_PICTURES, fileId, size, size, 'center', 90);
        cache[fileId] = newUrl;
        localStorage.setItem(PICTURE_CACHE_KEY, JSON.stringify(cache));
        return newUrl;
    } catch (error) {
        console.warn(`Could not get picture for ${fileId}.`, error);
        return null;
    }
}


// --- HTML TEMPLATE FUNCTIONS ---
function createGuestEventCard(eventDoc, isPastEvent = false) {
    const imageUrl = getCachedImageUrl(eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const collaboratorsHTML = (eventDoc.collab && eventDoc.collab.length > 0)
        ? `<div class="small text-muted mb-2"><i class="bi-people-fill me-1"></i><strong>In collaboration with:</strong> ${eventDoc.collab.join(', ')}</div>` : '';

    return `
        <div class="col">
            <div class="card h-100 shadow-sm overflow-hidden ${isPastEvent ? 'past-event-card' : ''}">
                <div class="event-image-placeholder bg-light" ${imageUrl ? `data-src="${imageUrl}"` : ''} data-alt="${eventDoc.event_name}"></div>
                <div class="card-body d-flex">
                    <div class="text-center border-end pe-3 me-3">
                        <div class="h5 ${isPastEvent ? 'text-muted' : 'text-danger'}">${eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div class="display-6 fw-bold ${isPastEvent ? 'text-muted' : ''}">${eventDate.getDate()}</div>
                    </div>
                    <div class="d-flex flex-column">
                        <h5 class="card-title">${eventDoc.event_name}</h5>
                        <p class="card-text small text-body-secondary flex-grow-1">${eventDoc.description || 'More details coming soon.'}</p>
                        ${collaboratorsHTML}
                        <div class="mt-auto small text-muted"><i class="bi-clock me-1"></i> ${formattedDate} at ${formattedTime}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createFaqItemHTML({ id, question, answer }) {
    return `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${id}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="false" aria-controls="collapse-${id}">${question}</button></h2>
            <div id="collapse-${id}" class="accordion-collapse collapse" aria-labelledby="heading-${id}" data-bs-parent="#faqAccordion"><div class="accordion-body">${answer}</div></div>
        </div>
    `;
}

function createOfficerCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId);
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100">
                <div class="card-body d-flex flex-column align-items-center justify-content-center p-3">
                    ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3" alt="${name}" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #fff;">`
        : `<i class="bi-person-circle fs-1 text-secondary mb-3" style="font-size: 100px !important;"></i>`
    }
                    <h5 class="card-title mb-1">${name}</h5>
                    <p class="card-text text-muted">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createAdviserCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId, 200);
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card text-center shadow">
                <div class="card-body p-4">
                     ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3" alt="${name}" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid #fff;">`
        : `<i class="bi-person-video3 fs-1 text-primary mb-3"></i>`
    }
                    <h5 class="card-title mb-1">${name}</h5>
                    <p class="card-text text-muted">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createJobCardHTML({ title, icon }) {
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3 rounded-circle" style="width: 4rem; height: 4rem;">
                        <i class="${icon}"></i>
                    </div>
                    <h5 class="fw-semibold mb-0">${title}</h5>
                </div>
            </div>
        </div>
    `;
}

function createLogoBreakdownHTML() {
    const hotspotPositions = [
        { point: 1, top: '42%', left: '30%' },
        { point: 2, top: '42%', left: '50%' },
        { point: 3, top: '33%', left: '46%' },
        { point: 4, top: '48%', left: '68%' },
        { point: 5, top: '57%', left: '65%' },
        { point: 6, top: '69%', left: '65%' },
        { point: 7, top: '22%', left: '35%' },
        { point: 8, top: '80%', left: '85%' },
        { point: 9, top: '75%', left: '36%' }
    ];

    const hotspotsHTML = hotspotPositions.map(hp =>
        `<div class="logo-hotspot" data-point="${hp.point}" style="top: ${hp.top}; left: ${hp.left};">${hp.point}</div>`
    ).join('');

    return `
        <section id="logo-breakdown" class="py-5">
            <div class="container">
                <h2 class="text-center fw-bold mb-3">The Official Organization Logo</h2>
                <p class="text-center text-muted mb-5">Designed by John Lester D. Gonzaga</p>
                <div class="row g-5 align-items-center">
                    <div class="col-lg-6">
                        <div class="logo-interactive-container">
                            <img src="/logo.webp" class="img-fluid" alt="SPECS Organization Logo with interactive points">
                            ${hotspotsHTML}
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="logo-description-panel p-4 rounded bg-light d-flex flex-column justify-content-center" style="min-height: 350px;">
                            <div id="logo-description-content">
                                <!-- This content will be updated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function getLandingHTML() {
    const faqData = [
        { id: 'one', question: 'What is SPECS?', answer: 'The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for Computer Science students at Partido State University. We aim to foster a community of learning, innovation, and collaboration.' },
        { id: 'two', question: 'Who can join SPECS?', answer: 'All bona fide students enrolled in the Computer Science program at Partido State University are encouraged to join and become active members of the organization.' },
        { id: 'three', question: 'How can I get updates on events?', answer: 'The best way is to create an account on this portal! We post all official events, announcements, and files here. You can also follow our official social media pages.' },
        { id: 'four', question: 'What kind of events does SPECS organize?', answer: 'We organize a variety of events, including coding seminars, workshops, programming competitions, tech talks from industry professionals, and social gatherings to build camaraderie among members.' },
    ];

    return `
    <style>
        .logo-interactive-container { position: relative; display: inline-block; }
        .logo-hotspot {
            position: absolute; width: 30px; height: 30px;
            background-color: rgba(0, 123, 255, 0.8); color: white;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-weight: bold; cursor: pointer; transform: translate(-50%, -50%);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 2px solid white; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
            animation: pulse 2s infinite;
        }
        .logo-hotspot:hover, .logo-hotspot.active {
            transform: translate(-50%, -50%) scale(1.3); animation: none;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
        }
        #logo-description-content {
            transition: opacity 0.3s ease-in-out;
        }
        #logo-description-content.content-hidden {
            opacity: 0;
        }
    </style>
    <div class="landing-page">
        <header class="navbar navbar-expand-lg fixed-top">
            <div class="container-fluid">  
                <a class="navbar-brand fw-bold" href="#">SPECS</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar"><span class="navbar-toggler-icon navbar-dark"></span></button>
                <div class="collapse navbar-collapse" id="mainNavbar">
                    <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                        <li class="nav-item"><a class="nav-link" href="#events">Events</a></li>
                        <li class="nav-item"><a class="nav-link" href="#about-specs">About SPECS</a></li>
                        <li class="nav-item"><a class="nav-link" href="#logo-breakdown">Our Logo</a></li>
                        <li class="nav-item"><a class="nav-link" href="#about-bscs">About BSCS</a></li>
                        <li class="nav-item"><a class="nav-link" href="#faq">FAQ</a></li>
                        <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
                        <li class="nav-item d-lg-none mt-2"><a href="#login" class="btn btn-sm btn-outline-light w-100">Login / Sign Up</a></li>
                    </ul>
                    <a href="#login" class="btn btn-sm btn-outline-light d-none d-lg-block">Login / Sign Up</a>
                </div>
            </div>
        </header>

        <main>
            <section class="hero-section-gradient text-white text-center py-5">
                <div class="container" style="padding-top: 5rem; padding-bottom: 3rem;">
                    <h1 class="display-4 fw-bold">Society of Programmers and Enthusiasts in Computer Science</h1>
                    <p class="lead col-lg-8 mx-auto">A hub for Computer Science students to get the latest updates on events and activities within the SPECS Organization.</p>
                </div>
            </section>

            <section id="events" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-3">Our Events</h2>
                    <p class="text-center text-muted mb-5">Stay updated with our latest activities and workshops.</p>
                    <h3 class="fw-bold mb-4">Upcoming Events</h3>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="upcoming-events-grid-container"><div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div></div>
                    <hr class="my-5">
                    <h3 class="fw-bold mb-4">Past Events</h3>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="past-events-grid-container"><div class="col-12 text-center p-5"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div></div></div>
                </div>
            </section>

            <section id="about-specs" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">About SPECS</h2>
                    <div class="row align-items-center">
                        <div class="col-lg-4 mb-4 mb-lg-0 text-center"><img src="/logo.webp" class="img-fluid rounded-3 shadow-sm" alt="SPECS Organization Logo" style="max-height: 250px;"></div>
                        <div class="col-lg-8">
                            <h3 class="fw-bold">Our Mission</h3>
                            <p>The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the premier organization for all Computer Science students at Partido State University. We are dedicated to fostering a dynamic environment of learning, innovation, and collaboration. Our goal is to empower members with the technical skills, professional networks, and leadership qualities necessary to excel in the ever-evolving world of technology.</p>
                        </div>
                    </div>
                    <hr class="my-5">
                    <h3 class="text-center fw-bold mb-5">Our Mentors and Leaders</h3>
                    <div class="row justify-content-center mb-5" id="adviser-card-container"></div>
                    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 justify-content-center" id="officers-grid-container"></div>
                </div>
            </section>

            ${createLogoBreakdownHTML()}

            <section id="about-bscs" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-3">The BSCS Program</h2>
                    <p class="text-center text-muted col-lg-8 mx-auto mb-5">The Bachelor of Science in Computer Science program at Partido State University equips students with a robust foundation in computing theories, programming, and system development to solve complex problems in various scientific and industrial domains.</p>
                    <h3 class="text-center fw-bold mb-5">Career Opportunities</h3>
                    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 justify-content-center" id="jobs-grid-container"></div>
                </div>
            </section>

            <section id="faq" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Frequently Asked Questions</h2>
                    <div class="row justify-content-center"><div class="col-lg-8"><div class="accordion" id="faqAccordion">${faqData.map(createFaqItemHTML).join('')}</div></div></div>
                </div>
            </section>
        </main>

        <footer id="contact" class="footer text-center py-5">
            <div class="container">
                <h3 class="fw-bold mb-3">Contact Us</h3>
                <p class="mb-4">For inquiries, partnerships, or more information about SPECS, feel free to reach out.</p>
                <div class="d-flex justify-content-center flex-wrap align-items-center gap-4">
                    <a href="mailto:parsu.specs@gmail.com" class="link-light text-decoration-none"><i class="bi-envelope-fill fs-4"></i><span class="ms-2">parsu.specs@gmail.com</span></a>
                    <a href="https://www.facebook.com/parsu.specs" target="_blank" class="link-light text-decoration-none"><i class="bi-facebook fs-4"></i><span class="ms-2">facebook.com/psu.specs</span></a>
                </div>
                <hr class="my-4">
                <p class="mb-0 small">© ${new Date().getFullYear()} SPECS. All Rights Reserved.</p>
            </div>
        </footer>
    </div>`;
}

// --- Handles lazy-loading images ---
function initializeImageLoader() {
    document.querySelectorAll('.event-image-placeholder').forEach(placeholder => {
        placeholder.style.height = '100%';
        placeholder.style.minHeight = '200px';
        const src = placeholder.dataset.src;
        if (!src) {
            placeholder.innerHTML = `<div class="d-flex w-100 h-100 justify-content-center align-items-center bg-secondary-subtle"><i class="bi-image-alt text-muted fs-1"></i></div>`;
            return;
        }
        const img = new Image();
        img.src = src;
        img.alt = placeholder.dataset.alt || 'Event image';
        img.className = 'w-100 h-100 object-fit-cover';
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease-in-out';
        img.onload = () => {
            placeholder.innerHTML = '';
            placeholder.appendChild(img);
            setTimeout(() => { img.style.opacity = '1'; }, 50);
        };
        img.onerror = () => {
            placeholder.innerHTML = `<div class="d-flex w-100 h-100 justify-content-center align-items-center bg-secondary-subtle"><i class="bi-image-alt text-muted fs-1"></i></div>`;
        };
    });
}

async function fetchUpcomingEvents() {
    const container = document.getElementById('upcoming-events-grid-container');
    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.equal('event_ended', false), Query.orderAsc('date_to_held'), Query.limit(3)]);
        if (response.documents.length > 0) {
            container.innerHTML = response.documents.map(doc => createGuestEventCard(doc, false)).join('');
        } else {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-calendar2-week" style="font-size: 4rem;"></i>
                    <h4 class="fw-light mt-3">No Upcoming Events</h4>
                    <p>New events and workshops will be posted here. Please check back soon!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Failed to load upcoming events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load upcoming events.</div></div>';
    }
}

async function fetchPastEvents() {
    const container = document.getElementById('past-events-grid-container');
    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.equal('event_ended', true), Query.orderDesc('date_to_held'), Query.limit(3)]);
        if (response.documents.length > 0) {
            container.innerHTML = response.documents.map(doc => createGuestEventCard(doc, true)).join('');
        } else {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-clock-history" style="font-size: 4rem;"></i>
                    <h4 class="fw-light mt-3">No Past Events Yet</h4>
                    <p>Our event history will appear here once events have concluded.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Failed to load past events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load past events.</div></div>';
    }
}

// --- Main render function ---
export default function renderLanding() {
    document.getElementById("app").innerHTML = getLandingHTML();

    const adviser = { name: 'Nicolas A. Pura', position: 'Organization Adviser', fileId: 'adviser' };
    const officers = [
        { name: 'Ramon P. Bombita Jr.', position: 'President', fileId: 'president' },
        { name: 'Ariel August A. Ablay', position: 'Vice-President External Affairs', fileId: 'vice-president-external' },
        { name: 'Alexander R. Santos', position: 'Vice-President Internal Affairs', fileId: 'vice-president-internal' },
        { name: 'Cathy A. Indico', position: 'Secretary', fileId: 'secretary' },
        { name: 'Princess Yvonne D. Palmes', position: 'Assistant Secretary', fileId: 'assistant-secretary' },
        { name: 'Lyzza V. Aboque', position: 'Treasurer', fileId: 'treasurer' },
        { name: 'James Ryan S. Gallego', position: 'Auditor', fileId: 'auditor' },
        { name: 'Mark Lorence R. Baltazar', position: 'P.I.O', fileId: 'pio' },
        { name: 'Clement A. Crucillo', position: 'Business Manager', fileId: 'business-manager-1' },
        { name: 'Rezel Joy A. Padillo', position: 'Business Manager', fileId: 'business-manager-2' },
        { name: 'Renalene V. Seares', position: 'Sergeant at Arms', fileId: 'SA1' },
        { name: 'Jabez B. Collano', position: 'Sergeant at Arms', fileId: 'SA2' },
        { name: 'Jhan Angelo Milante', position: '1A Representative', fileId: '1AR' },
        { name: 'Terence P. Serrano', position: '1B Representative', fileId: '1BR' },
        { name: 'Gil IV Miguel Salvador I. Cea', position: '2A Representative', fileId: '2AR' },
        { name: 'Joan C. Lara', position: '2B Representative', fileId: '2BR' },
        { name: 'Nonalyn N. Bondad', position: '3A Representative', fileId: '3AR' },
        { name: 'Robert A. Bayona Jr.', position: '3B Representative', fileId: '3BR' },
        { name: 'John Russel Ivan S. Romero', position: '4A Representative', fileId: '4AR' },
    ];
    const jobs = [
        { title: 'Software Engineer', icon: 'bi-code-slash' }, { title: 'Data Scientist', icon: 'bi-bar-chart-line-fill' },
        { title: 'Cybersecurity Analyst', icon: 'bi-shield-lock-fill' }, { title: 'AI/ML Engineer', icon: 'bi-robot' },
        { title: 'Game Developer', icon: 'bi-controller' }, { title: 'UX/UI Designer', icon: 'bi-palette-fill' },
    ];

    const adviserContainer = document.getElementById('adviser-card-container');
    //const officersContainer = document.getElementById('officers-grid-container');
    const jobsContainer = document.getElementById('jobs-grid-container');

    if (adviserContainer) adviserContainer.innerHTML = createAdviserCardHTML(adviser);
    //if (officersContainer) officersContainer.innerHTML = officers.map(createOfficerCardHTML).join('');
    if (jobsContainer) jobsContainer.innerHTML = jobs.map(createJobCardHTML).join('');

    // --- LOGIC FOR INTERACTIVE LOGO ---
    const symbolismData = [
        { num: 1, title: 'Human Head Silhouette', symbolism: 'Represents the intellectual and cognitive abilities central to computer science, emphasizing thinking, creativity, and problem-solving.', location: 'Positioned prominently in the center, it serves as the focal point of the logo.' },
        { num: 2, title: 'Processor Icon', symbolism: 'Represents the core concepts of processing power and computational thinking. The microchip is a fundamental element of all computing devices.', location: 'Embedded within the head, emphasizing that computation is at the core of the human thought process.' },
        { num: 3, title: 'Programming Icon', symbolism: 'Represents coding and software development. It highlights the importance of logical structuring and syntax, essential skills for computer scientists.', location: 'Near the top of the head, symbolizing that programming is a primary function of computer science.' },
        { num: 4, title: 'Database Icon', symbolism: 'Represents databases, critical for storing, managing, and retrieving data. It highlights the importance of data management in computer science.', location: 'Positioned near the head, showing the importance of data in computing.' },
        { num: 5, title: 'Lock Icon', symbolism: 'Signifies security and encryption, emphasizing the importance of protecting information in the digital age and representing cybersecurity.', location: 'Near the lower part of the head, indicating protective measures.' },
        { num: 6, title: 'Magnifying Glass Icon', symbolism: 'Represents analysis, research, and debugging. It symbolizes the investigative and problem-solving aspects of programming where attention to detail is crucial.', location: 'Situated near the database and programming icons, connecting the ideas of analysis and data.' },
        { num: 7, title: 'Scientific Icon', symbolism: 'Represents the interconnected nature of knowledge and technology, symbolizing networks, algorithms, and the scientific approach to problem-solving.', location: 'Surrounding the head, illustrating the broader context in which computer science operates.' },
        { num: 8, title: 'Gear Icon', symbolism: 'Represents engineering, automation, and the mechanical processes behind computer systems, symbolizing the systematic and technical nature of the field.', location: 'Represents the technical precision required in computer science.' },
        { num: 9, title: 'Cell-like Icon', symbolism: 'A metaphor for the fundamental building blocks of technology and the interconnectedness of networking, akin to how cells interact in a biological system.', location: 'Symbolizes the foundational and interconnected nature of computing.' }
    ];

    const hotspots = document.querySelectorAll('.logo-hotspot');
    const descriptionContent = document.getElementById('logo-description-content');

    const updateDescriptionPanel = (pointNumber, isReset = false) => {
        const data = symbolismData.find(item => item.num === pointNumber);
        let newHTML = '';

        if (isReset || !data) {
            newHTML = `
                <div class="text-center">
                    <i class="bi bi-arrows-move fs-1 text-primary mb-3"></i>
                    <h5 class="fw-bold">Explore the Logo</h5>
                    <p class="text-muted">Hover over the numbered points on the logo to discover the meaning behind each symbol.</p>
                </div>`;
        } else {
            newHTML = `
                <div class="text-start">
                    <div class="d-flex align-items-center mb-3">
                        <div class="flex-shrink-0"><i class="bi bi-bullseye text-primary fs-2 me-3"></i></div>
                        <div class="flex-grow-1">
                            <h5 class="fw-bold mb-0">${data.title}</h5>
                            <span class="text-primary small fw-semibold">SYMBOL #${data.num}</span>
                        </div>
                    </div>
                    <p class="text-muted mb-3">${data.symbolism}</p>
                    <p class="small text-muted border-top pt-3 mt-3 mb-0"><strong>Location:</strong> <em>${data.location}</em></p>
                </div>
            `;
        }

        descriptionContent.classList.add('content-hidden');
        setTimeout(() => {
            descriptionContent.innerHTML = newHTML;
            descriptionContent.classList.remove('content-hidden');
        }, 200);
    };

    hotspots.forEach(hotspot => {
        hotspot.addEventListener('mouseenter', () => {
            hotspots.forEach(h => h.classList.remove('active'));
            hotspot.classList.add('active');
            const pointNumber = parseInt(hotspot.dataset.point, 10);
            updateDescriptionPanel(pointNumber);
        });
    });

    document.querySelector('.logo-interactive-container').addEventListener('mouseleave', () => {
        hotspots.forEach(h => h.classList.remove('active'));
        updateDescriptionPanel(null, true);
    });

    updateDescriptionPanel(null, true);

    document.querySelectorAll('.nav-link[href^="#"], .navbar-brand[href="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const targetEl = document.querySelector(href);
                if (targetEl) {
                    const navbar = document.querySelector('.navbar.fixed-top');
                    const navbarHeight = navbar ? navbar.offsetHeight : 0;
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            }
        });
    });

    Promise.all([fetchUpcomingEvents(), fetchPastEvents()]).then(() => {
        initializeImageLoader();
    });
}