import { NotificationsRepository } from '../models/notifications.repository';
import { InAppService } from './inapp.service';
import { notificationQueue } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class NotificationsService {
  private repository = new NotificationsRepository();
  private inAppService = new InAppService();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen to domain events and dispatch notification jobs
    eventBus.on(EVENTS.MATCH.REQUEST_SENT, this.handleMatchRequest);
    eventBus.on(EVENTS.POST.COMMENTED, this.handleComment);
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
    // Fetch post to get author ID
    // ...
  };

  private handleMessage = async (payload: any) => {
    // Fetch chat members
    // ...
  };
}
