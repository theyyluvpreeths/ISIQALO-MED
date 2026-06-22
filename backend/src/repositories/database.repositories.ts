import { dbRun, dbGet, dbAll } from '../config/database';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  hpcsa_number: string;
  speciality: string;
  practice_name: string;
  practice_number: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEntity {
  id: string;
  title: string;
  category: string;
  institution: string;
  summary_encrypted: string;
  tags: string; // Comma separated
  consent_obtained: number; // 0 or 1
  file_name: string | null;
  file_size: number | null;
  file_path_encrypted: string | null;
  uploaded_by_user_id: string;
  views_count: number;
  downloads_count: number;
  likes_count: number;
  created_at: string;
}

export interface ExtractionEntity {
  id: string;
  case_id: string;
  user_id: string;
  format: string;
  extracted_at: string;
}

export interface AuditLogEntity {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string;
  created_at: string;
}

export class UserRepository {
  static async createUser(user: UserEntity): Promise<void> {
    const query = `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role,
        hpcsa_number, speciality, practice_name, practice_number,
        subscription_plan, subscription_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      user.id, user.email, user.password_hash, user.first_name, user.last_name, user.role,
      user.hpcsa_number, user.speciality, user.practice_name, user.practice_number,
      user.subscription_plan, user.subscription_status, user.created_at, user.updated_at
    ]);
  }

  static async getUserById(id: string): Promise<UserEntity | null> {
    return await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async updateUser(id: string, updates: Partial<Omit<UserEntity, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    await dbRun(`UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`, [
      ...params.slice(0, -1),
      new Date().toISOString(),
      id
    ]);
  }
}

export class CaseRepository {
  static async createCase(caseData: Omit<CaseEntity, 'views_count' | 'downloads_count' | 'likes_count'>): Promise<void> {
    const query = `
      INSERT INTO cases (
        id, title, category, institution, summary_encrypted, tags,
        consent_obtained, file_name, file_size, file_path_encrypted,
        uploaded_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      caseData.id, caseData.title, caseData.category, caseData.institution,
      caseData.summary_encrypted, caseData.tags, caseData.consent_obtained,
      caseData.file_name, caseData.file_size, caseData.file_path_encrypted,
      caseData.uploaded_by_user_id, caseData.created_at
    ]);
  }

  static async getCaseById(id: string): Promise<CaseEntity | null> {
    return await dbGet('SELECT * FROM cases WHERE id = ?', [id]);
  }

  static async getAllCases(filters: { search?: string; category?: string; sort?: string } = {}): Promise<CaseEntity[]> {
    let query = 'SELECT * FROM cases';
    const params: any[] = [];
    const clauses: string[] = [];

    if (filters.category && filters.category !== 'All') {
      clauses.push('category = ?');
      params.push(filters.category);
    }

    if (filters.search) {
      clauses.push('(title LIKE ? OR institution LIKE ? OR tags LIKE ?)');
      const wild = `%${filters.search}%`;
      params.push(wild, wild, wild);
    }

    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(' AND ')}`;
    }

    if (filters.sort) {
      if (filters.sort === 'views') {
        query += ' ORDER BY views_count DESC';
      } else if (filters.sort === 'downloads') {
        query += ' ORDER BY downloads_count DESC';
      } else if (filters.sort === 'likes') {
        query += ' ORDER BY likes_count DESC';
      } else {
        query += ' ORDER BY created_at DESC'; // default to recent
      }
    } else {
      query += ' ORDER BY created_at DESC';
    }

    return await dbAll(query, params);
  }

  static async incrementViews(id: string): Promise<void> {
    await dbRun('UPDATE cases SET views_count = views_count + 1 WHERE id = ?', [id]);
  }

  static async incrementDownloads(id: string): Promise<void> {
    await dbRun('UPDATE cases SET downloads_count = downloads_count + 1 WHERE id = ?', [id]);
  }

  static async incrementLikes(id: string): Promise<void> {
    await dbRun('UPDATE cases SET likes_count = likes_count + 1 WHERE id = ?', [id]);
  }
}

export class ExtractionRepository {
  static async createExtraction(extraction: ExtractionEntity): Promise<void> {
    const query = `
      INSERT INTO extractions (id, case_id, user_id, format, extracted_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      extraction.id, extraction.case_id, extraction.user_id,
      extraction.format, extraction.extracted_at
    ]);
  }

  static async getExtractionsByUserId(userId: string): Promise<any[]> {
    const query = `
      SELECT e.*, c.title as case_title, c.category as case_category 
      FROM extractions e
      JOIN cases c ON e.case_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.extracted_at DESC
    `;
    return await dbAll(query, [userId]);
  }
}

export class AuditLogRepository {
  static async createAuditLog(log: AuditLogEntity): Promise<void> {
    const query = `
      INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      log.id, log.user_id, log.action, log.ip_address,
      log.user_agent, log.details, log.created_at
    ]);
  }

  static async getAuditLogsByUserId(userId: string): Promise<AuditLogEntity[]> {
    return await dbAll('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  static async getAllAuditLogs(): Promise<AuditLogEntity[]> {
    return await dbAll('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  }
}
