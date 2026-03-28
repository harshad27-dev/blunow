import { prisma } from '../../../prisma/prisma';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class CommentsService {
  async getComments(postId: string, pagination: { page: number; limit: number }) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.comment.findMany({
      where: { postId },
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });
  }

  async createComment(postId: string, authorId: string, content: string) {
    if (!content?.trim()) throw new AppError('Comment content is required', 400);
    const comment = await prisma.comment.create({
      data: { postId, authorId, content },
      include: {
        author: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
    eventBus.emit(EVENTS.POST.COMMENTED, { postId, commentId: comment.id, authorId });
    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== userId) throw new AppError('Forbidden', 403);
    await prisma.comment.delete({ where: { id: commentId } });
  }
}
