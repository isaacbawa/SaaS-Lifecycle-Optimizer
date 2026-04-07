import { defineConfig } from 'tsup';

export default defineConfig([
    // Core entry - framework-agnostic, works in any JS runtime (browser/Node).
    // NO "use client" banner: the core is a pure JS library with no React or
    // framework dependency.  Server-side callers (Express, Fastify, plain Node)
    // can import createClient directly without triggering bundler warnings.
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
        external: ['react', 'react-dom', 'next', 'crypto'],
    },
    // React entry - requires React 18+.  Works in Next.js App Router, Remix,
    // Vite + React, Create React App, Gatsby, or any React-based framework.
    // The "use client" banner tells Next.js bundler these are client components;
    // non-Next bundlers safely ignore it.
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
    // Next.js server entry - helpers for Server Actions, Route Handlers,
    // middleware, and webhook verification.  Requires a Next.js server
    // environment (access to process.env, Node crypto).  No "use client".
    {
        entry: { 'nextjs/index': 'src/nextjs/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        outDir: 'dist',
        treeshake: true,
        splitting: false,
        target: 'es2020',
        external: ['react', 'react-dom', 'next', 'crypto'],
    },
]);
