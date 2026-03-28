import { ConfessionsRepository } from '../models/confessions.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class RevealService {
  private repository = new ConfessionsRepository();

  async requestReveal(confessionId: string, requesterId: string) {
    const confession = await this.repository.findById(confessionId);
    if (!confession) throw new AppError('Confession not found', 404);
    if (!confession.isAnonymous || confession.isRevealed) {
      throw new AppError('Confession is already public', 400);
    }
    
    // Notify the author via event bus (notification module handles actual push)
    eventBus.emit(EVENTS.CONFESSION.REVEAL_REQUESTED, { 
      confessionId, 
      authorId: confession.authorId, 
      requesterId 
    });
  }

  async acceptReveal(confessionId: string, authorId: string) {
    const confession = await this.repository.findById(confessionId);
    if (!confession) throw new AppError('Confession not found', 404);
    if (confession.authorId !== authorId) throw new AppError('Forbidden', 403);

    const updated = await this.repository.reveal(confessionId);
    eventBus.emit(EVENTS.CONFESSION.REVEALED, { confessionId, authorId });
    return updated;
  }
}
