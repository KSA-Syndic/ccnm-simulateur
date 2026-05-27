import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        include: [
            'src/**/*.test.ts',
            'src/**/*.spec.ts',
            'legacy-archive/tests/**/*.test.js',
            'tests/**/*.test.ts',
            'tests/**/*.spec.ts',
        ],
        exclude: ['node_modules', 'dist', 'e2e'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'e2e/',
                '*.config.js',
                '**/*.test.js'
            ]
        }
    }
});
