export type Gender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  birthDate: string; // ISO 8601 e.g. "2000-01-01"
  gender: Gender;
}

export interface LoginPayload {
  email: string;
  otp: string;
}

export interface RequestLoginOtpPayload {
  email: string;
}

export interface RequestLoginOtpResponse {
  message: string;
  devOtp?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  sexuality?: string;
  profile?: {
    username?: string | null;
    bio: string | null;
    bioPrompt1?: string | null;
    bioPrompt2?: string | null;
    avatarUrl: string | null;
    bannerUrl?: string | null;
    location?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    interests?: string[];
    interestedIn?: string[];
    lookingFor?: string[];
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
}
