import { Response } from 'express';
import { ConfessionsService } from '../services/confessions.service';
import { RevealService } from '../services/reveal.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class ConfessionsController {
  private confessionsService = new ConfessionsService();
  private revealService = new RevealService();

  getConfessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const confessions = await this.confessionsService.getConfessions({ page, limit });
      res.status(200).json({ success: true, data: confessions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  createConfession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const confession = await this.confessionsService.createConfession(req.user!.id, req.body);
      res.status(201).json({ success: true, data: confession });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  requestReveal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.revealService.requestReveal(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Reveal request sent' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  acceptReveal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const confession = await this.revealService.acceptReveal(req.params.id, req.user!.id);
      res.status(200).json({ success: true, data: confession });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
