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
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
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

  async savePost(postId: string, userId: string, collectionId?: string) {
    // Note: Schema currently has PostSave model where userId and postId are unique
    return prisma.postSave.upsert({
      where: { userId_postId: { userId, postId } },
      create: { postId, userId },
      update: {},
    });
  }

  async unsavePost(postId: string, userId: string) {
    return prisma.postSave.deleteMany({ where: { postId, userId } });
  }

  async findByAuthorId(authorId: string) {
    return prisma.post.findMany({
      where: { authorId, isDeleted: false },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSavedByUserId(userId: string) {
    const savedPosts = await prisma.postSave.findMany({
      where: { userId, post: { isDeleted: false } },
      include: {
        post: {
          include: {
            author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return savedPosts.map((savedPost) => savedPost.post);
  }
}
