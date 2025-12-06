import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { strategies } from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select().from(strategies);
console.log(JSON.stringify(result, null, 2));

await connection.end();
