import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CaseRepository, ExtractionRepository, AuditLogRepository } from '../repositories/database.repositories';
import { decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';

export class ExtractionController {
  static async extractCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { caseIds, format } = req.body;
      if (!Array.isArray(caseIds) || caseIds.length === 0) {
        res.status(400).json({ error: 'Please select at least one medical case to perform data extraction.' });
        return;
      }

      const targetFormat = (format || 'JSON').toUpperCase();
      if (!['JSON', 'CSV', 'PDF', 'ZIP'].includes(targetFormat)) {
        res.status(400).json({ error: 'Invalid extraction format. Supported formats: JSON, CSV, PDF, ZIP.' });
        return;
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();

      const extractedCasesData: any[] = [];

      for (const id of caseIds) {
        const c = await CaseRepository.getCaseById(id);
        if (c) {
          // Increment download counters
          await CaseRepository.incrementDownloads(id);

          const summaryDecrypted = decrypt(c.summary_encrypted);
          extractedCasesData.push({
            id: c.id,
            title: c.title,
            category: c.category,
            institution: c.institution,
            summary: summaryDecrypted,
            tags: c.tags,
            createdAt: c.created_at,
          });

          // Insert into extractions tracking table
          await ExtractionRepository.createExtraction({
            id: crypto.randomUUID(),
            case_id: id,
            user_id: req.user.id,
            format: targetFormat,
            extracted_at: now
          });
        }
      }

      if (extractedCasesData.length === 0) {
        res.status(404).json({ error: 'None of the requested cases were found.' });
        return;
      }

      // Log security audit logs
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'DATA_EXTRACTION',
        ip_address: ip,
        user_agent: userAgent,
        details: `Extracted ${extractedCasesData.length} records in ${targetFormat} format. Cases: ${caseIds.join(', ')}`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'DATA_EXTRACTION', `Extracted ${extractedCasesData.length} records in ${targetFormat} format.`, ip, userAgent);

      // Generate the payload based on format
      let payload: any = null;
      let contentType = 'application/json';
      let fileName = `isiqalo_extract_${Date.now()}`;

      if (targetFormat === 'JSON') {
        payload = JSON.stringify(extractedCasesData, null, 2);
        contentType = 'application/json';
        fileName += '.json';
      } else if (targetFormat === 'CSV') {
        const headers = 'Case ID,Title,Category,Institution,Summary,Tags,Date Created\n';
        const rows = extractedCasesData.map(c => 
          `"${c.id}","${c.title.replace(/"/g, '""')}","${c.category.replace(/"/g, '""')}","${c.institution.replace(/"/g, '""')}","${c.summary.replace(/"/g, '""')}","${c.tags.replace(/"/g, '""')}","${c.createdAt}"`
        ).join('\n');
        payload = headers + rows;
        contentType = 'text/csv';
        fileName += '.csv';
      } else {
        // PDF & ZIP Mock downloads (return a mock file buffer with summary details)
        payload = JSON.stringify({
          info: `Mock ${targetFormat} binary generation for medical compliance.`,
          totalRecords: extractedCasesData.length,
          generatedAt: now,
          records: extractedCasesData
        }, null, 2);
        contentType = 'application/json';
        fileName += '.json';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(payload);
    } catch (error) {
      console.error('Data extraction error:', error);
      res.status(500).json({ error: 'Internal server error during data extraction.' });
    }
  }

  static async getExtractionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const history = await ExtractionRepository.getExtractionsByUserId(req.user.id);
      res.status(200).json(history);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error retrieving history.' });
    }
  }
}
