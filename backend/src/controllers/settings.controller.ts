import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRepository, AuditLogRepository } from '../repositories/database.repositories';
import { logSecurityEvent } from '../config/logger';

export class SettingsController {
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { firstName, lastName, speciality, practiceName, practiceNumber } = req.body;
      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();

      const updates: any = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (speciality !== undefined) updates.speciality = speciality;
      if (practiceName !== undefined) updates.practice_name = practiceName;
      if (practiceNumber !== undefined) updates.practice_number = practiceNumber;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No update data provided.' });
        return;
      }

      await UserRepository.updateUser(req.user.id, updates);

      // Create security audit logs
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'PROFILE_UPDATED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Updated fields: ${Object.keys(updates).join(', ')}`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'PROFILE_UPDATED', `Profile fields updated: ${Object.keys(updates).join(', ')}`, ip, userAgent);

      res.status(200).json({ message: 'Practitioner profile updated successfully.' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error updating profile.' });
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let logs;
      if (req.user.role === 'admin') {
        logs = await AuditLogRepository.getAllAuditLogs();
      } else {
        logs = await AuditLogRepository.getAuditLogsByUserId(req.user.id);
      }

      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error retrieving compliance audit logs.' });
    }
  }

  static async changeSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { plan } = req.body;
      if (!['starter', 'professional', 'enterprise'].includes(plan)) {
        res.status(400).json({ error: 'Invalid subscription plan.' });
        return;
      }

      await UserRepository.updateUser(req.user.id, { subscription_plan: plan });

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const now = new Date().toISOString();

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        action: 'SUBSCRIPTION_CHANGED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Subscription plan upgraded/downgraded to: ${plan}`,
        created_at: now
      });

      logSecurityEvent(req.user.id, 'SUBSCRIPTION_CHANGED', `Plan changed to: ${plan}`, ip, userAgent);

      res.status(200).json({ message: `Subscription successfully updated to ${plan}.` });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error updating subscription.' });
    }
  }
}
