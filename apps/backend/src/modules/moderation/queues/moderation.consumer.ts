import { createWorker } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { prisma } from '../../../prisma/prisma';

export const moderationWorker = createWorker(
  QUEUES.MODERATION,
  async (job) => {
    const { action, userId } = job.data;

    if (action === 'BAN_USER_OPERATIONS') {
      // 1. Deactivate user account
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // 2. Revoke refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });

      console.log(`[Moderation] Ban operations completed for user ${userId}`);
    }
  },
);
