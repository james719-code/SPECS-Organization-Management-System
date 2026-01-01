import boxArrowInRight from 'bootstrap-icons/icons/box-arrow-in-right.svg';
import envelopeFill from 'bootstrap-icons/icons/envelope-fill.svg';
import facebook from 'bootstrap-icons/icons/facebook.svg';
import { Collapse } from 'bootstrap';

export function renderHeader() {
    return `
    <header class="navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="#home">SPECS</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mainNavbar">
                <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                    <li class="nav-item"><a class="nav-link" href="#home">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="#events">Events</a></li>
                    <li class="nav-item"><a class="nav-link" href="#about">About</a></li>
                    <li class="nav-item"><a class="nav-link" href="#resources">Resources</a></li>
                    <li class="nav-item"><a class="nav-link" href="#stories">Stories</a></li>
                </ul>
                <div class="d-flex">
                     <a href="#login" class="btn btn-sm btn-outline-light">
                        <img src="${boxArrowInRight}" alt="Login icon" class="me-2" style="width: 1em; height: 1em; filter: invert(1);">
                        Login / Sign Up
                    </a>
                </div>
            </div>
        </div>
    </header>
    `;
}

export function renderFooter() {
    return `
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
    `;
}

export function updateActiveNavLink(path) {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    if (!navLinks.length) return;

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).hash;
        if (linkPath === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

export function setupNavbarToggler() {
    const navLinks = document.querySelectorAll('#mainNavbar .nav-link, #mainNavbar .btn');
    const navbarCollapseElement = document.getElementById('mainNavbar');

    if (!navbarCollapseElement) {
        console.warn('Navbar collapse element #mainNavbar not found.');
        return;
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarCollapseElement.classList.contains('show')) {
                const bsCollapse = Collapse.getOrCreateInstance(navbarCollapseElement);
                bsCollapse.hide();
            }
        });
    });
}