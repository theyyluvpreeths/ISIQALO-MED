import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP address. Please try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.url}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Authentication rate limiter — 5 attempts per 15 minutes per IP.
 * Protects login and registration from brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Your IP has been temporarily blocked. Try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} — possible brute-force attempt on ${req.url}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Data extraction rate limiter — 20 requests per 15 minutes per IP.
 * Prevents excessive bulk data downloads.
 */
export const extractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Data extraction rate limit exceeded. Please wait before initiating more extractions.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Extraction rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});
