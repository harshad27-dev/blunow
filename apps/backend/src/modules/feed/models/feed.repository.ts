import { prisma } from '../../../prisma/prisma';

export class FeedRepository {
  async findRecentPosts(pagination: { page: number; limit: number }) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.post.findMany({
      where: { isPublic: true },
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });
  }
}
