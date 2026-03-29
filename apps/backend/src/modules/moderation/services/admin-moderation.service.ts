import { AdminModerationRepository } from '../models/admin-moderation.repository';
import { ReportStatus, ReportResolution, ContentType } from '@prisma/client';

export class AdminModerationService {
  private repo = new AdminModerationRepository();

  async getQueue(filters: { status?: ReportStatus; reportType?: ContentType; page: number; limit: number }) {
    return this.repo.getQueue(filters);
  }

  async getReportDetails(reportId: string) {
    const report = await this.repo.getReportById(reportId);
    if (!report) throw new Error('Report not found');
    
    const reportHistory = await this.repo.getReportHistoryForContent(report.contentId, report.contentType);
    
    return { ...report, reportHistory };
  }

  async resolveAction(reportId: string, moderatorId: string, payload: { action: 'APPROVE_REMOVAL' | 'REJECT' | 'ESCALATE', reason?: string, moderatorNotes?: string }) {
    const report = await this.repo.getReportById(reportId);
    if (!report) throw new Error('Report not found');

    if (payload.action === 'REJECT') {
      return this.repo.updateReportAction(reportId, { status: 'RESOLVED', resolution: 'REJECTED', moderatorId, moderatorNotes: payload.moderatorNotes });
    }

    if (payload.action === 'ESCALATE') {
      return this.repo.updateReportAction(reportId, { status: 'ESCALATED', moderatorId, moderatorNotes: payload.moderatorNotes });
    }

    if (payload.action === 'APPROVE_REMOVAL') {
      // Execute 3-strike logic
      const targetUserId = report.reported?.id;
      if (!targetUserId) throw new Error('No reported user attached to this report');
      
      const newStrikeCount = (report.reported?.strikeCount || 0) + 1;
      let banStatus = 'WARNED';
      let banExpiresAt = null;
      let banDurationStr = 'WARNING';

      if (newStrikeCount === 2) {
        banStatus = 'TEMP_BANNED';
        banDurationStr = 'TEMP_7_DAYS';
        const d = new Date();
        d.setDate(d.getDate() + 7);
        banExpiresAt = d;
      } else if (newStrikeCount >= 3) {
        banStatus = 'PERM_BANNED';
        banDurationStr = 'PERMANENT';
        const d = new Date();
        d.setFullYear(d.getFullYear() + 100);
        banExpiresAt = d;
      }

      await this.repo.updateUserStrikes(targetUserId, newStrikeCount, banStatus, banExpiresAt);
      await this.repo.recordUserViolation(targetUserId, report.id, newStrikeCount, banDurationStr);
      
      if (report.contentType === 'POST') {
        await this.repo.deletePost(report.contentId);
      } 

      return this.repo.updateReportAction(reportId, { status: 'RESOLVED', resolution: 'APPROVED', moderatorId, moderatorNotes: payload.moderatorNotes });
    }
  }

  async processAutoFlag(payload: { contentId: string, contentType: ContentType, flagType: any, confidence: number, details: any, autoAction: any }) {
    const flag = await this.repo.createAutoFlag(payload);

    if (payload.confidence > 0.95 && payload.autoAction === 'AUTO_REMOVE') {
      if (payload.contentType === 'POST') {
         await this.repo.deletePost(payload.contentId);
      }
      return { flagId: flag.id, status: 'AUTO_REMOVED' };
    }

    // Note: To mimic 'SYSTEM' reporter, we expect a system user or nullable. 
    // Schema says reporterId is required. We assume 'ADMIN_SYSTEM_ID' handles it for now in a real setup.
    // We will find a suitable user or seed a system user. For MVP, we insert a placeholder or first admin.
    const report = await this.repo.createReportFromFlag({
      contentId: payload.contentId,
      contentType: payload.contentType,
      reporterId: 'system', // Replace with valid UUID in DB later if constraint fails
      reason: 'INAPPROPRIATE_CONTENT',
      description: `Auto-flagged via ML as ${payload.flagType}`,
      status: 'PENDING',
      autoModerationStatus: 'FLAGGED',
      autoModerationConfidence: payload.confidence
    });

    return { flagId: flag.id, reportId: report.id, status: 'QUEUED_FOR_REVIEW' };
  }
}
