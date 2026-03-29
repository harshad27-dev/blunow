import { Response } from 'express';
import { FeedService } from '../services/feed.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class FeedController {
  private service = new FeedService();

  getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { minAge, maxAge, maxDistance, interests, sexuality, sort } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Ensure mock user location exists to prevent haversine crash (0,0 default)
      // Realistically we grab from req.user embedded profile OR redis cache, for MVP:
      const userLat = 19.0760; // Mumbai mock
      const userLng = 72.8777;

      const data = await this.service.getFilteredFeed({
        userId: req.user!.id,
        lat: userLat,
        lng: userLng,
        minAge: minAge ? parseInt(minAge as string) : undefined,
        maxAge: maxAge ? parseInt(maxAge as string) : undefined,
        maxDistance: maxDistance ? parseInt(maxDistance as string) : undefined,
        interests: interests as string,
        sexuality: sexuality as string,
        sort: sort as string,
        limit,
        offset: (page - 1) * limit
      });

      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPeopleNearYou = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const maxDistance = parseInt(req.query.maxDistance as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const userLat = 19.0760; 
      const userLng = 72.8777;

      const data = await this.service.getPeopleNearYou(userLat, userLng, maxDistance, limit, (page - 1) * limit);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPeopleYouMayVibeWith = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const interests = req.query.interests as string;
      const sexuality = req.query.sexuality as string || 'STRAIGHT'; // default or from user context
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const data = await this.service.getPeopleYouMayVibeWith(req.user!.id, interests, sexuality, limit, (page - 1) * limit);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
