import { prisma } from '../../../prisma/prisma';

export class MatchRepository {
  async createRequest(data: { senderId: string; receiverId: string; message?: string }) {
    return prisma.matchRequest.create({
      data,
      include: {
        sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        receiver: { include: { profile: { select: { username: true, avatarUrl: true } } } },
      },
    });
  }

  async findRequest(senderId: string, receiverId: string) {
    return prisma.matchRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    });
  }

  async findRequestById(id: string) {
    return prisma.matchRequest.findUnique({ where: { id } });
  }

  async findIncomingRequests(receiverId: string) {
    return prisma.matchRequest.findMany({
      where: { receiverId, status: 'PENDING' },
      include: { sender: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOutgoingRequests(senderId: string) {
    return prisma.matchRequest.findMany({
      where: { senderId, status: 'PENDING' },
      include: { receiver: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRequestStatus(id: string, status: any) {
    return prisma.matchRequest.update({ where: { id }, data: { status } });
  }

  async createMatch(user1Id: string, user2Id: string) {
    return prisma.match.create({
      data: { user1Id, user2Id },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
      },
    });
  }

  async findMatchesByUser(userId: string) {
    return prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        chat: true,
      },
    });
  }

  async findMatchById(id: string) {
    return prisma.match.findUnique({ where: { id } });
  }

  async deleteMatch(id: string) {
    return prisma.match.delete({ where: { id } });
  }
}
