import { prisma } from '../../../prisma/prisma';

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
    // Basic implementation utilizing Prisma and filtering locally if PostGIS isn't fully enabled
    // For Haversine directly in queryRaw:
    let query = `
      SELECT p.*, 
             u."id" as "authorId", u."username", prof."avatarUrl", prof."minAge", prof."maxAge",
             prof."interests", prof."latitude", prof."longitude", u."sexuality",
             (
                6371 * acos(
                  cos(radians($1)) * cos(radians(prof."latitude")) *
                  cos(radians(prof."longitude") - radians($2)) +
                  sin(radians($1)) * sin(radians(prof."latitude"))
                )
             ) AS distance
      FROM "posts" p
      JOIN "users" u ON p."authorId" = u."id"
      JOIN "profiles" prof ON u."id" = prof."userId"
      WHERE p."isPublic" = true AND p."isDeleted" = false
    `;

    const args: any[] = [params.lat || 0, params.lng || 0];
    let argPointer = 3;

    if (params.minAge !== undefined && params.maxAge !== undefined) {
       // Age is calculated dynamically (or from birthDate). Using birthDate:
       const minDob = new Date(); minDob.setFullYear(minDob.getFullYear() - params.maxAge);
       const maxDob = new Date(); maxDob.setFullYear(maxDob.getFullYear() - params.minAge);
       query += ` AND prof."birthDate" BETWEEN $${argPointer++} AND $${argPointer++}`;
       args.push(minDob, maxDob);
    }

    if (params.sexuality) {
       query += ` AND u."sexuality" = $${argPointer++}::"Sexuality"`;
       args.push(params.sexuality);
    }

    // Sort order handling
    query += ` ORDER BY p."createdAt" DESC LIMIT $${argPointer++} OFFSET $${argPointer++}`;
    args.push(params.limit, params.offset);

    const posts = await prisma.$queryRawUnsafe(query, ...args);
    
    // Post process distance filter if needed, and interests overlap
    let results = posts as any[];
    
    if (params.maxDistance) {
      results = results.filter(row => row.distance <= params.maxDistance!);
    }
    
    if (params.interests && params.interests.length > 0) {
      results = results.filter(row => {
         const overlap = row.interests?.filter((i: string) => params.interests!.includes(i)) || [];
         return overlap.length > 0;
      });
    }

    return results;
  }

  async getPeopleNearYou(lat: number, lng: number, maxDistance: number, limit: number, offset: number) {
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
    return (users as any[]).filter(u => u.distance <= maxDistance);
  }

  async getPeopleYouMayVibeWith(userId: string, interests: string[], sexuality: string, limit: number, offset: number) {
    // Pull users with matching sexuality
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        sexuality: sexuality as any
      },
      include: { profile: true },
      take: 100 // pull a chunk to score
    });

    const scored = users.map(u => {
      const dbInterests = u.profile?.interests || [];
      const common = dbInterests.filter(i => interests.includes(i));
      const score = (common.length / (interests.length || 1)) * 0.5 + 0.3; // rudimentary logic
      
      return {
        userId: u.id,
        username: u.profile?.username,
        avatarUrl: u.profile?.avatarUrl,
        sexuality: u.sexuality,
        commonInterests: common,
        sharedInterestCount: common.length,
        matchScore: Math.min(score, 1.0)
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(offset, offset + limit);
  }
}
