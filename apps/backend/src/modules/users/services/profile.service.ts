import { UsersRepository } from '../models/users.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class ProfileService {
  private usersRepository = new UsersRepository();

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }) {
    const profile = await this.usersRepository.updateProfile(userId, data);
    eventBus.emit(EVENTS.USER.PROFILE_UPDATED, { userId });
    return profile;
  }

  async updatePreferences(userId: string, data: {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    lookingFor?: string[];
  }) {
    const profile = await this.usersRepository.updateProfile(userId, data);
    eventBus.emit(EVENTS.USER.PREFERENCES_UPDATED, { userId });
    return profile;
  }

  async updateInterests(userId: string, interests: string[]) {
    const profile = await this.usersRepository.updateProfile(userId, { interests });
    eventBus.emit(EVENTS.USER.INTERESTS_UPDATED, { userId });
    return profile;
  }
}
