import { Response, Request } from 'express';
import { AuthRequest } from '../../../common/middleware/auth.middleware';
import { SocialRepository } from '../models/social.repository';

export class SocialController {
  private repo = new SocialRepository();

  verifyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { idPhotoUrl, faceVideoUrl } = req.body;
      const result = await this.repo.verifyProfile(req.user!.id, idPhotoUrl, faceVideoUrl);
      res.status(201).json({ success: true, verificationId: result.id, status: result.status });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  };

  getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId || req.user!.id; // fallback to current user if not provided in some context
      const stats = await this.repo.getStats(userId);
      res.status(200).json({
        success: true,
        stats: {
          followers: stats.followerCount,
          following: stats.followingCount,
          postsCount: stats.postsCount,
          matchCount: stats.matchCount,
          storiesCount: stats.storiesCount,
        },
      });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  };

  followUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const followerId = req.user!.id;
      const followingId = req.params.id;
      if (followerId === followingId) throw new Error("Cannot follow yourself");

      await this.repo.followUser(followerId, followingId);
      res.status(200).json({ success: true, action: 'FOLLOW', userId: followingId });
    } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
  };

  unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.repo.unfollowUser(req.user!.id, req.params.id);
      res.status(200).json({ success: true, action: 'UNFOLLOW', userId: req.params.id });
    } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
  };

  getFollowers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await this.repo.getFollowers(req.params.id, limit, (page - 1) * limit);
      res.status(200).json({ success: true, ...data });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  };

  getFollowing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await this.repo.getFollowing(req.params.id, limit, (page - 1) * limit);
      res.status(200).json({ success: true, ...data });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  };
}
