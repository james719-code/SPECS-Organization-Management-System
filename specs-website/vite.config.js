import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

export default defineConfig({
  define: {
    __APP_TITLE__: JSON.stringify(process.env.VITE_APP_TITLE),
  }
});
