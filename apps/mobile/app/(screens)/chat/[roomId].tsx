import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  const fallbackName = getParam(params.name) || "Chat";
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
      className="flex-1 bg-[#1B110A]"
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={["#150C06", "#1B110A", "#241912"]}
        className="flex-1"
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
        >
          <View className="flex-row items-center border-b border-white/10 bg-[#1B110A]/80 px-5 py-3">
            <TouchableOpacity
              className="mr-3 h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={24} color="#DDC1AE" />
            </TouchableOpacity>

            {avatarUrl ? (
              <View className="relative">
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-11 w-11 rounded-full border border-[#FFB77F]/30"
                />
                {isSocketConnected ? (
                  <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1B110A] bg-green-500" />
                ) : null}
              </View>
            ) : (
              <View className="relative h-11 w-11 items-center justify-center rounded-full border border-[#FFB77F]/30 bg-[#281D15]">
                <Ionicons name="person" size={20} color="#A58C7B" />
                {isSocketConnected ? (
                  <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1B110A] bg-green-500" />
                ) : null}
              </View>
            )}

            <View className="ml-3 flex-1">
              <Text
                className="text-base font-extrabold text-[#F3DFD1]"
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text
                className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#FFB77F]"
                numberOfLines={1}
              >
                {isSocketConnected ? "Active now" : subtitle}
              </Text>
            </View>

            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={showChatActions}
              activeOpacity={0.82}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#DDC1AE" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: messages.length ? "flex-end" : "center",
              paddingHorizontal: 20,
              paddingBottom: 24,
              paddingTop: 26,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={refetch}
                tintColor="#FFFFFF"
              />
            }
          >
            {isLoading ? (
              <View className="items-center justify-center">
                <ActivityIndicator color="#FFB77F" size="large" />
                <Text className="mt-3 text-sm font-semibold text-[#A58C7B]">
                  Loading messages
                </Text>
              </View>
            ) : messages.length === 0 ? (
              <View className="items-center px-4">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="h-24 w-24 rounded-full border border-[#FFB77F]/30"
                  />
                ) : (
                  <View className="h-24 w-24 items-center justify-center rounded-full bg-[#281D15]">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={34}
                      color="#A58C7B"
                    />
                  </View>
                )}
                <Text className="mt-5 text-center text-xl font-extrabold text-[#F3DFD1]">
                  Chat with {name}
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-[#A58C7B]">
                  Send a message to start the conversation.
                </Text>
              </View>
            ) : (
              <View>
                <View className="mb-10 items-center">
                  <Text className="rounded-full bg-[#281D15] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#A58C7B]">
                    Today
                  </Text>
                </View>
                <View className="gap-3">
                  {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const showAvatar =
                      message.senderId !== user?.id &&
                      previous?.senderId !== message.senderId;

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMine={message.senderId === user?.id}
                        showAvatar={showAvatar}
                      />
                    );
                  })}
                  <TypingIndicator visible={false} />
                </View>
              </View>
            )}
          </ScrollView>

          <SafeAreaView edges={["bottom"]} className="bg-[#1B110A]/90">
            <ChatInput
              placeholder={`Message ${name.split(" ")[0] || "them"}`}
              disabled={!isSocketConnected}
              onSend={sendMessage}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
