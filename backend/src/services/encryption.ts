import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

// Determine encryption key (must be 32 bytes)
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_RAW && process.env.NODE_ENV === 'production') {
  logger.error('FATAL: ENCRYPTION_KEY environment variable is not set. Cannot start in production without a proper encryption key.');
  process.exit(1);
}

const keySource = ENCRYPTION_KEY_RAW || 'isiqalo-med-dev-fallback-key-32c';
let encryptionKey = Buffer.from(keySource);

if (encryptionKey.length !== 32) {
  // If the key is not 32 bytes, derive a 32-byte key using sha256
  encryptionKey = crypto.createHash('sha256').update(keySource).digest();
  logger.warn('Encryption key was not 32 bytes. Derived a 32-byte key using SHA-256.');
}

if (!ENCRYPTION_KEY_RAW) {
  logger.warn('Using development fallback encryption key. Set ENCRYPTION_KEY in .env for production.');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended IV length for GCM

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Return iv:tag:ciphertext
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
}
