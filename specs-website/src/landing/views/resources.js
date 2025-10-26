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

const BUCKET_ID_PUBLIC_FILES = import.meta.env.VITE_BUCKET_PUBLIC_FILES;

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
            { id: 'three', question: 'How can I get updates on events?', answer: 'The best way to get updates is to look at our official Facebook page (<a href="https://www.facebook.com/parsu.specs" target="_blank" rel="noopener noreferrer">https://www.facebook.com/parsu.specs</a>) or visit this website for the latest announcements and event information.' },
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
                        <div class="col-lg-6 d-flex">
                            <div class="card h-100 shadow-sm w-100">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-center mb-3">
                                        <img src="${fileTextFill}" alt="Terms icon" class="me-3" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                                        <h4 class="card-title mb-0 fw-semibold">Terms of Service</h4>
                                    </div>
                                    <p class="card-text text-muted small"><strong>Last Updated:</strong> October 26, 2025</p>

                                    <h5 class="fw-bold mt-4 mb-2">1. Acceptance of Terms</h5>
                                    <p class="card-text text-muted small">By accessing or using the official website of the <strong>Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong> (“the Organization,” “we,” “our,” or “us”), you agree to be bound by these Terms of Service. If you do not agree, please do not access or use this site.</p>

                                    <h5 class="fw-bold mt-4 mb-2">2. Purpose of the Website</h5>
                                    <p class="card-text text-muted small">This website serves as the <strong>official information and communication portal</strong> of SPECS. It presents organizational announcements, activities, objectives, and updates as recognized under the <strong>SPECS Constitution and By-Laws</strong>. Users cannot create accounts or submit content. The site functions purely as a <strong>landing page</strong> for informational and archival purposes.</p>

                                    <h5 class="fw-bold mt-4 mb-2">3. Ownership and Governance</h5>
                                    <p class="card-text text-muted small">All content, materials, and data published on this website are the property of <strong>SPECS</strong>. Website operations and data handling are governed by the policies outlined in <strong>Article XI — Data Confidentiality</strong> of the SPECS Constitution and By-Laws.</p>
                                    
                                    <h5 class="fw-bold mt-4 mb-2">4. Permitted Use</h5>
                                    <p class="card-text text-muted small">Users may access and share information from this site for personal, academic, or organizational reference, provided that such use:</p>
                                    <ul class="card-text text-muted small ps-4">
                                        <li>Does not misrepresent, modify, or falsely attribute the content;</li>
                                        <li>Complies with university and organizational ethical standards;</li>
                                        <li>Includes proper acknowledgment of SPECS as the source.</li>
                                    </ul>

                                    <h5 class="fw-bold mt-4 mb-2">5. Prohibited Conduct</h5>
                                     <p class="card-text text-muted small">Users shall not:</p>
                                    <ul class="card-text text-muted small ps-4">
                                        <li>Attempt to interfere with, disrupt, or gain unauthorized access to the website or its servers;</li>
                                        <li>Use automated tools or scripts that compromise website performance;</li>
                                        <li>Misuse any organizational information for commercial, defamatory, or unlawful purposes.</li>
                                    </ul>

                                    <h5 class="fw-bold mt-4 mb-2">6. Contact Information</h5>
                                    <p class="card-text text-muted small">For inquiries related to this website, please contact:<br>
                                    <strong>Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong><br>
                                    Email: <a href="mailto:specs.cecs@parsu.edu.ph">specs.cecs@parsu.edu.ph</a><br>
                                    Address: College of Engineering and Computational Sciences, Partido State University</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6 d-flex">
                            <div class="card h-100 shadow-sm w-100">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-center mb-3">
                                        <img src="${shieldCheck}" alt="Privacy icon" class="me-3" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                                        <h4 class="card-title mb-0 fw-semibold">Privacy Policy</h4>
                                    </div>
                                    <p class="card-text text-muted small"><strong>Last Updated:</strong> October 26, 2025</p>

                                    <h5 class="fw-bold mt-4 mb-2">1. Introduction</h5>
                                    <p class="card-text text-muted small">SPECS respects your privacy. This Privacy Policy explains how we handle data collected through our website, in accordance with <strong>Article XI — Data Confidentiality</strong> of the SPECS Constitution and By-Laws.</p>

                                    <h5 class="fw-bold mt-4 mb-2">2. Data We Collect</h5>
                                    <p class="card-text text-muted small">This website does not require or allow user registration. However, we may collect limited technical data automatically, including:</p>
                                    <ul class="card-text text-muted small ps-4">
                                        <li>Browser type, device, and operating system;</li>
                                        <li>IP address (anonymized);</li>
                                        <li>Cached data or cookies used solely to improve loading speed and performance.</li>
                                    </ul>
                                    <p class="card-text text-muted small">No personally identifiable information (such as names or contact details) is collected through public browsing.</p>

                                    <h5 class="fw-bold mt-4 mb-2">3. Data from Members</h5>
                                    <p class="card-text text-muted small">Organizational data related to <strong>official SPECS members</strong> are collected <strong>offline</strong> and stored in accordance with the provisions of the <strong>SPECS Constitution and By-Laws — Article XI (Data Confidentiality)</strong> for purposes such as organizational coordination, university reporting, and record-keeping. Such information is never publicly displayed or shared through this website.</p>

                                    <h5 class="fw-bold mt-4 mb-2">4. Data Protection</h5>
                                    <p class="card-text text-muted small">All stored organizational data are accessed only by authorized SPECS officers and are subject to the confidentiality standards outlined in Article XI of the Constitution and By-Laws. Unauthorized access, disclosure, or misuse is strictly prohibited.</p>

                                    <h5 class="fw-bold mt-4 mb-2">5. Contact</h5>
                                    <p class="card-text text-muted small">If you have questions regarding this Privacy Policy or data handling, you may contact:<br>
                                    <strong>Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong><br>
                                    Email: <a href="mailto:specs.cecs@parsu.edu.ph">specs.cecs@parsu.edu.ph</a><br>
                                    Address: College of Engineering and Computational Sciences, Partido State University</p>
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