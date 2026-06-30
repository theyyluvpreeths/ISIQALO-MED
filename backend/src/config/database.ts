import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'isiqalo.db');

let resolveDbInit: () => void;
export const dbInitialized = new Promise<void>((resolve) => {
  resolveDbInit = resolve;
});

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Failed to connect to SQLite database:', err);
  } else {
    logger.info(`Connected to SQLite database at ${dbPath}`);
    initializeDatabase();
  }
});

// Helper to run queries as promises
export function dbRun(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
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
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function dbAll(query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function initializeDatabase() {
  db.serialize(async () => {
    // Enable Foreign Keys
    await dbRun('PRAGMA foreign_keys = ON;');

    // Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'practitioner',
        hpcsa_number TEXT UNIQUE,
        speciality TEXT,
        practice_name TEXT,
        practice_number TEXT,
        subscription_plan TEXT NOT NULL DEFAULT 'starter',
        subscription_status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Cases Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        institution TEXT NOT NULL,
        summary_encrypted TEXT NOT NULL,
        tags TEXT NOT NULL,
        consent_obtained INTEGER NOT NULL DEFAULT 0,
        patient_first_name_encrypted TEXT,
        patient_last_name_encrypted TEXT,
        patient_id_number_encrypted TEXT,
        patient_dob TEXT,
        patient_gender TEXT,
        patient_contact_encrypted TEXT,
        patient_medical_aid TEXT,
        patient_medical_aid_number_encrypted TEXT,
        file_name TEXT,
        file_size INTEGER,
        file_path_encrypted TEXT,
        uploaded_by_user_id TEXT NOT NULL,
        views_count INTEGER NOT NULL DEFAULT 0,
        downloads_count INTEGER NOT NULL DEFAULT 0,
        likes_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Extractions Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS extractions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        format TEXT NOT NULL,
        extracted_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Audit Logs Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    logger.info('Database tables initialized successfully');

    // Seed demo practitioner user if not already present
    const existingDemo = await dbGet('SELECT id FROM users WHERE id = ?', ['demo-practitioner-001']);
    if (!existingDemo) {
      const now = new Date().toISOString();
      await dbRun(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role,
          hpcsa_number, speciality, practice_name, practice_number,
          subscription_plan, subscription_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'demo-practitioner-001', 'dr.demo@isiqalo.co.za', 'demo-no-password',
        'Demo', 'Practitioner', 'practitioner',
        'MP1234567', 'General Medicine', 'Isiqalo Demo Practice', '1234567',
        'professional', 'active', now, now
      ]);
      logger.info('Demo practitioner user seeded into database');
    }

    resolveDbInit();
  });
}
