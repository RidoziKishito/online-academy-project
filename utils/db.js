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
        pool: { min: 0, max: 15 },
    },
});

export default db;