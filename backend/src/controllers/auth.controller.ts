import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository, AuditLogRepository, UserEntity } from '../repositories/database.repositories';
import { logSecurityEvent } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'isiqalo-med-jwt-secret-key-for-local-dev';
const JWT_EXPIRES_IN = '1h';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await UserRepository.getUserByEmail(email.toLowerCase());
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Log successful login
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: user.id,
        action: 'USER_LOGIN',
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: 'Successful password login',
        created_at: new Date().toISOString()
      });

      logSecurityEvent(user.id, 'USER_LOGIN', `User logged in: ${user.email}`, req.ip || 'unknown', req.get('user-agent') || 'unknown');

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          hpcsaNumber: user.hpcsa_number,
          speciality: user.speciality,
          practiceName: user.practice_name,
          practiceNumber: user.practice_number,
          subscriptionPlan: user.subscription_plan,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  }

  static async registerPatient(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, middleName, lastName, dob, medicalNumber } = req.body;
      if (!email || !password || !firstName || !lastName || !dob || !medicalNumber) {
        res.status(400).json({ error: 'Missing required patient fields.' });
        return;
      }

      const existingUser = await UserRepository.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists.' });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();

      const newUser: UserEntity = {
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        dob: dob,
        medical_number: medicalNumber,
        role: 'patient',
        hpcsa_number: '',
        speciality: '',
        practice_name: '',
        practice_number: '',
        subscription_plan: 'starter',
        subscription_status: 'active',
        created_at: now,
        updated_at: now
      };

      await UserRepository.createUser(newUser);

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: userId,
        action: 'USER_REGISTERED',
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: 'Patient registration',
        created_at: now
      });
      logSecurityEvent(userId, 'USER_REGISTERED', `Patient registration: ${newUser.email}`, req.ip || 'unknown', req.get('user-agent') || 'unknown');

      res.status(201).json({ message: 'Patient registered successfully.' });
    } catch (error) {
      console.error('Patient registration error:', error);
      res.status(500).json({ error: 'Internal server error during patient registration.' });
    }
  }

  static async registerPractitioner(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, hpcsaNumber, speciality, practiceName, practiceNumber, packageChoice } = req.body;
      if (!email || !password || !firstName || !lastName || !hpcsaNumber) {
        res.status(400).json({ error: 'Missing required practitioner fields.' });
        return;
      }

      const existingUser = await UserRepository.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists.' });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();

      const newUser: UserEntity = {
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        middle_name: null,
        last_name: lastName,
        dob: null,
        medical_number: null,
        role: 'practitioner',
        hpcsa_number: hpcsaNumber,
        speciality: speciality || '',
        practice_name: practiceName || '',
        practice_number: practiceNumber || '',
        subscription_plan: packageChoice || 'starter',
        subscription_status: 'active',
        created_at: now,
        updated_at: now
      };

      await UserRepository.createUser(newUser);

      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: userId,
        action: 'USER_REGISTERED',
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: 'Practitioner registration',
        created_at: now
      });
      logSecurityEvent(userId, 'USER_REGISTERED', `Practitioner registration: ${newUser.email}`, req.ip || 'unknown', req.get('user-agent') || 'unknown');

      res.status(201).json({ message: 'Practitioner registered successfully.' });
    } catch (error) {
      console.error('Practitioner registration error:', error);
      res.status(500).json({ error: 'Internal server error during practitioner registration.' });
    }
  }

  static async me(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserRepository.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          hpcsaNumber: user.hpcsa_number,
          speciality: user.speciality,
          practiceName: user.practice_name,
          practiceNumber: user.practice_number,
          subscriptionPlan: user.subscription_plan
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error fetching user.' });
    }
  }
}
