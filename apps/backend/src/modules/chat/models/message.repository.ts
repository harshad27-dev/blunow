import { prisma } from "../../../prisma/prisma";

export class MessageRepository {
  async create(data: {
    chatId: string;
    senderId: string;
    type: any;
    content?: string;
    mediaUrl?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          ...data,
          content: data.content?.trim(),
          deliveredAt: new Date(),
        },
        include: {
          sender: {
            include: {
              profile: { select: { username: true, avatarUrl: true } },
            },
          },
          readReceipts: true,
        },
      });

      await tx.chat.update({
        where: { id: data.chatId },
        data: {
          deletedBy1: false,
          deletedBy2: false,
          lastMessageAt: message.createdAt,
          lastMessageContent:
            data.content || (data.mediaUrl ? "Shared media" : null),
          lastMessageId: message.id,
          unreadCount: { increment: 1 },
        },
      });

      return message;
    });
  }

  async findByChatId(
    chatId: string,
    pagination: { page: number; limit: number },
  ) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          include: { profile: { select: { username: true, avatarUrl: true } } },
        },
        readReceipts: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pagination.limit,
    });
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
}
