import { Response } from 'express';
import { UsersService } from '../services/users.service';
import { ProfileService } from '../services/profile.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class UsersController {
  private usersService = new UsersService();
  private profileService = new ProfileService();

  getUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await this.usersService.getUserById(
        req.params.id,
        req.user!.id,
      );
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const profile = await this.profileService.updateProfile(req.user!.id, req.body);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const profile = await this.profileService.updatePreferences(req.user!.id, req.body);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  updateInterests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const profile = await this.profileService.updateInterests(req.user!.id, req.body.interests);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  deactivateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.usersService.deactivateUser(req.user!.id);
      res.status(200).json({ success: true, message: 'Account deactivated' });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.usersService.deleteUser(req.user!.id);
      res.status(200).json({ success: true, message: 'Account deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };
}
