import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthController } from '../controllers/auth.controller';
import { CaseController } from '../controllers/case.controller';
import { ExtractionController } from '../controllers/extraction.controller';
import { SettingsController } from '../controllers/settings.controller';
import { demoAuth } from '../middleware/demo-auth.middleware';
import { validate, registerSchema, loginSchema, caseUploadSchema, settingsUpdateSchema } from '../middleware/validator.middleware';
import { authLimiter, generalLimiter, extractionLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Apply general rate limiting to all API routes
router.use(generalLimiter);

// Configure Multer for secure uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save with a unique name to prevent collisions and file tracking
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF, TXT, images for medical attachment records
    const allowedTypes = /pdf|txt|png|jpeg|jpg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only medical files (.pdf, .txt) and image records (.png, .jpg, .webp) are allowed.'));
    }
  }
});

// ──────────────────────────────────────────────────
// DEMO MODE: All routes use demoAuth (no login needed)
// For production, swap demoAuth → authenticateJWT
// ──────────────────────────────────────────────────

// Authentication routes — kept for reference but not required in demo
router.post('/auth/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), AuthController.login);
router.get('/auth/me', demoAuth as any, AuthController.me as any);

// Medical Case routes — use demoAuth
router.post('/cases', demoAuth as any, upload.single('file'), (req, res, next) => {
  // Translate req.body values to match boolean/number for caseUploadSchema
  if (req.body.consentObtained === 'true') req.body.consentObtained = true;
  if (req.body.consentObtained === 'false') req.body.consentObtained = false;
  next();
}, validate(caseUploadSchema), CaseController.createCase as any);

router.get('/cases', demoAuth as any, CaseController.getCases as any);
router.get('/cases/:id', demoAuth as any, CaseController.getCaseById as any);
router.post('/cases/:id/like', demoAuth as any, CaseController.likeCase as any);

// Data Extraction & Reporting routes
router.post('/extract', demoAuth as any, extractionLimiter, ExtractionController.extractCases as any);
router.get('/extract/history', demoAuth as any, ExtractionController.getExtractionHistory as any);

// Practitioner Settings routes
router.put('/settings/profile', demoAuth as any, validate(settingsUpdateSchema), SettingsController.updateProfile as any);
router.get('/settings/audit-logs', demoAuth as any, SettingsController.getAuditLogs as any);
router.put('/settings/subscription', demoAuth as any, SettingsController.changeSubscription as any);

export default router;
