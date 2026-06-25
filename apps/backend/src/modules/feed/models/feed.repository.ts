import { Prisma } from "@prisma/client";
import { prisma } from "../../../prisma/prisma";

const postFieldNames = new Set(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Post")
    ?.fields.map((field) => field.name) ?? [],
);

const supportsAnonymousPosts = postFieldNames.has("isAnonymous");
let anonymousColumnName: string | null | undefined;

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
    cursor?: string;
  }) {
    // For MVP, we will pull all public posts through Prisma to ensure they show up
    // even if advanced profile properties or distances are missing.
    const cursorPost = decodeFeedCursor(params.cursor);
    const posts = await prisma.post.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        ...(cursorPost
          ? {
              OR: [
                { createdAt: { lt: cursorPost.createdAt } },
                { createdAt: cursorPost.createdAt, id: { lt: cursorPost.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit * 3,
      skip: cursorPost ? 0 : params.offset,
      include: {
        author: {
          include: {
            profile: true,
            followers: {
              where: { followerId: params.userId },
              select: { followerId: true },
            },
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
        comments: {
          where: { authorId: params.userId },
          select: { id: true },
          take: 1,
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
    });

    const anonymousById = await getAnonymousFlags(posts.map((post) => post.id));

    // Map Prisma objects back to the expected raw format for FeedService
    const rankedPosts = posts
      .map((p) => {
        const ageHours = Math.max(
          1,
          (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60),
        );
        const engagementScore =
          Math.log1p(p._count.likes * 2 + p._count.comments * 3 + p._count.saves);
        const followingBoost = p.author.followers.length > 0 ? 4 : 0;
        const unseenBoost =
          p.likes.length === 0 && p.saves.length === 0 && p.comments.length === 0
            ? 1.5
            : 0;
        const recencyScore = 8 / Math.sqrt(ageHours);

        return {
          id: p.id,
          caption: p.caption,
          mediaUrls: p.mediaUrls,
          isAnonymous: supportsAnonymousPosts
            ? Boolean((p as any).isAnonymous)
            : Boolean(anonymousById.get(p.id)),
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
          rankingScore: recencyScore + engagementScore + followingBoost + unseenBoost,
        };
      })
      .sort((a, b) => {
        if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, params.limit);

    const lastWindowPost = posts[posts.length - 1];
    return {
      items: rankedPosts,
      nextCursor:
        posts.length > params.limit && lastWindowPost
          ? encodeFeedCursor(lastWindowPost.createdAt, lastWindowPost.id)
          : null,
    };
  }

  async getPeopleNearYou(
    userId: string,
    lat: number,
    lng: number,
    maxDistance: number,
    limit: number,
    offset: number,
  ) {
    const query = `
      SELECT u."id", prof."username", prof."avatarUrl", u."sexuality", prof."interests",
      (
        6371 * acos(
          cos(radians($1)) * cos(radians(prof."latitude")) *
          cos(radians(prof."longitude") - radians($2)) +
          sin(radians($1)) * sin(radians(prof."latitude"))
        )
      ) AS distance
      FROM "users" u
      JOIN "profiles" prof ON u."id" = prof."userId"
      WHERE u."id" <> $5
        AND u."isActive" = true
        AND prof."latitude" IS NOT NULL
        AND prof."longitude" IS NOT NULL
      ORDER BY distance ASC
      LIMIT $3 OFFSET $4
    `;
    const users = await prisma.$queryRawUnsafe(query, lat, lng, limit, offset, userId);
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

const getAnonymousFlags = async (ids: string[]) => {
  if (ids.length === 0 || supportsAnonymousPosts)
    return new Map<string, boolean>();

  const columnName = await getAnonymousColumnName();
  if (!columnName) return new Map<string, boolean>();

  const rows = await prisma.$queryRawUnsafe<
    { id: string; isAnonymous: boolean }[]
  >(
    `SELECT "id", "${columnName}" AS "isAnonymous" FROM "posts" WHERE "id" IN (${ids
      .map((_, index) => `$${index + 1}`)
      .join(", ")})`,
    ...ids,
  );

  return new Map(rows.map((row) => [row.id, row.isAnonymous]));
};

const getAnonymousColumnName = async () => {
  if (anonymousColumnName !== undefined) return anonymousColumnName;

  const rows = await prisma.$queryRaw<
    { column_name: string }[]
  >`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'posts'
      AND column_name IN ('isAnonymous', 'is_anonymous')
    LIMIT 1
  `;

  anonymousColumnName = rows[0]?.column_name ?? null;
  return anonymousColumnName;
};

const encodeFeedCursor = (createdAt: Date, id: string) =>
  Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString(
    "base64url",
  );

const decodeFeedCursor = (cursor?: string) => {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!parsed?.createdAt || !parsed?.id) return null;
    return {
      createdAt: new Date(parsed.createdAt),
      id: String(parsed.id),
    };
  } catch {
    return null;
  }
};
