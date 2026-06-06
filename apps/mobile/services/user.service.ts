import { api } from "./api";

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  age?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  gender?: string;
  sexuality?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  interests?: string[];
  interestedIn?: string[];
  lookingFor?: string[];
  relationship?: string;
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  drinking?: string;
  smoking?: string;
  workout?: string;
  pets?: string;
  zodiac?: string;
}

export const userService = {
  getStats: async (userId: string) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await api.patch("/users/me/profile", payload);
    return response.data;
  },

  getProfile: async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
};
