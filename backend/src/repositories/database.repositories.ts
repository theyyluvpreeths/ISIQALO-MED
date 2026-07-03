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

export interface PatientEntity {
  id: string;
  organisation_name: string;
  facility_type: string;
  medicine_type: string;
  is_priority: number;
  suffering_from: string;
  treatment_name: string;
  treatment_notes_encrypted: string | null;
  existing_info_encrypted: string | null;
  first_name_encrypted: string | null;
  last_name_encrypted: string | null;
  id_number_encrypted: string | null;
  dob: string | null;
  gender: string | null;
  contact_encrypted: string | null;
  medical_aid: string | null;
  medical_aid_number_encrypted: string | null;
  views_count: number;
  downloads_count: number;
  created_at: string;
}

export interface PatientDocumentEntity {
  id: string;
  patient_id: string;
  uploaded_by_doctor_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path_encrypted: string;
  uploaded_at: string;
}

export interface ExtractionEntity {
  id: string;
  patient_id: string;
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

export interface CaseCommentEntity {
  id: string;
  patient_id: string;
  doctor_id: string;
  content: string;
  created_at: string;
}

export interface PrivateMessageEntity {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: number;
  created_at: string;
}

export class UserRepository {
  static async createUser(user: UserEntity): Promise<void> {
    const query = `
      INSERT INTO auth_users (
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
    return await dbGet('SELECT * FROM auth_users WHERE id = ?', [id]);
  }

  static async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await dbGet('SELECT * FROM auth_users WHERE email = ?', [email]);
  }

  static async updateUser(id: string, updates: Partial<Omit<UserEntity, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    await dbRun(`UPDATE auth_users SET ${setClause}, updated_at = ? WHERE id = ?`, [
      ...params.slice(0, -1),
      new Date().toISOString(),
      id
    ]);
  }
}

export class PatientRepository {
  static async createPatient(patient: PatientEntity, doctorId: string): Promise<void> {
    const query = `
      INSERT INTO pacs_patients (
        id, organisation_name, facility_type, medicine_type, is_priority, suffering_from,
        treatment_name, treatment_notes_encrypted, existing_info_encrypted,
        first_name_encrypted, last_name_encrypted, id_number_encrypted, dob, gender,
        contact_encrypted, medical_aid, medical_aid_number_encrypted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      patient.id, patient.organisation_name, patient.facility_type, patient.medicine_type,
      patient.is_priority, patient.suffering_from, patient.treatment_name, patient.treatment_notes_encrypted,
      patient.existing_info_encrypted, patient.first_name_encrypted, patient.last_name_encrypted,
      patient.id_number_encrypted, patient.dob, patient.gender, patient.contact_encrypted,
      patient.medical_aid, patient.medical_aid_number_encrypted, patient.created_at
    ]);

    // Map doctor to patient
    await dbRun(`INSERT INTO pacs_patient_doctors (patient_id, doctor_id, assigned_at) VALUES (?, ?, ?)`, [
      patient.id, doctorId, patient.created_at
    ]);
  }

  static async getPatientById(id: string): Promise<PatientEntity | null> {
    return await dbGet('SELECT * FROM pacs_patients WHERE id = ?', [id]);
  }

  static async getPatientsForDoctor(doctorId: string): Promise<PatientEntity[]> {
    const query = `
      SELECT p.* FROM pacs_patients p
      INNER JOIN pacs_patient_doctors pd ON p.id = pd.patient_id
      WHERE pd.doctor_id = ?
      ORDER BY p.is_priority DESC, p.created_at DESC
    `;
    return await dbAll(query, [doctorId]);
  }

  static async getAllPatients(): Promise<PatientEntity[]> {
    const query = `SELECT * FROM pacs_patients ORDER BY is_priority DESC, created_at DESC`;
    return await dbAll(query);
  }

