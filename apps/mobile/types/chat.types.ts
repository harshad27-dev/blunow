import type { MatchRequest } from "./match.types";

export type ChatMessageType = "TEXT" | "STORY_REPLY" | "IMAGE" | "VIDEO" | "AUDIO" | "POST";
export type ChatStatus = "REQUESTED" | "ACTIVE" | "REJECTED";

export type ChatParticipant = {
  id: string;
  email?: string;
  username?: string | null;
  profile?: {
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
};

export type ChatReadReceipt = {
  messageId: string;
  readByUserId: string;
  readAt: string;
};

export type ChatMessageReaction = {
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: ChatMessageType;
  content?: string | null;
  mediaUrl?: string | null;
  isRead?: boolean;
  isDeleted?: boolean;
  deliveredAt?: string | null;
  createdAt: string;
  sender?: ChatParticipant;
  readReceipts?: ChatReadReceipt[];
  replyToMessageId?: string | null;
  replyToMessage?: ChatMessage | null;
  storyId?: string | null;
  storyPreviewMediaUrl?: string | null;
  storyPreviewCaption?: string | null;
  storyAuthorId?: string | null;
  postId?: string | null;
  postPreviewMediaUrl?: string | null;
  postPreviewCaption?: string | null;
  postAuthorName?: string | null;
  clientId?: string;
  reactions?: ChatMessageReaction[];
};

export type ChatConversation = {
  id: string;
  matchId?: string | null;
  requestId?: string | null;
  requestedById?: string | null;
  status?: ChatStatus;
  request?: MatchRequest | null;
  user1Id: string;
  user2Id: string;
  user1?: ChatParticipant;
  user2?: ChatParticipant;
  messages?: ChatMessage[];
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  lastMessageId?: string | null;
  unreadCount?: number;
  mutedBy1?: boolean;
  mutedBy2?: boolean;
  archivedBy1?: boolean;
  archivedBy2?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    messages?: number;
  };
};

export type SendMessagePayload = {
  content?: string;
  mediaUrl?: string;
  type?: ChatMessageType;
  replyToMessageId?: string;
  clientId?: string;
};

export type ChatSettingsPayload = {
  muted?: boolean;
  archived?: boolean;
};
