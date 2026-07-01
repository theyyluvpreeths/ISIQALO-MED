import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PatientRepository, DocumentRepository, AuditLogRepository, PatientEntity } from '../repositories/database.repositories';
import { encrypt, decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';

export class PatientController {
  static async createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        organisationName, facilityType, medicineType, treatmentName, treatmentNotes,
        isPriority, sufferingFrom, existingInfo,
        firstName, lastName, idNumber, dob, gender,
        contact, medicalAid, medicalAidNumber
      } = req.body;

      if (!organisationName || !facilityType || !medicineType || !sufferingFrom || !treatmentName) {
        res.status(400).json({ error: 'Missing required clinical fields' });
        return;
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();
      const patientId = `pat-${crypto.randomBytes(4).toString('hex')}`;

      const patientData: PatientEntity = {
        id: patientId,
        organisation_name: organisationName,
        facility_type: facilityType,
        medicine_type: medicineType,
        is_priority: isPriority ? 1 : 0,
        suffering_from: sufferingFrom,
        treatment_name: treatmentName,
        treatment_notes_encrypted: treatmentNotes ? encrypt(treatmentNotes) : null,
        existing_info_encrypted: existingInfo ? encrypt(existingInfo) : null,
        first_name_encrypted: firstName ? encrypt(firstName) : null,
        last_name_encrypted: lastName ? encrypt(lastName) : null,
        id_number_encrypted: idNumber ? encrypt(idNumber) : null,
        dob: dob || null,
        gender: gender || null,
        contact_encrypted: contact ? encrypt(contact) : null,
        medical_aid: medicalAid || null,
        medical_aid_number_encrypted: medicalAidNumber ? encrypt(medicalAidNumber) : null,
        created_at: now
      };

      // Create patient and implicitly assign the creating doctor
      await PatientRepository.createPatient(patientData, req.user.id);

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'PATIENT_CREATED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Created patient record: ${patientId}`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'PATIENT_CREATED', `Patient created: ${patientId}`, ip, userAgent);

      res.status(201).json({
        message: 'Patient registered successfully.',
        patientId
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ error: 'Internal server error creating patient.' });
    }
  }

  static async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const patientId = req.params.patientId || req.params.id;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No document uploaded' });
        return;
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();
      const docId = `doc-${crypto.randomBytes(4).toString('hex')}`;
      
      const fileExt = file.originalname.split('.').pop() || 'unknown';

      await DocumentRepository.createDocument({
        id: docId,
        patient_id: patientId,
        uploaded_by_doctor_id: req.user.id,
        file_name: file.originalname,
        file_type: fileExt,
        file_size: file.size,
        file_path_encrypted: encrypt(file.path),
        uploaded_at: now
      });

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'DOCUMENT_UPLOADED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Uploaded ${fileExt} document for patient: ${patientId}`,
        created_at: now
      });

      res.status(201).json({ message: 'Document uploaded successfully', docId });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Internal server error uploading document.' });
    }
  }

  private static safeDecrypt(encrypted: string | null): string | null {
    if (!encrypted) return null;
    try {
      return decrypt(encrypted);
    } catch {
      return '[DECRYPTION_ERROR]';
    }
  }

  private static mapPatientToResponse(p: PatientEntity) {
    return {
      id: p.id,
      organisationName: p.organisation_name,
      facilityType: p.facility_type,
      medicineType: p.medicine_type,
      isPriority: p.is_priority === 1,
      sufferingFrom: p.suffering_from,
      treatmentName: p.treatment_name,
      treatmentNotes: PatientController.safeDecrypt(p.treatment_notes_encrypted),
      existingInfo: PatientController.safeDecrypt(p.existing_info_encrypted),
      firstName: PatientController.safeDecrypt(p.first_name_encrypted),
      lastName: PatientController.safeDecrypt(p.last_name_encrypted),
      idNumber: PatientController.safeDecrypt(p.id_number_encrypted),
      dob: p.dob,
      gender: p.gender,
      contact: PatientController.safeDecrypt(p.contact_encrypted),
      medicalAid: p.medical_aid,
      medicalAidNumber: PatientController.safeDecrypt(p.medical_aid_number_encrypted),
      createdAt: p.created_at
    };
  }

  static async getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const patients = await PatientRepository.getPatientsForDoctor(req.user.id);
      const decrypted = patients.map(p => PatientController.mapPatientToResponse(p));
      res.status(200).json(decrypted);
    } catch (error) {
      console.error('Fetch patients error:', error);
      res.status(500).json({ error: 'Internal server error retrieving patients.' });
    }
  }

  static async getPatientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.patientId || req.params.id;
      const patient = await PatientRepository.getPatientById(patientId);

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const docs = await DocumentRepository.getDocumentsByPatientId(patientId);
      
      const response = {
        ...PatientController.mapPatientToResponse(patient),
        documents: docs.map(d => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          fileSize: d.file_size,
          uploadedAt: d.uploaded_at
        }))
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch single patient error:', error);
      res.status(500).json({ error: 'Internal server error retrieving patient details.' });
    }
  }
}
