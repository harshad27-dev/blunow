import { FeedRepository } from '../models/feed.repository';

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
  }) {
    // Array parsing
    const interestsList = params.interests ? params.interests.split(',').map(i => i.trim()) : undefined;
    
    const feed = await this.repo.getFilteredFeed({
      ...params,
      interests: interestsList
    });

    return { 
      feed: feed.map(p => ({
        postId: p.id,
        caption: p.caption,
        author: {
          userId: p.authorId,
          username: p.username,
          avatarUrl: p.avatarUrl,
          sexuality: p.sexuality,
          distance: p.distance ? Math.round(p.distance) : null
        },
        createdAt: p.createdAt,
        mediaUrls: p.mediaUrls || [],
      })),
      total: feed.length,
      hasMore: feed.length === params.limit
    };
  }

  async getPeopleNearYou(lat: number, lng: number, maxDistance: number, limit: number, offset: number) {
    const users = await this.repo.getPeopleNearYou(lat, lng, maxDistance, limit, offset);
    return {
      users: users.map(u => ({
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        sexuality: u.sexuality,
        distance: Math.round(u.distance),
        commonInterests: u.interests
      })),
      total: users.length
    };
  }

  async getPeopleYouMayVibeWith(userId: string, interestsList: string, sexuality: string, limit: number, offset: number) {
    const list = interestsList ? interestsList.split(',').map(i => i.trim()) : [];
    const users = await this.repo.getPeopleYouMayVibeWith(userId, list, sexuality, limit, offset);
    return { users, total: users.length };
  }
}
