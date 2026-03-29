import { prisma } from '../../../prisma/prisma';

export class ModerationRepository {
  async createReport(data: any) {
    return prisma.report.create({ data });
  }

  async findReports(filters: { page: number; limit: number; status?: any }) {
    const skip = (filters.page - 1) * filters.limit;
    return prisma.report.findMany({
      where: filters.status ? { status: filters.status } : {},
      include: {
        reporter: { include: { profile: { select: { username: true } } } },
        reported: { include: { profile: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: filters.limit,
    });
  }

  async updateReportStatus(id: string, status: any, resolvedBy: string) {
    return prisma.report.update({
      where: { id },
      data: { status, moderatorId: resolvedBy, resolvedAt: new Date() } as any,
    });
  }

  async createBan(data: { userId: string; bannedBy: string; reason: string; type: any; expiresAt?: Date }) {
    return prisma.ban.create({ data });
  }

  async findBanById(id: string) {
    return prisma.ban.findUnique({ where: { id } });
  }

  async findBans(pagination: { page: number; limit: number }) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.ban.findMany({
      include: {
        user: { include: { profile: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });
  }

  async deleteBan(id: string) {
    return prisma.ban.delete({ where: { id } });
  }
}
