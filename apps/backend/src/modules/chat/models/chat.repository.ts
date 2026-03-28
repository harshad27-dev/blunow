import { prisma } from '../../../prisma/prisma';

export class ChatRepository {
  async findByUser(userId: string) {
    return prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
        user2: { include: { profile: { select: { displayName: true, avatarUrl: true } } } },
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

  async delete(id: string) {
    return prisma.chat.delete({ where: { id } });
  }
}
