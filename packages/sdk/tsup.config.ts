import { defineConfig } from 'tsup';

export default defineConfig([
    // Core entry
    {
        entry: { index: 'src/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        treeshake: true,
        splitting: false,
        target: 'es2020',
        external: ['react', 'react-dom', 'next'],
        banner: { js: '"use client";\n' },
    },
    // React entry
    {
        entry: { 'react/index': 'src/react/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        outDir: 'dist',
        treeshake: true,
        splitting: false,
        target: 'es2020',
        external: ['react', 'react-dom', 'next'],
        banner: { js: '"use client";\n' },
    },
    // Next.js server entry (no "use client" banner)
    {
        entry: { 'nextjs/index': 'src/nextjs/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        outDir: 'dist',
        treeshake: true,
        splitting: false,
        target: 'es2020',
        external: ['react', 'react-dom', 'next'],
    },
]);
