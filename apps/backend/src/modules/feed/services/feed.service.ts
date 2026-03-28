import { FeedRepository } from '../models/feed.repository';
import { DiscoveryService } from './discovery.service';
import { RankingService } from './ranking.service';

export class FeedService {
  private feedRepository = new FeedRepository();
  private discoveryService = new DiscoveryService();
  private rankingService = new RankingService();

  async getDiscoveryFeed(userId: string, pagination: { page: number; limit: number }) {
    // Get candidate users based on preferences
    const candidates = await this.discoveryService.getCandidates(userId, pagination);
    // Rank candidates by compatibility
    const ranked = await this.rankingService.rank(userId, candidates);
    return ranked;
  }

  async getVibesFeed(_userId: string, pagination: { page: number; limit: number }) {
    return this.feedRepository.findRecentPosts(pagination);
  }
}
