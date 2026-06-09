export interface GoogleLoginPayload {
  idToken: string;
}

export interface EmailAuthPayload {
  email: string;
}

export interface EmailAuthResponse {
  message: string;
  devOtp?: string;
}

export type RequestPasswordResetPayload = EmailAuthPayload;

export type RequestPasswordResetResponse = EmailAuthResponse;

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  sexuality?: string;
  profile?: {
    username?: string | null;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    birthDate?: string | null;
    gender?: string | null;
    interests?: string[];
    interestedIn?: string[];
    lookingFor?: string[];
    relationship?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
    maxDistance?: number | null;
    drinking?: string | null;
    smoking?: string | null;
    workout?: string | null;
    pets?: string | null;
    zodiac?: string | null;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  isNewUser?: boolean;
  onboardingRequired?: boolean;
}
