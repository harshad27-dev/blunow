import { prisma } from "../../../prisma/prisma";

export class FeedRepository {
  async getFilteredFeed(params: {
    userId: string;
    lat: number | null;
    lng: number | null;
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string[];
    sexuality?: string;
    sort?: string;
    limit: number;
    offset: number;
  }) {
    // For MVP, we will pull all public posts through Prisma to ensure they show up
    // even if advanced profile properties or distances are missing.
    const posts = await prisma.post.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
      skip: params.offset,
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        likes: {
          where: { userId: params.userId },
          select: { id: true },
        },
        saves: {
          where: { userId: params.userId },
          select: { id: true },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
    });

    // Map Prisma objects back to the expected raw format for FeedService
    return posts.map((p) => ({
      id: p.id,
      caption: p.caption,
      mediaUrls: p.mediaUrls,
      authorId: p.authorId,
      username: p.author.profile?.username || "Unknown",
      avatarUrl: p.author.profile?.avatarUrl || null,
      sexuality: p.author.sexuality,
      distance: null, // Distance logic temporarily skipped for global MVP feed
      createdAt: p.createdAt,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      savesCount: p._count.saves,
      isLiked: p.likes.length > 0,
      isSaved: p.saves.length > 0,
    }));
  }

  async getPeopleNearYou(
    lat: number,
    lng: number,
    maxDistance: number,
    limit: number,
    offset: number,
  ) {
    const query = `
      SELECT u."id", u."username", prof."avatarUrl", u."sexuality", prof."interests",
      (
        6371 * acos(
          cos(radians($1)) * cos(radians(prof."latitude")) *
          cos(radians(prof."longitude") - radians($2)) +
          sin(radians($1)) * sin(radians(prof."latitude"))
        )
      ) AS distance
      FROM "users" u
      JOIN "profiles" prof ON u."id" = prof."userId"
      WHERE prof."latitude" IS NOT NULL AND prof."longitude" IS NOT NULL
      ORDER BY distance ASC
      LIMIT $3 OFFSET $4
    `;
    const users = await prisma.$queryRawUnsafe(query, lat, lng, limit, offset);
    return (users as any[]).filter((u) => u.distance <= maxDistance);
  }

  async getPeopleYouMayVibeWith(
    userId: string,
    interests: string[],
    sexuality: string,
    limit: number,
    offset: number,
  ) {
    // Pull users with matching sexuality
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        sexuality: sexuality as any,
      },
      include: { profile: true },
      take: 100, // pull a chunk to score
    });

    const scored = users
      .map((u) => {
        const dbInterests = u.profile?.interests || [];
        const common = dbInterests.filter((i) => interests.includes(i));
        const score = (common.length / (interests.length || 1)) * 0.5 + 0.3; // rudimentary logic

        return {
          userId: u.id,
          username: u.profile?.username,
          avatarUrl: u.profile?.avatarUrl,
          sexuality: u.sexuality,
          commonInterests: common,
          sharedInterestCount: common.length,
          matchScore: Math.min(score, 1.0),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(offset, offset + limit);
  }
}
