import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.HOST,
        port: process.env.PORT,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: 'postgres',
    },
    pool: { 
        min: 2,  // Minimum connections to maintain
        max: 10  // Maximum connections allowed
    },
});

export default db;