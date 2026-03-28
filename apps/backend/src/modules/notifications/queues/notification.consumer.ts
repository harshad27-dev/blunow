import { createWorker } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { PushService } from '../services/push.service';
import { InAppService } from '../services/inapp.service';
import { prisma } from '../../../prisma/prisma';

const pushService = new PushService();
const inAppService = new InAppService();

export const notificationWorker = createWorker(
  QUEUES.NOTIFICATION,
  async (job) => {
    const { userId, type, title, body, data } = job.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // 1. Create In-App notification
    await inAppService.createInAppNotification({ userId, type, title, body, data });

    // 2. Send Push Notification if FCM token exists
    if (user.fcmToken) {
      await pushService.sendPushNotification(user.fcmToken, { title, body, data });
    }

    console.log(`[Notification] Processed notification for user ${userId}`);
  },
);
