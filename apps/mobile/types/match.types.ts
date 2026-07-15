export type MatchRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type MatchUserProfile = {
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  location?: string | null;
  interests?: string[];
};

export type MatchUser = {
  id: string;
  email?: string;
  username?: string | null;
  isVerified?: boolean;
  profile?: MatchUserProfile | null;
};

export type MatchChat = {
  id: string;
  matchId?: string | null;
  requestId?: string | null;
  requestedById?: string | null;
  status?: "REQUESTED" | "ACTIVE" | "REJECTED";
  user1Id?: string;
  user2Id?: string;
};

export type Match = {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  user1?: MatchUser;
  user2?: MatchUser;
  chat?: MatchChat | null;
};

export type MatchRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  status: MatchRequestStatus;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: MatchUser;
  receiver?: MatchUser;
  chat?: MatchChat | null;
};

export type MatchRecommendation = {
  id: string;
  name: string;
  lastName: string;
  age: number;
  city: string;
  distance: string;
  occupation: string;
  online: boolean;
  verified: boolean;
  quote: string;
  imageUrl: string;
  avatarUrl?: string | null;
  profilePhotoUrls?: string[];
  interests: string[];
  matchScore: number;
  chatRequests: number;
  alreadyLikedMe?: boolean;
};

export type MatchRecommendationFilters = {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  gender?: "ANY" | "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";
  useMyPreference?: boolean;
  interests?: string[];
  verifiedOnly?: boolean;
  onlineOnly?: boolean;
};

export type DiscoverProfile = {
  id: string;
  username: string;
  name: string;
  age: number;
  city: string;
  distance: string;
  avatarUrl?: string | null;
  imageUrl: string;
  bio: string;
  quote: string;
  interests: string[];
  online: boolean;
  verified: boolean;
  matchScore: number;
  isConnected?: boolean;
};

export type SendMatchRequestPayload = {
  receiverId: string;
  message?: string;
};

export type RespondMatchRequestPayload = {
  requestId: string;
  status: Extract<MatchRequestStatus, "ACCEPTED" | "REJECTED">;
};
