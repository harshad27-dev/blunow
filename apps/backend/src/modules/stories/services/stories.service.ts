import { StoriesRepository } from '../models/stories.repository';
import { storyExpiryQueue } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';
import { prisma } from '../../../prisma/prisma';

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

  async getStoryById(id: string, viewerId?: string) {
    const story = await this.storiesRepository.findById(id, viewerId);
    if (!story) throw new AppError('Story not found', 404);
    return {
      ...story,
      isViewed:
        story.authorId === viewerId || Boolean((story as any).views?.length),
      viewCount: story._count?.views || 0,
      views: undefined,
    };
  }

  async deleteStory(id: string, userId: string) {
    const story = await this.storiesRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    if (story.authorId !== userId) throw new AppError('Forbidden', 403);
    await this.storiesRepository.delete(id);
  }


  async replyToStory(storyId: string, senderId: string, content: string) {
    const replyContent = content.trim();
    if (!replyContent) throw new AppError('Reply is required', 400);

    const story = await this.storiesRepository.findById(storyId);
    if (!story || story.isDeleted || story.expiresAt <= new Date()) {
      throw new AppError('Story not found or expired', 404);
    }
    if (story.authorId === senderId) {
      throw new AppError('You cannot reply to your own story', 400);
    }

    const authorId = story.authorId;
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: authorId },
          { blockerId: authorId, blockedId: senderId },
        ],
      },
      select: { blockerId: true },
    });
    if (block) throw new AppError('You cannot reply to this story', 403);

    return prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirst({
        where: {
          OR: [
            { user1Id: senderId, user2Id: authorId },
            { user1Id: authorId, user2Id: senderId },
          ],
        },
        include: { chat: true },
      });

      let chat = match?.chat ?? null;
      let request = await tx.matchRequest.findUnique({
        where: { senderId_receiverId: { senderId, receiverId: authorId } },
        include: { chat: true },
      });

      if (!chat) {
        if (!request) {
          const incoming = await tx.matchRequest.findUnique({
            where: { senderId_receiverId: { senderId: authorId, receiverId: senderId } },
            include: { chat: true },
          });

          if (incoming?.status === 'PENDING') {
            await tx.matchRequest.update({ where: { id: incoming.id }, data: { status: 'ACCEPTED' } });
            const createdMatch = await tx.match.create({
              data: { user1Id: authorId, user2Id: senderId },
            });
            chat = incoming.chat
              ? await tx.chat.update({
                  where: { id: incoming.chat.id },
                  data: { matchId: createdMatch.id, status: 'ACTIVE', deletedBy1: false, deletedBy2: false },
                })
              : await tx.chat.create({
                  data: { matchId: createdMatch.id, user1Id: authorId, user2Id: senderId, status: 'ACTIVE' },
                });
          }
        }
      }

      if (!chat) {
        if (!request) {
          request = await tx.matchRequest.create({
            data: {
              senderId,
              receiverId: authorId,
              message: replyContent,
            },
            include: { chat: true },
          });
        }

        chat = request.chat ?? await tx.chat.create({
          data: {
            requestId: request.id,
            user1Id: senderId,
            user2Id: authorId,
            requestedById: senderId,
            status: 'REQUESTED',
          },
        });
      }

      const message = await tx.message.create({
        data: {
          chatId: chat.id,
          senderId,
          type: 'STORY_REPLY',
          content: replyContent,
          storyId: story.id,
          storyPreviewMediaUrl: story.mediaUrl,
          storyPreviewCaption: story.caption,
          storyAuthorId: story.authorId,
          deliveredAt: new Date(),
        },
        include: {
          sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
          readReceipts: true,
          replyToMessage: {
            include: {
              sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            },
          },
        },
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: {
          deletedBy1: false,
          deletedBy2: false,
          lastMessageAt: message.createdAt,
          lastMessageContent: 'Replied to a story',
          lastMessageId: message.id,
          unreadCount: { increment: 1 },
        },
      });

      eventBus.emit(EVENTS.CHAT.MESSAGE_SENT, {
        chatId: chat.id,
        messageId: message.id,
        senderId,
      });

      return { chatId: chat.id, message };
    });
  }
  async recordView(storyId: string, viewerId: string) {
    const story = await this.storiesRepository.findById(storyId);
    if (!story) throw new AppError('Story not found', 404);

    const existingView = await this.storiesRepository.findView(storyId, viewerId);
    await this.storiesRepository.addView(storyId, viewerId);
    if (!existingView && story.authorId !== viewerId) {
      eventBus.emit(EVENTS.STORY.VIEWED, {
        storyId,
        authorId: story.authorId,
        viewerId,
      });
    }
  }
}
