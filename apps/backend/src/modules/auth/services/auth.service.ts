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
  private defaultGoogleClientId =
    "211313668261-l1j7397jievqoc4lancnj108jsfl8kp0.apps.googleusercontent.com";

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

  async startAuth(dto: { email: string }) {
    const user = await this.authRepository.findByEmail(dto.email);

    if (user) {
      const result = await this.requestLoginOtp(dto);
      return {
        ...result,
        flow: "login" as const,
      };
    }

    const result = await this.requestRegistrationOtp(dto);
    return {
      ...result,
      flow: "signup" as const,
    };
  }

  async requestRegistrationOtp(dto: { email: string }) {
    const existingUser = await this.authRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new AppError("Email already in use", 409);
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
      await this.mailService.sendRegistrationOtp(dto.email, otp);
    } catch (error) {
      await this.authRepository.deleteLoginOtp(dto.email);
      if (process.env.NODE_ENV !== "production") {
        console.error("[Registration OTP] Failed to send email:", error);
      }
      throw new AppError("Unable to send OTP email. Check SMTP settings.", 500);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Registration OTP] ${dto.email}: ${otp}`);
    }

    return {
      message: "OTP sent. Check your email and enter the code below.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    };
  }

  async registerWithOtp(dto: {
    email: string;
    otp: string;
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

    if (await this.authRepository.isUsernameTaken(dto.username)) {
      throw new AppError("Username already in use", 409);
    }

    const registerOtp = await this.authRepository.findLoginOtpByEmail(dto.email);
    if (!registerOtp || registerOtp.expiresAt.getTime() < Date.now()) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError("OTP expired. Please request a new one.", 401);
    }

    if (registerOtp.attempts >= this.maxOtpAttempts) {
      await this.authRepository.deleteLoginOtp(dto.email);
      throw new AppError(
        "Too many OTP attempts. Please request a new one.",
        429,
      );
    }

    const isOtpValid = await bcrypt.compare(dto.otp, registerOtp.otpHash);
    if (!isOtpValid) {
      await this.authRepository.incrementLoginOtpAttempts(dto.email);
      throw new AppError("Invalid OTP", 401);
    }

    await this.authRepository.deleteLoginOtp(dto.email);

    const user = await this.authRepository.createUser({
      email: dto.email,
      username: dto.username,
      birthDate: new Date(dto.birthDate),
      gender: dto.gender as any,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isVerified: true,
    });

    const tokens = await this.tokenService.generateTokens(user);

    eventBus.emit(EVENTS.AUTH.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
    });

    return { user: this.sanitizeUser(user), ...tokens };
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

  async googleMobileLogin(dto: { idToken: string }) {
    const googleProfile = await this.verifyGoogleIdToken(dto.idToken);
    let user =
      (await this.authRepository.findByGoogleId(googleProfile.sub)) ||
      (await this.authRepository.findByEmail(googleProfile.email));
    let isNewUser = false;

    if (user && !user.isActive) {
      throw new AppError("Account has been deactivated", 403);
    }

    if (user?.googleId && user.googleId !== googleProfile.sub) {
      throw new AppError("This email is linked to another Google account", 409);
    }

    if (user && !user.googleId) {
      user = await this.authRepository.linkGoogleAccount(
        user.id,
        googleProfile.sub,
      );
    }

    if (!user) {
      isNewUser = true;
      user = await this.authRepository.createGoogleUser({
        email: googleProfile.email,
        googleId: googleProfile.sub,
        username: await this.generateGoogleUsername(googleProfile),
        avatarUrl: googleProfile.picture,
      });

      eventBus.emit(EVENTS.AUTH.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
      });
    }

    const tokens = await this.tokenService.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      isNewUser,
      onboardingRequired: !user.profile?.lookingFor?.length,
      ...tokens,
    };
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

  private async verifyGoogleIdToken(idToken: string) {
    const allowedAudiences = [
      process.env.GOOGLE_EXPO_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_WEB_CLIENT_ID,
      this.defaultGoogleClientId,
    ].filter(Boolean);

    if (!allowedAudiences.length) {
      throw new AppError("Google sign-in is not configured", 500);
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
        idToken,
      )}`,
    );

    if (!response.ok) {
      throw new AppError("Invalid Google token", 401);
    }

    const payload = (await response.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };

    if (!payload.aud || !allowedAudiences.includes(payload.aud)) {
      throw new AppError("Google token audience is not allowed", 401);
    }

    if (!payload.sub || !payload.email) {
      throw new AppError("Google account is missing required details", 401);
    }

    if (payload.email_verified !== true && payload.email_verified !== "true") {
      throw new AppError("Google email is not verified", 401);
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name,
      picture: payload.picture,
    };
  }

  private async generateGoogleUsername(profile: {
    email: string;
    name?: string;
  }) {
    const base = (profile.name || profile.email.split("@")[0] || "blunow")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .replace(/^[._]+|[._]+$/g, "")
      .slice(0, 16);
    const safeBase = base.length >= 3 ? base : `user${base}`;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const suffix = attempt === 0 ? "" : String(randomInt(100, 9999));
      const username = `${safeBase}${suffix}`.slice(0, 20);
      if (!(await this.authRepository.isUsernameTaken(username))) {
        return username;
      }
    }

    return `user${randomInt(100000, 999999)}`;
  }
}
