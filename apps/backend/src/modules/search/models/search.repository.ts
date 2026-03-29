import { prisma } from '../../../prisma/prisma';

export class SearchRepository {
  async getUnifiedSearch(query: string, type: string, limit: number, offset: number) {
    if (!query) return { users: [], posts: [], rooms: [] };

    // Search Users
    let users = [];
    if (type === 'all' || type === 'users') {
      const u = await prisma.$queryRawUnsafe(`
        SELECT u.id, prof.username, prof."avatarUrl"
        FROM "users" u
        JOIN "profiles" prof ON u.id = prof."userId"
        WHERE to_tsvector('english', prof.username || ' ' || COALESCE(prof.bio, '')) @@ plainto_tsquery('english', $1)
        LIMIT $2 OFFSET $3
      `, query, limit, offset);
      users = u as any[];
    }

    // Search Posts (caption text)
    let posts = [];
    if (type === 'all' || type === 'posts') {
      const p = await prisma.$queryRawUnsafe(`
        SELECT p.id, p.caption, p."mediaUrls", u.id as "authorId"
        FROM "posts" p
        JOIN "users" u ON p."authorId" = u.id
        WHERE to_tsvector('english', COALESCE(p.caption, '')) @@ plainto_tsquery('english', $1)
        LIMIT $2 OFFSET $3
      `, query, limit, offset);
      posts = p as any[];
    }

    // Search Rooms
    let rooms = [];
    if (type === 'all' || type === 'rooms') {
      const r = await prisma.$queryRawUnsafe(`
        SELECT id, name, description, "avatarUrl"
        FROM "rooms"
        WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
        LIMIT $2 OFFSET $3
      `, query, limit, offset);
      rooms = r as any[];
    }

    return { users, posts, rooms };
  }

  async getAdvancedSearch(queryData: any, limit: number, offset: number) {
    // Basic Prisma matching algorithm similar to feed filtering
    // In MVP, we map explicit filters to the DB query
    let whereClause: any = {};
    if (queryData.location) {
      whereClause.profile = { ...whereClause.profile, location: { contains: queryData.location, mode: 'insensitive' } };
    }
    if (queryData.sexuality) {
      whereClause.sexuality = queryData.sexuality;
    }
    
    // Using prisma query instead of full queryRaw for simplicity 
    const users = await prisma.user.findMany({
      where: whereClause,
      include: { profile: true },
      take: limit,
      skip: offset
    });

    return { users: users.map(u => ({
      userId: u.id,
      username: u.profile?.username,
      location: u.profile?.location,
      age: u.profile?.birthDate ? (new Date().getFullYear() - u.profile.birthDate.getFullYear()) : null,
      interests: u.profile?.interests
    })), total: users.length };
  }

  async getTrendingHashtags(limit: number) {
    /* MVP implementation finding hashtags in recent posts */
    const recentPosts = await prisma.post.findMany({
      where: { caption: { contains: '#' }, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { caption: true }
    });

    const counts: Record<string, number> = {};
    for (const post of recentPosts) {
       const tags = post.caption?.match(/#[a-zA-Z0-9_]+/g) || [];
       tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    }

    const sorted = Object.entries(counts)
      .map(([hashtag, count]) => ({ hashtag, postCount: count, trendingScore: count, trend: 'up' }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, limit);

    return { hashtags: sorted };
  }
}
