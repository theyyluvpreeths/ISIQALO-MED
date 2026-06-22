import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.routes';
import { logger } from './config/logger';
import './config/database'; // Import to initialize db tables

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security configuration (Zero-Trust)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5173", "http://localhost:5173"]
    }
  }
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Serve API routes
app.use('/api', apiRouter);

// Serve Static Frontend files in production
const frontendBuildPath = path.join(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
  logger.info(`Serving static files from ${frontendBuildPath}`);
} else {
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Isiqalo Med Secure API is active. Running in Development mode.' });
  });
}

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal error occurred on the secure server.' });
});

app.listen(PORT, () => {
  logger.info(`Server successfully running on port ${PORT}`);
});

export default app;
