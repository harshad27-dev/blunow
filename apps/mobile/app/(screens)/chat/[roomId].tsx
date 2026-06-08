import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import {
  useChatConversationQuery,
  useChatMessagesQuery,
  useMarkChatReadMutation,
  useUpdateChatSettingsMutation,
  chatKeys,
} from "@/hooks/useChat";
import { useChatSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/store/authStore";
import type { ChatMessage } from "@/types/chat.types";
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

  const { data: conversation, isFetching: isConversationFetching } =
    useChatConversationQuery(roomId);
  const {
    data: serverMessages = [],
    isLoading,
    isFetching,
    refetch,
  } = useChatMessagesQuery(roomId);
  const markReadMutation = useMarkChatReadMutation(roomId);
  const updateSettingsMutation = useUpdateChatSettingsMutation(roomId);

  const otherParticipant = getOtherParticipant(conversation, user?.id);
  const name =
    otherParticipant?.profile?.username ||
    otherParticipant?.username ||
    fallbackName;
  const avatarUrl = otherParticipant?.profile?.avatarUrl || fallbackAvatarUrl;

  const messages = useMemo(
    () => [...serverMessages, ...pendingMessages],
    [pendingMessages, serverMessages],
  );

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
            pending.content !== nextMessage.content ||
            pending.senderId !== nextMessage.senderId,
        ),
      );

      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(roomId),
        (current = []) => {
          if (current.some((item) => item.id === nextMessage.id)) {
            return current;
          }
          return [...current, nextMessage];
        },
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
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
    socket.on("chat:error", handleSocketError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("chat:leave", roomId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:message:new", handleNewMessage);
      socket.off("chat:error", handleSocketError);
    };
  }, [queryClient, roomId, socket]);

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

  const sendMessage = (content: string) => {
    const pendingMessage: PendingMessage = {
      id: `${roomId}-${Date.now()}`,
      chatId: roomId,
      senderId: user?.id || "me",
      type: "TEXT",
      content,
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
      type: "TEXT",
      content,
    });
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
      className="flex-1 bg-[#F8F4F0]"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View className="flex-row items-center border-b border-[#E4DDD7] bg-[#F8F4F0] px-5 py-3.5">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={() => router.back()}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1C1C1C" />
          </TouchableOpacity>

          {avatarUrl ? (
            <View className="relative">
              <Image
                source={{ uri: avatarUrl }}
                className="h-12 w-12 rounded-full border-2 border-white bg-[#E4DDD7]"
              />
              {isSocketConnected ? (
                <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#F8F4F0] bg-[#4FB56F]" />
              ) : null}
            </View>
          ) : (
            <View className="relative h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#B19F91]">
              <Ionicons name="person" size={20} color="#F8F4F0" />
              {isSocketConnected ? (
                <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#F8F4F0] bg-[#4FB56F]" />
              ) : null}
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text
              className="text-[17px] font-extrabold text-[#1C1C1C]"
              numberOfLines={1}
            >
              {name}
            </Text>
            <View className="mt-1 flex-row items-center">
              {isSocketConnected ? (
                <View className="mr-1.5 h-2 w-2 rounded-full bg-[#4FB56F]" />
              ) : null}
              <Text
                className="text-xs font-semibold text-[#6F6259]"
                numberOfLines={1}
              >
                {isSocketConnected ? "Online now" : subtitle}
              </Text>
            </View>
          </View>


          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={showChatActions}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#1C1C1C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length ? "flex-end" : "center",
            paddingHorizontal: 12,
            paddingBottom: 14,
            paddingTop: 14,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#B19F91"
            />
          }
        >
          {isLoading ? (
            <View className="items-center justify-center">
              <ActivityIndicator color="#B19F91" size="large" />
              <Text className="mt-3 text-sm font-semibold text-[#6F6259]">
                Loading messages
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center px-4">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-24 w-24 rounded-full border-4 border-white bg-[#E4DDD7]"
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#B19F91]">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={34}
                    color="#F8F4F0"
                  />
                </View>
              )}
              <Text className="mt-5 text-center text-2xl font-extrabold text-[#1C1C1C]">
                Chat with {name}
              </Text>
              <Text className="mt-2 text-center text-sm font-medium leading-5 text-[#6F6259]">
                Start with something warm, specific, and easy to reply to.
              </Text>
            </View>
          ) : (
            <View>
              <View className="mb-8 items-center">
                <Text
                  className="overflow-hidden rounded-full border border-[#E4DDD7] bg-white px-4 py-1.5 text-xs font-extrabold text-[#6F6259]"
                  style={styles.datePill}
                >
                  Today
                </Text>
              </View>
              <View className="gap-3.5">
                {messages.map((message, index) => {
                  const next = messages[index + 1];
                  const showAvatar =
                    message.senderId !== user?.id &&
                    next?.senderId !== message.senderId;
                  const showReaction =
                    message.senderId !== user?.id &&
                    index === Math.max(0, messages.length - 2);

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isMine={message.senderId === user?.id}
                      showAvatar={showAvatar}
                      avatarUrl={avatarUrl}
                      reaction={showReaction ? "heart" : undefined}
                    />
                  );
                })}
                <TypingIndicator visible={false} />
              </View>
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} className="bg-[#F8F4F0]">
          <ChatInput
            placeholder="Type a message..."
            disabled={!isSocketConnected}
            onSend={sendMessage}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navButton: {
    shadowColor: "#1C1C1C",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  datePill: {
    shadowColor: "#1C1C1C",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
});
