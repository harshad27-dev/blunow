import { MessageRepository } from "../models/message.repository";
import { ChatRepository } from "../models/chat.repository";
import { eventBus } from "../../../events/event-bus";
import { EVENTS } from "../../../events/event-constants";
import { AppError } from "../../../common/middleware/error.middleware";
import { prisma } from "../../../prisma/prisma";

export class MessageService {
  private messageRepository = new MessageRepository();
  private chatRepository = new ChatRepository();

  async getMessages(
    chatId: string,
    userId: string,
    pagination: { page: number; limit: number },
  ) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError("Chat not found", 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError("Forbidden", 403);
    }
    const messages = await this.messageRepository.findByChatId(
      chatId,
      pagination,
    );
    const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
    const privacy = await prisma.userPrivacyPreference.findUnique({
      where: { userId: otherUserId },
      select: { readReceipts: true },
    });

    if (privacy?.readReceipts !== false) return messages;

    return messages.map((message) =>
      message.senderId === userId
        ? {
            ...message,
            isRead: false,
            readReceipts: (message.readReceipts as any[]).filter(
              (receipt) => receipt.readByUserId !== otherUserId,
            ),
          }
        : message,
    );
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    data: {
      type: any;
      content?: string;
      mediaUrl?: string;
      replyToMessageId?: string;
    },
  ) {
    if (!data.content?.trim() && !data.mediaUrl) {
      throw new AppError("Message content or media is required", 400);
    }
    if (data.content && data.content.trim().length > 4000) {
      throw new AppError("Message content is too long", 400);
    }

    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError("Chat not found", 404);
    if (chat.user1Id !== senderId && chat.user2Id !== senderId) {
      throw new AppError("Forbidden", 403);
    }

    if (chat.status === "REQUESTED") {
      if (chat.requestedById !== senderId) {
        throw new AppError("Accept the message request before replying", 403);
      }
      if (data.type !== "TEXT" || data.mediaUrl) {
        throw new AppError("Message requests support text only", 400);
      }
      if (data.replyToMessageId) {
        throw new AppError("Accept the message request before replying to messages", 403);
      }
      const requestMessageCount = await prisma.message.count({
        where: { chatId, senderId },
      });
      if (requestMessageCount >= 3) {
        throw new AppError("Wait for this request to be accepted before sending more messages", 403);
      }
    } else if (chat.status !== "ACTIVE") {
      throw new AppError("This conversation is no longer available", 403);
    }

    if (data.replyToMessageId) {
      const replyTarget = await prisma.message.findUnique({
        where: { id: data.replyToMessageId },
        select: { chatId: true },
      });

      if (!replyTarget || replyTarget.chatId !== chatId) {
        throw new AppError("Reply message not found", 404);
      }
    }

    const message = await this.messageRepository.create({
      chatId,
      senderId,
      ...data,
    });
    eventBus.emit(EVENTS.CHAT.MESSAGE_SENT, {
      chatId,
      messageId: message.id,
      senderId,
    });
    return message;
  }

  async markAsRead(chatId: string, userId: string) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError("Chat not found", 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError("Forbidden", 403);
    }
    const [result, privacy] = await Promise.all([
      this.messageRepository.markAllRead(chatId, userId),
      prisma.userPrivacyPreference.findUnique({
        where: { userId },
        select: { readReceipts: true },
      }),
    ]);
    return {
      ...result,
      shareReceipt: privacy?.readReceipts !== false,
    };
  }

  async deleteForEveryone(chatId: string, messageId: string, userId: string) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError("Chat not found", 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError("Forbidden", 403);
    }

    try {
      return await this.messageRepository.deleteForEveryone(messageId, userId);
    } catch (error: any) {
      if (error.message === "Message not found") {
        throw new AppError("Message not found", 404);
      }
      if (error.message === "Forbidden") {
        throw new AppError("Only the sender can delete this message", 403);
      }
      throw error;
    }
  }
}

