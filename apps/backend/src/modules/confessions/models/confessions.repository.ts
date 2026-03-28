import { prisma } from '../../../prisma/prisma';

export class ConfessionsRepository {
  async create(data: { authorId: string; content: string; isAnonymous: boolean }) {
    return prisma.confession.create({ data });
  }

  async findMany(pagination: { page: number; limit: number }) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.confession.findMany({
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });
  }

  async findById(id: string) {
    return prisma.confession.findUnique({
      where: { id },
      include: { author: { include: { profile: true } } },
    });
  }

  async reveal(id: string) {
    return prisma.confession.update({
      where: { id },
      data: { isAnonymous: false, isRevealed: true, revealedAt: new Date() },
    });
  }
}
