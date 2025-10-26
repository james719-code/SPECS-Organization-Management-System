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
        main: resolve(__dirname, './src/index.html'),
        landing: resolve(__dirname, 'src/landing/index.html'),
        userDashboard: resolve(__dirname, 'src/dashboard-user/index.html'),
        adminDashboard: resolve(__dirname, 'src/dashboard-admin/index.html'),
      },
      output: {
        manualChunks(id) {
            console.log(id);
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