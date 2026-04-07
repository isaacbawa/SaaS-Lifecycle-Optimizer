/* ==========================================================================
 * Database Connection - Neon Serverless PostgreSQL via Drizzle ORM
 *
 * Uses @neondatabase/serverless for HTTP-based, connection-pooled access
 * that works perfectly with Next.js Edge and Serverless functions.
 *
 * Connection is lazily initialized and cached per process using globalThis
 * to survive HMR in development without leaking connections.
 * ========================================================================== */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function getDb() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error(
            '[DB] DATABASE_URL is not set. Add it to .env.local - get it from https://console.neon.tech',
        );
    }

    const sql = neon(url);
    return drizzle(sql, { schema });
}

/* ── Singleton via globalThis (survives HMR) ──────────────────────── */

const globalKey = Symbol.for('lifecycleos-db');
type GlobalWithDb = typeof globalThis & { [globalKey]?: ReturnType<typeof getDb> };

/**
 * Lazy database proxy - defers connection until first property access,
 * so importing this module during `next build` (page-data collection)
 * won't throw when DATABASE_URL is absent from the build environment.
 */
type DbInstance = ReturnType<typeof getDb>;

function resolveDb(): DbInstance {
    return ((globalThis as GlobalWithDb)[globalKey] ??= getDb());
}

export const db: DbInstance = new Proxy({} as DbInstance, {
    get(_target, prop, receiver) {
        const real = resolveDb();
        const value = Reflect.get(real, prop, receiver);
        return typeof value === 'function' ? value.bind(real) : value;
    },
});

export type Database = DbInstance;
