import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthController } from '../controllers/auth.controller';
import { PatientController } from '../controllers/patient.controller';
import { ExtractionController } from '../controllers/extraction.controller';
import { SettingsController } from '../controllers/settings.controller';
import { ChatController } from '../controllers/chat.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { authorizePatientAccess } from '../middleware/patient-access.middleware';
import { validate, settingsUpdateSchema } from '../middleware/validator.middleware';
import { authLimiter, generalLimiter, extractionLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Apply general rate limiting to all API routes
router.use(generalLimiter);

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB maximum file limit for STL, XRAY, DCM etc.
  },
  fileFilter: (req, file, cb) => {
    // Accept STL, DCM, XRAY, PDF, TXT, and images for medical attachment records
    const allowedTypes = /stl|dcm|xray|pdf|txt|png|jpeg|jpg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Some formats don't have standard mimetypes easily matched, so rely mostly on extension for the heavy types, but ideally check both.
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only medical files (.stl, .dcm, .xray, .pdf, .txt) and images are allowed.'));
    }
  }
});

// Authentication routes
router.post('/auth/login', authLimiter, AuthController.login as any);
router.post('/auth/register/patient', authLimiter, AuthController.registerPatient as any);
router.post('/auth/register/practitioner', authLimiter, AuthController.registerPractitioner as any);
router.get('/auth/me', authenticateJWT as any, AuthController.me as any);

// Medical Patients routes 
router.post('/patients', authenticateJWT as any, PatientController.createPatient as any);
router.get('/patients', authenticateJWT as any, PatientController.getPatients as any);
router.post('/patients/link', authenticateJWT as any, PatientController.linkPatientRecord as any);

// Patient Specific Routes - guarded by authorizePatientAccess
router.get('/patients/:id', authenticateJWT as any, authorizePatientAccess as any, PatientController.getPatientById as any);
router.put('/patients/:id', authenticateJWT as any, authorizePatientAccess as any, PatientController.updatePatient as any);
router.delete('/patients/:id', authenticateJWT as any, authorizePatientAccess as any, PatientController.deletePatient as any);
router.post('/patients/:id/documents', authenticateJWT as any, authorizePatientAccess as any, upload.array('files', 10), PatientController.uploadDocument as any);
router.get('/patients/:id/documents/:docId/url', authenticateJWT as any, authorizePatientAccess as any, PatientController.getDocumentUrl as any);
router.get('/patients/:id/comments', authenticateJWT as any, authorizePatientAccess as any, PatientController.getComments as any);
router.post('/patients/:id/comments', authenticateJWT as any, authorizePatientAccess as any, PatientController.addComment as any);

// Private Chats Routes
router.get('/chats/users', authenticateJWT as any, ChatController.getChatUsers as any);
router.get('/chats/:userId', authenticateJWT as any, ChatController.getMessages as any);
router.post('/chats/:userId', authenticateJWT as any, ChatController.sendMessage as any);

// Data Extraction & Reporting routes
router.post('/extract', authenticateJWT as any, extractionLimiter, ExtractionController.extractCases as any);
router.get('/extract/history', authenticateJWT as any, ExtractionController.getExtractionHistory as any);

// Practitioner Settings routes
router.put('/settings/profile', authenticateJWT as any, validate(settingsUpdateSchema), SettingsController.updateProfile as any);
router.get('/settings/audit-logs', authenticateJWT as any, SettingsController.getAuditLogs as any);
router.put('/settings/subscription', authenticateJWT as any, SettingsController.changeSubscription as any);

export default router;
