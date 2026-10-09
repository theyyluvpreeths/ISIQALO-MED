import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    logger.error('FATAL: JWT_SECRET environment variable is not set. Cannot start in production without it.');
    process.exit(1);
  }
  logger.warn('Using development fallback JWT secret. Set JWT_SECRET in .env for production.');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'isiqalo-med-jwt-secret-key-for-local-dev';
export const JWT_EXPIRES_IN = '1h';
