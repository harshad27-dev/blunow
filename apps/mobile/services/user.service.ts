import { api } from "./api";

export interface UpdateProfilePayload {
  name?: string;
  username?: string;
  bio?: string;
  age?: number;
  birthDate?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  gender?: string;
  sexuality?: string;
  avatarUrl?: string | null;
  profilePhotoUrls?: string[];
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

export interface PrivacySettings {
  isPrivate: boolean;
  discoverable: boolean;
  showOnlineStatus: boolean;
  readReceipts: boolean;
}

export interface BlockedUser {
  id: string;
  username: string;
  avatarUrl?: string | null;
  blockedAt: string;
}

export interface VerificationRecord {
  id: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
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

  updatePreferences: async (
    payload: Pick<
      UpdateProfilePayload,
      "minAge" | "maxAge" | "maxDistance" | "lookingFor"
    >,
  ) => {
    const response = await api.patch("/users/me/preferences", payload);
    return response.data;
  },

  updateInterests: async (interests: string[]) => {
    const response = await api.patch("/users/me/interests", { interests });
    return response.data;
  },

  followUser: async (userId: string) => {
    const response = await api.post("/users/" + userId + "/follow");
    return response.data;
  },

  unfollowUser: async (userId: string) => {
    const response = await api.delete("/users/" + userId + "/follow");
    return response.data;
  },

  getFollowers: async (userId: string, page = 1) => {
    const response = await api.get("/users/" + userId + "/followers", {
      params: { page },
    });
    return response.data;
  },

  getFollowing: async (userId: string, page = 1) => {
    const response = await api.get("/users/" + userId + "/following", {
      params: { page },
    });
    return response.data;
  },

  getPrivacy: async () => {
    const response = await api.get("/users/me/privacy");
    return response.data;
  },

  updatePrivacy: async (payload: Partial<PrivacySettings>) => {
    const response = await api.patch("/users/me/privacy", payload);
    return response.data;
  },

  getBlockedUsers: async () => {
    const response = await api.get("/users/me/blocked");
    return response.data;
  },

  blockUser: async (userId: string) => {
    const response = await api.post("/users/" + userId + "/block");
    return response.data;
  },

  unblockUser: async (userId: string) => {
    const response = await api.delete("/users/" + userId + "/block");
    return response.data;
  },

  getVerification: async () => {
    const response = await api.get("/users/me/verification");
    return response.data;
  },

  submitVerification: async (idPhotoUrl: string, faceVideoUrl: string) => {
    const response = await api.post("/users/me/verification", {
      idPhotoUrl,
      faceVideoUrl,
    });
    return response.data;
  },

  deactivateAccount: async () => {
    const response = await api.delete("/users/me");
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete("/users/me/permanent");
    return response.data;
  },
};

