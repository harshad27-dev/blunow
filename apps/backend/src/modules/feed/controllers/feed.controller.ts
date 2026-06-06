import { Response } from 'express';
import { FeedService } from '../services/feed.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';
import { prisma } from '../../../prisma/prisma';

export class FeedController {
  private service = new FeedService();

  getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { minAge, maxAge, maxDistance, interests, sexuality, sort } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const profile = await getProfileLocation(req.user!.id);

      const data = await this.service.getFilteredFeed({
        userId: req.user!.id,
        lat: profile?.latitude ?? null,
        lng: profile?.longitude ?? null,
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
      const profile = await getProfileLocation(req.user!.id);

      if (profile?.latitude == null || profile?.longitude == null) {
        res.status(200).json({
          success: true,
          users: [],
          total: 0,
          message: 'Add your location to discover people near you.',
        });
        return;
      }

      const data = await this.service.getPeopleNearYou(
        req.user!.id,
        profile.latitude,
        profile.longitude,
        maxDistance,
        limit,
        (page - 1) * limit,
      );
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPeopleYouMayVibeWith = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const interests = req.query.interests as string;
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { profile: { select: { interests: true } } },
      });
      const sexuality = (req.query.sexuality as string) || currentUser?.sexuality || 'STRAIGHT';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const data = await this.service.getPeopleYouMayVibeWith(
        req.user!.id,
        interests || currentUser?.profile?.interests?.join(',') || '',
        sexuality,
        limit,
        (page - 1) * limit,
      );
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

const getProfileLocation = (userId: string) =>
  prisma.profile.findUnique({
    where: { userId },
    select: { latitude: true, longitude: true },
  });
