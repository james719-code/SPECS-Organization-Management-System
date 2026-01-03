// unlighthouse.config.mjs

/** @type {import('unlighthouse').UserConfig} */
export default {
    site: 'http://localhost:4173',
    sitePaths: [
        '/',
        '/landing/',
        '/landing/#login',
        '/landing/#signup',
        '/landing/#events',
        '/landing/#about',
        '/dashboard-student/',
        '/dashboard-officer/',
        '/dashboard-admin/',
    ],
    scanner: {
        device: 'mobile',
        sitemap: false,
        robotsTxt: false,
    },
    // Use the explicit path to your Edge browser.
    puppeteerOptions: {
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    },
};