import { prisma } from '../../../prisma/prisma';

export class DiscoveryService {
  async getCandidates(userId: string, pagination: { page: number; limit: number }) {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const skip = (pagination.page - 1) * pagination.limit;

    return prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        profile: {
          minAge: { lte: profile?.maxAge ?? 99 },
          maxAge: { gte: profile?.minAge ?? 18 },
        },
      },
      include: {
        profile: true,
        posts: { take: 3, orderBy: { createdAt: 'desc' } },
      },
      skip,
      take: pagination.limit,
    });
  }
}
