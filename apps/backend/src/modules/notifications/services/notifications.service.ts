import { NotificationsRepository } from '../models/notifications.repository';
import { InAppService } from './inapp.service';
import { notificationQueue } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';
import { prisma } from '../../../prisma/prisma';

export class NotificationsService {
  private repository = new NotificationsRepository();
  private inAppService = new InAppService();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen to domain events and dispatch notification jobs
    eventBus.on(EVENTS.MATCH.REQUEST_SENT, this.handleMatchRequest);
    eventBus.on(EVENTS.POST.LIKED, this.handlePostLike);
    eventBus.on(EVENTS.POST.COMMENTED, this.handleComment);
    eventBus.on(EVENTS.STORY.VIEWED, this.handleStoryView);
    eventBus.on(EVENTS.CHAT.MESSAGE_SENT, this.handleMessage);
    // Add other event listeners as needed
  }

  getNotifications = async (userId: string, pagination: { page: number; limit: number }) => {
    return this.repository.findByUserId(userId, pagination);
  };

  markAsRead = async (id: string, userId: string) => {
    const notification = await this.repository.findById(id);
    if (!notification) throw new AppError('Notification not found', 404);
    if (notification.userId !== userId) throw new AppError('Forbidden', 403);
    
    await this.repository.markAsRead(id);
  };

  markAllAsRead = async (userId: string) => {
    await this.repository.markAllAsRead(userId);
  };

  deleteNotification = async (id: string, userId: string) => {
    const notification = await this.repository.findById(id);
    if (!notification) throw new AppError('Notification not found', 404);
    if (notification.userId !== userId) throw new AppError('Forbidden', 403);

    await this.repository.delete(id);
  };

  // Handlers
  private handleMatchRequest = async (payload: any) => {
    await notificationQueue.add(QUEUES.NOTIFICATION, {
      userId: payload.receiverId,
      type: 'MATCH',
      title: 'New Match Request',
      body: 'Someone wants to connect with you.',
      data: { requestId: payload.requestId },
    });
  };

  private handleComment = async (payload: any) => {
    if (payload.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: payload.parentId },
        include: { author: { include: { profile: { select: { username: true } } } } },
      });
      if (!parentComment || parentComment.authorId === payload.authorId) return;

      await notificationQueue.add(QUEUES.NOTIFICATION, {
        userId: parentComment.authorId,
        type: 'COMMENT',
        title: 'New reply',
        body: 'Someone replied to your comment.',
        data: {
          postId: payload.postId,
          commentId: payload.commentId,
          parentId: payload.parentId,
        },
      });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: payload.postId },
      select: { authorId: true },
    });
    if (!post || post.authorId === payload.authorId) return;

    await notificationQueue.add(QUEUES.NOTIFICATION, {
      userId: post.authorId,
      type: 'COMMENT',
      title: 'New comment',
      body: 'Someone commented on your post.',
      data: { postId: payload.postId, commentId: payload.commentId },
    });
  };

  private handlePostLike = async (payload: any) => {
    const post = await prisma.post.findUnique({
      where: { id: payload.postId },
      select: { authorId: true },
    });
    if (!post || post.authorId === payload.userId) return;

    await notificationQueue.add(QUEUES.NOTIFICATION, {
      userId: post.authorId,
      type: 'LIKE',
      title: 'New like',
      body: 'Someone liked your post.',
      data: { postId: payload.postId },
    });
  };

  private handleStoryView = async (payload: any) => {
    if (payload.authorId === payload.viewerId) return;

    await notificationQueue.add(QUEUES.NOTIFICATION, {
      userId: payload.authorId,
      type: 'STORY_VIEW',
      title: 'Story viewed',
      body: 'Someone viewed your story.',
      data: { storyId: payload.storyId, viewerId: payload.viewerId },
    });
  };

  private handleMessage = async (payload: any) => {
    // Fetch chat members
    // ...
  };
}
