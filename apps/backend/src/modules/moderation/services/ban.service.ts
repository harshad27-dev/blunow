import { moderationQueue } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';

export class ModerationQueueService {
  async processBan(userId: string) {
    await moderationQueue.add(QUEUES.MODERATION, {
      action: 'BAN_USER_OPERATIONS',
      userId,
    });
  }
}
