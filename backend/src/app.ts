import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.routes';
import { logger } from './config/logger';
import { dbInitialized } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for accurate IP tracking (needed behind reverse proxies and rate limiting)
app.set('trust proxy', 1);

// Security configuration (Zero-Trust)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Additional security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0'); // Modern browsers use CSP instead
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Express request logging (signed file tokens are credentials — keep them out of logs)
app.use((req: Request, res: Response, next: NextFunction) => {
  const url = req.url.replace(/^\/api\/files\/[^/?]+/, '/api/files/[redacted]');
  logger.info(`${req.method} ${url} - IP: ${req.ip}`);
  next();
});

// Serve API routes
app.use('/api', apiRouter);

// Serve Static Frontend files in production
const frontendBuildPath = process.env.FRONTEND_DIST_PATH || path.join(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  // SPA fallback — but unknown /api routes must still 404 as JSON
  app.get(/^(?!\/api(\/|$)).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
  logger.info(`Serving static files from ${frontendBuildPath}`);
} else {
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Isiqalo Med Secure API is active. Running in Development mode.' });
  });
}

app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    res.status(err.status || 400).json({ error: 'Malformed or oversized request body.' });
    return;
  }
  logger.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'An unexpected internal error occurred on the secure server.' });
});

dbInitialized
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server successfully running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('FATAL: database failed to initialise, server not started.', err);
    process.exit(1);
  });

export default app;
