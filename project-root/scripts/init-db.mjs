import { initializeDatabase, getDatabasePath } from '../src/db/database.js';

const db = initializeDatabase();
db.close();

console.log(`Database initialized at ${getDatabasePath()}`);
