import { Response } from 'express';
import { FeedService } from '../services/feed.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class FeedController {
  private feedService = new FeedService();

  getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const feed = await this.feedService.getDiscoveryFeed(req.user!.id, { page, limit });
      res.status(200).json({ success: true, data: feed });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  getVibesFeed = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const feed = await this.feedService.getVibesFeed(req.user!.id, { page, limit });
      res.status(200).json({ success: true, data: feed });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };
}
