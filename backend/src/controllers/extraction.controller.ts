import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PatientRepository, ExtractionRepository, AuditLogRepository, DocumentRepository } from '../repositories/database.repositories';
import { decrypt } from '../services/encryption';
import { logSecurityEvent } from '../config/logger';
import PDFDocument from 'pdfkit';
import { BlobServiceClient } from '@azure/storage-blob';
const archiver = require('archiver');

const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
const CONTAINER_NAME = 'isiqalo-pacs-files';

export class ExtractionController {
  static async extractCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { patientIds, format } = req.body;
      if (!Array.isArray(patientIds) || patientIds.length === 0) {
        res.status(400).json({ error: 'Please select at least one patient to perform data extraction.' });
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

      const extractedData: any[] = [];

      for (const id of patientIds) {
        const p = await PatientRepository.getPatientById(id);
        
        // RBAC Check for extraction: Ensure doctor is assigned or is admin
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            const isAssigned = await PatientRepository.isDoctorAssignedToPatient(req.user.id, id);
            if (!isAssigned) continue; // skip patients they don't have access to
        }

        if (p) {
          const docs = await DocumentRepository.getDocumentsByPatientId(id);

          extractedData.push({
            id: p.id,
            organisationName: p.organisation_name,
            facilityType: p.facility_type,
            medicineType: p.medicine_type,
            isPriority: p.is_priority === 1,
            sufferingFrom: p.suffering_from,
            treatmentName: p.treatment_name,
            treatmentNotes: p.treatment_notes_encrypted ? decrypt(p.treatment_notes_encrypted) : null,
            existingInfo: p.existing_info_encrypted ? decrypt(p.existing_info_encrypted) : null,
            createdAt: p.created_at,
            documents: docs.map(d => ({ name: d.file_name, type: d.file_type, encryptedPath: d.file_path_encrypted }))
          });
        }
      }

      if (extractedData.length === 0) {
        res.status(404).json({ error: 'None of the requested patients were found or authorized.' });
        return;
      }

