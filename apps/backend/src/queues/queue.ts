import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from './queue-constants';

// Redis connection shared by all queues
export const redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queue instances (used by services to dispatch jobs) ──────────────────────
export const storyExpiryQueue = new Queue(QUEUES.STORY_EXPIRY, { connection: redisConnection });
export const notificationQueue = new Queue(QUEUES.NOTIFICATION, { connection: redisConnection });
export const mediaProcessingQueue = new Queue(QUEUES.MEDIA_PROCESSING, { connection: redisConnection });
export const moderationQueue = new Queue(QUEUES.MODERATION, { connection: redisConnection });

// Factory helper — creates a typed worker for a given queue
export function createWorker(
  queueName: string,
  processor: (job: any) => Promise<void>,
): Worker {
  return new Worker(queueName, processor, { connection: redisConnection });
}
