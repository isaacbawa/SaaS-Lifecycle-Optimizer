import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        exclude: ['node_modules', '.next'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            include: ['src/lib/**/*.ts'],
            exclude: ['src/lib/db/schema.ts', 'src/**/*.test.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
