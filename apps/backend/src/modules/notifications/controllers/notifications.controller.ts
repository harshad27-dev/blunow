import { Response } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class NotificationsController {
  private notificationsService = new NotificationsService();

  getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await this.notificationsService.getNotifications(req.user!.id, { page, limit });
      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.notificationsService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.notificationsService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.notificationsService.deleteNotification(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
