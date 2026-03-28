import { Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class ReportsController {
  private reportsService = new ReportsService();

  createReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { reportedId, reason, description } = req.body;
      const report = await this.reportsService.createReport(req.user!.id, { reportedId, reason, description });
      res.status(201).json({ success: true, data: report });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as any;
      const reports = await this.reportsService.getReports({ page, limit, status });
      res.status(200).json({ success: true, data: reports });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.body;
      const report = await this.reportsService.resolveReport(req.params.id, req.user!.id, status);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };
}
