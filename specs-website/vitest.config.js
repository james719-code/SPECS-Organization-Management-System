import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.js'],
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/__tests__/',
                '**/*.spec.js',
                '**/*.test.js',
                'dist/'
            ]
        },
        testTimeout: 10000
    },
    resolve: {
        alias: {
            'npm:@supabase/supabase-js@2': resolve(__dirname, './node_modules/@supabase/supabase-js/dist/index.mjs'),
            '@': resolve(__dirname, './src'),
            '@shared': resolve(__dirname, './src/shared')
        }
    }
});
