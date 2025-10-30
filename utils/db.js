import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

// Configure database connection
const connectionConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      };

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