import { Response } from "express";
import { AuthRequest } from "../../../common/middleware/auth.middleware";
import { UserSettingsService } from "../services/user-settings.service";

export class UserSettingsController {
  private service = new UserSettingsService();

  getPrivacy = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.getPrivacy(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({
        success: false,
        message: error.message,
      });
    }
  };

  updatePrivacy = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.updatePrivacy(req.user!.id, req.body);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({
        success: false,
        message: error.message,
      });
    }
  };

  getBlockedUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.getBlockedUsers(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.service.blockUser(req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: "User blocked" });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({
        success: false,
        message: error.message,
      });
    }
  };

  unblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.service.unblockUser(req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: "User unblocked" });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({
        success: false,
        message: error.message,
      });
    }
  };
}
