import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  define: {
    __APP_TITLE__: JSON.stringify(process.env.VITE_APP_TITLE),
  },
  css: {
    preprocessorOptions: {
      scss: {
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
    outDir: '../dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'src/index.html'),
        landing: resolve(process.cwd(), 'src/landing/index.html'),
        officerDashboard: resolve(process.cwd(), 'src/dashboard-officer/index.html'),
        adminDashboard: resolve(process.cwd(), 'src/dashboard-admin/index.html'),
        studentDashboard: resolve(process.cwd(), 'src/dashboard-student/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('appwrite')) {
              return 'vendor-appwrite';
            }
            if (id.includes('bootstrap')) {
              return 'vendor-bootstrap';
            }
            if(id.includes('chart')) {
              return 'vendor-chart';
            }
            return 'vendor';
          }
          if (id.includes('/shared/')) {
            return 'shared-utils';
          }
        }
      }
    },
  }
});
