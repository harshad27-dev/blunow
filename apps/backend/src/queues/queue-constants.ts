export const QUEUES = {
  STORY_EXPIRY: 'story-expiry',
  NOTIFICATION: 'notification',
  MEDIA_PROCESSING: 'media-processing',
  MODERATION: 'moderation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
