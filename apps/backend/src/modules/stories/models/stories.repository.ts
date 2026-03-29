import { prisma } from '../../../prisma/prisma';

export class StoriesRepository {
  async create(data: {
    authorId: string;
    mediaUrl: string;
    mediaType: any;
    caption?: string;
    expiresAt: Date;
  }) {
    return prisma.story.create({
      data,
      include: { author: { include: { profile: { select: { username: true, avatarUrl: true } } } } },
    });
  }

  async findById(id: string) {
    return prisma.story.findUnique({
      where: { id },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        _count: { select: { views: true } },
      },
    });
  }

  async findActiveStories(userId: string) {
    return prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        authorId: { not: userId },
      },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addView(storyId: string, viewerId: string) {
    return prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      create: { storyId, viewerId },
      update: {},
    });
  }

  async delete(id: string) {
    return prisma.story.delete({ where: { id } });
  }
}
