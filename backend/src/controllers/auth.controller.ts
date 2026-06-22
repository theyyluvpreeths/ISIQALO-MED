import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository, AuditLogRepository, UserEntity } from '../repositories/database.repositories';
import { logSecurityEvent } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'isiqalo-med-jwt-secret-key-for-local-dev';
const JWT_EXPIRES_IN = '24h';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        email, password, firstName, lastName, hpcsaNumber,
        speciality, practiceName, practiceNumber, subscriptionPlan
      } = req.body;

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Check if user already exists
      const existingUser = await UserRepository.getUserByEmail(email);
      if (existingUser) {
        logSecurityEvent(null, 'SIGNUP_FAILURE', `Attempted signup with existing email: ${email}`, ip, userAgent);
        res.status(400).json({ error: 'A user with this email address is already registered.' });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newUser: UserEntity = {
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'practitioner', // Default role
        hpcsa_number: hpcsaNumber,
        speciality,
        practice_name: practiceName,
        practice_number: practiceNumber,
        subscription_plan: subscriptionPlan || 'starter',
        subscription_status: 'active',
        created_at: now,
        updated_at: now
      };

      await UserRepository.createUser(newUser);

      // Create Audit Log in database
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: userId,
        action: 'USER_REGISTERED',
        ip_address: ip,
        user_agent: userAgent,
        details: `Practitioner registered: ${firstName} ${lastName} (${hpcsaNumber})`,
        created_at: now
      });

      logSecurityEvent(userId, 'SIGNUP_SUCCESS', `User registered: ${email}`, ip, userAgent);

      // Generate JWT
      const token = jwt.sign(
        { id: userId, email: newUser.email, role: newUser.role, subscriptionPlan: newUser.subscription_plan },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        token,
        user: {
          id: userId,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          hpcsaNumber: newUser.hpcsa_number,
          speciality: newUser.speciality,
          practiceName: newUser.practice_name,
          practiceNumber: newUser.practice_number,
          subscriptionPlan: newUser.subscription_plan
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error during registration.' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const user = await UserRepository.getUserByEmail(email.toLowerCase());
      if (!user) {
        logSecurityEvent(null, 'LOGIN_FAILURE', `Invalid login attempt for email: ${email}`, ip, userAgent);
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logSecurityEvent(user.id, 'LOGIN_FAILURE', `Invalid password attempted for: ${email}`, ip, userAgent);
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const now = new Date().toISOString();

      // Create Audit Log
      await AuditLogRepository.createAuditLog({
        id: crypto.randomUUID(),
        user_id: user.id,
        action: 'USER_LOGIN',
        ip_address: ip,
        user_agent: userAgent,
        details: `Practitioner logged in successfully`,
        created_at: now
      });

      logSecurityEvent(user.id, 'LOGIN_SUCCESS', `User logged in: ${email}`, ip, userAgent);

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, subscriptionPlan: user.subscription_plan },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
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
          subscriptionPlan: user.subscription_plan
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login.' });
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
