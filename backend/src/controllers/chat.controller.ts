import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ChatRepository, AuditLogRepository } from '../repositories/database.repositories';

export class ChatController {
  static async getChatUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const users = await ChatRepository.getAllUsersForChat();
      res.status(200).json(users);
    } catch (error) {
      console.error('Fetch chat users error:', error);
      res.status(500).json({ error: 'Internal server error fetching chat users.' });
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // If admin and requesting all messages
      if (req.query.admin === 'true' && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        const messages = await ChatRepository.getAllMessagesAdmin();
        res.status(200).json(messages);
        return;
      }

      const otherUserId = req.params.userId;
      if (!otherUserId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const messages = await ChatRepository.getMessagesBetweenUsers(req.user.id, otherUserId);
      res.status(200).json(messages);
    } catch (error) {
      console.error('Fetch messages error:', error);
      res.status(500).json({ error: 'Internal server error fetching messages.' });
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const receiverId = req.params.userId;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      const messageId = `msg-${crypto.randomBytes(4).toString('hex')}`;
      
      await ChatRepository.createMessage({
        id: messageId,
        sender_id: req.user.id,
        receiver_id: receiverId,
        content: content.trim(),
        is_read: 0,
        created_at: new Date().toISOString()
      });

      res.status(201).json({ message: 'Message sent successfully', messageId });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error sending message.' });
    }
  }
}
