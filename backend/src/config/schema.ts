// Database schema — applied on every startup. All statements are idempotent.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  dob TEXT,
  medical_number TEXT,
  role TEXT NOT NULL DEFAULT 'practitioner',
  hpcsa_number TEXT,
  speciality TEXT,
  practice_name TEXT,
  practice_number TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'starter',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_otps (
  email TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pacs_patients (
  id TEXT PRIMARY KEY,
  organisation_name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  medicine_type TEXT NOT NULL,
  is_priority INTEGER NOT NULL DEFAULT 0,
  suffering_from TEXT NOT NULL,
  treatment_name TEXT NOT NULL,
  treatment_notes_encrypted TEXT,
  existing_info_encrypted TEXT,
  first_name_encrypted TEXT,
  last_name_encrypted TEXT,
  id_number_encrypted TEXT,
  dob TEXT,
  gender TEXT,
  contact_encrypted TEXT,
  medical_aid TEXT,
  medical_aid_number_encrypted TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pacs_patient_doctors (
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (patient_id, doctor_id),
  FOREIGN KEY (patient_id) REFERENCES pacs_patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_patient_links (
  user_id TEXT NOT NULL,
  pacs_patient_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, pacs_patient_id),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (pacs_patient_id) REFERENCES pacs_patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pacs_patient_documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  uploaded_by_doctor_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path_encrypted TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES pacs_patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pacs_case_comments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES pacs_patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pacs_extractions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  patient_ids TEXT NOT NULL,
  format TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  extracted_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_doctors_doctor ON pacs_patient_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON pacs_patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_comments_patient ON pacs_case_comments(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON private_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_extractions_user ON pacs_extractions(user_id, extracted_at);
`;
