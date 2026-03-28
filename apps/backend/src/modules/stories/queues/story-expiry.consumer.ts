import { createWorker } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { prisma } from '../../../prisma/prisma';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

// BullMQ worker — processes story expiry jobs
export const storyExpiryWorker = createWorker(
  QUEUES.STORY_EXPIRY,
  async (job) => {
    const { storyId } = job.data;
    await prisma.story.deleteMany({
      where: { id: storyId, expiresAt: { lte: new Date() } },
    });
    eventBus.emit(EVENTS.STORY.EXPIRED, { storyId });
    console.log(`[StoryExpiry] Story ${storyId} expired and deleted`);
  },
);
