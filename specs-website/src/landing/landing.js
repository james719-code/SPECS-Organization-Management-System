import './landing.scss';
import { Collapse, Dropdown } from 'bootstrap';

// Import SVG icons instead of using the icon font
import calendar from 'bootstrap-icons/icons/calendar2-week.svg';
import clockHistory from 'bootstrap-icons/icons/clock-history.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import personVideo3 from 'bootstrap-icons/icons/person-video3.svg';
import boxArrowInRight from 'bootstrap-icons/icons/box-arrow-in-right.svg';
import envelopeFill from 'bootstrap-icons/icons/envelope-fill.svg';
import facebook from 'bootstrap-icons/icons/facebook.svg';
import codeSlash from 'bootstrap-icons/icons/code-slash.svg';
import barChartLineFill from 'bootstrap-icons/icons/bar-chart-line-fill.svg';
import shieldLockFill from 'bootstrap-icons/icons/shield-lock-fill.svg';
import robot from 'bootstrap-icons/icons/robot.svg';
import controller from 'bootstrap-icons/icons/controller.svg';
import paletteFill from 'bootstrap-icons/icons/palette-fill.svg';
import imageAlt from 'bootstrap-icons/icons/image-alt.svg';
import arrowsMove from 'bootstrap-icons/icons/arrows-move.svg';
import bullseye from 'bootstrap-icons/icons/bullseye.svg';
import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import hourglassSplit from 'bootstrap-icons/icons/hourglass-split.svg';
import envelopeCheckFill from 'bootstrap-icons/icons/envelope-check-fill.svg';

import logoURL from '../../public/logo.webp';
import { account, databases, storage, Query, ID } from '../shared/appwrite.js';

const BUCKET_ID_EVENT_IMAGES = import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES;
const BUCKET_ID_PICTURES = import.meta.env.VITE_BUCKET_ID_PICTURES;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

const IMAGE_CACHE_KEY = 'eventImageCache';
const PICTURE_CACHE_KEY = 'pictureImageCache';
const app = document.getElementById('app');

