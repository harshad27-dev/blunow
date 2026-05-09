import { api } from './api';
import type {
  LoginPayload,
  RequestLoginOtpPayload,
  RequestLoginOtpResponse,
  RegisterPayload,
  AuthResponse,
} from '@/types/auth.types';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export const authService = {
  requestLoginOtp: async (
    payload: RequestLoginOtpPayload,
  ): Promise<RequestLoginOtpResponse> => {
    const { data } = await api.post<ApiWrapper<RequestLoginOtpResponse>>(
      '/auth/login/otp',
      payload,
    );
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiWrapper<AuthResponse>>(
      '/auth/register',
      payload,
    );
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<AuthResponse['user']> => {
    const { data } = await api.get<ApiWrapper<AuthResponse['user']>>(
      '/auth/me',
    );
    return data.data;
  },
};
