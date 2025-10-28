import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
    },
    pool: { 
        min: 2,  // Minimum connections to maintain
        max: 10  // Maximum connections allowed
    },
});

export default db;