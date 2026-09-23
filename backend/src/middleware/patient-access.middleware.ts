import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { PatientRepository, AuthPatientLinkRepository } from '../repositories/database.repositories';

export async function authorizePatientAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const patientId = req.params.patientId || req.params.id;
    if (!patientId) {
      return next();
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      return next();
    }

    if (user.role === 'viewer') {
      if (req.method !== 'GET') {
        res.status(403).json({ error: 'Forbidden: Viewers cannot modify patient data.' });
        return;
      }
      return next();
    }

    if (user.role === 'patient') {
      const isLinked = await AuthPatientLinkRepository.isPatientLinked(user.id, patientId);
      if (!isLinked) {
        res.status(403).json({ error: 'Forbidden: You are not linked to this patient record.' });
        return;
      }
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
