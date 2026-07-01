import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { PatientRepository } from '../repositories/database.repositories';

export async function authorizePatientAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const patientId = req.params.patientId || req.params.id;
    if (!patientId) {
      // If there's no patientId in the route params, nothing to check here
      return next();
    }

    // Admins can bypass assigned doctor check
    if (user.role === 'admin' || user.role === 'superadmin') {
      return next();
    }

    const isAssigned = await PatientRepository.isDoctorAssignedToPatient(user.id, patientId);
    if (!isAssigned) {
      res.status(403).json({ error: 'Forbidden: You are not authorized to view or edit this patient.' });
      return;
    }

    next();
  } catch (err) {
    console.error('Authorization error in patient-access middleware:', err);
    res.status(500).json({ error: 'Internal server error verifying access.' });
  }
}
