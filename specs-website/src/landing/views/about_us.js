// views/about_us.js

import { storage } from '../../shared/appwrite.js';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import personVideo3 from 'bootstrap-icons/icons/person-video3.svg';
import arrowsMove from 'bootstrap-icons/icons/arrows-move.svg';
import bullseye from 'bootstrap-icons/icons/bullseye.svg';
import logoURL from '../../../public/logo.webp';
import {renderHeader} from "../../shared/utils.js";

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
            <div class="card text-center shadow-sm h-100 card-hover-grow">
                <div class="card-body d-flex flex-column align-items-center justify-content-center p-3">
                    ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3 object-fit-cover shadow-sm" alt="${name}" style="width: 100px; height: 100px; border: 3px solid var(--bs-primary-bg-subtle);">`
        : `<img src="${personCircle}" alt="Default profile picture" class="mb-3" style="width: 100px; height: 100px; opacity: 0.5;">`
    }
                    <h5 class="card-title mb-1 fw-semibold">${name}</h5>
                    <p class="card-text text-muted small">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createAdviserCardHTML({ name, position, fileId }) {
    const imageUrl = getPictureUrl(fileId, 200);
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card text-center shadow card-hover-grow">
                <div class="card-body p-4">
                     ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3 object-fit-cover shadow" alt="${name}" style="width: 120px; height: 120px; border: 4px solid var(--bs-primary-bg-subtle);">`
        : `<img src="${personVideo3}" alt="Default adviser icon" class="mb-3" style="width: 80px; height: 80px; filter: var(--bs-primary-text-emphasis);">`
    }
                    <h5 class="card-title fw-bold mb-1">${name}</h5>
                    <p class="card-text text-muted">${position}</p>
                </div>
            </div>
        </div>
    `;
}

function createDeveloperCardHTML({ name, course, year, quote, fileId }) {
    const imageUrl = getPictureUrl(fileId, 200);
    return `
        <div class="col">
            <div class="card shadow-sm h-100 text-center">
                <div class="card-body p-4 d-flex flex-column">
                    ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3 mx-auto object-fit-cover shadow" alt="${name}" style="width: 120px; height: 120px; border: 4px solid var(--bs-secondary-bg-subtle);">`
        : `<img src="${personVideo3}" alt="Default developer icon" class="mb-3 mx-auto" style="width: 100px; height: 100px; opacity: 0.6;">`
    }
                    <h5 class="card-title fw-bold mb-1">${name}</h5>
                    <p class="text-primary fw-medium mb-2">${course} - ${year}</p>
                    <div class="mt-auto pt-3 border-top">
                        <blockquote class="blockquote mb-0 small fst-italic">
                            <p>"${quote}"</p>
                        </blockquote>
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
            <div class="card text-center shadow-sm h-100 card-hover-grow">
                <div class="card-body d-flex flex-column align-items-center justify-content-center p-3">
                    ${imageUrl
        ? `<img src="${imageUrl}" class="rounded-circle mb-3 object-fit-cover shadow-sm" alt="${name}" style="width: 100px; height: 100px; border: 3px solid var(--bs-info-bg-subtle);">`
        : `<img src="${personCircle}" alt="Default profile picture" class="mb-3" style="width: 100px; height: 100px; opacity: 0.5;">`
    }
                    <h5 class="card-title mb-1 fw-semibold">${name}</h5>
                    <p class="card-text text-muted small">${position}</p>
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
        <section id="logo-breakdown" class="py-5">
            <div class="container">
                <h2 class="text-center fw-bold mb-3">The Official Organization Logo</h2>
                <p class="text-center text-muted mb-5">Designed by John Lester D. Gonzaga</p>
                <div class="row g-5 align-items-center">
                    <div class="col-lg-6"><div class="logo-interactive-container"><img src="${logoURL}" class="img-fluid" alt="SPECS Organization Logo with interactive points">${hotspotsHTML}</div></div>
                    <div class="col-lg-6"><div class="logo-description-panel p-4 rounded bg-light d-flex flex-column justify-content-center" style="min-height: 350px;"><div id="logo-description-content"></div></div></div>
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
            ? `<div class="text-center"><img src="${arrowsMove}" alt="Explore icon" class="mb-3" style="width: 3rem; height: 3rem; filter: invert(26%) sepia(96%) saturate(2221%) hue-rotate(205deg) brightness(98%) contrast(97%);"><h5 class="fw-bold">Explore the Logo</h5><p class="text-muted">Hover over the numbered points on the logo to discover the meaning behind each symbol.</p></div>`
            : `<div class="text-start"><div class="d-flex align-items-center mb-3"><div class="flex-shrink-0"><img src="${bullseye}" alt="Symbol icon" class="me-3" style="width: 2rem; height: 2rem; filter: invert(26%) sepia(96%) saturate(2221%) hue-rotate(205deg) brightness(98%) contrast(97%);"></div><div class="flex-grow-1"><h5 class="fw-bold mb-0">${data.title}</h5><span class="text-primary small fw-semibold">SYMBOL #${data.num}</span></div></div><p class="text-muted mb-3">${data.symbolism}</p><p class="small text-muted border-top pt-3 mt-3 mb-0"><strong>Location:</strong> <em>${data.location}</em></p></div>`;

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
            { name: 'James Ryan S. Gallego', course: 'BS in Computer Science', year: '3rd Year', quote: "If they can't, then I will", fileId: 'president' },
        ],
    };

    container.innerHTML = `
    <div class="landing-page">
        ${renderHeader()}
        <main>
            <section id="about-specs" class="py-5 bg-light" style="padding-top: 6rem !important;">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">About SPECS</h2>
                    <div class="row align-items-center g-5">
                        <div class="col-lg-4 mb-4 mb-lg-0 text-center">
                            <img src="${logoURL}" class="img-fluid rounded-3 shadow-sm" alt="SPECS Organization Logo" style="max-height: 250px;">
                        </div>
                        <div class="col-lg-8">
                            <h3 class="fw-bold">Our Mission</h3>
                            <p>The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the premier organization for all Computer Science students at Partido State University. We are dedicated to fostering a dynamic environment of learning, innovation, and collaboration. Our goal is to empower members with the technical skills, professional networks, and leadership qualities necessary to excel in the ever-evolving world of technology.</p>
                        </div>
                    </div>
                    <hr class="my-5">
                    <h3 class="text-center fw-bold mb-5">Our Mentors and Leaders</h3>
                    <div class="row justify-content-center mb-5" id="adviser-card-container">
                        ${createAdviserCardHTML(siteData.adviser)}
                    </div>
                    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 justify-content-center" id="officers-grid-container">
                        ${siteData.officers.map(createOfficerCardHTML).join('')}
                    </div>
                </div>
            </section>

            <section id="publicity-media" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Publicity and Media</h2>
                    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 justify-content-center">
                        ${siteData.publicityAndMedia.map(createPublicityMediaCardHTML).join('')}
                    </div>
                </div>
            </section>

            ${createLogoBreakdownHTML()}

            <section id="developers" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Meet the Developers</h2>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center">
                        ${siteData.developers.map(createDeveloperCardHTML).join('')}
                    </div>
                </div>
            </section>
        </main>
    </div>
    `;

    setupInteractiveLogo();
    setupSmoothScrolling();
}