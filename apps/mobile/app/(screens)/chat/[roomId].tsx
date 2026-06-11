import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import {
  useChatConversationQuery,
  useInfiniteChatMessagesQuery,
  useMarkChatReadMutation,
  useUpdateChatSettingsMutation,
  chatKeys,
} from "@/hooks/useChat";
import { useChatSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import type { ChatMessage, ChatMessageType } from "@/types/chat.types";
import { postService } from "@/services/post.service";
import { useQueryClient } from "@tanstack/react-query";

type PendingMessage = ChatMessage & { isPending?: boolean };

const getParam = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getOtherParticipant = (conversation: any, currentUserId?: string) =>
  conversation?.user1Id === currentUserId
    ? conversation?.user2
    : conversation?.user1;

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    roomId: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
  }>();

  const roomId = getParam(params.roomId) || "";
  const fallbackName = getParam(params.name) || "Isabella";
  const fallbackAvatarUrl = getParam(params.avatarUrl);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const socket = useChatSocket();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const { data: conversation, isFetching: isConversationFetching } =
    useChatConversationQuery(roomId);
  const {
    data: messagePages,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteChatMessagesQuery(roomId);
  const markReadMutation = useMarkChatReadMutation(roomId);
  const updateSettingsMutation = useUpdateChatSettingsMutation(roomId);

  const otherParticipant = getOtherParticipant(conversation, user?.id);
  const name =
    otherParticipant?.profile?.username ||
    otherParticipant?.username ||
    fallbackName;
  const avatarUrl = otherParticipant?.profile?.avatarUrl || fallbackAvatarUrl;

  const serverMessages = useMemo(
    () => messagePages?.pages.flat() ?? [],
    [messagePages],
  );

  const messages = useMemo(() => {
    const pendingNewestFirst = [...pendingMessages].reverse();
    return [...pendingNewestFirst, ...serverMessages];
  }, [pendingMessages, serverMessages]);

  useEffect(() => {
    if (!roomId) return;

    const handleConnect = () => {
      setIsSocketConnected(true);
      socket.emit("chat:join", roomId);
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleNewMessage = (message: unknown) => {
      const nextMessage = message as ChatMessage;
      if (nextMessage.chatId !== roomId) return;

      setPendingMessages((current) =>
        current.filter(
          (pending) =>
            pending.senderId !== nextMessage.senderId ||
            (pending.content !== nextMessage.content &&
              pending.mediaUrl !== nextMessage.mediaUrl),
        ),
      );

      queryClient.setQueryData<any>(
        chatKeys.messages(roomId),
        (current: any) => {
          if (!current?.pages) return current;
          if (
            current.pages.some((page: ChatMessage[]) =>
              page.some((item) => item.id === nextMessage.id),
            )
          ) {
            return current;
          }
          const pages = [...current.pages];
          pages[0] = [nextMessage, ...(pages[0] ?? [])];
          return { ...current, pages };
        },
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    };

    const handleTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId === user?.id) return;
      setTypingUserIds((current) => {
        if (!payload.isTyping) {
          return current.filter((id) => id !== payload.userId);
        }
        if (current.includes(payload.userId)) return current;
        return [...current, payload.userId];
      });
    };

    const handleSocketError = (payload: { message?: string }) => {
      setPendingMessages([]);
      Alert.alert(
        "Message failed",
        payload.message || "Unable to send your message.",
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:message:new", handleNewMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:error", handleSocketError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("chat:leave", roomId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:message:new", handleNewMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:error", handleSocketError);
    };
  }, [queryClient, roomId, socket, user?.id]);

  const isCurrentUser1 = conversation?.user1Id === user?.id;
  const isMuted = isCurrentUser1
    ? conversation?.mutedBy1
    : conversation?.mutedBy2;
  const isArchived = isCurrentUser1
    ? conversation?.archivedBy1
    : conversation?.archivedBy2;

  useEffect(() => {
    if (
      roomId &&
      serverMessages.some((message) => message.senderId !== user?.id)
    ) {
      if (isSocketConnected) {
        socket.emit("chat:read", roomId);
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      } else {
        markReadMutation.mutate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, serverMessages.length, user?.id]);

  const subtitle = useMemo(() => {
    if (isConversationFetching) return "Syncing...";
    if (messages.length === 0) return "Start the conversation";
    if (isMuted) return "Muted";
    return `${messages.length} message${messages.length === 1 ? "" : "s"}`;
  }, [isConversationFetching, isMuted, messages.length]);

  const sendMessage = (
    content: string,
    type: ChatMessageType = "TEXT",
    mediaUrl?: string,
  ) => {
    const pendingMessage: PendingMessage = {
      id: `${roomId}-${Date.now()}`,
      chatId: roomId,
      senderId: user?.id || "me",
      type,
      content,
      mediaUrl,
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    setPendingMessages((current) => [...current, pendingMessage]);

    if (!isSocketConnected) {
      setPendingMessages((current) =>
        current.filter((message) => message.id !== pendingMessage.id),
      );
      Alert.alert(
        "Offline",
        "Chat is reconnecting. Please try again in a moment.",
      );
      return;
    }

    socket.emit("chat:message", {
      chatId: roomId,
      type,
      content,
      mediaUrl,
    });
  };

  const sendTypingState = useCallback((isTyping: boolean) => {
    if (!roomId || !isSocketConnected) return;
    socket.emit("chat:typing", { chatId: roomId, isTyping });
  }, [isSocketConnected, roomId, socket]);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos permission needed",
          "Allow photo access to send an image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setIsUploadingMedia(true);
      const asset = result.assets[0];
      const mediaUrl = await postService.uploadMedia(
        asset.uri,
        asset.mimeType || "image/jpeg",
      );

      if (!mediaUrl) throw new Error("Upload did not return a media URL.");
      sendMessage("", "IMAGE", mediaUrl);
    } catch (error: any) {
      Alert.alert("Image failed", error.message || "Unable to send image.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const loadOlderMessages = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  };

  const showChatActions = () => {
    Alert.alert(name, "Conversation options", [
      {
        text: isMuted ? "Unmute" : "Mute",
        onPress: () => updateSettingsMutation.mutate({ muted: !isMuted }),
      },
      {
        text: isArchived ? "Unarchive" : "Archive",
        onPress: () => updateSettingsMutation.mutate({ archived: !isArchived }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-bg"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View className="flex-row items-center border-b border-border bg-bg px-5 py-3.5">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-bg-card"
            onPress={() => router.back()}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          {avatarUrl ? (
            <View className="relative">
              <Image
                source={{ uri: avatarUrl }}
                className="h-12 w-12 rounded-full border-2 border-bg-card bg-bg-elevated"
              />
              {isSocketConnected ? (
                <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-bg bg-success" />
              ) : null}
            </View>
          ) : (
            <View className="relative h-12 w-12 items-center justify-center rounded-full border-2 border-bg-card bg-primary-light">
              <Ionicons name="person" size={20} color={Colors.textInverse} />
              {isSocketConnected ? (
                <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-bg bg-success" />
              ) : null}
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text
              className="text-[17px] font-extrabold text-text-primary"
              numberOfLines={1}
            >
              {name}
            </Text>
            <View className="mt-1 flex-row items-center">
              {isSocketConnected ? (
                <View className="mr-1.5 h-2 w-2 rounded-full bg-success" />
              ) : null}
              <Text
                className="text-xs font-semibold text-text-secondary"
                numberOfLines={1}
              >
                {isSocketConnected ? "Online now" : subtitle}
              </Text>
            </View>
          </View>


          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card"
            onPress={showChatActions}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          className="flex-1"
          data={messages}
          keyExtractor={(message) => message.id}
          inverted
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length ? "flex-start" : "center",
            paddingHorizontal: 12,
            paddingBottom: 14,
            paddingTop: 14,
          }}
          ItemSeparatorComponent={() => <View className="h-3.5" />}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.25}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={Colors.primaryLight}
            />
          }
          ListHeaderComponent={
            <TypingIndicator visible={typingUserIds.length > 0} />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator color={Colors.primaryLight} />
              </View>
            ) : messages.length ? (
              <View className="items-center pb-6">
                <Text
                  className="overflow-hidden rounded-full border border-border bg-bg-card px-4 py-1.5 text-xs font-extrabold text-text-secondary"
                  style={styles.datePill}
                >
                  Recent messages
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center justify-center">
                <ActivityIndicator color={Colors.primaryLight} size="large" />
                <Text className="mt-3 text-sm font-semibold text-text-secondary">
                  Loading messages
                </Text>
              </View>
            ) : (
              <View className="items-center px-4">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="h-24 w-24 rounded-full border-4 border-bg-card bg-bg-elevated"
                  />
                ) : (
                  <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-light">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={34}
                      color={Colors.textInverse}
                    />
                  </View>
                )}
                <Text className="mt-5 text-center text-2xl font-extrabold text-text-primary">
                  Chat with {name}
                </Text>
                <Text className="mt-2 text-center text-sm font-medium leading-5 text-text-secondary">
                  Start with something warm, specific, and easy to reply to.
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => {
            const next = messages[index + 1];
            const showAvatar =
              item.senderId !== user?.id && next?.senderId !== item.senderId;
            const showReaction =
              item.senderId !== user?.id && index === 0;

            return (
              <MessageBubble
                message={item}
                isMine={item.senderId === user?.id}
                showAvatar={showAvatar}
                avatarUrl={avatarUrl}
                reaction={showReaction ? "heart" : undefined}
              />
            );
          }}
        />

        <SafeAreaView edges={["bottom"]} className="bg-bg">
          <ChatInput
            placeholder="Type a message..."
            disabled={!isSocketConnected || isUploadingMedia}
            onSend={(content) => sendMessage(content)}
            onPickImage={pickImage}
            onTypingChange={sendTypingState}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navButton: {
    shadowColor: Colors.black,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  datePill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
});
