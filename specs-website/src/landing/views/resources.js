import codeSlash from 'bootstrap-icons/icons/code-slash.svg';
import barChartLineFill from 'bootstrap-icons/icons/bar-chart-line-fill.svg';
import shieldLockFill from 'bootstrap-icons/icons/shield-lock-fill.svg';
import robot from 'bootstrap-icons/icons/robot.svg';
import controller from 'bootstrap-icons/icons/controller.svg';
import paletteFill from 'bootstrap-icons/icons/palette-fill.svg';
import fileEarmarkTextFill from 'bootstrap-icons/icons/file-earmark-text-fill.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg'; // Icon for Terms
import shieldCheck from 'bootstrap-icons/icons/shield-check.svg'; // Icon for Privacy
import { renderHeader, renderFooter } from '../../shared/utils.js';
import { storage } from '../../shared/appwrite.js'; // --- IMPORTED ---

// --- Constants ---
const BUCKET_ID_PUBLIC_FILES = import.meta.env.VITE_BUCKET_PUBLIC_FILES;

// --- Helper Functions ---

function createFaqItemHTML({ id, question, answer }) {
    return `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${id}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="false" aria-controls="collapse-${id}">${question}</button></h2>
            <div id="collapse-${id}" class="accordion-collapse collapse" aria-labelledby="heading-${id}" data-bs-parent="#faqAccordion"><div class="accordion-body">${answer}</div></div>
        </div>
    `;
}

function createJobCardHTML({ title, icon }) {
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100 card-hover-grow">
                <div class="card-body p-4">
                    <div class="d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3 rounded-circle" style="width: 4rem; height: 4rem;">
                        <img src="${icon}" alt="${title} icon" style="width: 2rem; height: 2rem; filter: brightness(0) invert(1);">
                    </div>
                    <h5 class="fw-semibold mb-0">${title}</h5>
                </div>
            </div>
        </div>
    `;
}

function createFileCardHTML({ name, fileId }) {
    const downloadUrl = storage.getFileDownload(BUCKET_ID_PUBLIC_FILES, fileId);

    return `
        <div class="col-md-8 col-lg-6">
            <div class="card shadow-sm">
                <div class="card-body d-flex justify-content-between align-items-center p-3 p-md-4">
                    <div class="d-flex align-items-center">
                        <img src="${fileEarmarkTextFill}" alt="File icon" class="me-3" style="width: 2.5rem; height: 2.5rem; filter: var(--bs-primary-text-emphasis);">
                        <h5 class="mb-0 fw-semibold">${name}</h5>
                    </div>
                    <a href="${downloadUrl}" class="btn btn-primary">Download</a>
                </div>
            </div>
        </div>
    `;
}


// --- Main Render Function ---

export function renderResourcesPage(app) {
    const siteData = {
        jobs: [
            { title: 'Software Engineer', icon: codeSlash }, { title: 'Data Scientist', icon: barChartLineFill },
            { title: 'Cybersecurity Analyst', icon: shieldLockFill },
            { title: 'AI/ML Engineer', icon: robot },
            { title: 'Game Developer', icon: controller },
            { title: 'UX/UI Designer', icon: paletteFill },
        ],
        faq: [
            { id: 'one', question: 'What is SPECS?', answer: 'The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for Computer Science students at Partido State University. We aim to foster a community of learning, innovation, and collaboration.' },
            { id: 'two', question: 'Who can join SPECS?', answer: 'All bona fide students enrolled in the Computer Science program at Partido State University are encouraged to join and become active members of the organization.' },
            { id: 'three', question: 'How can I get updates on events?', answer: 'The best way is to create an account on this portal! We post all official events, announcements, and files here. You can also follow our official social media pages.' },
            { id: 'four', question: 'What kind of events does SPECS organize?', answer: 'We organize a variety of events, including coding seminars, workshops, programming competitions, tech talks from industry professionals, and social gatherings to build camaraderie among members.' },
        ],
        files: [
            { name: 'Constitution and By-Laws', fileId: 'cons-by-laws' },
        ]
    };

    app.innerHTML = `
    <div class="landing-page">
        ${renderHeader()}
        <main>
            <section id="about-bscs" class="py-5 bg-light" style="padding-top: 6rem !important;">
                <div class="container">
                    <h2 class="text-center fw-bold mb-3">The BSCS Program</h2>
                    <p class="text-center text-muted col-lg-8 mx-auto mb-5">The Bachelor of Science in Computer Science program at Partido State University equips students with a robust foundation in computing theories, programming, and system development to solve complex problems in various scientific and industrial domains.</p>
                    <h3 class="text-center fw-bold mb-5">Career Opportunities</h3>
                    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 justify-content-center" id="jobs-grid-container">
                        ${siteData.jobs.map(createJobCardHTML).join('')}
                    </div>
                </div>
            </section>
            <section id="faq" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Frequently Asked Questions</h2>
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <div class="accordion" id="faqAccordion">
                                ${siteData.faq.map(createFaqItemHTML).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="org-files" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Public Organization Files</h2>
                    <div class="row g-4 justify-content-center">
                        ${siteData.files.map(createFileCardHTML).join('')}
                    </div>
                </div>
            </section>

            <section id="terms-privacy" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">Terms & Privacy</h2>
                    <div class="row g-4 justify-content-center">
                        <div class="col-lg-6">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-center mb-3">
                                        <img src="${fileTextFill}" alt="Terms icon" class="me-3" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                                        <h4 class="card-title mb-0 fw-semibold">Terms of Service</h4>
                                    </div>
                                    <p class="card-text text-muted small">By accessing and using the SPECS Web Portal, you agree to comply with and be bound by the following terms and conditions. These terms apply to all visitors, users, and others who wish to access or use the service. If you disagree with any part of the terms, then you do not have permission to access the service. You agree not to use the portal for any unlawful purpose or any purpose prohibited under this clause.</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-center mb-3">
                                        <img src="${shieldCheck}" alt="Privacy icon" class="me-3" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                                        <h4 class="card-title mb-0 fw-semibold">Privacy Policy</h4>
                                    </div>
                                    <p class="card-text text-muted small">Our Privacy Policy describes how we collect, use, and share information about you when you use our portal. We are committed to protecting your privacy. We collect information you provide directly to us, such as when you create an account, as well as information collected automatically, like your usage data. This information is used to operate, maintain, and improve our services. We do not share your personal information with third parties except as described in this policy or with your consent.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>
    `;

    setupSmoothScrolling();
}