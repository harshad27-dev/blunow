import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from '../models/auth.repository';
import { jwtConfig } from '../../../config/jwt.config';
import { AppError } from '../../../common/middleware/error.middleware';

export class TokenService {
  private authRepository = new AuthRepository();

  async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as any,
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.saveRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    const stored = await this.authRepository.findRefreshToken(refreshToken);

    if (!stored || new Date() > stored.expiresAt) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = stored.user;
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as any,
    });

    return { accessToken };
  }
}
