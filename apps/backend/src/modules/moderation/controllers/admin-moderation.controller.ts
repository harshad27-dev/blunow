import { Request, Response } from 'express';
import { AdminModerationService } from '../services/admin-moderation.service';
import { ContentType, ReportStatus } from '@prisma/client';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class AdminModerationController {
  private service = new AdminModerationService();

  getQueue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ReportStatus | undefined;
      const reportType = req.query.reportType as ContentType | undefined;

      const data = await this.service.getQueue({ status, reportType, page, limit });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const reportId = req.params.id;
      const data = await this.service.getReportDetails(reportId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  };

  resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const reportId = req.params.id;
      const { action, reason, moderatorNotes } = req.body;
      const moderatorId = req.user!.id; // Auth context

      const result = await this.service.resolveAction(reportId, moderatorId, { action, reason, moderatorNotes });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  autoFlagWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKey = req.headers['x-ml-api-key'];
      if (apiKey !== process.env.ML_MODERATION_API_KEY) {
        res.status(401).json({ success: false, message: 'Unauthorized Webhook Provider' });
        return;
      }

      const { contentId, contentType, flagType, confidence, details, autoAction } = req.body;
      const result = await this.service.processAutoFlag({ contentId, contentType, flagType, confidence, details, autoAction });
      
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
