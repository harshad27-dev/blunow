import { prisma } from '../../../prisma/prisma';

export class MessageRepository {
  async create(data: {
    chatId: string;
    senderId: string;
    type: any;
    content?: string;
    mediaUrl?: string;
  }) {
    return prisma.message.create({
      data,
      include: {
        sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
      },
    });
  }

  async findByChatId(chatId: string, pagination: { page: number; limit: number }) {
    const skip = (pagination.page - 1) * pagination.limit;
    return prisma.message.findMany({
      where: { chatId },
      include: {
        sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
    });
  }

  async markAllRead(chatId: string, userId: string) {
    return prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
  }
}
