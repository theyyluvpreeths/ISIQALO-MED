import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'isiqalo-med-jwt-secret-key-for-local-dev';

// Extend Express Request type to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    subscriptionPlan: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication failed: Missing or malformed token header');
    res.status(401).json({ error: 'Access denied. Missing or malformed token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      subscriptionPlan: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid or expired token', { error });
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// RBAC Authorization Middleware
export function checkRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.id} with role ${req.user.role} tried to access restricted route requiring roles: [${allowedRoles.join(', ')}]`);
      res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
      return;
    }

    next();
  };
}
