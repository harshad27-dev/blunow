import { MatchRecommendationFilters, MatchRepository } from '../models/match.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class MatchService {
  private matchRepository = new MatchRepository();

  async getMatches(userId: string) {
    return this.matchRepository.findMatchesByUser(userId);
  }

  async getRecommendations(
    userId: string,
    limit?: number,
    filters?: MatchRecommendationFilters,
  ) {
    return this.matchRepository.findRecommendationsForUser(userId, limit, filters);
  }

  async dismissRecommendation(userId: string, dismissedUserId: string) {
    if (userId === dismissedUserId) {
      throw new AppError('Cannot dismiss your own profile', 400);
    }

    await this.matchRepository.dismissRecommendation(userId, dismissedUserId);
  }

  async restoreDismissedRecommendation(userId: string, dismissedUserId: string) {
    if (userId === dismissedUserId) {
      throw new AppError('Cannot restore your own profile', 400);
    }

    await this.matchRepository.restoreDismissedRecommendation(userId, dismissedUserId);
  }

  async unmatch(matchId: string, userId: string) {
    const match = await this.matchRepository.findMatchById(matchId);
    if (!match) throw new AppError('Match not found', 404);
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new AppError('Forbidden', 403);
    }
    await this.matchRepository.deleteMatch(matchId);
    eventBus.emit(EVENTS.MATCH.MATCHED, { matchId, userId });
  }
}
