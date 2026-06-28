import { UsersRepository } from '../models/users.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class UsersService {
  private usersRepository = new UsersRepository();

  async getUserById(id: string, viewerId?: string) {
    const user = await this.usersRepository.findById(id, viewerId);
    if (!user) throw new AppError('User not found', 404);
    if (viewerId && viewerId !== id) {
      await this.usersRepository.recordProfileView(viewerId, id);
    }
    const {
      passwordHash,
      followers = [],
      blockedByUsers = [],
      ...safe
    } = user as any;
    return {
      ...safe,
      isFollowing: followers.length > 0,
      isBlocked: blockedByUsers.length > 0,
    };
  }

  async deactivateUser(userId: string) {
    await this.usersRepository.deactivate(userId);
    eventBus.emit(EVENTS.USER.DEACTIVATED, { userId });
  }

  async deleteUser(userId: string) {
    await this.usersRepository.delete(userId);
    eventBus.emit(EVENTS.USER.DEACTIVATED, { userId, permanent: true });
  }
}
