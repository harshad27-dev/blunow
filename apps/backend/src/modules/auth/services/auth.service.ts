import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { AuthRepository } from "../models/auth.repository";
import { TokenService } from "./token.service";
import { MailService } from "./mail.service";
import { eventBus } from "../../../events/event-bus";
import { EVENTS } from "../../../events/event-constants";
import { AppError } from "../../../common/middleware/error.middleware";

export class AuthService {
  private authRepository = new AuthRepository();
  private tokenService = new TokenService();
  private mailService = new MailService();
  private otpExpiresInMs = 10 * 60 * 1000;
  private maxOtpAttempts = 5;

  async register(dto: {
    email: string;
    password: string;
    username: string;
    birthDate: string;
    gender: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const existingUser = await this.authRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      username: dto.username,
      birthDate: new Date(dto.birthDate),
      gender: dto.gender as any,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    const tokens = await this.tokenService.generateTokens(user);

    // Emit event — notifications module listens to send welcome notification
    eventBus.emit(EVENTS.AUTH.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async requestLoginOtp(dto: { email: string }) {
    const user = await this.authRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError(
        "Email not found. Please create an account first.",
        404,
      );
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated", 403);
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + this.otpExpiresInMs);

    await this.authRepository.upsertLoginOtp({
      email: dto.email,
      otpHash,
      expiresAt,
    });

    try {
      await this.mailService.sendLoginOtp(dto.email, otp);
    } catch (error) {
      await this.authRepository.deleteLoginOtp(dto.email);
      if (process.env.NODE_ENV !== "production") {
        console.error("[Auth OTP] Failed to send email:", error);
      }
      throw new AppError("Unable to send OTP email. Check SMTP settings.", 500);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Auth OTP] ${dto.email}: ${otp}`);
    }

    return {
      message: "OTP sent. Check your email and enter the code below.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    };
  }

  async requestPasswordReset(dto: { email: string }) {
    const user = await this.authRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError(
        "Email not found. Please create an account first.",
        404,
      );
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated", 403);
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + this.otpExpiresInMs);

    await this.authRepository.upsertLoginOtp({
      email: dto.email,
      otpHash,
      expiresAt,
    });

    try {
      await this.mailService.sendPasswordResetOtp(dto.email, otp);
    } catch (error) {
      await this.authRepository.deleteLoginOtp(dto.email);
      if (process.env.NODE_ENV !== "production") {
        console.error("[Password reset OTP] Failed to send email:", error);
      }
      throw new AppError("Unable to send reset email. Check SMTP settings.", 500);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Password reset OTP] ${dto.email}: ${otp}`);
    }

    eventBus.emit(EVENTS.AUTH.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
    });

    return {
      message: "Reset OTP sent. Check your email and enter the code below.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    };
  }

  async resetPassword(dto: { email: string; otp: string; password: string }) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new AppError("Invalid OTP", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated", 403);
    }

    const resetOtp = await this.authRepository.findLoginOtpByEmail(dto.email);
    if (!resetOtp || resetOtp.expiresAt.getTime() < Date.now()) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError("OTP expired. Please request a new one.", 401);
    }

    if (resetOtp.attempts >= this.maxOtpAttempts) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError(
        "Too many OTP attempts. Please request a new one.",
        429,
      );
    }

    const isOtpValid = await bcrypt.compare(dto.otp, resetOtp.otpHash);
    if (!isOtpValid) {
      await this.authRepository.incrementLoginOtpAttempts(dto.email);
      throw new AppError("Invalid OTP", 401);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.authRepository.updatePassword(user.id, passwordHash);
    await this.authRepository.deleteLoginOtp(dto.email);
    await this.authRepository.deleteAllRefreshTokens(user.id);

    return { message: "Password reset successfully. Please sign in again." };
  }

  async login(dto: { email: string; otp: string }) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new AppError("Invalid OTP", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated", 403);
    }

    const loginOtp = await this.authRepository.findLoginOtpByEmail(dto.email);
    if (!loginOtp || loginOtp.expiresAt.getTime() < Date.now()) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError("OTP expired. Please request a new one.", 401);
    }

    if (loginOtp.attempts >= this.maxOtpAttempts) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError(
        "Too many OTP attempts. Please request a new one.",
        429,
      );
    }

    const isOtpValid = await bcrypt.compare(dto.otp, loginOtp.otpHash);
    if (!isOtpValid) {
      await this.authRepository.incrementLoginOtpAttempts(dto.email);
      throw new AppError("Invalid OTP", 401);
    }

    await this.authRepository.deleteLoginOtp(dto.email);
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
    if (!user) throw new AppError("User not found", 404);
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
