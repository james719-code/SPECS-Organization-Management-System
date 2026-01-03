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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },

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
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('bootstrap')) {
              return 'vendor-bootstrap';
            }
            if (id.includes('chart')) {
              return 'vendor-chart';
            }
            if (id.includes('@aws-sdk')) {
              return 'vendor-aws';
            }
            return 'vendor';
          }
          if (id.includes('/shared/')) {
            return 'shared-utils';
          }
          if (id.includes('/dashboard-admin/views/')) {
            return 'views-admin';
          }
          if (id.includes('/dashboard-officer/views/')) {
            return 'views-officer';
          }
          if (id.includes('/dashboard-student/views/')) {
            return 'views-student';
          }
          if (id.includes('/landing/views/')) {
            return 'views-landing';
          }
        }
      }
    },
  }
});
