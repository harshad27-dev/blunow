import { prisma } from "../../../prisma/prisma";

const baseMessageInclude = {
  sender: {
    include: {
      profile: { select: { username: true, avatarUrl: true } },
    },
  },
  readReceipts: true,
};

const messageInclude = {
  ...baseMessageInclude,
  replyToMessage: {
    include: {
      sender: {
        include: {
          profile: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  },
};

const isStaleReplyClientError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Unknown field `replyToMessage`") ||
    message.includes("Unknown argument `replyToMessageId`") ||
    message.includes("Unknown arg `replyToMessageId`") ||
    message.includes("Unknown argument `replyToMessage`")
  );
};

export class MessageRepository {
  async create(data: {
    chatId: string;
    senderId: string;
    type: any;
    content?: string;
    mediaUrl?: string;
    replyToMessageId?: string;
    postId?: string;
    postPreviewMediaUrl?: string;
    postPreviewCaption?: string;
    postAuthorName?: string;
  }) {
    const createMessage = (includeReply: boolean) =>
      prisma.$transaction(async (tx) => {
        const messageData: Record<string, unknown> = {
          chatId: data.chatId,
          senderId: data.senderId,
          type: data.type,
          content: data.content?.trim(),
          mediaUrl: data.mediaUrl,
          deliveredAt: new Date(),
          postId: data.postId,
          postPreviewMediaUrl: data.postPreviewMediaUrl,
          postPreviewCaption: data.postPreviewCaption,
          postAuthorName: data.postAuthorName,
        };

        if (includeReply && data.replyToMessageId) {
          messageData.replyToMessageId = data.replyToMessageId;
        }

        const message = await tx.message.create({
          data: messageData as any,
          include: includeReply ? (messageInclude as any) : baseMessageInclude,
        });

        await tx.chat.update({
          where: { id: data.chatId },
          data: {
            deletedBy1: false,
            deletedBy2: false,
            lastMessageAt: message.createdAt,
            lastMessageContent:
              data.type === "POST"
                ? "Shared a post"
                : data.content || (data.mediaUrl ? "Shared media" : null),
            lastMessageId: message.id,
            unreadCount: { increment: 1 },
          },
        });

        return message;
      });

    try {
      return await createMessage(true);
    } catch (error) {
      if (!isStaleReplyClientError(error)) throw error;
      return createMessage(false);
    }
  }

  async findByChatId(
    chatId: string,
    pagination: { page: number; limit: number },
  ) {
    const skip = (pagination.page - 1) * pagination.limit;
    const query = (includeReply: boolean) =>
      prisma.message.findMany({
        where: { chatId },
        include: includeReply ? (messageInclude as any) : baseMessageInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.limit,
      });

    try {
      return await query(true);
    } catch (error) {
      if (!isStaleReplyClientError(error)) throw error;
      return query(false);
    }
  }

  async markAllRead(chatId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const unreadMessages = await tx.message.findMany({
        where: {
          chatId,
          senderId: { not: userId },
          readReceipts: { none: { readByUserId: userId } },
        },
        select: { id: true },
      });

      if (unreadMessages.length === 0) {
        await tx.chat.update({
          where: { id: chatId },
          data: { unreadCount: 0 },
        });
        return { count: 0 };
      }

      await tx.messageReadReceipt.createMany({
        data: unreadMessages.map((message) => ({
          messageId: message.id,
          readByUserId: userId,
        })),
        skipDuplicates: true,
      });

      await tx.message.updateMany({
        where: { id: { in: unreadMessages.map((message) => message.id) } },
        data: { isRead: true },
      });

      await tx.chat.update({
        where: { id: chatId },
        data: { unreadCount: 0 },
      });

      return { count: unreadMessages.length };
    });
  }

  async countUnreadByChatIds(chatIds: string[], userId: string) {
    if (chatIds.length === 0) return new Map<string, number>();

    const grouped = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        chatId: { in: chatIds },
        senderId: { not: userId },
        readReceipts: { none: { readByUserId: userId } },
      },
      _count: { _all: true },
    });

    return new Map(grouped.map((item) => [item.chatId, item._count._all]));
  }

  async deleteForEveryone(messageId: string, userId: string) {
    const deleteMessage = (includeReply: boolean) =>
      prisma.$transaction(async (tx) => {
        const message = await tx.message.findUnique({
          where: { id: messageId },
          include: { chat: true },
        });

        if (!message) throw new Error("Message not found");
        if (message.senderId !== userId) throw new Error("Forbidden");

        const updatedMessage = await tx.message.update({
          where: { id: messageId },
          data: {
            content: null,
            mediaUrl: null,
            isDeleted: true,
          },
          include: includeReply ? (messageInclude as any) : baseMessageInclude,
        });

        if (message.chat.lastMessageId === message.id) {
          await tx.chat.update({
            where: { id: message.chatId },
            data: { lastMessageContent: "Message deleted" },
          });
        }

        return updatedMessage;
      });

    try {
      return await deleteMessage(true);
    } catch (error) {
      if (!isStaleReplyClientError(error)) throw error;
      return deleteMessage(false);
    }
  }
}

