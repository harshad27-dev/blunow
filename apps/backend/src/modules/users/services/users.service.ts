import { UsersRepository } from '../models/users.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class UsersService {
  private usersRepository = new UsersRepository();

  async getUserById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  async deactivateUser(userId: string) {
    await this.usersRepository.deactivate(userId);
    eventBus.emit(EVENTS.USER.DEACTIVATED, { userId });
  }
}
