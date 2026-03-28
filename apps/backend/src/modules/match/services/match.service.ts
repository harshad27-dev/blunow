import { MatchRepository } from '../models/match.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class MatchService {
  private matchRepository = new MatchRepository();

  async getMatches(userId: string) {
    return this.matchRepository.findMatchesByUser(userId);
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
