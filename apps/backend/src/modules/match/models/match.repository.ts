import { prisma } from '../../../prisma/prisma';

export type MatchRecommendationFilters = {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  gender?: string;
  useMyPreference?: boolean;
  interests?: string[];
  verifiedOnly?: boolean;
  onlineOnly?: boolean;
};

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

  async findRecommendationsForUser(
    userId: string,
    limit = 20,
    filters: MatchRecommendationFilters = {},
  ) {
    const [currentUser, existingRequests, existingMatches, incomingRequests, dismissals, blocks] = await Promise.all([
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
      prisma.matchDismissal.findMany({
        where: { userId },
        select: { dismissedUserId: true },
      }),
      prisma.userBlock.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: { blockerId: true, blockedId: true },
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
    dismissals.forEach((dismissal) => excludedUserIds.add(dismissal.dismissedUserId));
    blocks.forEach((block) => {
      excludedUserIds.add(
        block.blockerId === userId ? block.blockedId : block.blockerId,
      );
    });

    const preferenceGenders =
      filters.useMyPreference && currentUser?.profile?.interestedIn?.length
        ? normalizePreferenceGenders(currentUser.profile.interestedIn)
        : undefined;

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedUserIds) },
        isActive: true,
        AND: [
          {
            OR: [
              { privacyPreference: { is: null } },
              { privacyPreference: { is: { discoverable: true } } },
            ],
          },
        ],
        profile: {
          is: {
            ...(filters.gender && filters.gender !== 'ANY'
              ? { gender: filters.gender as any }
              : preferenceGenders
                ? { gender: { in: preferenceGenders as any[] } }
                : {}),
            ...(filters.interests?.length
              ? { interests: { hasSome: filters.interests } }
              : {}),
          },
        },
        ...(filters.verifiedOnly
          ? {
              OR: [
                { isVerified: true },
                { verification: { is: { status: 'VERIFIED' } } },
              ],
            }
          : {}),
      },
      include: {
        profile: true,
        verification: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(limit * 4, 40),
    });

    const currentInterests = currentUser?.profile?.interests ?? [];
    const incomingSenderIds = new Set(incomingRequests.map((request) => request.senderId));

    return users.map((user) => {
      const interests = user.profile?.interests ?? [];
      const sharedInterestCount = interests.filter((interest) =>
        currentInterests.includes(interest),
      ).length;
      const age = getAge(user.profile?.birthDate);
      const distanceMiles = getDistanceMiles(
        currentUser?.profile?.latitude,
        currentUser?.profile?.longitude,
        user.profile?.latitude,
        user.profile?.longitude,
      );
      const online = user.updatedAt >= new Date(Date.now() - 15 * 60 * 1000);

      const profileWithPhotos = user.profile as (typeof user.profile & { profilePhotoUrls?: string[] }) | null;
      const profilePhotoUrls = profileWithPhotos?.profilePhotoUrls ?? [];

      return {
        id: user.id,
        name: user.profile?.username ?? user.email.split('@')[0],
        lastName: '',
        age,
        city: user.profile?.location ?? 'Location not set',
        distance:
          typeof distanceMiles === 'number'
            ? `${Math.max(1, Math.round(distanceMiles))} mi away`
            : 'Nearby',
        occupation: user.profile?.relationship ?? 'Blunow member',
        online,
        verified: user.verification?.status === 'VERIFIED' || user.isVerified,
        quote: user.profile?.bio ?? 'No bio provided yet.',
        imageUrl: profilePhotoUrls[0] || user.profile?.bannerUrl || user.profile?.avatarUrl || '',
        avatarUrl: user.profile?.avatarUrl,
        profilePhotoUrls,
        interests,
        matchScore: Math.min(99, 70 + sharedInterestCount * 6),
        chatRequests: incomingRequests.length,
        alreadyLikedMe: incomingSenderIds.has(user.id),
      };
    }).filter((recommendation) => {
      if (filters.minAge && recommendation.age < filters.minAge) return false;
      if (filters.maxAge && recommendation.age > filters.maxAge) return false;
      if (filters.onlineOnly && !recommendation.online) return false;
      if (filters.maxDistance && typeof getDistanceValue(recommendation.distance) === 'number') {
        return getDistanceValue(recommendation.distance)! <= filters.maxDistance;
      }
      return true;
    }).slice(0, limit);
  }

  async dismissRecommendation(userId: string, dismissedUserId: string) {
    return prisma.matchDismissal.upsert({
      where: { userId_dismissedUserId: { userId, dismissedUserId } },
      update: {},
      create: { userId, dismissedUserId },
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

const getDistanceMiles = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
) => {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    return undefined;
  }

  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getDistanceValue = (distance: string) => {
  const value = Number(distance.match(/\d+/)?.[0]);
  return Number.isFinite(value) ? value : undefined;
};

const normalizePreferenceGenders = (values: string[]) => {
  const normalized = values
    .map((value) => {
      const key = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
      if (key === 'MEN') return 'MALE';
      if (key === 'WOMEN') return 'FEMALE';
      if (key === 'NON_BINARY') return 'NON_BINARY';
      if (['MALE', 'FEMALE', 'OTHER'].includes(key)) return key;
      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return normalized.length ? normalized : undefined;
};

