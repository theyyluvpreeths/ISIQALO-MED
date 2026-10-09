import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import dotenv from 'dotenv';
import { SCHEMA_SQL } from './schema';

dotenv.config();

const dbPath = process.env.DB_DATABASE_PATH || path.resolve(__dirname, '../../data', 'isiqalo.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export let db: sqlite3.Database;

let resolveDbInit: () => void;
let rejectDbInit: (err: Error) => void;
export const dbInitialized = new Promise<void>((resolve, reject) => {
  resolveDbInit = resolve;
  rejectDbInit = reject;
});

function connectToDatabase() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error('Failed to connect to SQLite database:', err);
      rejectDbInit(err);
    } else {
      logger.info(`Connected to SQLite database at ${dbPath}`);
      initializeDatabase();
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

// Runs fn inside a transaction on a serialized connection so concurrent
// requests can't interleave statements into each other's transaction.
let txQueue: Promise<unknown> = Promise.resolve();
export function dbTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const run = txQueue.then(async () => {
    await dbRun('BEGIN IMMEDIATE TRANSACTION');
    try {
      const result = await fn();
      await dbRun('COMMIT');
      return result;
    } catch (error) {
      await dbRun('ROLLBACK').catch(() => undefined);
      throw error;
    }
  });
  txQueue = run.catch(() => undefined);
  return run;
}

function initializeDatabase() {
  // foreign_keys must be enabled per-connection; busy_timeout avoids SQLITE_BUSY under concurrent writes
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;\n${SCHEMA_SQL}`, (err) => {
    if (err) {
      logger.error('Error initializing database schema:', err);
      rejectDbInit(err);
    } else {
      logger.info('Database schema initialized');
      resolveDbInit();
    }
  });
}
