import { ConfessionsRepository } from '../models/confessions.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

export class ConfessionsService {
  private repository = new ConfessionsRepository();

  async createConfession(authorId: string, data: { content: string; isAnonymous: boolean }) {
    const confession = await this.repository.create({ ...data, authorId });
    eventBus.emit(EVENTS.CONFESSION.CREATED, { confessionId: confession.id, authorId });
    return confession;
  }

  async getConfessions(pagination: { page: number; limit: number }) {
    return this.repository.findMany(pagination);
  }
}
