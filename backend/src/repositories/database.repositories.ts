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

export class UserRepository {
  static async createUser(user: UserEntity): Promise<void> {
    const query = `
      INSERT INTO auth.users (
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
    return await dbGet('SELECT * FROM auth.users WHERE id = ?', [id]);
  }

  static async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await dbGet('SELECT * FROM auth.users WHERE email = ?', [email]);
  }

  static async updateUser(id: string, updates: Partial<Omit<UserEntity, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    await dbRun(`UPDATE auth.users SET ${setClause}, updated_at = ? WHERE id = ?`, [
      ...params.slice(0, -1),
      new Date().toISOString(),
      id
    ]);
  }
}

export class PatientRepository {
  static async createPatient(patient: PatientEntity, doctorId: string): Promise<void> {
    const query = `
      INSERT INTO pacs.patients (
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
    await dbRun(`INSERT INTO pacs.patient_doctors (patient_id, doctor_id, assigned_at) VALUES (?, ?, ?)`, [
      patient.id, doctorId, patient.created_at
    ]);
  }

  static async getPatientById(id: string): Promise<PatientEntity | null> {
    return await dbGet('SELECT * FROM pacs.patients WHERE id = ?', [id]);
  }

  static async getPatientsForDoctor(doctorId: string): Promise<PatientEntity[]> {
    const query = `
      SELECT p.* FROM pacs.patients p
      INNER JOIN pacs.patient_doctors pd ON p.id = pd.patient_id
      WHERE pd.doctor_id = ?
      ORDER BY p.is_priority DESC, p.created_at DESC
    `;
    return await dbAll(query, [doctorId]);
  }

  static async isDoctorAssignedToPatient(doctorId: string, patientId: string): Promise<boolean> {
    const result = await dbGet('SELECT 1 FROM pacs.patient_doctors WHERE doctor_id = ? AND patient_id = ?', [doctorId, patientId]);
    return !!result;
  }
  
  static async updatePatient(id: string, updates: Partial<Omit<PatientEntity, 'id' | 'created_at'>>): Promise<void> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    await dbRun(`UPDATE pacs.patients SET ${setClause} WHERE id = ?`, params);
  }
}

export class DocumentRepository {
  static async createDocument(doc: PatientDocumentEntity): Promise<void> {
    const query = `
      INSERT INTO pacs.patient_documents (
        id, patient_id, uploaded_by_doctor_id, file_name, file_type, file_size, file_path_encrypted, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      doc.id, doc.patient_id, doc.uploaded_by_doctor_id, doc.file_name, doc.file_type, doc.file_size, doc.file_path_encrypted, doc.uploaded_at
    ]);
  }

  static async getDocumentsByPatientId(patientId: string): Promise<PatientDocumentEntity[]> {
    return await dbAll('SELECT * FROM pacs.patient_documents WHERE patient_id = ? ORDER BY uploaded_at DESC', [patientId]);
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
      INSERT INTO audit.logs (id, user_id, action, ip_address, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(query, [
      log.id, log.user_id, log.action, log.ip_address,
      log.user_agent, log.details, log.created_at
    ]);
  }

  static async getAuditLogsByUserId(userId: string): Promise<AuditLogEntity[]> {
    return await dbAll('SELECT * FROM audit.logs WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  static async getAllAuditLogs(): Promise<AuditLogEntity[]> {
    return await dbAll('SELECT TOP 100 * FROM audit.logs ORDER BY created_at DESC');
  }
}
