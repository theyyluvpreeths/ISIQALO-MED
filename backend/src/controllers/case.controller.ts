import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CaseRepository, AuditLogRepository, CaseEntity } from '../repositories/database.repositories';
import { encrypt, decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';

export class CaseController {
  static async createCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        title, category, institution, summary, tags, consentObtained,
        patientFirstName, patientLastName, patientIdNumber,
        patientDob, patientGender, patientContact,
        patientMedicalAid, patientMedicalAidNumber
      } = req.body;
      const file = req.file; // Handle files optionally

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();
      const caseId = `case-${crypto.randomBytes(4).toString('hex')}`;

      // Encrypt the sensitive abstract/summary
      const summaryEncrypted = encrypt(summary);

      // Encrypt patient PII fields
      const patientFirstNameEncrypted = patientFirstName ? encrypt(patientFirstName) : null;
      const patientLastNameEncrypted = patientLastName ? encrypt(patientLastName) : null;
      const patientIdNumberEncrypted = patientIdNumber ? encrypt(patientIdNumber) : null;
      const patientContactEncrypted = patientContact ? encrypt(patientContact) : null;
      const patientMedicalAidNumberEncrypted = patientMedicalAidNumber ? encrypt(patientMedicalAidNumber) : null;

      // Handle file metadata encryption if present
      let fileName = null;
      let fileSize = null;
      let filePathEncrypted = null;

      if (file) {
        fileName = file.originalname;
        fileSize = file.size;
        filePathEncrypted = encrypt(file.path);
      }

      const caseData: Omit<CaseEntity, 'views_count' | 'downloads_count' | 'likes_count'> = {
        id: caseId,
        title,
        category,
        institution,
        summary_encrypted: summaryEncrypted,
        tags,
        consent_obtained: consentObtained ? 1 : 0,
        patient_first_name_encrypted: patientFirstNameEncrypted,
        patient_last_name_encrypted: patientLastNameEncrypted,
        patient_id_number_encrypted: patientIdNumberEncrypted,
        patient_dob: patientDob || null,
        patient_gender: patientGender || null,
        patient_contact_encrypted: patientContactEncrypted,
        patient_medical_aid: patientMedicalAid || null,
        patient_medical_aid_number_encrypted: patientMedicalAidNumberEncrypted,
        file_name: fileName,
        file_size: fileSize,
        file_path_encrypted: filePathEncrypted,
        uploaded_by_user_id: req.user.id,
        created_at: now
      };

      await CaseRepository.createCase(caseData);

      // Log security audit log for creation
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'CASE_CREATED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Created medical case record: ${caseId} (${title})`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'CASE_CREATED', `Case created successfully: ${caseId}`, ip, userAgent);

      res.status(201).json({
        message: 'Medical case uploaded successfully and encrypted at rest.',
        caseId,
        title
      });
    } catch (error) {
      console.error('Create case error:', error);
      res.status(500).json({ error: 'Internal server error uploading case.' });
    }
  }

  /** Helper to safely decrypt a field, returning null on failure */
  private static safeDecrypt(encrypted: string | null): string | null {
    if (!encrypted) return null;
    try {
      return decrypt(encrypted);
    } catch {
      return '[DECRYPTION_ERROR]';
    }
  }

  /** Map a raw CaseEntity row to the decrypted API response shape */
  private static mapCaseToResponse(c: CaseEntity) {
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      institution: c.institution,
      summary: CaseController.safeDecrypt(c.summary_encrypted) || '[CORRUPTED DATA]',
      tags: c.tags,
      consentObtained: c.consent_obtained === 1,
      patientFirstName: CaseController.safeDecrypt(c.patient_first_name_encrypted),
      patientLastName: CaseController.safeDecrypt(c.patient_last_name_encrypted),
      patientIdNumber: CaseController.safeDecrypt(c.patient_id_number_encrypted),
      patientDob: c.patient_dob,
      patientGender: c.patient_gender,
      patientContact: CaseController.safeDecrypt(c.patient_contact_encrypted),
      patientMedicalAid: c.patient_medical_aid,
      patientMedicalAidNumber: CaseController.safeDecrypt(c.patient_medical_aid_number_encrypted),
      fileName: c.file_name,
      fileSize: c.file_size,
      uploadedByUserId: c.uploaded_by_user_id,
      viewsCount: c.views_count,
      downloadsCount: c.downloads_count,
      likesCount: c.likes_count,
      createdAt: c.created_at
    };
  }

  static async getCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { search, category, sort } = req.query;
      
      const cases = await CaseRepository.getAllCases({
        search: search as string,
        category: category as string,
        sort: sort as string
      });

      // Decrypt summaries and patient PII for return
      const decryptedCases = cases.map(c => CaseController.mapCaseToResponse(c));

      res.status(200).json(decryptedCases);
    } catch (error) {
      console.error('Fetch cases error:', error);
      res.status(500).json({ error: 'Internal server error retrieving cases.' });
    }
  }

  static async getCaseById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const c = await CaseRepository.getCaseById(id);

      if (!c) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      // Increment views count
      await CaseRepository.incrementViews(id);

      const caseDetails = {
        ...CaseController.mapCaseToResponse(c),
        viewsCount: c.views_count + 1, // reflect the increment
      };

      res.status(200).json(caseDetails);
    } catch (error) {
      console.error('Fetch single case error:', error);
      res.status(500).json({ error: 'Internal server error retrieving case details.' });
    }
  }

  static async likeCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await CaseRepository.incrementLikes(id);
      res.status(200).json({ message: 'Case liked successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error liking case.' });
    }
  }
}
