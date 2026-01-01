// views/about_us.js

import { storage } from '../../shared/appwrite.js';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import personVideo3 from 'bootstrap-icons/icons/person-video3.svg';
import arrowsMove from 'bootstrap-icons/icons/arrows-move.svg';
import bullseye from 'bootstrap-icons/icons/bullseye.svg';
import infoCircle from 'bootstrap-icons/icons/info-circle.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import cameraVideoFill from 'bootstrap-icons/icons/camera-video-fill.svg';
import codeSlash from 'bootstrap-icons/icons/code-slash.svg';
import logoURL from '../../../public/logo.webp';

const BUCKET_ID_PICTURES = import.meta.env.VITE_BUCKET_ID_PICTURES;
const PICTURE_CACHE_KEY = 'pictureImageCache';

function getPictureUrl(fileId, size = 150) {
    if (!fileId) return null;
    try {
        const cache = JSON.parse(localStorage.getItem(PICTURE_CACHE_KEY)) || {};
        if (cache[fileId]) return cache[fileId];
        const newUrl = storage.getFilePreview(BUCKET_ID_PICTURES, fileId, size, size, 'center', 90);
        cache[fileId] = newUrl;
        localStorage.setItem(PICTURE_CACHE_KEY, JSON.stringify(cache));
        return newUrl;
    } catch (error) {
        console.warn(`Could not get picture for ${fileId}.`, error);
        return null;
    }
}

function createOfficerCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId);
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100 border-0 hover-lift bg-white">
                <div class="card-body d-flex flex-column align-items-center justify-content-center p-3 p-md-4">
                    <div class="position-relative mb-3">
                        ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle object-fit-cover shadow-sm" alt="${name}" style="width: 90px; height: 90px; border: 3px solid var(--bs-primary);">`
        : `<div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center shadow-sm" style="width: 90px; height: 90px;">
                <img src="${personCircle}" alt="Default profile picture" style="width: 50px; height: 50px; filter: var(--bs-primary-text-emphasis);">
            </div>`
    }
                        <span class="position-absolute bottom-0 end-0 badge bg-primary rounded-circle p-1 border border-2 border-white">
                            <i class="bi bi-person-badge fs-6"></i>
                        </span>
                    </div>
                    <h5 class="card-title mb-1 fw-semibold text-dark fs-6">${name}</h5>
                    <p class="card-text text-muted small mb-0">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createAdviserCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId, 200);
    return `
        <div class="col-12 col-md-8 col-lg-6 mx-auto">
            <div class="card shadow border-0 hover-lift bg-white">
                <div class="card-body p-4 p-md-5 text-center">
                    <div class="position-relative mb-4">
                        ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle object-fit-cover shadow" alt="${name}" style="width: 140px; height: 140px; border: 5px solid var(--bs-primary);">`
        : `<div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center shadow mx-auto" style="width: 140px; height: 140px;">
                <img src="${personVideo3}" alt="Default adviser icon" style="width: 70px; height: 70px; filter: var(--bs-primary-text-emphasis);">
            </div>`
    }
                    </div>
                    <h3 class="card-title fw-bold mb-2 text-primary">${name}</h3>
                    <p class="card-text text-muted fs-5 mb-0">${position}</p>
                    <div class="mt-4 pt-3 border-top">
                        <p class="text-muted small mb-0">
                            <i class="bi bi-mortarboard-fill me-2"></i>Partido State University
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createDeveloperCardHTML({ name, course, year, quote, fileId }) {
    const imageUrl = getPictureUrl(fileId, 200);
    return `
        <div class="col">
            <div class="card shadow-sm h-100 border-0 hover-lift bg-white">
                <div class="card-body p-4 d-flex flex-column text-center">
                    <div class="mb-3">
                        ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mx-auto object-fit-cover shadow" alt="${name}" style="width: 100px; height: 100px; border: 4px solid var(--bs-secondary);">`
        : `<div class="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center shadow mx-auto" style="width: 100px; height: 100px;">
                <img src="${personVideo3}" alt="Default developer icon" style="width: 50px; height: 50px; filter: var(--bs-secondary-text-emphasis);">
            </div>`
    }
                    </div>
                    <h5 class="card-title fw-bold mb-1 text-dark">${name}</h5>
                    <p class="text-primary fw-medium mb-2 small">${course} • ${year}</p>
                    <div class="mt-auto pt-3 border-top">
                        <div class="d-flex align-items-start mb-2">
                            <i class="bi bi-quote fs-4 text-primary opacity-25 me-2"></i>
                            <blockquote class="blockquote mb-0 small fst-italic text-muted flex-grow-1">
                                <p class="mb-0">${quote}</p>
                            </blockquote>
                        </div>
                        <div class="d-flex align-items-center justify-content-center mt-2">
                            <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1 small">
                                <i class="bi bi-code-slash me-1"></i>Developer
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createPublicityMediaCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId);
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100 border-0 hover-lift bg-white">
                <div class="card-body d-flex flex-column align-items-center justify-content-center p-3 p-md-4">
                    <div class="position-relative mb-3">
                        ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle object-fit-cover shadow-sm" alt="${name}" style="width: 90px; height: 90px; border: 3px solid var(--bs-info);">`
        : `<div class="rounded-circle bg-info bg-opacity-10 d-flex align-items-center justify-content-center shadow-sm" style="width: 90px; height: 90px;">
                <img src="${personCircle}" alt="Default profile picture" style="width: 50px; height: 50px; filter: var(--bs-info-text-emphasis);">
            </div>`
    }
                        <span class="position-absolute bottom-0 end-0 badge bg-info rounded-circle p-1 border border-2 border-white">
                            <i class="bi bi-camera-video fs-6"></i>
                        </span>
                    </div>
                    <h5 class="card-title mb-1 fw-semibold text-dark fs-6">${name}</h5>
                    <p class="card-text text-muted small mb-0">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createLogoBreakdownHTML() {
    const hotspotPositions = [
        { point: 1, top: '42%', left: '30%' }, { point: 2, top: '42%', left: '50%' },
        { point: 3, top: '33%', left: '46%' }, { point: 4, top: '48%', left: '68%' },
        { point: 5, top: '57%', left: '65%' }, { point: 6, top: '69%', left: '65%' },
        { point: 7, top: '22%', left: '35%' }, { point: 8, top: '80%', left: '85%' },
        { point: 9, top: '75%', left: '36%' }
    ];
    const hotspotsHTML = hotspotPositions.map(hp => `<div class="logo-hotspot" data-point="${hp.point}" style="top: ${hp.top}; left: ${hp.left};">${hp.point}</div>`).join('');
    return `
        <section id="logo-breakdown" class="py-5 py-md-6">
            <div class="container">
                <div class="text-center mb-5 mb-md-6">
                    <h2 class="fw-bold mb-3 position-relative d-inline-block fs-3 fs-md-2">The Official Organization Logo</h2>
                    <p class="text-muted fs-5">Designed by John Lester D. Gonzaga</p>
                    <div class="d-flex align-items-center justify-content-center gap-3 mt-3">
                        <span class="badge bg-primary rounded-pill px-3 py-2">
                            <i class="bi bi-palette2 me-2"></i>Interactive Design
                        </span>
                        <span class="badge bg-secondary rounded-pill px-3 py-2">
                            <i class="bi bi-lightbulb me-2"></i>Symbolic Meaning
                        </span>
                    </div>
                </div>
                <div class="row g-4 g-md-5 align-items-center">
                    <div class="col-lg-6">
                        <div class="logo-interactive-container position-relative rounded-4 overflow-hidden border bg-white">
                            <img src="${logoURL}" class="img-fluid" alt="SPECS Organization Logo with interactive points">
                            ${hotspotsHTML}
                            <div class="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white p-3 text-center">
                                <small>Hover over the numbered points to explore the symbolism</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="logo-description-panel p-4 p-md-5 rounded-4 bg-white shadow-sm border h-100 d-flex flex-column justify-content-center">
                            <div id="logo-description-content" class="fade-in"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function setupInteractiveLogo() {
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
    if (!hotspots.length || !descriptionContent) return;

    const updateDescriptionPanel = (pointNumber, isReset = false) => {
        const data = symbolismData.find(item => item.num === pointNumber);
        const newHTML = (isReset || !data)
            ? `<div class="text-center">
                    <div class="mb-4">
                        <img src="${arrowsMove}" alt="Explore icon" style="width: 4rem; height: 4rem; filter: var(--bs-primary-text-emphasis);">
                    </div>
                    <h4 class="fw-bold text-dark mb-3">Explore the Logo</h4>
                    <p class="text-muted mb-4">Hover over the numbered points on the logo to discover the deep meaning and symbolism behind each element of our organization's identity.</p>
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1">
                            <i class="bi bi-info-circle me-1"></i>9 Symbols
                        </span>
                        <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1">
                            <i class="bi bi-eye me-1"></i>Interactive
                        </span>
                    </div>
                </div>`
            : `<div class="text-start">
                    <div class="d-flex align-items-center mb-4">
                        <div class="flex-shrink-0">
                            <div class="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                                <img src="${bullseye}" alt="Symbol icon" style="width: 1.5rem; height: 1.5rem; filter: var(--bs-primary-text-emphasis);">
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h4 class="fw-bold text-dark mb-1">${data.title}</h4>
                            <span class="badge bg-primary rounded-pill px-3 py-1 small fw-medium">
                                <i class="bi bi-hash me-1"></i>Symbol ${data.num}
                            </span>
                        </div>
                    </div>
                    <div class="mb-4">
                        <h6 class="fw-semibold text-dark mb-2">Symbolism</h6>
                        <p class="text-muted mb-0">${data.symbolism}</p>
                    </div>
                    <div class="border-top pt-3">
                        <h6 class="fw-semibold text-dark mb-2">Design Placement</h6>
                        <p class="text-muted small mb-0"><i class="bi bi-geo-alt me-2"></i>${data.location}</p>
                    </div>
                </div>`;

        descriptionContent.classList.add('fade-out');
        setTimeout(() => {
            descriptionContent.innerHTML = newHTML;
            descriptionContent.classList.remove('fade-out');
            descriptionContent.classList.add('fade-in');
            setTimeout(() => descriptionContent.classList.remove('fade-in'), 300);
        }, 200);
    };

    hotspots.forEach(hotspot => {
        hotspot.addEventListener('mouseenter', () => {
            hotspots.forEach(h => h.classList.remove('active'));
            hotspot.classList.add('active');
            updateDescriptionPanel(parseInt(hotspot.dataset.point, 10));
        });
    });

    document.querySelector('.logo-interactive-container')?.addEventListener('mouseleave', () => {
        hotspots.forEach(h => h.classList.remove('active'));
        updateDescriptionPanel(null, true);
    });
    updateDescriptionPanel(null, true);
}

export function renderAboutUsPage(container) {
    const siteData = {
        adviser: { name: 'Nicolas A. Pura', position: 'Organization Adviser', fileId: 'adviser' },
        officers: [
            { name: 'James Ryan S. Gallego', position: 'President', fileId: 'president' },
            { name: 'Jay Virgil A. Romero', position: 'Vice-President External Affairs', fileId: 'vice-president-external' },
            { name: 'Gil IV Miguel Salvador I. Cea', position: 'Vice-President Internal Affairs', fileId: 'vice-president-internal' },
            { name: 'Princess Yvonne D. Palmes', position: 'Secretary', fileId: 'secretary' },
            { name: 'Johann Dane P. Boaquña', position: 'Assistant Secretary', fileId: 'assistant-secretary' },
            { name: 'Lyzza V. Aboque', position: 'Treasurer', fileId: 'treasurer' },
            { name: 'Kateleen Bolocon', position: 'Assistant Treasurer', fileId: 'assistant-treasurer' },
            { name: 'Renalene V. Seares', position: 'Auditor', fileId: 'auditor' },
            { name: 'Mark Lorence R. Baltazar', position: 'P.I.O', fileId: 'pio' },
            { name: 'Nicole Dumandan', position: 'Business Manager', fileId: 'business-manager-1' },
            { name: 'Lea Mae Gabay', position: 'Business Manager', fileId: 'business-manager-2' },
            { name: 'Karl Francis Gelo Pamada', position: 'Sergeant at Arms', fileId: 'SA1' },
            { name: 'Althea Marie Pano', position: 'Sergeant at Arms', fileId: 'SA2' },
            { name: 'Ashley Pollero', position: '1A Representative', fileId: '1AR' },
            { name: 'Kirby Paladan', position: '1B Representative', fileId: '1BR' },
            { name: 'Allana Mae Estaquio', position: '2A Representative', fileId: '2AR' },
            { name: 'Mark Steve Canillo', position: '2B Representative', fileId: '2BR' },
            { name: 'Aldrich Jay Francisco', position: '3A Representative', fileId: '3AR' },
            { name: 'Joan Coderis Lara', position: '3B Representative', fileId: '3BR' },
            { name: 'Sheilla Mae S. Rico', position: '4A Representative', fileId: '4AR' },
            { name: 'Robert Bayona', position: '4B Representative', fileId: '4BR' },
            { name: 'Lynn A. Remodo', position: 'Committee in Sports', fileId: 'CS1' },
            { name: 'Kenneth Bryan A. Velarde', position: 'Committee in Sports', fileId: 'CS2' },
        ],
        publicityAndMedia: [
            { name: 'Jay Virgil A. Romero', position: 'Appointed Head of Publicity and Media', fileId: 'vice-president-external' },
            { name: 'Jovert A. Pabon', position: 'Public Relations Officer', fileId: 'pm-pro' },
            { name: 'John Lester D. Gonzaga', position: 'Creative Media Officer', fileId: 'pm-cmo' },
            { name: 'Ramon P. Bombita Jr.', position: 'Documentation Officer', fileId: 'pm-do-1' },
            { name: 'Julie Pearl M. Deleña', position: 'Documentation Officer', fileId: 'pm-do-2' },
            { name: 'John A. Guinomtad', position: 'Documentation Officer', fileId: 'pm-do-3' }
        ],
        developers: [
            { name: 'James Ryan S. Gallego', course: 'BS in Computer Science', year: '3rd Year', quote: "It is never too late to be what you might have been", fileId: 'president' },
        ],
    };

    container.innerHTML = `
    <div class="about-us-page">
        <!-- Hero Section -->
        <section class="hero-section-gradient py-5 py-md-6 pt-7 pt-md-8">
            <div class="container pt-3 pt-md-4 pt-lg-5">
                <div class="row justify-content-center">
                    <div class="col-lg-10 col-xl-8 text-center">
                        <h1 class="display-6 display-md-5 fw-bold mb-3 mb-md-4 pt-2 pt-md-4">About SPECS</h1>
                        <p class="lead fs-6 fs-md-5 mb-0 opacity-75 px-2 px-md-3">The premier organization for Computer Science students at Partido State University.</p>
                    </div>
                </div>
            </div>
            </section>

            <!-- About SPECS Section -->
            <section id="about-specs" class="py-4 py-md-5 py-lg-6 bg-light-subtle">
                <div class="container">
                    <div class="row align-items-center g-4 g-md-5">
                        <div class="col-lg-5 text-center mb-4 mb-lg-0">
                            <div class="position-relative">
                                <img src="${logoURL}" class="img-fluid rounded-4" alt="SPECS Organization Logo" style="max-height: 280px;">
                            </div>
                        </div>
                        <div class="col-lg-7">
                            <div class="d-flex align-items-center mb-4">
                                <div class="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                                    <img src="${infoCircle}" alt="About icon" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                                </div>
                                <h2 class="fw-bold mb-0 fs-3 fs-md-2">Our Mission & Vision</h2>
                            </div>
                            <p class="text-muted fs-6 fs-md-5 mb-4">The <strong>Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong> is dedicated to fostering a dynamic environment of learning, innovation, and collaboration for all Computer Science students at Partido State University.</p>
                            <div class="row g-3 mt-4">
                                <div class="col-md-6">
                                    <div class="bg-white rounded-3 p-3 shadow-sm border h-100">
                                        <div class="d-flex align-items-center mb-2">
                                            <i class="bi bi-bullseye text-primary fs-4 me-2"></i>
                                            <h5 class="fw-semibold mb-0">Our Mission</h5>
                                        </div>
                                        <p class="text-muted small mb-0">To empower members with technical skills, professional networks, and leadership qualities necessary to excel in the ever-evolving world of technology.</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="bg-white rounded-3 p-3 shadow-sm border h-100">
                                        <div class="d-flex align-items-center mb-2">
                                            <i class="bi bi-eye text-primary fs-4 me-2"></i>
                                            <h5 class="fw-semibold mb-0">Our Vision</h5>
                                        </div>
                                        <p class="text-muted small mb-0">To be the leading student organization that shapes the future of technology through innovation, collaboration, and academic excellence.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Adviser Section -->
            <section class="py-4 py-md-5 py-lg-6">
                <div class="container">
                    <div class="text-center mb-5 mb-md-6">
                        <div class="d-inline-flex align-items-center bg-primary bg-opacity-10 rounded-pill px-4 py-2 mb-3">
                            <i class="bi bi-mortarboard-fill text-primary fs-5 me-2"></i>
                            <span class="fw-semibold text-primary">Faculty Guidance</span>
                        </div>
                        <h2 class="fw-bold mb-4 position-relative d-inline-block fs-3 fs-md-2">Organization Adviser</h2>
                        <p class="text-muted col-lg-6 mx-auto">Our dedicated adviser provides guidance and support to ensure the success of SPECS initiatives and activities.</p>
                    </div>
                    <div id="adviser-card-container">
                        ${createAdviserCardHTML(siteData.adviser)}
                    </div>
                </div>
            </section>

            <!-- Officers Section -->
            <section class="py-4 py-md-5 py-lg-6 bg-light-subtle">
                <div class="container">
                    <div class="text-center mb-5 mb-md-6">
                        <div class="d-inline-flex align-items-center bg-primary bg-opacity-10 rounded-pill px-4 py-2 mb-3">
                            <img src="${peopleFill}" alt="People icon" class="me-2" style="width: 1.25rem; height: 1.25rem; filter: var(--bs-primary-text-emphasis);">
                            <span class="fw-semibold text-primary">Student Leadership</span>
                        </div>
                        <h2 class="fw-bold mb-4 position-relative d-inline-block fs-3 fs-md-2">Officers & Representatives</h2>
                        <p class="text-muted col-lg-8 mx-auto">Meet the dedicated student leaders who drive SPECS forward through their commitment and vision.</p>
                    </div>
                    <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3 g-md-4" id="officers-grid-container">
                        ${siteData.officers.map(createOfficerCardHTML).join('')}
                    </div>
                </div>
            </section>

            <!-- Publicity & Media Section -->
            <section class="py-4 py-md-5 py-lg-6">
                <div class="container">
                    <div class="text-center mb-5 mb-md-6">
                        <div class="d-inline-flex align-items-center bg-info bg-opacity-10 rounded-pill px-4 py-2 mb-3">
                            <img src="${cameraVideoFill}" alt="Media icon" class="me-2" style="width: 1.25rem; height: 1.25rem; filter: var(--bs-info-text-emphasis);">
                            <span class="fw-semibold text-info">Creative Team</span>
                        </div>
                        <h2 class="fw-bold mb-4 position-relative d-inline-block fs-3 fs-md-2">Publicity and Media</h2>
                        <p class="text-muted col-lg-8 mx-auto">Our creative team handles branding, documentation, and communications to showcase SPECS to the world.</p>
                    </div>
                    <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3 g-md-4">
                        ${siteData.publicityAndMedia.map(createPublicityMediaCardHTML).join('')}
                    </div>
                </div>
            </section>

            ${createLogoBreakdownHTML()}

            <!-- Developers Section -->
            <section class="py-4 py-md-5 py-lg-6 bg-light-subtle">
                <div class="container">
                    <div class="text-center mb-5 mb-md-6">
                        <div class="d-inline-flex align-items-center bg-secondary bg-opacity-10 rounded-pill px-4 py-2 mb-3">
                            <img src="${codeSlash}" alt="Code icon" class="me-2" style="width: 1.25rem; height: 1.25rem; filter: var(--bs-secondary-text-emphasis);">
                            <span class="fw-semibold text-secondary">Technical Team</span>
                        </div>
                        <h2 class="fw-bold mb-4 position-relative d-inline-block fs-3 fs-md-2">Meet the Developers</h2>
                        <p class="text-muted col-lg-6 mx-auto">The talented developers behind this website and other technical initiatives of SPECS.</p>
                    </div>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center">
                        ${siteData.developers.map(createDeveloperCardHTML).join('')}
                    </div>
                </div>
            </section>
    </div>
    `;

    setupInteractiveLogo();
}