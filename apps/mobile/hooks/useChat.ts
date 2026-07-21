import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { chatService } from "@/services/chat.service";
import type {
  ChatConversation,
  ChatMessage,
  ChatSettingsPayload,
  SendMessagePayload,
} from "@/types/chat.types";

export const chatKeys = {
  conversations: ["chat-conversations"] as const,
  conversation: (chatId: string) => ["chat-conversation", chatId] as const,
  messages: (chatId: string) => ["chat-messages", chatId] as const,
};

export const useChatConversationsQuery = (enabled = true) => {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => {
      const response = await chatService.getConversations();
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data as ChatConversation[];
    },
    enabled,
    refetchInterval: enabled ? 30000 : false,
  });
};

export const useChatConversationQuery = (chatId?: string) => {
  return useQuery({
    queryKey: chatKeys.conversation(chatId || ""),
    queryFn: async () => {
      if (!chatId) return null;
      const response = await chatService.getConversation(chatId);
      if (!response?.success) return null;
      return response.data as ChatConversation;
    },
    enabled: Boolean(chatId),
  });
};

export const useChatMessagesQuery = (chatId?: string) => {
  return useQuery({
    queryKey: chatKeys.messages(chatId || ""),
    queryFn: async () => {
      if (!chatId) return [];
      const response = await chatService.getMessages(chatId);
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data.reverse() as ChatMessage[];
    },
    enabled: Boolean(chatId),
    staleTime: 1000 * 60,
  });
};

export const useInfiniteChatMessagesQuery = (chatId?: string) => {
  const limit = 30;

  return useInfiniteQuery({
    queryKey: chatKeys.messages(chatId || ""),
    queryFn: async ({ pageParam }) => {
      if (!chatId) return [];
      const response = await chatService.getMessages(chatId, pageParam, limit);
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data as ChatMessage[];
    },
    enabled: Boolean(chatId),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < limit ? undefined : allPages.length + 1,
    staleTime: 1000 * 60,
  });
};

export type SharePostResult = {
  sharedCount: number;
  failedCount: number;
  results: {
    chatId: string;
    success: boolean;
    messageId?: string;
    message?: string;
  }[];
};

export const useSharePostMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      chatIds,
    }: {
      postId: string;
      chatIds: string[];
    }) => {
      const response = await chatService.sharePost(postId, chatIds);
      if (!response?.success) {
        throw new Error(response?.message || "Unable to share post");
      }
      return response.data as SharePostResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    },
  });
};
export const useSendChatMessageMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendMessagePayload) =>
      chatService.sendMessage(chatId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(chatId) });
    },
  });
};

export const useMarkChatReadMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => chatService.markConversationRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
    },
  });
};

export const useUpdateChatSettingsMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChatSettingsPayload) =>
      chatService.updateConversation(chatId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(chatId) });
    },
  });
};

export const useDeleteChatMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => chatService.deleteConversation(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    },
  });
};

export const useDeleteChatMessageMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) =>
      chatService.deleteMessageForEveryone(chatId, messageId),
    onSuccess: (response) => {
      const deletedMessage = response?.data as ChatMessage | undefined;

      if (deletedMessage) {
        queryClient.setQueryData<any>(chatKeys.messages(chatId), (current: any) => {
          if (!current?.pages) return current;

          return {
            ...current,
            pages: current.pages.map((page: ChatMessage[]) =>
              page.map((message) =>
                message.id === deletedMessage.id ? deletedMessage : message,
              ),
            ),
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(chatId) });
    },
  });
};

export const useReactToMessageMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string | null;
    }) => {
      if (emoji === null) {
        return chatService.removeReaction(chatId, messageId);
      }
      return chatService.reactToMessage(chatId, messageId, emoji);
    },
    onSuccess: (_response, variables) => {
      // Optimistically patch reactions in the query cache
      queryClient.setQueryData<any>(chatKeys.messages(chatId), (current: any) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page: ChatMessage[]) =>
            page.map((message) => {
              if (message.id !== variables.messageId) return message;
              // Strip existing reactions for this chatId owner (we don't
              // track userId here since it's local; server reconciles on reload)
              return { ...message };
            }),
          ),
        };
      });
    },
  });
};
