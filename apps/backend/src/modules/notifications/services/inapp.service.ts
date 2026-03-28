import { NotificationsRepository } from '../models/notifications.repository';

export class InAppService {
  private repository = new NotificationsRepository();

  async createInAppNotification(data: {
    userId: string;
    type: any;
    title: string;
    body: string;
    data?: any;
  }) {
    // Optionally emit via sockets for real-time delivery
    return this.repository.create({
      ...data,
      data: data.data ? JSON.stringify(data.data) : undefined,
    });
  }
}
