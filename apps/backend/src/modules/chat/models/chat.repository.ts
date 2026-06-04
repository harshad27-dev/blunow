import { prisma } from '../../../prisma/prisma';
import { MessageRepository } from './message.repository';

export class ChatRepository {
  private messageRepository = new MessageRepository();

  async findByUser(userId: string) {
    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        user2: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            readReceipts: true,
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });

    const unreadCounts = await this.messageRepository.countUnreadByChatIds(
      chats.map((chat) => chat.id),
      userId,
    );

    return chats.map((chat) => ({
      ...chat,
      unreadCount: unreadCounts.get(chat.id) ?? 0,
    }));
  }

  async findById(id: string) {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async create(matchId: string, user1Id: string, user2Id: string) {
    return prisma.chat.upsert({
      where: { matchId },
      update: {},
      create: { matchId, user1Id, user2Id },
    });
  }

  async updateSettings(chatId: string, user1Id: string, user2Id: string, currentUserId: string, settings: { muted?: boolean; archived?: boolean }) {
    const dataToUpdate: any = {};
    if (settings.muted !== undefined) {
      if (currentUserId === user1Id) dataToUpdate.mutedBy1 = settings.muted;
      if (currentUserId === user2Id) dataToUpdate.mutedBy2 = settings.muted;
    }
    if (settings.archived !== undefined) {
      if (currentUserId === user1Id) dataToUpdate.archivedBy1 = settings.archived;
      if (currentUserId === user2Id) dataToUpdate.archivedBy2 = settings.archived;
    }
    return prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
  }

  async delete(id: string) {
    return prisma.chat.delete({ where: { id } });
  }
}
