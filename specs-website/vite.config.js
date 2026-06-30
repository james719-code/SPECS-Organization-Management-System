import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

/**
 * SPA Fallback Plugin
 * Vite's preview server has no built-in history-API fallback.
 * This plugin adds a middleware to BOTH dev and preview servers so that
 * refreshing any deep route (e.g. /dashboard/admin/students) serves index.html
 * instead of returning 404. On Netlify, public/_redirects handles the same thing.
 */
const spaFallbackPlugin = () => ({
  name: 'spa-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || '/';
      // Let Vite handle requests for actual assets (have a file extension)
      // and Vite internals (start with /@)
      const lastSegment = url.split('?')[0].split('/').pop() || '';
      if (!lastSegment.includes('.') && !url.startsWith('/@')) {
        req.url = '/index.html';
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || '/';
      const lastSegment = url.split('?')[0].split('/').pop() || '';
      if (!lastSegment.includes('.') && !url.startsWith('/@')) {
        req.url = '/index.html';
      }
      next();
    });
  },
});

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  define: {
    __APP_TITLE__: JSON.stringify(process.env.VITE_APP_TITLE),
  },

  plugins: [
    react(),
    spaFallbackPlugin(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    chunkSizeWarningLimit: 800,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
      output: {
        // Single vendor chunk — keeps all node_modules in one file so Rollup
        // can guarantee module initialization order. Splitting vendor further
        // causes runtime errors because the browser may load parallel chunks
        // in any order, breaking React's internal bootstrapping.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  }
});
