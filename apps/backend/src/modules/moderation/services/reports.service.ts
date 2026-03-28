import { ModerationRepository } from '../models/moderation.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

export class ReportsService {
  private repository = new ModerationRepository();

  async createReport(reporterId: string, data: { reportedId: string; reason: any; description?: string }) {
    const report = await this.repository.createReport({ ...data, reporterId });
    eventBus.emit(EVENTS.MODERATION.REPORT_CREATED, { reportId: report.id });
    return report;
  }

  async getReports(filters: { page: number; limit: number; status?: any }) {
    return this.repository.findReports(filters);
  }

  async resolveReport(id: string, resolvedBy: string, status: any) {
    const report = await this.repository.updateReportStatus(id, status, resolvedBy);
    eventBus.emit(EVENTS.MODERATION.REPORT_RESOLVED, { reportId: id, status });
    return report;
  }
}
