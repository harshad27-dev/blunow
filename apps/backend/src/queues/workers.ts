import { Worker } from 'bullmq';
import {
  mediaProcessingQueue,
  moderationQueue,
  notificationQueue,
  redisConnection,
  storyExpiryQueue,
} from './queue';
import { notificationWorker } from '../modules/notifications/queues/notification.consumer';
import { storyExpiryWorker } from '../modules/stories/queues/story-expiry.consumer';
import { mediaWorker } from '../modules/media/queues/media.consumer';
import { moderationWorker } from '../modules/moderation/queues/moderation.consumer';

const workers: Worker[] = [
  notificationWorker,
  storyExpiryWorker,
  mediaWorker,
  moderationWorker,
];

let workersStarted = false;

export const startWorkers = () => {
  if (workersStarted) return;
  workersStarted = true;

  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      console.log(`[Queue:${worker.name}] Completed job ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      console.error(
        `[Queue:${worker.name}] Failed job ${job?.id ?? 'unknown'}:`,
        error,
      );
    });
  });

  console.log(
    `[Queue] Workers started: ${workers.map((worker) => worker.name).join(', ')}`,
  );
};

export const closeWorkers = async () => {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all([
    notificationQueue.close(),
    storyExpiryQueue.close(),
    mediaProcessingQueue.close(),
    moderationQueue.close(),
  ]);
  await redisConnection.quit();
};