function getCachedImageUrl(fileId, width = 400, height = 250) {
    if (!fileId) return null;
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY)) || {};
        if (cache[fileId]?.[`${width}x${height}`]) {
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

function createEventCardSkeletonHTML() {
    return `
        <div class="col">
            <div class="card h-100 shadow-sm" aria-hidden="true">
                <div class="bg-light" style="height: 200px;"></div>
                <div class="card-body">
                    <h5 class="card-title placeholder-glow"><span class="placeholder col-8"></span></h5>
                    <p class="card-text placeholder-glow"><span class="placeholder col-12"></span><span class="placeholder col-7"></span><span class="placeholder col-9"></span></p>
                    <div class="mt-auto small text-muted placeholder-glow"><span class="placeholder col-10"></span></div>
                </div>
            </div>
        </div>
    `;
}

function createGuestEventCard(eventDoc, isPastEvent = false) {
    const imageUrl = getCachedImageUrl(eventDoc.image_file);
    const eventDate = new Date(eventDoc.date_to_held);
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const collaboratorsHTML = (eventDoc.collab && eventDoc.collab.length > 0)
        ? `<div class="small text-muted mb-2 d-flex align-items-center"><img src="${peopleFill}" alt="Collaboration icon" class="me-1" style="width: 1.1em; height: 1.1em; filter: invert(50%);"><strong>In collaboration with:</strong>&nbsp;${eventDoc.collab.join(', ')}</div>` : '';

    return `
        <div class="col">
            <div class="card h-100 shadow-sm overflow-hidden card-hover-grow ${isPastEvent ? 'past-event-card' : ''}">
                <div class="event-image-placeholder bg-light" ${imageUrl ? `data-src="${imageUrl}"` : ''} data-alt="${eventDoc.event_name}"></div>
                <div class="card-body d-flex">
                    <div class="text-center border-end pe-3 me-3">
                        <div class="h5 ${isPastEvent ? 'text-muted' : 'text-primary'}">${eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div class="display-6 fw-bold ${isPastEvent ? 'text-muted' : ''}">${eventDate.getDate()}</div>
                    </div>
                    <div class="d-flex flex-column">
                        <h5 class="card-title fw-bold">${eventDoc.event_name}</h5>
                        <p class="card-text small text-body-secondary flex-grow-1">${eventDoc.description || 'More details coming soon.'}</p>
                        ${collaboratorsHTML}
                        <div class="mt-auto small text-muted d-flex align-items-center"><img src="${clock}" alt="Clock icon" class="me-1" style="width: 1em; height: 1em; filter: invert(50%);"> ${formattedDate} at ${formattedTime}</div>
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

function renderLandingPage() {
    app.innerHTML = `
    <div class="landing-page">
        <header class="navbar navbar-expand-lg navbar-dark fixed-top">
            <div class="container-fluid">
                <a class="navbar-text fw-bold" href="#">SPECS</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar"><span class="navbar-toggler-icon"></span></button>
                <div class="collapse navbar-collapse" id="mainNavbar">
                    <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                        <li class="nav-item"><a class="nav-link" href="#events">Events</a></li>
                        <li class="nav-item"><a class="nav-link" href="#about-specs">About SPECS</a></li>
                        <li class="nav-item"><a class="nav-link" href="#logo-breakdown">Our Logo</a></li>
                        <li class="nav-item"><a class="nav-link" href="#about-bscs">About BSCS</a></li>
                        <li class="nav-item"><a class="nav-link" href="#faq">FAQ</a></li>
                        <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
                        <li class="nav-item d-lg-none mt-2"><a href="#login" class="btn btn-sm btn-outline-light w-100"><img src="${boxArrowInRight}" alt="Login icon" class="me-2" style="width: 1em; height: 1em; filter: invert(1);">Login / Sign Up</a></li>
                    </ul>
                    <a href="#login" class="btn btn-sm btn-outline-light d-none d-lg-block"><img src="${boxArrowInRight}" alt="Login icon" class="me-2" style="width: 1em; height: 1em; filter: invert(1);">Login / Sign Up</a>
                </div>
            </div>
        </header>

        <main>
            <section class="hero-section-gradient text-white text-center py-5">
                <div class="container" style="padding-top: 6rem; padding-bottom: 6rem;">
                    <h1 class="display-4 fw-bold">Society of Programmers and Enthusiasts in Computer Science</h1>
                    <p class="lead col-lg-8 mx-auto">A hub for Computer Science students to get the latest updates on events and activities within the SPECS Organization.</p>
                </div>
            </section>
            <section id="events" class="py-5">
                <div class="container">
                    <h2 class="text-center fw-bold mb-3">Our Events</h2>
                    <p class="text-center text-muted mb-5">Stay updated with our latest activities and workshops.</p>
                    <h3 class="fw-bold mb-4">Upcoming Events</h3>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="upcoming-events-grid-container"></div>
                    <hr class="my-5">
                    <h3 class="fw-bold mb-4">Past Events</h3>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center" id="past-events-grid-container"></div>
                </div>
            </section>
            <section id="about-specs" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center fw-bold mb-5">About SPECS</h2>
                    <div class="row align-items-center g-5"><div class="col-lg-4 mb-4 mb-lg-0 text-center"><img src="${logoURL}" class="img-fluid rounded-3 shadow-sm" alt="SPECS Organization Logo" style="max-height: 250px;"></div><div class="col-lg-8"><h3 class="fw-bold">Our Mission</h3><p>The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the premier organization for all Computer Science students at Partido State University. We are dedicated to fostering a dynamic environment of learning, innovation, and collaboration. Our goal is to empower members with the technical skills, professional networks, and leadership qualities necessary to excel in the ever-evolving world of technology.</p></div></div>
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
                <div class="container"><h2 class="text-center fw-bold mb-5">Frequently Asked Questions</h2><div class="row justify-content-center"><div class="col-lg-8"><div class="accordion" id="faqAccordion"></div></div></div></div>
            </section>
        </main>

        <footer id="contact" class="footer text-center py-5">
            <div class="container">
                <h3 class="fw-bold mb-3">Contact Us</h3>
                <p class="mb-4">For inquiries, partnerships, or more information about SPECS, feel free to reach out.</p>
                <div class="d-flex justify-content-center flex-wrap align-items-center gap-4">
                    <a href="mailto:parsu.specs@gmail.com" class="link-light text-decoration-none footer-link d-flex align-items-center"><img src="${envelopeFill}" alt="Email icon" style="width: 1.5rem; height: 1.5rem; filter: invert(1);"><span class="ms-2">parsu.specs@gmail.com</span></a>
                    <a href="https://www.facebook.com/parsu.specs" target="_blank" class="link-light text-decoration-none footer-link d-flex align-items-center"><img src="${facebook}" alt="Facebook icon" style="width: 1.5rem; height: 1.5rem; filter: invert(1);"><span class="ms-2">facebook.com/psu.specs</span></a>
                </div>
                <hr class="my-4"><p class="mb-0 small">© ${new Date().getFullYear()} SPECS. All Rights Reserved.</p>
            </div>
        </footer>
    </div>
    `;

    initializeDataAndListenersForLanding();
}

function renderLoginPage() {
    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="login-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Login Account</h2>
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="email" class="form-label">Email Address</label>
                                    <input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required />
                                </div>
                                <div class="col-12">
                                    <label for="password" class="form-label">Password</label>
                                    <input id="password" name="password" type="password" class="form-control" placeholder="Enter your password" required />
                                </div>
                            </div>
                            <div id="status-message" class="text-center small text-danger mt-3" aria-live="polite"></div>
                            <div class="d-grid mt-4">
                               <button type="submit" class="btn btn-primary">
                                    <span class="button-text">Login</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                               </button>
                            </div>
                            <p class="text-center small mt-4 mb-0">Don't have an account? <a href="#signup">Sign up</a></p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

    const loginForm = document.getElementById('login-form');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const statusMessageDiv = document.getElementById('status-message');

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        submitButton.disabled = true;
        buttonText.textContent = 'Authenticating...';
        buttonSpinner.classList.remove('d-none');
        statusMessageDiv.textContent = '';

        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();

            if (!user.emailVerification) {
                await account.deleteSession('current');
                throw new Error("Your email has not been verified. Please check your inbox for the verification link.");
            }

            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);

            if (profile.type === 'admin') {
                window.location.href = '/dashboard-admin/';
            } else if (profile.type === 'student' && profile.verified) {
                window.location.href = '/dashboard-user/';
            } else {
                await account.deleteSession('current');
                window.location.hash = 'pending-verification';
            }
        } catch (err) {
            statusMessageDiv.textContent = err.message;
            if (!window.location.href.includes('dashboard')) {
                submitButton.disabled = false;
                buttonText.textContent = 'Login';
                buttonSpinner.classList.add('d-none');
            }
        }
    };
}

function renderSignupPage() {
    const yearLevelOptions = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
        .map(section => `<option value="BSCS ${section}">BSCS ${section}</option>`).join('');

    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-8 col-xl-7">
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="signup-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Create Account</h2>
                            <div id="form-error-message" class="alert alert-danger d-none" role="alert"></div>
                            <div class="row g-3">
                                <div class="col-md-6"><label for="name" class="form-label">Full Name</label><input id="name" name="name" type="text" class="form-control" placeholder="e.g., Juan Dela Cruz" required /></div>
                                <div class="col-md-6"><label for="username" class="form-label">Username</label><input id="username" name="username" type="text" class="form-control" placeholder="e.g., juan23" required /></div>
                                <div class="col-12"><label for="email" class="form-label">University Email</label><input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required pattern=".+@parsu\\.edu\\.ph$" title="Please use your @parsu.edu.ph email address."/></div>
                                <div class="col-md-6"><label for="yearLevel" class="form-label">Year & Section</label><select id="yearLevel" name="yearLevel" class="form-select" required><option value="" disabled selected>-- Select your section --</option>${yearLevelOptions}</select></div>
                                <div class="col-md-6"><label for="gender" class="form-label">Gender</label><select id="gender" name="gender" class="form-select" required><option value="" disabled selected>-- Select Gender --</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                                <div class="col-md-6"><label for="password" class="form-label">Password</label><input id="password" name="password" type="password" class="form-control" placeholder="At least 8 characters" required minlength="8" /></div>
                                <div class="col-md-6"><label for="password2" class="form-label">Retype Password</label><input id="password2" name="password2" type="password" class="form-control" placeholder="Confirm your password" required /></div>
                            </div>
                            <div class="d-grid mt-4">
                                <button type="submit" class="btn btn-primary">
                                    <span class="button-text">Sign Up</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                </button>
                            </div>
                            <p class="text-center small mt-4 mb-0">Already have an account? <a href="#login">Login here</a></p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

    const signupForm = document.getElementById('signup-form');
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const formErrorDiv = document.getElementById('form-error-message');

    const showFormError = (message) => {
        formErrorDiv.textContent = message;
        formErrorDiv.classList.remove('d-none');
    };

    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        const { name, username, email, yearLevel, gender, password, password2 } = e.target.elements;

        formErrorDiv.classList.add('d-none');
        if (password.value.length < 8) { showFormError("Password must be at least 8 characters long."); return; }
        if (password.value !== password2.value) { showFormError("Passwords do not match. Please try again."); return; }
        if (!email.value.endsWith('@parsu.edu.ph')) { showFormError("Invalid email. Please use your official @parsu.edu.ph email address."); return; }
        if (!signupForm.checkValidity()) { showFormError("Please fill out all required fields."); return; }

        submitButton.disabled = true;
        buttonText.textContent = 'Signing Up...';
        buttonSpinner.classList.remove('d-none');

        try {
            const user = await account.create(ID.unique(), email.value, password.value, name.value);
            await account.createEmailPasswordSession(email.value, password.value);
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, {
                username: username.value, fullname: name.value, yearLevel: yearLevel.value, gender: gender.value,
                verified: false, type: 'student', haveResume: false, resumeId: '', haveSchedule: false, scheduleId: ''
            });
            const verificationUrl = `${window.location.origin}/#verify-email`;
            await account.createVerification(verificationUrl);
            window.location.hash = 'check-email';
        } catch (err) {
            showFormError(`Signup failed: ${err.message}`);
        } finally {
            submitButton.disabled = false;
            buttonText.textContent = 'Sign Up';
            buttonSpinner.classList.add('d-none');
        }
    };
}

