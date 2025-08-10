// unlighthouse.config.mjs

/** @type {import('unlighthouse').UserConfig} */
export default {
    site: 'http://localhost:4173',
    sitePaths: [
        '/',
        '/landing/',
        '/dashboard-user/',
        '/dashboard-admin/',
    ],
    scanner: {
        device: 'mobile',
        sitemap: false,
        robotsTxt: false,
    },
    // Use the explicit path to your Edge browser.
    // This is the most reliable method.
    puppeteerOptions: {
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    },
};