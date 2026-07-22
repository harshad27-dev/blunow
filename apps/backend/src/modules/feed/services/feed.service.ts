import { FeedRepository } from "../models/feed.repository";

export class FeedService {
  private repo = new FeedRepository();

  async getFilteredFeed(params: {
    userId: string;
    lat: number | null;
    lng: number | null;
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string;
    sexuality?: string;
    sort?: string;
    limit: number;
    offset: number;
    cursor?: string;
  }) {
    // Array parsing
    const interestsList = params.interests
      ? params.interests.split(",").map((i) => i.trim())
      : undefined;

    const feed = await this.repo.getFilteredFeed({
      ...params,
      interests: interestsList,
    });

    const items = feed.items.map((p) => ({
      postId: p.id,
      caption: p.caption,
      isAnonymous: Boolean(p.isAnonymous),
      author: {
        userId: p.isAnonymous ? null : p.authorId,
        username: p.isAnonymous ? "Anonymous" : p.username,
        avatarUrl: p.isAnonymous ? null : p.avatarUrl,
        sexuality: p.isAnonymous ? null : p.sexuality,
        distance: p.distance ? Math.round(p.distance) : null,
      },
      isOwnPost: p.authorId === params.userId,
      isFollowing: Boolean((p as any).isFollowing),
      createdAt: p.createdAt,
      mediaUrls: p.mediaUrls || [],
      likesCount: p.likesCount || 0,
      commentsCount: p.commentsCount || 0,
      savesCount: p.savesCount || 0,
      isLiked: Boolean(p.isLiked),
      isSaved: Boolean(p.isSaved),
      rankingScore: p.rankingScore,
    }));

    return {
      items,
      feed: items,
      nextCursor: feed.nextCursor,
      total: items.length,
      hasMore: Boolean(feed.nextCursor),
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
    const users = await this.repo.getPeopleNearYou(
      userId,
      lat,
      lng,
      maxDistance,
      limit,
      offset,
    );
    return {
      users: users.map((u) => ({
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        sexuality: u.sexuality,
        distance: Math.round(u.distance),
        commonInterests: u.interests,
      })),
      total: users.length,
    };
  }

  async getPeopleYouMayVibeWith(
    userId: string,
    interestsList: string,
    sexuality: string,
    limit: number,
    offset: number,
  ) {
    const list = interestsList
      ? interestsList.split(",").map((i) => i.trim())
      : [];
    const users = await this.repo.getPeopleYouMayVibeWith(
      userId,
      list,
      sexuality,
      limit,
      offset,
    );
    return { users, total: users.length };
  }
}