function renderVerifyEmailPage() {
    app.innerHTML = `
    <div class="container auth-container">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5"><div class="card shadow-lg text-center"><div class="card-body p-4 p-md-5">
            <div id="verify-icon" class="mb-4"><div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status"></div></div>
            <h2 id="verify-status" class="card-title h3 fw-bold">Verifying Email...</h2>
            <p id="verify-message" class="card-text text-body-secondary">Please wait a moment while we confirm your verification link.</p>
            <div class="d-grid mt-4"><a href="#login" id="verify-action-btn" class="btn btn-primary d-none">Proceed to Login</a></div>
        </div></div></div>
      </div>
    </div>`;

    const handleVerification = async () => {
        const statusEl = document.getElementById('verify-status');
        const messageEl = document.getElementById('verify-message');
        const iconEl = document.getElementById('verify-icon');
        const actionBtn = document.getElementById('verify-action-btn');
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const secret = urlParams.get('secret');
            if (!userId || !secret) throw new Error("Verification link is invalid or incomplete.");
            await account.updateVerification(userId, secret);
            iconEl.innerHTML = `<img src="${checkCircleFill}" alt="Success" class="text-success" style="width: 5rem; height: 5rem; fill: var(--bs-success);">`;
            statusEl.textContent = "Email Verified!";
            messageEl.innerHTML = `Thank you! Your account is now active. You can now log in. Redirecting shortly...`;
            actionBtn.classList.remove('d-none');
            setTimeout(() => { window.location.hash = 'login'; }, 4000);
        } catch (err) {
            iconEl.innerHTML = `<img src="${xCircleFill}" alt="Failure" class="text-danger" style="width: 5rem; height: 5rem; fill: var(--bs-danger);">`;
            statusEl.textContent = "Verification Failed";
            messageEl.textContent = err.message + ". The link may have expired or has already been used.";
            actionBtn.classList.remove('d-none');
        }
    };
    handleVerification();
}

function renderPendingVerificationPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${hourglassSplit}" alt="Pending approval" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(75%) sepia(50%) saturate(1) hue-rotate(5deg) brightness(1.2);">
                        <h2 class="mt-3 fw-bold">Account Pending Approval</h2>
                        <p class="mb-4 lead">Thank you for signing up and verifying your email. Your account is now waiting to be verified by an administrator. You will be able to access the dashboard once your account is approved.</p>
                        <button id="logout-btn-pending" class="btn btn-secondary w-100 mt-3">Logout</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.getElementById('logout-btn-pending').onclick = async () => {
        try {
            await account.deleteSession('current');
            window.location.hash = 'login';
        } catch (error) {
            const container = document.querySelector('.card');
            if (container) {
                container.innerHTML += `<p class="text-danger small mt-3">Failed to log out: ${error.message}</p>`;
            }
        }
    };
}

function renderCheckEmailPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                 <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${envelopeCheckFill}" alt="Check email" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(48%) sepia(61%) saturate(2371%) hue-rotate(120deg) brightness(94%) contrast(101%);">
                        <h2 class="mt-3 fw-bold">Check Your Inbox!</h2>
                        <p class="mb-4 lead">A verification link has been sent to your @parsu.edu.ph email address. Please click the link inside to activate your account.</p>
                        <a href="#login" class="btn btn-primary" id="buttonBack">Logout</a>
                    </div>
                </div>
            </div>
        </div>`;
    document.getElementById("buttonBack").onclick = async () => {
        try {
            await account.deleteSession('current');
            window.location.hash = 'login';
        } catch (error) {
            const container = document.querySelector('.card');
            if (container) {
                container.innerHTML += `<p class="text-danger small mt-3">Failed to log out: ${error.message}</p>`;
            }
        }
    }
}

function initializeDataAndListenersForLanding() {
    const siteData = {
        adviser: { name: 'Nicolas A. Pura', position: 'Organization Adviser', fileId: 'adviser' },
        officers: [
            { name: 'Ramon P. Bombita Jr.', position: 'President', fileId: 'president' }, { name: 'Ariel August A. Ablay', position: 'Vice-President External Affairs', fileId: 'vice-president-external' },
            { name: 'Alexander R. Santos', position: 'Vice-President Internal Affairs', fileId: 'vice-president-internal' }, { name: 'Cathy A. Indico', position: 'Secretary', fileId: 'secretary' },
            { name: 'Princess Yvonne D. Palmes', position: 'Assistant Secretary', fileId: 'assistant-secretary' }, { name: 'Lyzza V. Aboque', position: 'Treasurer', fileId: 'treasurer' },
            { name: 'James Ryan S. Gallego', position: 'Auditor', fileId: 'auditor' }, { name: 'Mark Lorence R. Baltazar', position: 'P.I.O', fileId: 'pio' },
            { name: 'Clement A. Crucillo', position: 'Business Manager', fileId: 'business-manager-1' }, { name: 'Rezel Joy A. Padillo', position: 'Business Manager', fileId: 'business-manager-2' },
            { name: 'Renalene V. Seares', position: 'Sergeant at Arms', fileId: 'SA1' }, { name: 'Jabez B. Collano', position: 'Sergeant at Arms', fileId: 'SA2' },
            { name: 'Jhan Angelo Milante', position: '1A Representative', fileId: '1AR' }, { name: 'Terence P. Serrano', position: '1B Representative', fileId: '1BR' },
            { name: 'Gil IV Miguel Salvador I. Cea', position: '2A Representative', fileId: '2AR' }, { name: 'Joan C. Lara', position: '2B Representative', fileId: '2BR' },
            { name: 'Nonalyn N. Bondad', position: '3A Representative', fileId: '3AR' }, { name: 'Robert A. Bayona Jr.', position: '3B Representative', fileId: '3BR' },
            { name: 'John Russel Ivan S. Romero', position: '4A Representative', fileId: '4AR' },
        ],
        jobs: [
            { title: 'Software Engineer', icon: codeSlash }, { title: 'Data Scientist', icon: barChartLineFill }, { title: 'Cybersecurity Analyst', icon: shieldLockFill },
            { title: 'AI/ML Engineer', icon: robot }, { title: 'Game Developer', icon: controller }, { title: 'UX/UI Designer', icon: paletteFill },
        ],
        faq: [
            { id: 'one', question: 'What is SPECS?', answer: 'The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for Computer Science students at Partido State University. We aim to foster a community of learning, innovation, and collaboration.' },
            { id: 'two', question: 'Who can join SPECS?', answer: 'All bona fide students enrolled in the Computer Science program at Partido State University are encouraged to join and become active members of the organization.' },
            { id: 'three', question: 'How can I get updates on events?', answer: 'The best way is to create an account on this portal! We post all official events, announcements, and files here. You can also follow our official social media pages.' },
            { id: 'four', question: 'What kind of events does SPECS organize?', answer: 'We organize a variety of events, including coding seminars, workshops, programming competitions, tech talks from industry professionals, and social gatherings to build camaraderie among members.' },
        ]
    };

    const adviserContainer = document.getElementById('adviser-card-container');
    //const officersContainer = document.getElementById('officers-grid-container');
    const jobsContainer = document.getElementById('jobs-grid-container');
    const faqContainer = document.getElementById('faqAccordion');

    if (adviserContainer) adviserContainer.innerHTML = createAdviserCardHTML(siteData.adviser);
    //if (officersContainer) officersContainer.innerHTML = siteData.officers.map(createOfficerCardHTML).join('');
    if (jobsContainer) jobsContainer.innerHTML = siteData.jobs.map(createJobCardHTML).join('');
    if (faqContainer) faqContainer.innerHTML = siteData.faq.map(createFaqItemHTML).join('');

    setupInteractiveLogo();
    setupSmoothScrolling();
    Promise.all([fetchUpcomingEvents(), fetchPastEvents()]).then(() => {
        initializeImageLoader();
    });
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

function setupSmoothScrolling() {
    document.querySelectorAll('.nav-link[href^="#"], .navbar-brand[href="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const targetEl = (href === '#') ? document.body : document.querySelector(href);

            if (targetEl) {
                const navbarHeight = document.querySelector('.navbar.fixed-top')?.offsetHeight || 0;
                const elementPosition = targetEl.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                window.scrollTo({ top: href === '#' ? 0 : offsetPosition, behavior: 'smooth' });
            }
        });
    });
}

function initializeImageLoader() {
    document.querySelectorAll('.event-image-placeholder').forEach(placeholder => {
        placeholder.style.height = '100%';
        placeholder.style.minHeight = '200px';
        const src = placeholder.dataset.src;
        const defaultIcon = `<div class="d-flex w-100 h-100 justify-content-center align-items-center bg-secondary-subtle"><img src="${imageAlt}" alt="Default image placeholder" style="width: 4rem; height: 4rem; opacity: 0.3;"></div>`;
        if (!src) {
            placeholder.innerHTML = defaultIcon;
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
        img.onerror = () => { placeholder.innerHTML = defaultIcon; };
    });
}

async function fetchUpcomingEvents() {
    const container = document.getElementById('upcoming-events-grid-container');
    if (!container) return;
    container.innerHTML = Array(3).fill(createEventCardSkeletonHTML()).join('');

    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.equal('event_ended', false), Query.orderAsc('date_to_held'), Query.limit(3)]);
        if (response.documents.length > 0) {
            container.innerHTML = response.documents.map(doc => createGuestEventCard(doc, false)).join('');
        } else {
            container.innerHTML = `<div class="col-12 text-center text-muted py-5">
                <img src="${calendar}" alt="Calendar icon" style="width: 4rem; height: 4rem; opacity: 0.5;"/>
                <h4 class="fw-light mt-3">No Upcoming Events</h4>
                <p>New events will be posted here. Please check back soon!</p>
            </div>`;
        }
    } catch (error) {
        console.error("Failed to load upcoming events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load upcoming events. Please try refreshing the page.</div></div>';
    }
}

async function fetchPastEvents() {
    const container = document.getElementById('past-events-grid-container');
    if (!container) return;
    container.innerHTML = Array(3).fill(createEventCardSkeletonHTML()).join('');

    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.equal('event_ended', true), Query.orderDesc('date_to_held'), Query.limit(3)]);
        container.innerHTML = (response.documents.length > 0)
            ? response.documents.map(doc => createGuestEventCard(doc, true)).join('')
            : `<div class="col-12 text-center text-muted py-5"><img src="${clockHistory}" alt="Past events icon" style="width: 4rem; height: 4rem; opacity: 0.5;"><h4 class="fw-light mt-3">No Past Events Yet</h4><p>Our event history will appear here once events conclude.</p></div>`;
    } catch (error) {
        console.error("Failed to load past events:", error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">Could not load past events. Please try refreshing the page.</div></div>';
    }
}

const routes = {
    '': renderLandingPage,
    '#login': renderLoginPage,
    '#signup': renderSignupPage,
    '#verify-email': renderVerifyEmailPage,
    '#pending-verification': renderPendingVerificationPage,
    '#check-email': renderCheckEmailPage
};

function router() {
    const path = (window.location.hash || '#').split('?')[0];
    const renderFunction = routes[path] || renderLandingPage;
    renderFunction();
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);