import { StoriesRepository } from '../models/stories.repository';
import { storyExpiryQueue } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class StoriesService {
  private storiesRepository = new StoriesRepository();

  async createStory(authorId: string, data: {
    mediaUrl: string;
    mediaType: any;
    caption?: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour stories

    const story = await this.storiesRepository.create({ ...data, authorId, expiresAt });

    // Schedule expiry job
    await storyExpiryQueue.add(
      QUEUES.STORY_EXPIRY,
      { storyId: story.id },
      { delay: 24 * 60 * 60 * 1000 }, // 24h
    );

    eventBus.emit(EVENTS.STORY.CREATED, { storyId: story.id, authorId });
    return story;
  }

  async getActiveStories(userId: string) {
    return this.storiesRepository.findActiveStories(userId);
  }

  async getActiveStoriesByAuthorId(authorId: string) {
    return this.storiesRepository.findActiveStoriesByAuthorId(authorId);
  }

  async getStoryById(id: string) {
    const story = await this.storiesRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    return story;
  }

  async deleteStory(id: string, userId: string) {
    const story = await this.storiesRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    if (story.authorId !== userId) throw new AppError('Forbidden', 403);
    await this.storiesRepository.delete(id);
  }

  async recordView(storyId: string, viewerId: string) {
    await this.storiesRepository.addView(storyId, viewerId);
  }
}
