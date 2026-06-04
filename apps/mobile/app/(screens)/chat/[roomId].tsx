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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import {
  useChatConversationQuery,
  useChatMessagesQuery,
  useMarkChatReadMutation,
  useSendChatMessageMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import type { ChatMessage } from "@/types/chat.types";

type PendingMessage = ChatMessage & { isPending?: boolean };

const getParam = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getOtherParticipant = (conversation: any, currentUserId?: string) =>
  conversation?.user1Id === currentUserId ? conversation?.user2 : conversation?.user1;

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  const {
    data: conversation,
    isFetching: isConversationFetching,
  } = useChatConversationQuery(roomId);
  const {
    data: serverMessages = [],
    isLoading,
    isFetching,
    refetch,
  } = useChatMessagesQuery(roomId);
  const sendMessageMutation = useSendChatMessageMutation(roomId);
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

  const isCurrentUser1 = conversation?.user1Id === user?.id;
  const isMuted = isCurrentUser1 ? conversation?.mutedBy1 : conversation?.mutedBy2;
  const isArchived = isCurrentUser1
    ? conversation?.archivedBy1
    : conversation?.archivedBy2;

  useEffect(() => {
    if (roomId && serverMessages.some((message) => message.senderId !== user?.id)) {
      markReadMutation.mutate();
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
    sendMessageMutation.mutate(
      { content, type: "TEXT" },
      {
        onSuccess: () => setPendingMessages([]),
        onError: (error: any) => {
          setPendingMessages((current) =>
            current.filter((message) => message.id !== pendingMessage.id),
          );
          Alert.alert(
            "Message failed",
            error?.response?.data?.message || "Unable to send your message.",
          );
        },
      },
    );
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
      className="flex-1 bg-[#050505]"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View className="flex-row items-center border-b border-[#1A1A1A] px-4 py-3">
          <TouchableOpacity
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#111]"
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={25} color={Colors.white} />
          </TouchableOpacity>

          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="h-11 w-11 rounded-full" />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#111]">
              <Ionicons name="person" size={20} color="#888" />
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {name}
            </Text>
            <Text
              className="mt-0.5 text-xs font-semibold text-[#888]"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>

          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-[#111]"
            onPress={showChatActions}
            activeOpacity={0.82}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length ? "flex-end" : "center",
            padding: 18,
            paddingBottom: 20,
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
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text className="mt-3 text-sm font-semibold text-[#888]">
                Loading messages
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center px-4">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-24 w-24 rounded-full" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#111]">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={34}
                    color="#888"
                  />
                </View>
              )}
              <Text className="mt-5 text-center text-xl font-bold text-white">
                Chat with {name}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#888]">
                Send a message to start the conversation.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
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
          )}
        </ScrollView>

        <View style={{ paddingBottom: Math.max(insets.bottom - 12, 0) }}>
          <ChatInput
            placeholder={`Message ${name.split(" ")[0] || "them"}`}
            disabled={sendMessageMutation.isPending}
            onSend={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
