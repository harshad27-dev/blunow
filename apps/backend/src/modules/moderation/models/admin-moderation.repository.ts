import { prisma } from '../../../prisma/prisma';
import { Prisma, ReportStatus, ReportResolution, ContentType } from '@prisma/client';

export class AdminModerationRepository {
  async getQueue(filters: { status?: ReportStatus; reportType?: ContentType; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;
    
    // Type dynamically to bypass IDE Prisma namespace sync delay
    const whereClause: any = {};
    if (filters.status) whereClause.status = filters.status;
    if (filters.reportType) whereClause.contentType = filters.reportType;

    const [reports, total, pendingCount] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        include: {
          reporter: { select: { id: true, profile: { select: { username: true } } } },
          reported: { select: { id: true, strikeCount: true, createdAt: true, profile: { select: { username: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.report.count({ where: whereClause }),
      prisma.report.count({ where: { status: 'PENDING' } })
    ]);

    return { reports, total, pendingCount };
  }

  async getReportById(id: string) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, profile: { select: { username: true } } } },
        reported: { select: { id: true, strikeCount: true, createdAt: true, profile: { select: { username: true } } } }
      }
    });
  }
  
  async getReportHistoryForContent(contentId: string, contentType: ContentType) {
    return prisma.report.findMany({
      where: { contentId, contentType },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, description: true, status: true, createdAt: true }
    });
  }

  async updateReportAction(id: string, updateData: any) {
    return prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        reported: { select: { id: true, strikeCount: true, banStatus: true, banExpiresAt: true, profile: { select: { username: true } } } }
      }
    });
  }

  async recordUserViolation(userId: string, reportId: string, strikeNumber: number, banDuration: string | null) {
    return prisma.userViolation.create({
      data: { userId, reportId, strikeNumber, banDuration }
    });
  }
  
  async updateUserStrikes(userId: string, newStrikeCount: number, banStatus: any, banExpiresAt: Date | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { strikeCount: newStrikeCount, banStatus, banExpiresAt }
    });
  }

  async createAutoFlag(data: any) {
    return prisma.autoFlag.create({ data });
  }

  async createReportFromFlag(data: any) {
    return prisma.report.create({ data });
  }

  async deletePost(id: string) {
    return prisma.post.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
