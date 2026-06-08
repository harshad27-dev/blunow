import { api } from "./api";
import { Config } from "@/constants/config";
import { storage } from "@/utils/storage";
import type {
  LoginPayload,
  RequestLoginOtpPayload,
  RequestLoginOtpResponse,
  RequestPasswordResetPayload,
  RequestPasswordResetResponse,
  ResetPasswordPayload,
  RegisterPayload,
  AuthResponse,
} from "@/types/auth.types";

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export const authService = {
  requestLoginOtp: async (
    payload: RequestLoginOtpPayload,
  ): Promise<RequestLoginOtpResponse> => {
    const { data } = await api.post<ApiWrapper<RequestLoginOtpResponse>>(
      "/auth/login/otp",
      payload,
    );
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      "/auth/login",
      payload,
    );
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      "/auth/register",
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

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
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
