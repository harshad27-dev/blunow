import { ModerationRepository } from '../models/moderation.repository';
import { ModerationQueueService } from './ban.service';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

export class ModerationService {
  private repository = new ModerationRepository();
  private queueService = new ModerationQueueService();

  async banUser(userId: string, bannedBy: string, data: { reason: string; type: any; expiresAt?: string }) {
    const ban = await this.repository.createBan({
      userId,
      bannedBy,
      reason: data.reason,
      type: data.type,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    eventBus.emit(EVENTS.MODERATION.USER_BANNED, { userId, banId: ban.id });
    
    // Kick user out via socket, revoke tokens etc
    await this.queueService.processBan(userId);

    return ban;
  }

  async unbanUser(id: string) {
    const ban = await this.repository.findBanById(id);
    if (!ban) return;

    await this.repository.deleteBan(id);
  }

  async getBans(pagination: { page: number; limit: number }) {
    return this.repository.findBans(pagination);
  }
}
