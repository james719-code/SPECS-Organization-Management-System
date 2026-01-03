import codeSlash from 'bootstrap-icons/icons/code-slash.svg';
import barChartLineFill from 'bootstrap-icons/icons/bar-chart-line-fill.svg';
import shieldLockFill from 'bootstrap-icons/icons/shield-lock-fill.svg';
import robot from 'bootstrap-icons/icons/robot.svg';
import controller from 'bootstrap-icons/icons/controller.svg';
import paletteFill from 'bootstrap-icons/icons/palette-fill.svg';
import fileEarmarkTextFill from 'bootstrap-icons/icons/file-earmark-text-fill.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';
import shieldCheck from 'bootstrap-icons/icons/shield-check.svg';
import cpuFill from 'bootstrap-icons/icons/cpu-fill.svg';
import lightbulbFill from 'bootstrap-icons/icons/lightbulb-fill.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import { storage } from '../../shared/appwrite.js';

const BUCKET_ID_PUBLIC_FILES = import.meta.env.VITE_BUCKET_PUBLIC_FILES;

function createFaqItemHTML({ id, question, answer }) {
    return `
        <div class="accordion-item border-0 mb-3 bg-transparent">
            <h2 class="accordion-header" id="heading-${id}">
                <button class="accordion-button collapsed shadow-none rounded-3 py-3 py-md-4 px-3 px-md-4 bg-white fs-6" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="false" aria-controls="collapse-${id}">
                    <span class="fw-semibold text-dark">${question}</span>
                </button>
            </h2>
            <div id="collapse-${id}" class="accordion-collapse collapse" aria-labelledby="heading-${id}" data-bs-parent="#faqAccordion">
                <div class="accordion-body pt-2 pt-md-3 px-3 px-md-4 pb-3 pb-md-4 text-muted bg-white rounded-bottom-3">
                    ${answer}
                </div>
            </div>
        </div>
    `;
}

