import { create } from "zustand";
import type { ChatConversation, ChatMessage } from "@/types/chat.types";

type ChatState = {
  conversations: ChatConversation[];
  messagesByChatId: Record<string, ChatMessage[]>;
  typingByChatId: Record<string, boolean>;
  setConversations: (conversations: ChatConversation[]) => void;
  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  appendMessage: (chatId: string, message: ChatMessage) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  clearChatState: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messagesByChatId: {},
  typingByChatId: {},
  setConversations: (conversations) => set({ conversations }),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChatId: { ...state.messagesByChatId, [chatId]: messages },
    })),
  appendMessage: (chatId, message) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...(state.messagesByChatId[chatId] ?? []), message],
      },
    })),
  setTyping: (chatId, isTyping) =>
    set((state) => ({
      typingByChatId: { ...state.typingByChatId, [chatId]: isTyping },
    })),
  clearChatState: () =>
    set({ conversations: [], messagesByChatId: {}, typingByChatId: {} }),
}));
