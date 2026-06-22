import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config/logger';

// Generic validation middleware
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        logger.warn('Payload validation failed', { errors, body: req.body });
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
      res.status(500).json({ error: 'Internal server error during validation' });
    }
  };
};

// Validation Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  hpcsaNumber: z.string().regex(/^MP\s?\d{7}$/i, 'HPCSA number must match standard format e.g. MP1234567'),
  speciality: z.string().min(1, 'Speciality is required'),
  practiceName: z.string().min(1, 'Practice name is required'),
  practiceNumber: z.string().regex(/^\d{7}$/, 'Practice number must be a 7-digit identifier'),
  subscriptionPlan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const caseUploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(2, 'Category is required'),
  institution: z.string().min(2, 'Institution is required'),
  summary: z.string().min(10, 'Summary/Abstract must be at least 10 characters'),
  tags: z.string().min(1, 'At least one tag is required'),
  consentObtained: z.boolean().refine(val => val === true, {
    message: 'Patient consent is legally required to upload case records',
  }),
});

export const settingsUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  speciality: z.string().min(1, 'Speciality is required').optional(),
  practiceName: z.string().min(1, 'Practice name is required').optional(),
  practiceNumber: z.string().regex(/^\d{7}$/, 'Practice number must be a 7-digit identifier').optional(),
});
