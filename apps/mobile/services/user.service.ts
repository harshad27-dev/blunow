import { api } from './api';

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

export const userService = {
  getStats: async (userId: string) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await api.patch('/users/me/profile', payload);
    return response.data;
  },

  getProfile: async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }
};
