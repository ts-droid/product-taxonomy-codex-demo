import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const storageDir = path.resolve(process.cwd(), 'project-root/storage');
const defaultDbPath = path.join(storageDir, 'taxonomy.sqlite');
const schemaPath = path.resolve(process.cwd(), 'project-root/src/db/schema.sql');

export function getDatabasePath() {
  return process.env.TAXONOMY_DB_PATH || defaultDbPath;
}

export function ensureStorageDir() {
  fs.mkdirSync(path.dirname(getDatabasePath()), { recursive: true });
}

export function openDatabase() {
  ensureStorageDir();
  return new Database(getDatabasePath());
}

export function initializeDatabase() {
  const db = openDatabase();
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
}
