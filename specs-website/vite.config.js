import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config(); // Load .env variables

export default defineConfig({
  // Set the root to the directory containing your main index.html
  root: 'src',

  // Public directory for static assets, relative to the project root.
  publicDir: '../public',

  define: {
    __APP_TITLE__: JSON.stringify(process.env.VITE_APP_TITLE),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Optional: Suppress specific SCSS warnings if needed.
        silenceDeprecations: [
          'import',
          'mixed-decls',
          'color-functions',
          'global-builtin',
        ],
      },
    },
  },
  build: {
    // The output directory is relative to the project root.
    outDir: '../dist',

    // Clean the output directory before building.
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Define all your entry points here using absolute paths.
        // This is crucial for a multi-page application setup.
        main: resolve(__dirname, './src/index.html'),
        landing: resolve(__dirname, 'src/landing/index.html'),
        // Uncomment these as you build them out.
        userDashboard: resolve(__dirname, 'src/dashboard-user/index.html'),
        // adminDashboard: resolve(__dirname, 'src/admin-dashboard/index.html'),
      },
      output: {
        // --- IMPROVED MANUAL CHUNKS CONFIGURATION ---
        // This function provides fine-grained control over how your code is split.
        // It helps optimize caching and initial load times.
        manualChunks(id) {
          // Group all node_modules into vendor-related chunks.
          if (id.includes('node_modules')) {
            // Create a dedicated chunk for the Appwrite SDK.
            if (id.includes('appwrite')) {
              return 'vendor-appwrite';
            }
            // Create a dedicated chunk for Bootstrap's JS.
            if (id.includes('bootstrap')) {
              return 'vendor-bootstrap';
            }
            // Bundle all other dependencies into a single 'vendor' file.
            return 'vendor';
          }
          // Create a chunk for shared utilities if you have a 'shared' directory.
          // This is useful for code reused across multiple pages (e.g., API clients, formatters).
          if (id.includes('/shared/')) {
            return 'shared-utils';
          }
        }
      }
    },
  }
});