  static async isDoctorAssignedToPatient(doctorId: string, patientId: string): Promise<boolean> {
    const result = await dbGet('SELECT 1 FROM pacs_patient_doctors WHERE doctor_id = ? AND patient_id = ?', [doctorId, patientId]);
    return !!result;
  }
  
  static async updatePatient(id: string, updates: Partial<Omit<PatientEntity, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    await dbRun(`UPDATE pacs_patients SET ${setClause} WHERE id = ?`, params);
  }

  static async deletePatient(id: string): Promise<void> {
    await dbRun('DELETE FROM pacs_patients WHERE id = ?', [id]);
  }

  static async incrementViews(id: string): Promise<void> {
    await dbRun('UPDATE pacs_patients SET views_count = views_count + 1 WHERE id = ?', [id]);
  }

  static async incrementDownloads(id: string): Promise<void> {
    await dbRun('UPDATE pacs_patients SET downloads_count = downloads_count + 1 WHERE id = ?', [id]);
  }
}

export class DocumentRepository {
  static async createDocument(doc: PatientDocumentEntity): Promise<void> {
    const query = `
      INSERT INTO pacs_patient_documents (
        id, patient_id, uploaded_by_doctor_id, file_name, file_type, file_size, file_path_encrypted, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      doc.id, doc.patient_id, doc.uploaded_by_doctor_id, doc.file_name, doc.file_type, doc.file_size, doc.file_path_encrypted, doc.uploaded_at
    ]);
  }

  static async getDocumentsByPatientId(patientId: string): Promise<PatientDocumentEntity[]> {
    return await dbAll('SELECT * FROM pacs_patient_documents WHERE patient_id = ? ORDER BY uploaded_at DESC', [patientId]);
  }
}

export class ExtractionRepository {
  static async getExtractionsByUserId(userId: string): Promise<any[]> {
    // Left as stub since extraction functionality will need total rewrite
    return [];
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

export class CaseCommentRepository {
  static async createComment(comment: CaseCommentEntity): Promise<void> {
    const query = `INSERT INTO pacs_case_comments (id, patient_id, doctor_id, content, created_at) VALUES (?, ?, ?, ?, ?)`;
    await dbRun(query, [comment.id, comment.patient_id, comment.doctor_id, comment.content, comment.created_at]);
  }

  static async getCommentsByPatientId(patientId: string): Promise<any[]> {
    const query = `
      SELECT c.*, u.first_name, u.last_name, u.role
      FROM pacs_case_comments c
      INNER JOIN auth_users u ON c.doctor_id = u.id
      WHERE c.patient_id = ?
      ORDER BY c.created_at ASC
    `;
    return await dbAll(query, [patientId]);
  }
}

export class ChatRepository {
  static async createMessage(message: PrivateMessageEntity): Promise<void> {
    const query = `INSERT INTO private_messages (id, sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
    await dbRun(query, [message.id, message.sender_id, message.receiver_id, message.content, message.is_read, message.created_at]);
  }

  static async getMessagesBetweenUsers(user1Id: string, user2Id: string): Promise<PrivateMessageEntity[]> {
    const query = `
      SELECT m.*, s.first_name as sender_first_name, s.last_name as sender_last_name
      FROM private_messages m
      INNER JOIN auth_users s ON m.sender_id = s.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `;
    return await dbAll(query, [user1Id, user2Id, user2Id, user1Id]);
  }

  static async getAllUsersForChat(): Promise<any[]> {
    return await dbAll('SELECT id, first_name, last_name, role, email FROM auth_users ORDER BY first_name ASC');
  }

  static async getAllMessagesAdmin(): Promise<any[]> {
    const query = `
      SELECT m.*, 
             s.first_name as sender_first_name, s.last_name as sender_last_name,
             r.first_name as receiver_first_name, r.last_name as receiver_last_name
      FROM private_messages m
      INNER JOIN auth_users s ON m.sender_id = s.id
      INNER JOIN auth_users r ON m.receiver_id = r.id
      ORDER BY m.created_at DESC LIMIT 500
    `;
    return await dbAll(query);
  }
}
