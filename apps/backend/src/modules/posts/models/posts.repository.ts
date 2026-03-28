import { prisma } from '../../../prisma/prisma';

export class PostsRepository {
  async create(data: {
    authorId: string;
    caption?: string;
    mediaUrls: string[];
    mediaTypes: any[];
    isPublic: boolean;
  }) {
    return prisma.post.create({
      data,
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async update(id: string, data: { caption?: string; isPublic?: boolean }) {
    return prisma.post.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  }

  async addLike(postId: string, userId: string) {
    return prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
  }

  async removeLike(postId: string, userId: string) {
    return prisma.postLike.deleteMany({ where: { postId, userId } });
  }
}
