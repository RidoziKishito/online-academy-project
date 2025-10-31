import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

// Configure database connection
let connectionConfig;

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if provided (production/Render)
    console.log('Using DATABASE_URL for database connection');
    connectionConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
} else {
    // Fallback to individual environment variables (local development)
    console.log('Using individual DB_* variables for database connection');
    console.log('DB_HOST:', process.env.DB_HOST);
    connectionConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
}

const db = knex({
    client: 'pg',
    connection: connectionConfig,
    // Keep a very small pool to avoid exhausting Supabase pooler limits
    // (Render free + Supabase pooler often caps concurrent clients)
    pool: {
        min: 0,
        max: 3,
        // Tarn (knex) pool options to fail fast and free idle clients
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        reapIntervalMillis: 3000,
    },
});

export default db;