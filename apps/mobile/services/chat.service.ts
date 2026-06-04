import { api } from "./api";

export type ChatMessagePreview = {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  type?: string;
  createdAt?: string;
  senderId?: string;
};

export type ChatParticipant = {
  id: string;
  username?: string;
  profile?: {
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type ChatConversation = {
  id: string;
  user1Id: string;
  user2Id: string;
  user1?: ChatParticipant;
  user2?: ChatParticipant;
  messages?: ChatMessagePreview[];
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  unreadCount?: number;
  mutedBy1?: boolean;
  mutedBy2?: boolean;
  archivedBy1?: boolean;
  archivedBy2?: boolean;
  _count?: {
    messages?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export const chatService = {
  getConversations: async () => {
    const response = await api.get("/chat/conversations");
    return response.data;
  },

  getConversation: async (chatId: string) => {
    const response = await api.get(`/chat/${chatId}`);
    return response.data;
  },

  getMessages: async (chatId: string, page = 1, limit = 30) => {
    const response = await api.get(`/chat/${chatId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  },

  sendMessage: async (
    chatId: string,
    payload: { content?: string; mediaUrl?: string; type?: string },
  ) => {
    const response = await api.post(`/chat/${chatId}/messages`, {
      type: payload.type || "TEXT",
      content: payload.content,
      mediaUrl: payload.mediaUrl,
    });
    return response.data;
  },
};
