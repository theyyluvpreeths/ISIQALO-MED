import * as sql from 'mssql';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'password123!',
  database: process.env.DB_DATABASE || 'isiqalo',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Use true for Azure, false for local
    trustServerCertificate: true, // Often needed for local development
  },
};

export let db: sql.ConnectionPool;

let resolveDbInit: () => void;
export const dbInitialized = new Promise<void>((resolve) => {
  resolveDbInit = resolve;
});

async function connectToDatabase() {
  try {
    db = await sql.connect(dbConfig);
    logger.info(`Connected to MSSQL database on ${dbConfig.server}`);
    await initializeDatabase();
  } catch (err) {
    logger.error('Failed to connect to MSSQL database:', err);
  }
}

connectToDatabase();

function convertQuery(query: string, params: any[]) {
  let q = query;
  const request = new sql.Request(db);
  for (let i = 0; i < params.length; i++) {
    // Replace the first occurrence of '?' with '@p{i}'
    q = q.replace('?', `@p${i}`);
    request.input(`p${i}`, params[i]);
  }
  return { q, request };
}

// Helper to run queries as promises
export async function dbRun(query: string, params: any[] = []): Promise<any> {
  const { q, request } = convertQuery(query, params);
  try {
    const result = await request.query(q);
    return { lastID: null, changes: result.rowsAffected[0] || 0 };
  } catch (error) {
    logger.error(`Database Error in dbRun: ${error}`);
    throw error;
  }
}

export async function dbGet(query: string, params: any[] = []): Promise<any> {
  const { q, request } = convertQuery(query, params);
  try {
    const result = await request.query(q);
    return result.recordset[0] || null;
  } catch (error) {
    logger.error(`Database Error in dbGet: ${error}`);
    throw error;
  }
}

export async function dbAll(query: string, params: any[] = []): Promise<any[]> {
  const { q, request } = convertQuery(query, params);
  try {
    const result = await request.query(q);
    return result.recordset;
  } catch (error) {
    logger.error(`Database Error in dbAll: ${error}`);
    throw error;
  }
}

async function initializeDatabase() {
  const sqlFilePath = path.join(process.cwd(), 'data', 'isiqalo.sql');
  if (fs.existsSync(sqlFilePath)) {
    try {
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      const request = new sql.Request(db);
      await request.query(sqlContent);
      logger.info('Database tables initialized successfully from isiqalo.sql');
    } catch (err) {
      logger.error('Error initializing database from file:', err);
    }
  } else {
    logger.warn('isiqalo.sql not found in data directory');
  }

  resolveDbInit();
}