      // Log security audit logs
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'DATA_EXTRACTION',
        ip_address: ip,
        user_agent: userAgent,
        details: `Extracted ${extractedData.length} patient records in ${targetFormat} format. Patients: ${patientIds.join(', ')}`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'DATA_EXTRACTION', `Extracted ${extractedData.length} patient records in ${targetFormat} format.`, ip, userAgent);

      // Generate the payload based on format
      let payload: any = null;
      let contentType = 'application/json';
      let fileName = `isiqalo_pacs_extract_${Date.now()}`;

      if (targetFormat === 'JSON') {
        payload = JSON.stringify(extractedData, null, 2);
        contentType = 'application/json';
        fileName += '.json';
        const buffer = Buffer.from(payload);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.status(200).send(buffer);
      } else if (targetFormat === 'CSV') {
        const headers = 'Patient ID,Organisation,Facility Type,Medicine Category,Priority,Suffering From,Treatment Name,Documents Count,Date Created\n';
        const rows = extractedData.map(p => 
          `"${p.id}","${p.organisationName?.replace(/"/g, '""')}","${p.facilityType}","${p.medicineType}","${p.isPriority}","${p.sufferingFrom?.replace(/"/g, '""')}","${p.treatmentName?.replace(/"/g, '""')}","${p.documents.length}","${p.createdAt}"`
        ).join('\n');
        payload = headers + rows;
        contentType = 'text/csv';
        fileName += '.csv';
        const buffer = Buffer.from(payload);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.status(200).send(buffer);
      } else if (targetFormat === 'PDF') {
        const doc = new PDFDocument();
        const chunks: any[] = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        
        const pdfPromise = new Promise<void>((resolve) => {
          doc.on('end', () => {
            const resultBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}.pdf`);
            res.status(200).send(resultBuffer);
            resolve();
          });
        });

        doc.fontSize(20).text('ISIQALO MED - Patient Extraction Report', { align: 'center' });
        doc.moveDown(2);

        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

        let first = true;
        for (const p of extractedData) {
          if (!first) {
            doc.addPage();
          }
          first = false;
          await ExtractionController.appendPatientContentToPdf(p, doc, containerClient);
        }

        doc.end();
        await pdfPromise;
        return; // Response handled in 'end' event
        return; // Response handled in 'end' event
      } else {
        // ZIP extraction
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err: any) => {
          console.error('Archiver error:', err);
          if (!res.headersSent) res.status(500).json({ error: 'Failed to create zip archive.' });
        });

        archive.pipe(res);

        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

        for (const p of extractedData) {
          const folderName = `patient_${p.id}`;

          // Create a PDF report for this specific patient
          const doc = new PDFDocument();
          const pdfChunks: any[] = [];
          doc.on('data', chunk => pdfChunks.push(chunk));
          
          const pdfPromise = new Promise<void>((resolve) => {
            doc.on('end', () => {
              const pdfBuffer = Buffer.concat(pdfChunks);
              archive.append(pdfBuffer, { name: `${folderName}/Clinical_Report.pdf` });
              resolve();
            });
          });

          doc.fontSize(20).text('ISIQALO MED - Patient Clinical Report', { align: 'center' });
          doc.moveDown(2);
          
          await ExtractionController.appendPatientContentToPdf(p, doc, containerClient);
          
          doc.end();

          await pdfPromise;

          // Append raw documents
          for (const d of p.documents) {
            try {
              if (!d.encryptedPath) continue;
              const decryptedKey = decrypt(d.encryptedPath);
              const blockBlobClient = containerClient.getBlockBlobClient(decryptedKey);
              
              if (await blockBlobClient.exists()) {
                const downloadResponse = await blockBlobClient.download(0);
                if (downloadResponse.readableStreamBody) {
                  archive.append(downloadResponse.readableStreamBody as any, { name: `${folderName}/raw_files/${d.name}` });
                }
              }
            } catch (err) {
              console.error(`Failed to append file ${d.name} for patient ${p.id}`, err);
            }
          }
        }

        await archive.finalize();
        return; // Handled by archiver pipe
      }
    } catch (error) {
      console.error('Extraction error:', error);
      res.status(500).json({ error: 'Internal server error performing data extraction.' });
    }
  }

  static async getExtractionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const extractions = await ExtractionRepository.getExtractionsByUserId(req.user.id);
      res.status(200).json(extractions);
    } catch (error) {
      console.error('Fetch extraction history error:', error);
      res.status(500).json({ error: 'Internal server error retrieving extraction history.' });
    }
  }

  private static async appendPatientContentToPdf(p: any, doc: typeof PDFDocument, containerClient: any) {
    doc.fontSize(16).text(`Patient ID: ${p.id}`, { underline: true });
    doc.fontSize(12).text(`Organisation: ${p.organisationName}`);
    doc.text(`Condition: ${p.sufferingFrom}`);
    doc.text(`Treatment: ${p.treatmentName}`);
    if (p.treatmentNotes) doc.text(`Notes: ${p.treatmentNotes}`);
    if (p.existingInfo) doc.text(`History: ${p.existingInfo}`);
    
    if (p.documents && p.documents.length > 0) {
      doc.moveDown(0.5);
      doc.text(`Attached Documents: ${p.documents.map((d: any) => d.name).join(', ')}`);
      
      for (const d of p.documents) {
        if (d.type && ['png', 'jpg', 'jpeg'].includes(d.type.toLowerCase())) {
          try {
            if (!d.encryptedPath) continue;
            const decryptedKey = decrypt(d.encryptedPath);
            const blockBlobClient = containerClient.getBlockBlobClient(decryptedKey);
            if (await blockBlobClient.exists()) {
               const buffer = await blockBlobClient.downloadToBuffer();
               doc.addPage();
               doc.fontSize(14).text(`Attached Image: ${d.name}`, { underline: true });
               doc.moveDown();
               doc.image(buffer, { fit: [500, 500], align: 'center', valign: 'center' });
            }
          } catch (err) {
            console.error(`Failed to embed image ${d.name} for patient ${p.id}`, err);
          }
        }
      }
    }
    doc.moveDown(1.5);
  }
}
