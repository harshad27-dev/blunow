import { prisma } from '../../../prisma/prisma';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class CommentsService {
  async getComments(
    postId: string,
    userId: string,
    pagination: { page: number; limit: number },
  ) {
    const skip = (pagination.page - 1) * pagination.limit;
    const comments = await (prisma.comment as any).findMany({
      where: { postId, parentId: null },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        likes: { where: { userId }, select: { id: true } },
        replies: {
          include: {
            author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            likes: { where: { userId }, select: { id: true } },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { likes: true, replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });

    return comments.map((comment) => this.serializeComment(comment, userId));
  }

  async createComment(postId: string, authorId: string, content: string, parentId?: string) {
    if (!content?.trim()) throw new AppError('Comment content is required', 400);
    if (parentId) {
      const parent = await (prisma.comment as any).findFirst({
        where: { id: parentId, postId, parentId: null },
      });
      if (!parent) throw new AppError('Parent comment not found', 404);
    }

    const comment = await (prisma.comment as any).create({
      data: { postId, authorId, content: content.trim(), parentId },
      include: {
        author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        likes: { where: { userId: authorId }, select: { id: true } },
        replies: {
          include: {
            author: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            likes: { where: { userId: authorId }, select: { id: true } },
            _count: { select: { likes: true } },
          },
        },
        _count: { select: { likes: true, replies: true } },
      },
    });
    eventBus.emit(EVENTS.POST.COMMENTED, {
      postId,
      commentId: comment.id,
      authorId,
      parentId,
    });
    return this.serializeComment(comment, authorId);
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== userId) throw new AppError('Forbidden', 403);
    await prisma.comment.delete({ where: { id: commentId } });
  }

  async updateComment(commentId: string, userId: string, content: string) {
    if (!content?.trim()) throw new AppError('Comment content is required', 400);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== userId) throw new AppError('Forbidden', 403);

    return prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    });
  }

  async reportComment(
    commentId: string,
    reporterId: string,
    data: { reason: any; description?: string },
  ) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId === reporterId) {
      throw new AppError('You cannot report your own comment', 400);
    }

    return prisma.report.create({
      data: {
        reporterId,
        reportedId: comment.authorId,
        reason: data.reason,
        description: data.description,
        contentId: commentId,
        contentType: 'COMMENT' as any,
      },
    });
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);

    await (prisma as any).commentLike.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId },
      update: {},
    });
  }

  async unlikeComment(commentId: string, userId: string) {
    await (prisma as any).commentLike.deleteMany({ where: { commentId, userId } });
  }

  private serializeComment(comment: any, userId: string) {
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      authorId: comment.authorId,
      author: comment.author,
      isOwn: comment.authorId === userId,
      isLiked: Boolean(comment.likes?.length),
      likesCount: comment._count?.likes || 0,
      repliesCount: comment._count?.replies || 0,
      replies: (comment.replies || []).map((reply: any) => ({
        id: reply.id,
        postId: reply.postId,
        parentId: reply.parentId,
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        authorId: reply.authorId,
        author: reply.author,
        isOwn: reply.authorId === userId,
        isLiked: Boolean(reply.likes?.length),
        likesCount: reply._count?.likes || 0,
        repliesCount: 0,
        replies: [],
      })),
    };
  }
}
