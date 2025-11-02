import knex from 'knex';
import dotenv from 'dotenv';
import pg from 'pg';
import logger from './logger.js';

// Allow disabling dotenv in production to avoid mixing with Render Env Vars
const disableDotenv = (process.env.DISABLE_DOTENV || '').toLowerCase() === 'true';
if (!disableDotenv) {
    dotenv.config();
} else {
    logger.info('dotenv loading disabled via DISABLE_DOTENV=true');
}

// Ensure pg uses TCP keep-alive at the client level as well
pg.defaults.keepAlive = true;
pg.defaults.keepAliveInitialDelayMillis = 10000;

// Configure database connection
let connectionConfig;

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if provided (production/Render)
    logger.info('Using DATABASE_URL for database connection');
    connectionConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        // Keep TCP connection alive to reduce idle disconnects
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    };
    // Diagnostics: log sanitized host/port and pooler hint
    try {
        const u = new URL(process.env.DATABASE_URL);
        const host = u.hostname;
        const port = u.port || '(default)';
        const isPooler = host.includes('pooler.supabase.com');
        if (!isPooler) {
            logger.warn({ host, port }, 'DATABASE_URL does not look like Supabase pooler host; consider using session pooler URL');
        } else {
            logger.info({ host, port }, 'DATABASE_URL points to Supabase pooler');
        }
    } catch (e) {
        logger.warn('Failed to parse DATABASE_URL for diagnostics');
    }
} else {
    // Fallback to individual environment variables (local development)
    logger.info('Using individual DB_* variables for database connection');
    logger.info({ host: process.env.DB_HOST, db: process.env.DB_NAME }, 'DB_* connection parameters');
    connectionConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    };
}

const db = knex({
    client: 'pg',
    connection: connectionConfig,
    // Keep a very small pool to avoid exhausting Supabase pooler limits
    // (Render free + Supabase pooler often caps concurrent clients)
    pool: {
        min: 0,
        // Keep pool tiny to reduce connection churn and pooler overload
        max: 5,
        // Tarn (knex) pool options to fail fast and free idle clients
        acquireTimeoutMillis: 15000,
        idleTimeoutMillis: 10000,
        reapIntervalMillis: 3000,
    },
});

export default db;