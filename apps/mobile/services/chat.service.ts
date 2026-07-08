import { api } from "./api";
import type { ChatSettingsPayload, SendMessagePayload } from "@/types/chat.types";
export type { ChatConversation, ChatMessage, ChatParticipant } from "@/types/chat.types";

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
    payload: SendMessagePayload,
  ) => {
    const response = await api.post(`/chat/${chatId}/messages`, {
      type: payload.type || "TEXT",
      content: payload.content,
      mediaUrl: payload.mediaUrl,
    });
    return response.data;
  },

  updateConversation: async (chatId: string, payload: ChatSettingsPayload) => {
    const response = await api.patch(`/chat/conversations/${chatId}`, payload);
    return response.data;
  },

  markConversationRead: async (chatId: string) => {
    const response = await api.patch(`/chat/conversations/${chatId}/read`);
    return response.data;
  },

  setTyping: async (chatId: string, isTyping: boolean) => {
    const response = await api.post(`/chat/${chatId}/typing`, { isTyping });
    return response.data;
  },
  deleteMessageForEveryone: async (chatId: string, messageId: string) => {
    const response = await api.delete(`/chat/${chatId}/messages/${messageId}`);
    return response.data;
  },

  deleteConversation: async (chatId: string) => {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  },
};


