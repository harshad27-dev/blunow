import { prisma } from "../../../prisma/prisma";

export class AuthRepository {
  async createUser(data: {
    email: string;
    passwordHash: string;
    username: string;
    birthDate: Date;
    gender: any;
    location?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        profile: {
          create: {
            username: data.username,
            birthDate: data.birthDate,
            gender: data.gender,
            location: data.location,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
      },
      include: { profile: true },
    });
  }

  async createGoogleUser(data: {
    email: string;
    googleId: string;
    username: string;
    avatarUrl?: string;
  }) {
    const fallbackBirthDate = new Date();
    fallbackBirthDate.setFullYear(fallbackBirthDate.getFullYear() - 18);

    return prisma.user.create({
      data: {
        email: data.email,
        googleId: data.googleId,
        isVerified: true,
        profile: {
          create: {
            username: data.username,
            birthDate: fallbackBirthDate,
            gender: "OTHER",
            avatarUrl: data.avatarUrl,
          },
        },
      },
      include: { profile: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
      include: { profile: true },
    });
  }

  async linkGoogleAccount(userId: string, googleId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { googleId, isVerified: true },
      include: { profile: true },
    });
  }

  async isUsernameTaken(username: string) {
    const profile = await prisma.profile.findUnique({ where: { username } });
    return Boolean(profile);
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async saveRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  }

  async deleteAllRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async upsertLoginOtp(data: {
    email: string;
    otpHash: string;
    expiresAt: Date;
  }) {
    return prisma.loginOtp.upsert({
      where: { email: data.email },
      update: {
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        attempts: 0,
      },
      create: data,
    });
  }

  async findLoginOtpByEmail(email: string) {
    return prisma.loginOtp.findUnique({ where: { email } });
  }

  async incrementLoginOtpAttempts(email: string) {
    return prisma.loginOtp.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
  }

  async deleteLoginOtp(email: string) {
    return prisma.loginOtp.deleteMany({ where: { email } });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      include: { profile: true },
    });
  }
}
