import { prisma } from "../../../prisma/prisma";

export class SearchRepository {
  async getDiscoverPeople(
    currentUserId: string,
    limit: number,
    offset: number,
    category = "For you",
  ) {
    const [currentUser, excludedRequests, excludedMatches, blocks, users] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: currentUserId },
          include: { profile: true },
        }),
        prisma.matchRequest.findMany({
          where: {
            OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
          },
          select: { senderId: true, receiverId: true },
        }),
        prisma.match.findMany({
          where: {
            OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
          },
          select: { user1Id: true, user2Id: true },
        }),
        prisma.userBlock.findMany({
          where: {
            OR: [
              { blockerId: currentUserId },
              { blockedId: currentUserId },
            ],
          },
          select: { blockerId: true, blockedId: true },
        }),
        prisma.user.findMany({
          where: {
            id: { not: currentUserId },
            isActive: true,
            profile: { isNot: null },
            OR: [
              { privacyPreference: { is: null } },
              { privacyPreference: { is: { discoverable: true } } },
            ],
          },
          include: {
            profile: true,
            verification: { select: { status: true } },
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: Math.max(limit + offset + 1, limit),
        }),
      ]);

    const excludedUserIds = new Set<string>([currentUserId]);
    excludedRequests.forEach((request) => {
      excludedUserIds.add(
        request.senderId === currentUserId
          ? request.receiverId
          : request.senderId,
      );
    });
    excludedMatches.forEach((match) => {
      excludedUserIds.add(
        match.user1Id === currentUserId ? match.user2Id : match.user1Id,
      );
    });
    blocks.forEach((block) => {
      excludedUserIds.add(
        block.blockerId === currentUserId ? block.blockedId : block.blockerId,
      );
    });

    const currentInterests = currentUser?.profile?.interests ?? [];
    const normalizedCategory = category.toLowerCase();
    const onlineCutoff = new Date(Date.now() - 15 * 60 * 1000);

    const discoveryProfiles = users
      .filter((user) => !excludedUserIds.has(user.id))
      .map((user) => {
        const interests = user.profile?.interests ?? [];
        const sharedInterestCount = interests.filter((interest) =>
          currentInterests.includes(interest),
        ).length;
        const online = user.updatedAt >= onlineCutoff;
        const distance = getDistanceLabel(
          currentUser?.profile?.latitude,
          currentUser?.profile?.longitude,
          user.profile?.latitude,
          user.profile?.longitude,
        );
        const matchScore = Math.min(
          99,
          62 +
            sharedInterestCount * 7 +
            (user.verification?.status === "VERIFIED" || user.isVerified
              ? 5
              : 0) +
            (online ? 4 : 0),
        );

        return {
          id: user.id,
          username: user.profile?.username ?? user.email.split("@")[0],
          name: user.profile?.username ?? user.email.split("@")[0],
          age: getAge(user.profile?.birthDate),
          city: user.profile?.location ?? "Location not set",
          distance,
          avatarUrl: user.profile?.avatarUrl,
          imageUrl: user.profile?.avatarUrl || "",
          bio: user.profile?.bio ?? "No bio provided yet.",
          quote: user.profile?.bio ?? "No bio provided yet.",
          interests,
          online,
          verified: user.verification?.status === "VERIFIED" || user.isVerified,
          matchScore,
          isConnected: false,
        };
      })
      .filter((profile) => matchesDiscoverCategory(profile, normalizedCategory))
      .sort((a, b) => {
        if (normalizedCategory === "online") {
          return (
            Number(b.online) - Number(a.online) || b.matchScore - a.matchScore
          );
        }

        return b.matchScore - a.matchScore;
      });

    const pagedProfiles = discoveryProfiles.slice(offset, offset + limit);

    return {
      data: pagedProfiles,
      hasMore: discoveryProfiles.length > offset + limit,
      nextPage:
        discoveryProfiles.length > offset + limit
          ? Math.floor(offset / limit) + 2
          : null,
    };
  }

  async getUnifiedSearch(
    currentUserId: string,
    query: string,
    type: string,
    limit: number,
    offset: number,
  ) {
    if (!query) return { users: [], posts: [], rooms: [] };

    // Search Users
    let users = [];
    if (type === "all" || type === "users") {
      const u = await prisma.$queryRawUnsafe(
        `
        SELECT u.id, prof.username, prof."avatarUrl", prof.bio, prof."birthDate", prof.interests, prof.location
        FROM "users" u
        JOIN "profiles" prof ON u.id = prof."userId"
        LEFT JOIN "user_privacy_preferences" privacy ON privacy."userId" = u.id
        WHERE (
          to_tsvector('english', prof.username || ' ' || COALESCE(prof.bio, '')) @@ plainto_tsquery('english', $1)
          OR prof.username ILIKE '%' || $1 || '%'
        )
        AND u.id <> $4
        AND u."isActive" = true
        AND COALESCE(privacy.discoverable, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM "user_blocks" block
          WHERE (block."blockerId" = $4 AND block."blockedId" = u.id)
             OR (block."blockedId" = $4 AND block."blockerId" = u.id)
        )
        LIMIT $2 OFFSET $3
      `,
        query,
        limit,
        offset,
        currentUserId,
      );
      users = u as any[];
    }

    // Search Posts (caption text)
    let posts = [];
    if (type === "all" || type === "posts") {
      const p = await prisma.$queryRawUnsafe(
        `
        SELECT p.id, p.caption, p."mediaUrls", u.id as "authorId"
        FROM "posts" p
        JOIN "users" u ON p."authorId" = u.id
        WHERE (
          to_tsvector('english', COALESCE(p.caption, '')) @@ plainto_tsquery('english', $1)
          OR p.caption ILIKE '%' || $1 || '%'
        )
        AND p."isPublic" = true
        AND p."isDeleted" = false
        LIMIT $2 OFFSET $3
      `,
        query,
        limit,
        offset,
      );
      posts = p as any[];
    }

    // Search Rooms
    let rooms = [];
    if (type === "all" || type === "rooms") {
      const r = await prisma.$queryRawUnsafe(
        `
        SELECT id, name, description, "avatarUrl"
        FROM "rooms"
        WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
        LIMIT $2 OFFSET $3
      `,
        query,
        limit,
        offset,
      );
      rooms = r as any[];
    }

    return { users, posts, rooms };
  }

  async getAdvancedSearch(queryData: any, limit: number, offset: number) {
    // Basic Prisma matching algorithm similar to feed filtering
    // In MVP, we map explicit filters to the DB query
    let whereClause: any = {};
    if (queryData.location) {
      whereClause.profile = {
        ...whereClause.profile,
        location: { contains: queryData.location, mode: "insensitive" },
      };
    }
    if (queryData.sexuality) {
      whereClause.sexuality = queryData.sexuality;
    }

    // Using prisma query instead of full queryRaw for simplicity
    const users = await prisma.user.findMany({
      where: whereClause,
      include: { profile: true },
      take: limit,
      skip: offset,
    });

    return {
      users: users.map((u) => ({
        userId: u.id,
        username: u.profile?.username,
        location: u.profile?.location,
        age: u.profile?.birthDate
          ? new Date().getFullYear() - u.profile.birthDate.getFullYear()
          : null,
        interests: u.profile?.interests,
      })),
      total: users.length,
    };
  }

  async getTrendingHashtags(limit: number) {
    /* MVP implementation finding hashtags in recent posts */
    const recentPosts = await prisma.post.findMany({
      where: {
        caption: { contains: "#" },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { caption: true },
    });

    const counts: Record<string, number> = {};
    for (const post of recentPosts) {
      const tags = post.caption?.match(/#[a-zA-Z0-9_]+/g) || [];
      tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    }

    const sorted = Object.entries(counts)
      .map(([hashtag, count]) => ({
        hashtag,
        postCount: count,
        trendingScore: count,
        trend: "up",
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, limit);

    return { hashtags: sorted };
  }
}

const getAge = (birthDate?: Date | null) => {
  if (!birthDate) return 18;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
};

const matchesDiscoverCategory = (
  profile: { interests: string[]; online: boolean; distance: string },
  category: string,
) => {
  if (category === "for you" || category === "nearby") return true;
  if (category === "online") return profile.online;

  return profile.interests.some(
    (interest) => interest.toLowerCase() === category,
  );
};

const getDistanceLabel = (
  fromLat?: number | null,
  fromLng?: number | null,
  toLat?: number | null,
  toLng?: number | null,
) => {
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return "Nearby";
  }

  const distanceKm = getDistanceKm(fromLat, fromLng, toLat, toLng);
  if (distanceKm < 1) return "Less than 1 km";

  return `${Math.round(distanceKm)} km`;
};

const getDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) => {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const toRadians = (degrees: number) => degrees * (Math.PI / 180);
