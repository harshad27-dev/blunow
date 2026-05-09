import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { storage } from '@/utils/storage';
import { Config } from '@/constants/config';
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  RequestLoginOtpPayload,
  RequestLoginOtpResponse,
} from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  requestLoginOtp: (
    payload: RequestLoginOtpPayload,
  ) => Promise<RequestLoginOtpResponse>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  requestLoginOtp: async (payload) => {
    return authService.requestLoginOtp(payload);
  },

  login: async (payload) => {
    const response = await authService.login(payload);
    await storage.set(Config.TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      await storage.set(Config.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    set({ user: response.user, token: response.accessToken, isAuthenticated: true });
  },

  register: async (payload) => {
    const response = await authService.register(payload);
    await storage.set(Config.TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      await storage.set(Config.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    set({ user: response.user, token: response.accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // swallow — always clear local state
    }
    await storage.delete(Config.TOKEN_KEY);
    await storage.delete(Config.REFRESH_TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  rehydrate: async () => {
    try {
      const token = await storage.get(Config.TOKEN_KEY);
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await authService.me();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      await storage.delete(Config.TOKEN_KEY);
      await storage.delete(Config.REFRESH_TOKEN_KEY);
      set({ isLoading: false });
    }
  },
}));
