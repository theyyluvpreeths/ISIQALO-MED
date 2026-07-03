import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PatientRepository, DocumentRepository, AuditLogRepository, PatientEntity, CaseCommentRepository } from '../repositories/database.repositories';
import { encrypt, decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';
import fs from 'fs';
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';

const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
const CONTAINER_NAME = 'isiqalo-pacs-files';

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
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No documents uploaded' });
        return;
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      await containerClient.createIfNotExists();

      const uploadedDocIds: string[] = [];

      for (const file of files) {
        const docId = `doc-${crypto.randomBytes(4).toString('hex')}`;
        const fileExt = file.originalname.split('.').pop() || 'unknown';

        const blockBlobClient = containerClient.getBlockBlobClient(file.filename);
        await blockBlobClient.uploadFile(file.path);
        await fs.promises.unlink(file.path);

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
      if (!fileKey) {
        res.status(500).json({ error: 'Failed to decrypt document path' });
        return;
      }

      await PatientRepository.incrementDownloads(id);

      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
      
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.valueOf() + 3600 * 1000); // 1 hour
      
      const permissions = new BlobSASPermissions();
      permissions.read = true;
      
      const url = await blockBlobClient.generateSasUrl({
        permissions,
        startsOn,
        expiresOn
      });
      
      res.status(200).json({ url });
    } catch (error) {
      console.error('Fetch document URL error:', error);
      res.status(500).json({ error: 'Internal server error retrieving document URL.' });
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
      
      let patients;
      if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'viewer') {
        patients = await PatientRepository.getAllPatients();
      } else {
        patients = await PatientRepository.getPatientsForDoctor(req.user.id);
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

      const isAssigned = await PatientRepository.isDoctorAssignedToPatient(req.user.id, patientId);
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

      const isAssigned = await PatientRepository.isDoctorAssignedToPatient(req.user.id, patientId);
      if (!isAssigned) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Fetch documents to delete from Blob Storage
      const docs = await DocumentRepository.getDocumentsByPatientId(patientId);
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

      for (const doc of docs) {
        const fileKey = PatientController.safeDecrypt(doc.file_path_encrypted);
        if (fileKey) {
          const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
          await blockBlobClient.deleteIfExists();
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
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const patientId = req.params.id;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Comment content is required' });
        return;
      }

      const commentId = `cmt-${crypto.randomBytes(4).toString('hex')}`;
      
      await CaseCommentRepository.createComment({
        id: commentId,
        patient_id: patientId,
        doctor_id: req.user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
      });

      res.status(201).json({ message: 'Comment added successfully', commentId });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Internal server error adding comment.' });
    }
  }
}
