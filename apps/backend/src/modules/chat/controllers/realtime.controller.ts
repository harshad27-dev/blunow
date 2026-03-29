import { Response } from 'express';
import { AuthRequest } from '../../../common/middleware/auth.middleware';
import { RealtimeRepository } from '../models/realtime.repository';

export class RealtimeController {
  private repo = new RealtimeRepository();

  setTyping = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { isTyping } = req.body;
      const conversationId = req.params.conversationId;
      await this.repo.setTyping(conversationId, req.user!.id, isTyping);
      // In a real implementation this emits via Socket.io Server instance
      res.status(200).json({ success: true, conversationId, userId: req.user!.id, isTyping, timestamp: new Date() });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  };

  markMessageRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const messageId = req.params.messageId;
      const result = await this.repo.markMessageRead(messageId, req.user!.id);
      res.status(200).json({ success: true, messageId, conversationId: result.conversationId, readBy: [{ userId: req.user!.id, readAt: result.readAt }], deliveredAt: result.deliveredAt });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  };

  markConversationRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await this.repo.markConversationAsRead(req.params.conversationId, req.user!.id);
      res.status(200).json({ success: true, conversationId: req.params.conversationId, readCount: result.updatedCount });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  };

  getOnlineStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await this.repo.getOnlineStatus(req.params.userId);
      res.status(200).json({ success: true, ...(result || { userId: req.params.userId, isOnline: false, status: 'offline' }) });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  };

  getBatchOnlineStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idsStr = req.query.ids as string;
      if (!idsStr) throw new Error("Missing ids query parameter");
      const ids = idsStr.split(',').map(s => s.trim());
      const results = await this.repo.getBatchOnlineStatus(ids);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  };
}