function createJobCardHTML({ title, icon }) {
    return `
        <div class="col">
            <div class="card text-center shadow-sm h-100 border-0 overflow-hidden hover-lift bg-white">
                <div class="card-body p-3 p-md-4 p-lg-5 position-relative">
                    <div class="bg-gradient-primary text-white rounded-3 p-2 p-md-3 mb-3 mb-md-4 d-inline-flex align-items-center justify-content-center" 
                         style="width: 4rem; height: 4rem; background: linear-gradient(135deg, var(--bs-primary) 0%, #0d6b66 100%);">
                        <img src="${icon}" alt="${title} icon" class="p-1" style="width: 1.75rem; height: 1.75rem; filter: brightness(0) invert(1);">
                    </div>
                    <h5 class="fw-semibold mb-0 text-dark fs-6 fs-md-5">${title}</h5>
                    <p class="text-muted small mt-1 mt-md-2 mb-0">Explore opportunities</p>
                    <div class="position-absolute top-0 end-0 m-2 m-md-3">
                        <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 px-md-3 py-1 small fw-medium">Career</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createFeatureCardHTML({ title, icon, description }) {
    return `
        <div class="col-md-4 mb-3 mb-md-0">
            <div class="d-flex flex-column align-items-center h-100 px-2 px-md-0">
                <div class="feature-icon-container mb-3">
                    <img src="${icon}" alt="${title} icon" class="p-2" style="width: 2rem; height: 2rem; filter: var(--bs-primary-text-emphasis);">
                </div>
                <h5 class="fw-semibold mb-2 text-center fs-6 fs-md-5">${title}</h5>
                <p class="text-muted small text-center flex-grow-1">${description}</p>
            </div>
        </div>
    `;
}

function createFileCardHTML({ name, fileId, fileType = 'PDF', fileSize = '1.2 MB' }) {
    const downloadUrl = storage.getFileDownload(BUCKET_ID_PUBLIC_FILES, fileId);

    return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card shadow-sm border-0 hover-lift bg-white h-100">
                <div class="card-body d-flex flex-column p-3 p-md-4">
                    <div class="d-flex align-items-start mb-3">
                        <div class="bg-primary bg-opacity-10 rounded-3 p-2 p-md-3 me-3 me-md-4 flex-shrink-0">
                            <img src="${fileEarmarkTextFill}" alt="File icon" style="width: 1.5rem; height: 1.5rem; filter: var(--bs-primary-text-emphasis);">
                        </div>
                        <div class="flex-grow-1 min-width-0">
                            <h5 class="mb-1 fw-semibold text-dark fs-6 fs-md-5 text-break">${name}</h5>
                            <div class="d-flex align-items-center flex-wrap gap-2 mt-2">
                                <span class="badge bg-light text-dark border border-1 border-secondary-subtle rounded-pill px-2 py-1 small">
                                    ${fileType}
                                </span>
                                <span class="text-muted small">${fileSize}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-auto">
                        <a href="${downloadUrl}" class="btn btn-primary w-100 rounded-pill shadow-sm py-2">
                            <i class="bi bi-download me-2"></i>Download
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createPolicyCardHTML({ title, icon, lastUpdated, content }) {
    return `
        <div class="col-lg-6 mb-3 mb-lg-0">
            <div class="card h-100 shadow-sm border-0 hover-lift bg-white">
                <div class="card-body p-3 p-md-4">
                    <div class="d-flex align-items-center mb-3 mb-md-4">
                        <div class="bg-primary bg-opacity-10 rounded-3 p-2 p-md-3 me-3 me-md-4 flex-shrink-0">
                            <img src="${icon}" alt="${title} icon" style="width: 1.75rem; height: 1.75rem; filter: var(--bs-primary-text-emphasis);">
                        </div>
                        <div class="flex-grow-1 min-width-0">
                            <h4 class="card-title mb-0 fw-bold text-dark fs-5 fs-md-4">${title}</h4>
                            <p class="text-muted small mb-0"><strong>Last Updated:</strong> ${lastUpdated}</p>
                        </div>
                    </div>
                    <div class="policy-content">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function getFilesFromAppwrite() {
    try {
        // List files from the public files bucket
        const files = await storage.listFiles(BUCKET_ID_PUBLIC_FILES);

        // Transform the files to match our data structure
        return files.files.map(file => {
            // Extract file extension and type
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toUpperCase();
            const fileSize = (file.sizeOriginal / (1024 * 1024)).toFixed(1) + ' MB';

            // Map file extensions to readable types
            const fileTypeMap = {
                'PDF': 'PDF',
                'DOCX': 'DOCX',
                'DOC': 'DOC',
                'TXT': 'TXT',
                'XLSX': 'Excel',
                'XLS': 'Excel',
                'PPTX': 'PowerPoint',
                'PPT': 'PowerPoint',
                'JPG': 'Image',
                'JPEG': 'Image',
                'PNG': 'Image',
                'ZIP': 'Archive'
            };

            const fileType = fileTypeMap[fileExtension] || fileExtension;

            return {
                name: fileName.replace(/\.[^/.]+$/, ""), // Remove extension from display name
                fileId: file.$id,
                fileType: fileType,
                fileSize: fileSize
            };
        });
    } catch (error) {
        console.error('Error fetching files from Appwrite:', error);
        // Return fallback data if Appwrite fails
        return [
            {
                name: 'Constitution and By-Laws',
                fileId: 'cons-by-laws',
                fileType: 'PDF',
                fileSize: '1.2 MB'
            }
        ];
    }
}

export async function renderResourcesPage(container) {
    const siteData = {
        bscsFeatures: [
            {
                title: 'Core Fundamentals',
                icon: cpuFill,
                description: 'Strong foundation in algorithms, data structures, and software engineering principles.'
            },
            {
                title: 'Innovation Focus',
                icon: lightbulbFill,
                description: 'Encourages creative problem-solving and innovative thinking in technology.'
            },
            {
                title: 'Industry Ready',
                icon: peopleFill,
                description: 'Prepares students for real-world challenges with industry-aligned curriculum.'
            },
        ],
        jobs: [
            { title: 'Software Engineer', icon: codeSlash },
            { title: 'Data Scientist', icon: barChartLineFill },
            { title: 'Cybersecurity Analyst', icon: shieldLockFill },
            { title: 'AI/ML Engineer', icon: robot },
            { title: 'Game Developer', icon: controller },
            { title: 'UX/UI Designer', icon: paletteFill },
        ],
        faq: [
            {
                id: 'one',
                question: 'What is SPECS?',
                answer: 'The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for Computer Science students at Partido State University. We aim to foster a community of learning, innovation, and collaboration.'
            },
            {
                id: 'two',
                question: 'Who can join SPECS?',
                answer: 'All bona fide students enrolled in the Computer Science program at Partido State University are encouraged to join and become active members of the organization.'
            },
            {
                id: 'three',
                question: 'How can I get updates on events?',
                answer: 'The best way to get updates is to look at our official Facebook page (<a href="https://www.facebook.com/parsu.specs" target="_blank" rel="noopener noreferrer" class="text-primary fw-medium">https://www.facebook.com/parsu.specs</a>) or visit this website for the latest announcements and event information.'
            },
            {
                id: 'four',
                question: 'What kind of events does SPECS organize?',
                answer: 'We organize a variety of events, including coding seminars, workshops, programming competitions, tech talks from industry professionals, and social gatherings to build camaraderie among members.'
            },
        ]
    };

    // Get files from Appwrite
    const files = await getFilesFromAppwrite();

    container.innerHTML = `
    <div class="resources-page">
        <!-- Hero Section -->
        <section class="hero-section-gradient py-5 py-md-6 pt-7 pt-md-8">
            <div class="container pt-3 pt-md-4 pt-lg-5">
                <div class="row justify-content-center">
                    <div class="col-lg-10 col-xl-8 text-center">
                        <h1 class="display-6 display-md-5 fw-bold mb-3 mb-md-4 pt-2 pt-md-4">Resources & Information</h1>
                        <p class="lead fs-6 fs-md-5 mb-0 opacity-75 px-2 px-md-3">Everything you need to know about the BSCS program, career opportunities, and SPECS organization resources.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- BSCS Program Section -->
        <section id="about-bscs" class="py-4 py-md-5 py-lg-6 bg-light-subtle">
            <div class="container">
                <div class="text-center mb-4 mb-md-5 mb-lg-6 px-2 px-md-3">
                    <h2 class="fw-bold mb-3 mb-md-4 position-relative d-inline-block fs-3 fs-md-2">The BSCS Program</h2>
                    <p class="text-muted col-lg-8 mx-auto mb-4 mb-md-5 px-md-5 fs-6 fs-md-5">The Bachelor of Science in Computer Science program at Partido State University equips students with a robust foundation in computing theories, programming, and system development to solve complex problems in various scientific and industrial domains.</p>
                </div>
                
                <div class="row g-3 g-md-4 mb-4 mb-md-5 mb-lg-6">
                    ${siteData.bscsFeatures.map(createFeatureCardHTML).join('')}
                </div>
            </div>
        </section>

            <!-- Career Opportunities Section -->
            <section class="py-4 py-md-5 py-lg-6">
                <div class="container">
                    <div class="text-center mb-4 mb-md-5 mb-lg-6 px-2 px-md-3">
                        <h3 class="fw-bold mb-4 mb-md-5 position-relative d-inline-block mx-auto d-block fs-3 fs-md-2">Career Opportunities</h3>
                        <p class="text-muted col-lg-8 mx-auto mb-4 mb-md-5 px-md-5 fs-6 fs-md-5">Explore the diverse career paths available to Computer Science graduates from Partido State University.</p>
                    </div>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 g-md-4" id="jobs-grid-container">
                        ${siteData.jobs.map(createJobCardHTML).join('')}
                    </div>
                </div>
            </section>

            <!-- FAQ Section -->
            <section id="faq" class="py-4 py-md-5 py-lg-6 bg-light-subtle">
                <div class="container">
                    <div class="text-center mb-4 mb-md-5 mb-lg-6 px-2 px-md-3">
                        <h2 class="fw-bold mb-3 mb-md-4 position-relative d-inline-block fs-3 fs-md-2">Frequently Asked Questions</h2>
                        <p class="text-muted col-lg-6 mx-auto mb-4 mb-md-5 fs-6 fs-md-5">Find answers to common questions about SPECS and the BSCS program.</p>
                    </div>
                    <div class="row justify-content-center">
                        <div class="col-lg-9">
                            <div class="accordion" id="faqAccordion">
                                ${siteData.faq.map(createFaqItemHTML).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Organization Files -->
            <section id="org-files" class="py-4 py-md-5 py-lg-6">
                <div class="container">
                    <div class="text-center mb-4 mb-md-5 mb-lg-6 px-2 px-md-3">
                        <h2 class="fw-bold mb-3 mb-md-4 position-relative d-inline-block fs-3 fs-md-2">Public Organization Files</h2>
                        <p class="text-muted col-lg-8 mx-auto mb-4 mb-md-5 fs-6 fs-md-5">Access official SPECS documents, templates, and resources available for download.</p>
                    </div>
                    ${files.length > 0 ? `
                        <div class="row g-3 g-md-4" id="files-grid-container">
                            ${files.map(createFileCardHTML).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-5">
                            <div class="bg-light rounded-3 p-5">
                                <i class="bi bi-folder-x display-4 text-muted mb-3"></i>
                                <h4 class="fw-semibold mb-2">No Files Available</h4>
                                <p class="text-muted mb-0">There are currently no public files available for download.</p>
                            </div>
                        </div>
                    `}
                </div>
            </section>

            <!-- Terms & Privacy -->
            <section id="terms-privacy" class="py-4 py-md-5 py-lg-6 bg-light-subtle">
                <div class="container">
                    <div class="text-center mb-4 mb-md-5 mb-lg-6 px-2 px-md-3">
                        <h2 class="fw-bold mb-3 mb-md-4 position-relative d-inline-block fs-3 fs-md-2">Terms & Privacy</h2>
                        <p class="text-muted col-lg-6 mx-auto mb-4 mb-md-5 fs-6 fs-md-5">Our commitment to transparency and data protection.</p>
                    </div>
                    <div class="row g-3 g-md-4 g-lg-5 justify-content-center">
                        ${createPolicyCardHTML({
        title: 'Terms of Service',
        icon: fileTextFill,
        lastUpdated: 'October 26, 2025',
        content: `
                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">1. Acceptance of Terms</h5>
                                <p class="text-muted small mb-3">By accessing or using the official website of the <strong>Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong> ("the Organization"), you agree to be bound by these Terms of Service.</p>

                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">2. Purpose of the Website</h5>
                                <p class="text-muted small mb-3">This website serves as the <strong>official information and communication portal</strong> of SPECS for organizational announcements, activities, and updates.</p>

                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">3. Ownership and Governance</h5>
                                <p class="text-muted small mb-3">All content published on this website is the property of <strong>SPECS</strong>, governed by <strong>Article XI — Data Confidentiality</strong> of the SPECS Constitution.</p>
                                
                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">4. Contact Information</h5>
                                <p class="text-muted small">
                                    <strong>SPECS Organization</strong><br>
                                    Email: <a href="mailto:specs.cecs@parsu.edu.ph" class="text-primary">specs.cecs@parsu.edu.ph</a><br>
                                    Address: College of Engineering and Computational Sciences, Partido State University
                                </p>
                            `
    })}
                        
                        ${createPolicyCardHTML({
        title: 'Privacy Policy',
        icon: shieldCheck,
        lastUpdated: 'October 26, 2025',
        content: `
                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">1. Introduction</h5>
                                <p class="text-muted small mb-3">SPECS respects your privacy. This policy explains our data handling in accordance with our Constitution.</p>

                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">2. Data We Collect</h5>
                                <p class="text-muted small mb-3">We collect limited technical data only. No personally identifiable information is collected through public browsing.</p>

                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">3. Data Protection</h5>
                                <p class="text-muted small mb-3">All data is accessed only by authorized SPECS officers under strict confidentiality standards.</p>

                                <h5 class="fw-bold mt-3 mt-md-4 mb-2 mb-md-3 text-dark fs-6 fs-md-5">4. Contact</h5>
                                <p class="text-muted small">
                                    <strong>SPECS Organization</strong><br>
                                    Email: <a href="mailto:specs.cecs@parsu.edu.ph" class="text-primary">specs.cecs@parsu.edu.ph</a><br>
                                    Address: College of Engineering and Computational Sciences, Partido State University
                                </p>
                            `
    })}
                    </div>
                </div>
            </section>
    </div>
    `;
}