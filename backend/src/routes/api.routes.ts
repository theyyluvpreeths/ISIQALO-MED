import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthController } from '../controllers/auth.controller';
import { PatientController } from '../controllers/patient.controller';
import { ExtractionController } from '../controllers/extraction.controller';
import { SettingsController } from '../controllers/settings.controller';
import { ChatController } from '../controllers/chat.controller';
import { demoAuth } from '../middleware/demo-auth.middleware';
import { authorizePatientAccess } from '../middleware/patient-access.middleware';
import { validate, registerSchema, loginSchema, settingsUpdateSchema } from '../middleware/validator.middleware';
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

// ──────────────────────────────────────────────────
// DEMO MODE: All routes use demoAuth (no login needed)
// For production, swap demoAuth → authenticateJWT
// ──────────────────────────────────────────────────

// Authentication routes
router.post('/auth/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), AuthController.login);
router.get('/auth/me', demoAuth as any, AuthController.me as any);

// Facilities routes have been deprecated in favor of native fields on patients

// Medical Patients routes 
router.post('/patients', demoAuth as any, PatientController.createPatient as any);
router.get('/patients', demoAuth as any, PatientController.getPatients as any);

// Patient Specific Routes - guarded by authorizePatientAccess
router.get('/patients/:id', demoAuth as any, authorizePatientAccess as any, PatientController.getPatientById as any);
router.put('/patients/:id', demoAuth as any, authorizePatientAccess as any, PatientController.updatePatient as any);
router.delete('/patients/:id', demoAuth as any, authorizePatientAccess as any, PatientController.deletePatient as any);
router.post('/patients/:id/documents', demoAuth as any, authorizePatientAccess as any, upload.array('files', 10), PatientController.uploadDocument as any);
router.get('/patients/:id/documents/:docId/url', demoAuth as any, authorizePatientAccess as any, PatientController.getDocumentUrl as any);
router.get('/patients/:id/comments', demoAuth as any, authorizePatientAccess as any, PatientController.getComments as any);
router.post('/patients/:id/comments', demoAuth as any, authorizePatientAccess as any, PatientController.addComment as any);

// Private Chats Routes
router.get('/chats/users', demoAuth as any, ChatController.getChatUsers as any);
router.get('/chats/:userId', demoAuth as any, ChatController.getMessages as any);
router.post('/chats/:userId', demoAuth as any, ChatController.sendMessage as any);

// Data Extraction & Reporting routes
router.post('/extract', demoAuth as any, extractionLimiter, ExtractionController.extractCases as any);
router.get('/extract/history', demoAuth as any, ExtractionController.getExtractionHistory as any);

// Practitioner Settings routes
router.put('/settings/profile', demoAuth as any, validate(settingsUpdateSchema), SettingsController.updateProfile as any);
router.get('/settings/audit-logs', demoAuth as any, SettingsController.getAuditLogs as any);
router.put('/settings/subscription', demoAuth as any, SettingsController.changeSubscription as any);

export default router;
