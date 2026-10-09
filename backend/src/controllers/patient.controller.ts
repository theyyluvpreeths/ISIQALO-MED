import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PatientRepository, DocumentRepository, AuditLogRepository, PatientEntity, CaseCommentRepository, AuthPatientLinkRepository } from '../repositories/database.repositories';
import { encrypt, decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';
import fs from 'fs';
import { Request } from 'express';
import { Storage, signFileToken, verifyFileToken } from '../services/storage';

const isAdmin = (role: string) => role === 'admin' || role === 'superadmin';

const INLINE_MIME_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain; charset=utf-8',
};

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
        views_count: 0,
        downloads_count: 0,
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
      const files = (req.files as Express.Multer.File[]) || [];
      
      if (files.length === 0) {
        res.status(400).json({ error: 'No documents uploaded' });
        return;
      }

      if (req.user.role === 'patient' || req.user.role === 'viewer') {
        await PatientController.cleanupTempFiles(files);
        res.status(403).json({ error: 'Forbidden: Only practitioners can upload documents.' });
        return;
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();
      const uploadedDocIds: string[] = [];

      for (const file of files) {
        const docId = `doc-${crypto.randomBytes(4).toString('hex')}`;
        const fileExt = file.originalname.split('.').pop() || 'unknown';

        await Storage.uploadFile(file.filename, file.path);
        await fs.promises.unlink(file.path).catch(() => undefined);

        await DocumentRepository.createDocument({
          id: docId,
          patient_id: patientId,
          uploaded_by_doctor_id: req.user.id,
          file_name: file.originalname,
          file_type: fileExt,
          file_size: file.size,
          file_path_encrypted: encrypt(file.filename),
          uploaded_at: now
        });

        uploadedDocIds.push(docId);
      }

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'DOCUMENT_UPLOADED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Uploaded ${files.length} documents for patient: ${patientId}`,
        created_at: now
      });

      res.status(201).json({ message: 'Documents uploaded successfully', docIds: uploadedDocIds });
    } catch (error) {
      console.error('Upload documents error:', error);
      await PatientController.cleanupTempFiles((req.files as Express.Multer.File[]) || []);
      res.status(500).json({ error: 'Internal server error uploading documents.' });
    }
  }

  static async getDocumentUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { id, docId } = req.params;
      
      const docs = await DocumentRepository.getDocumentsByPatientId(id);
      const doc = docs.find(d => d.id === docId);
      
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      
      const fileKey = PatientController.safeDecrypt(doc.file_path_encrypted);
      if (!fileKey || fileKey === '[DECRYPTION_ERROR]') {
        res.status(500).json({ error: 'Failed to decrypt document path' });
        return;
      }

      await PatientRepository.incrementDownloads(id);

      // Same-origin signed link, streamed by serveFile — works behind Docker and any proxy
      const token = signFileToken({ docId, patientId: id, userId: req.user.id });
      res.status(200).json({ url: `/api/files/${token}` });
    } catch (error) {
      console.error('Fetch document URL error:', error);
      res.status(500).json({ error: 'Internal server error retrieving document URL.' });
    }
  }

  static async serveFile(req: Request, res: Response): Promise<void> {
    try {
      const payload = verifyFileToken(req.params.token);
      if (!payload) {
        res.status(403).json({ error: 'This document link is invalid or has expired.' });
        return;
      }

      const docs = await DocumentRepository.getDocumentsByPatientId(payload.patientId);
      const doc = docs.find(d => d.id === payload.docId);
      const fileKey = doc ? PatientController.safeDecrypt(doc.file_path_encrypted) : null;
      if (!doc || !fileKey || fileKey === '[DECRYPTION_ERROR]' || !(await Storage.exists(fileKey))) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const ext = (doc.file_type || '').toLowerCase();
      const inlineType = INLINE_MIME_TYPES[ext];
      const safeName = doc.file_name.replace(/[^\w.\- ]/g, '_');
      res.setHeader('Content-Type', inlineType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${inlineType ? 'inline' : 'attachment'}; filename="${safeName}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      // Uploaded content must never execute script, even when served inline
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");

      const { stream, contentLength } = await Storage.openStream(fileKey);
      if (contentLength !== undefined) res.setHeader('Content-Length', contentLength);
      stream.on('error', (err) => {
        console.error('Document stream error:', err);
        res.destroy(err);
      });
      stream.pipe(res);
    } catch (error) {
      console.error('Serve file error:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error retrieving document.' });
    }
  }

  private static async cleanupTempFiles(files: Express.Multer.File[]): Promise<void> {
    await Promise.all(files.map(f => fs.promises.unlink(f.path).catch(() => undefined)));
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
      viewsCount: p.views_count,
      downloadsCount: p.downloads_count,
      createdAt: p.created_at
    };
  }

  static async getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const filters = {
        organisationName: req.query.organisationName as string,
        medicineType: req.query.medicineType as string,
        medicalAid: req.query.medicalAid as string,
      };
      
      let patients;

      if (isAdmin(req.user.role) || req.user.role === 'viewer') {
        patients = await PatientRepository.getAllPatients(filters);
      } else if (req.user.role === 'patient') {
        // Patient only gets their linked cases
        const allPatients = await PatientRepository.getAllPatients(filters);
        const linkedIds = await AuthPatientLinkRepository.getLinkedPatientIds(req.user.id);
        patients = allPatients.filter(p => linkedIds.includes(p.id));
      } else {
        patients = await PatientRepository.getPatientsForDoctor(req.user.id, filters);
      }

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

      await PatientRepository.incrementViews(patientId);

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

  static async updatePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const patientId = req.params.id;
      const existingPatient = await PatientRepository.getPatientById(patientId);
      if (!existingPatient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const isAssigned = isAdmin(req.user.role) || await PatientRepository.isDoctorAssignedToPatient(req.user.id, patientId);
      if (!isAssigned) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const {
        organisationName, facilityType, medicineType, treatmentName, treatmentNotes,
        isPriority, sufferingFrom, existingInfo,
        firstName, lastName, idNumber, dob, gender,
        contact, medicalAid, medicalAidNumber
      } = req.body;

      const updates: Partial<PatientEntity> = {};

      if (organisationName !== undefined) updates.organisation_name = organisationName;
      if (facilityType !== undefined) updates.facility_type = facilityType;
      if (medicineType !== undefined) updates.medicine_type = medicineType;
      if (treatmentName !== undefined) updates.treatment_name = treatmentName;
      if (treatmentNotes !== undefined) updates.treatment_notes_encrypted = treatmentNotes ? encrypt(treatmentNotes) : null;
      if (isPriority !== undefined) updates.is_priority = isPriority ? 1 : 0;
      if (sufferingFrom !== undefined) updates.suffering_from = sufferingFrom;
      if (existingInfo !== undefined) updates.existing_info_encrypted = existingInfo ? encrypt(existingInfo) : null;
      if (firstName !== undefined) updates.first_name_encrypted = firstName ? encrypt(firstName) : null;
      if (lastName !== undefined) updates.last_name_encrypted = lastName ? encrypt(lastName) : null;
      if (idNumber !== undefined) updates.id_number_encrypted = idNumber ? encrypt(idNumber) : null;
      if (dob !== undefined) updates.dob = dob || null;
      if (gender !== undefined) updates.gender = gender || null;
      if (contact !== undefined) updates.contact_encrypted = contact ? encrypt(contact) : null;
      if (medicalAid !== undefined) updates.medical_aid = medicalAid || null;
      if (medicalAidNumber !== undefined) updates.medical_aid_number_encrypted = medicalAidNumber ? encrypt(medicalAidNumber) : null;

      await PatientRepository.updatePatient(patientId, updates);

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'PATIENT_UPDATED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Updated patient record: ${patientId}`,
        created_at: now
      });

      res.status(200).json({ message: 'Patient updated successfully.' });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({ error: 'Internal server error updating patient.' });
    }
  }

  static async deletePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const patientId = req.params.id;
      const existingPatient = await PatientRepository.getPatientById(patientId);
      if (!existingPatient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const isAssigned = isAdmin(req.user.role) || await PatientRepository.isDoctorAssignedToPatient(req.user.id, patientId);
      if (!isAssigned) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Fetch documents to delete from Blob Storage
      const docs = await DocumentRepository.getDocumentsByPatientId(patientId);
      for (const doc of docs) {
        const fileKey = PatientController.safeDecrypt(doc.file_path_encrypted);
        if (fileKey && fileKey !== '[DECRYPTION_ERROR]') {
          await Storage.deleteIfExists(fileKey).catch(err => console.error(`Failed to delete blob for ${doc.id}:`, err));
        }
      }

      await PatientRepository.deletePatient(patientId);

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'PATIENT_DELETED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Deleted patient record: ${patientId}`,
        created_at: now
      });

      res.status(200).json({ message: 'Patient deleted successfully.' });
    } catch (error) {
      console.error('Delete patient error:', error);
      res.status(500).json({ error: 'Internal server error deleting patient.' });
    }
  }

  static async getComments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const comments = await CaseCommentRepository.getCommentsByPatientId(patientId);
      res.status(200).json(comments);
    } catch (error) {
      console.error('Fetch comments error:', error);
      res.status(500).json({ error: 'Internal server error fetching comments.' });
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const { content } = req.body;
      const doctorId = req.user?.id;

      if (req.user?.role === 'viewer') {
        res.status(403).json({ error: 'Forbidden: Viewers cannot comment.' });
        return;
      }

      if (!doctorId || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'Missing required comment fields' });
        return;
      }

      const commentId = `com-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      await CaseCommentRepository.createComment({
        id: commentId,
        patient_id: patientId,
        doctor_id: doctorId,
        content: content.trim(),
        created_at: now
      });

      res.status(201).json({ message: 'Comment added', id: commentId });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  static async linkPatientRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (req.user.role !== 'patient') {
        res.status(403).json({ error: 'Only patient accounts can link to patient records.' });
        return;
      }

      const { idNumber } = req.body;
      if (!idNumber || typeof idNumber !== 'string') {
        res.status(400).json({ error: 'ID Number is required' });
        return;
      }

      const allPatients = await PatientRepository.getAllPatients();
      const matchedPatients = allPatients.filter(p => {
        const decId = PatientController.safeDecrypt(p.id_number_encrypted);
        return decId === idNumber.trim();
      });

      if (matchedPatients.length === 0) {
        res.status(404).json({ error: 'No records found matching this ID number.' });
        return;
      }

      for (const p of matchedPatients) {
        await AuthPatientLinkRepository.linkPatient(req.user.id, p.id);
      }

      res.status(200).json({ message: `Successfully linked ${matchedPatients.length} record(s).` });
    } catch (error) {
      console.error('Link patient record error:', error);
      res.status(500).json({ error: 'Failed to link patient record' });
    }
  }
}
