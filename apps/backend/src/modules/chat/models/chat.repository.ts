import { prisma } from '../../../prisma/prisma';

export class ChatRepository {
  async findByUser(userId: string) {
    return prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        user2: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
      },
    });
  }

  async create(matchId: string, user1Id: string, user2Id: string) {
    return prisma.chat.create({ data: { matchId, user1Id, user2Id } });
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
