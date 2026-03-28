import bcrypt from 'bcryptjs';
import { AuthRepository } from '../models/auth.repository';
import { TokenService } from './token.service';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class AuthService {
  private authRepository = new AuthRepository();
  private tokenService = new TokenService();

  async register(dto: {
    email: string;
    password: string;
    displayName: string;
    birthDate: string;
    gender: string;
  }) {
    const existingUser = await this.authRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      birthDate: new Date(dto.birthDate),
      gender: dto.gender as any,
    });

    const tokens = await this.tokenService.generateTokens(user);

    // Emit event — notifications module listens to send welcome notification
    eventBus.emit(EVENTS.AUTH.USER_REGISTERED, { userId: user.id, email: user.email });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 403);
    }

    const tokens = await this.tokenService.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(refreshToken: string) {
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.authRepository.deleteRefreshToken(refreshToken);
    } else {
      await this.authRepository.deleteAllRefreshTokens(userId);
    }
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
