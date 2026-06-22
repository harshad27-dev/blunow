import { api } from "./api";
import { Config } from "@/constants/config";
import { storage } from "@/utils/storage";
import type {
  RequestPasswordResetPayload,
  StartAuthPayload,
  StartAuthResponse,
  RequestPasswordResetResponse,
  ResetPasswordPayload,
  AuthResponse,
  EmailLoginPayload,
  GoogleLoginPayload,
  RegisterWithOtpPayload,
  RequestLoginOtpPayload,
  RequestLoginOtpResponse,
  RequestRegisterOtpPayload,
  RequestRegisterOtpResponse,
} from "@/types/auth.types";

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export const authService = {
  googleLogin: async (payload: GoogleLoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      "/auth/google/mobile",
      payload,
    );
    return data.data;
  },

  startAuth: async (payload: StartAuthPayload): Promise<StartAuthResponse> => {
    const { data } = await api.post<ApiWrapper<StartAuthResponse>>(
      "/auth/start",
      payload,
    );
    return data.data;
  },

  requestLoginOtp: async (
    payload: RequestLoginOtpPayload,
  ): Promise<RequestLoginOtpResponse> => {
    const { data } = await api.post<ApiWrapper<RequestLoginOtpResponse>>(
      "/auth/login/otp",
      payload,
    );
    return data.data;
  },

  emailLogin: async (payload: EmailLoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      "/auth/login",
      payload,
    );
    return data.data;
  },

  requestRegisterOtp: async (
    payload: RequestRegisterOtpPayload,
  ): Promise<RequestRegisterOtpResponse> => {
    const { data } = await api.post<ApiWrapper<RequestRegisterOtpResponse>>(
      "/auth/register/otp",
      payload,
    );
    return data.data;
  },

  registerWithOtp: async (
    payload: RegisterWithOtpPayload,
  ): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      "/auth/register/otp/verify",
      payload,
    );
    return data.data;
  },

  logout: async (allDevices = false): Promise<void> => {
    const refreshToken = await storage.get(Config.REFRESH_TOKEN_KEY);
    await api.post("/auth/logout", allDevices ? {} : { refreshToken });
  },

  requestPasswordReset: async (
    payload: RequestPasswordResetPayload,
  ): Promise<RequestPasswordResetResponse> => {
    const { data } = await api.post<ApiWrapper<RequestPasswordResetResponse>>(
      "/auth/password-reset/otp",
      payload,
    );
    return data.data;
  },

  resetPassword: async (
    payload: ResetPasswordPayload,
  ): Promise<{ message: string }> => {
    const { data } = await api.post<ApiWrapper<{ message: string }>>(
      "/auth/password-reset",
      payload,
    );
    return data.data;
  },

  refresh: async (
    refreshToken: string,
  ): Promise<Pick<AuthResponse, "accessToken" | "refreshToken">> => {
    const { data } = await api.post<
      ApiWrapper<Pick<AuthResponse, "accessToken" | "refreshToken">>
    >("/auth/refresh", { refreshToken });
    return data.data;
  },

  me: async (): Promise<AuthResponse["user"]> => {
    const { data } =
      await api.get<ApiWrapper<AuthResponse["user"]>>("/auth/me");
    return data.data;
  },
};
