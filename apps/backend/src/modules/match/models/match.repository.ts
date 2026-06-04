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
    const existing = await this.findMatchBetweenUsers(user1Id, user2Id);
    if (existing) return existing;

    return prisma.match.create({
      data: { user1Id, user2Id },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        chat: true,
      },
    });
  }

  async findMatchBetweenUsers(user1Id: string, user2Id: string) {
    return prisma.match.findFirst({
      where: {
        OR: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id },
        ],
      },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        chat: true,
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

  async findRecommendationsForUser(userId: string, limit = 20) {
    const [currentUser, existingRequests, existingMatches, incomingRequests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.matchRequest.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true, status: true },
      }),
      prisma.match.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        select: { user1Id: true, user2Id: true },
      }),
      prisma.matchRequest.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        select: { senderId: true },
      }),
    ]);

    const excludedUserIds = new Set<string>([userId]);
    existingRequests.forEach((request) => {
      if (request.senderId === userId) {
        excludedUserIds.add(request.receiverId);
        return;
      }

      if (request.status !== 'PENDING') {
        excludedUserIds.add(request.senderId);
      }
    });
    existingMatches.forEach((match) => {
      excludedUserIds.add(match.user1Id);
      excludedUserIds.add(match.user2Id);
    });

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedUserIds) },
        isActive: true,
        profile: {
          isNot: null,
        },
      },
      include: {
        profile: true,
        verification: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const currentInterests = currentUser?.profile?.interests ?? [];
    const incomingSenderIds = new Set(incomingRequests.map((request) => request.senderId));

    return users.map((user) => {
      const interests = user.profile?.interests ?? [];
      const sharedInterestCount = interests.filter((interest) =>
        currentInterests.includes(interest),
      ).length;

      return {
        id: user.id,
        name: user.profile?.username ?? user.email.split('@')[0],
        lastName: '',
        age: getAge(user.profile?.birthDate),
        city: user.profile?.location ?? 'Location not set',
        distance: 'Nearby',
        occupation: user.profile?.relationship ?? 'Blunow member',
        online: false,
        verified: user.verification?.status === 'VERIFIED' || user.isVerified,
        quote: user.profile?.bio ?? 'No bio provided yet.',
        imageUrl: user.profile?.bannerUrl || user.profile?.avatarUrl || '',
        avatarUrl: user.profile?.avatarUrl,
        interests,
        matchScore: Math.min(99, 70 + sharedInterestCount * 6),
        chatRequests: incomingRequests.length,
        alreadyLikedMe: incomingSenderIds.has(user.id),
      };
    });
  }

  async findMatchById(id: string) {
    return prisma.match.findUnique({ where: { id } });
  }

  async deleteMatch(id: string) {
    return prisma.match.delete({ where: { id } });
  }
}

const getAge = (birthDate?: Date | null) => {
  if (!birthDate) return 18;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};
