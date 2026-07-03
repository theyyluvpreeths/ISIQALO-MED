import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_DATABASE_PATH || path.join(process.cwd(), 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export let db: sqlite3.Database;

let resolveDbInit: () => void;
export const dbInitialized = new Promise<void>((resolve) => {
  resolveDbInit = resolve;
});

function connectToDatabase() {
  db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      logger.error('Failed to connect to SQLite database:', err);
    } else {
      logger.info(`Connected to SQLite database at ${dbPath}`);
      db.run("PRAGMA foreign_keys = ON;");
      await initializeDatabase();
    }
  });
}

connectToDatabase();

// Helper to run queries as promises
export function dbRun(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        logger.error(`Database Error in dbRun: ${err}`);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function dbGet(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        logger.error(`Database Error in dbGet: ${err}`);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function dbAll(query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error(`Database Error in dbAll: ${err}`);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function initializeDatabase() {
  const sqlFilePath = path.join(process.cwd(), 'data', 'isiqalo.sql');
  if (fs.existsSync(sqlFilePath)) {
    try {
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // sqlite3 exec method handles multiple statements
      db.exec(sqlContent, (err) => {
        if (err) {
           logger.error('Error initializing database from file:', err);
        } else {
           logger.info('Database tables initialized successfully from isiqalo.sql');
        }
        resolveDbInit();
      });
    } catch (err) {
      logger.error('Error reading isiqalo.sql file:', err);
      resolveDbInit();
    }
  } else {
    logger.warn('isiqalo.sql not found in data directory');
    resolveDbInit();
  }
}
