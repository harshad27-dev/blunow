import { Response } from 'express';
import { ModerationService } from '../services/moderation.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class ModerationController {
  private modService = new ModerationService();

  banUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { reason, type, expiresAt } = req.body;
      const ban = await this.modService.banUser(req.params.id, req.user!.id, { reason, type, expiresAt });
      res.status(201).json({ success: true, data: ban });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  unbanUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.modService.unbanUser(req.params.id);
      res.status(200).json({ success: true, message: 'Ban lifted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  getBans = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const bans = await this.modService.getBans({ page, limit });
      res.status(200).json({ success: true, data: bans });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
