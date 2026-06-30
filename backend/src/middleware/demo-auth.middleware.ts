import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Demo mode middleware — bypasses JWT authentication and injects a
 * mock practitioner user on every request. This lets all API routes
 * work without needing to register or log in.
 *
 * Replace with `authenticateJWT` for production.
 */

export interface DemoAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    subscriptionPlan: string;
  };
}

const DEMO_USER = {
  id: 'demo-practitioner-001',
  email: 'dr.demo@isiqalo.co.za',
  role: 'practitioner',
  subscriptionPlan: 'professional',
};

export function demoAuth(req: DemoAuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Inject the demo user on every request — no token required
  req.user = DEMO_USER;
  logger.info(`[DEMO MODE] Auto-authenticated as ${DEMO_USER.email}`);
  next();
}
