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

  async findById(id: string, viewerId?: string) {
    return prisma.story.findUnique({
      where: { id },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        ...(viewerId
          ? { views: { where: { viewerId }, select: { id: true } } }
          : {}),
        _count: { select: { views: true } },
      },
    });
  }

  async findActiveStories(userId: string) {
    const stories = await prisma.story.findMany({
      where: {
        isDeleted: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        views: { where: { viewerId: userId }, select: { id: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stories.map((story) => ({
      ...story,
      isViewed: story.authorId === userId || story.views.length > 0,
      viewCount: story._count.views,
      views: undefined,
    }));
  }

  async findActiveStoriesByAuthorId(authorId: string) {
    return prisma.story.findMany({
      where: {
        authorId,
        isDeleted: false,
        expiresAt: { gt: new Date() },
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

  async findView(storyId: string, viewerId: string) {
    return prisma.storyView.findUnique({
      where: { storyId_viewerId: { storyId, viewerId } },
    });
  }

  async delete(id: string) {
    return prisma.story.delete({ where: { id } });
  }
}
