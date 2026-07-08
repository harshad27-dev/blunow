import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import {
  MessageBubble,
  type MessageReplyPreview,
} from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import {
  useChatConversationQuery,
  useDeleteChatMessageMutation,
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
import { moderationService } from "@/services/moderation.service";
import { userService } from "@/services/user.service";
import { useQueryClient } from "@tanstack/react-query";

type PendingMessage = ChatMessage & {
  isPending?: boolean;
  replyPreview?: MessageReplyPreview | null;
};

type TimelineItem =
  | { type: "message"; id: string; message: PendingMessage }
  | { type: "date"; id: string; label: string };

const QUICK_REACTIONS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDC4D", "\uD83D\uDE2E", "\uD83D\uDE22"] as const;

const getParam = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getOtherParticipant = (conversation: any, currentUserId?: string) =>
  conversation?.user1Id === currentUserId
    ? conversation?.user2
    : conversation?.user1;

const getDateKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "unknown";

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const getDateLabel = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDateKey(value) === getDateKey(today.toISOString())) return "Today";
  if (getDateKey(value) === getDateKey(yesterday.toISOString())) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};


const getMessagePreviewText = (message: PendingMessage) => {
  if (message.isDeleted) return "Message deleted";
  return message.content || (message.mediaUrl ? "Shared media" : "Message");
};
const buildTimelineItems = (items: PendingMessage[]): TimelineItem[] => {
  return items.flatMap((message, index) => {
    const nextMessage = items[index + 1];
    const currentDateKey = getDateKey(message.createdAt);
    const nextDateKey = nextMessage ? getDateKey(nextMessage.createdAt) : null;
    const timelineItems: TimelineItem[] = [
      { type: "message", id: message.id, message },
    ];

    if (currentDateKey !== nextDateKey) {
      timelineItems.push({
        type: "date",
        id: `date-${currentDateKey}-${message.id}`,
        label: getDateLabel(message.createdAt),
      });
    }

    return timelineItems;
  });
};

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
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<PendingMessage | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const actionOverlayAnim = useRef(new Animated.Value(0)).current;

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
  const deleteMessageMutation = useDeleteChatMessageMutation(roomId);

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
    return [...pendingNewestFirst, ...serverMessages].filter(
      (message) => !hiddenMessageIds.includes(message.id),
    );
  }, [hiddenMessageIds, pendingMessages, serverMessages]);

  const timelineItems = useMemo(() => buildTimelineItems(messages), [messages]);

  useEffect(() => {
    if (!selectedMessage) return;

    actionOverlayAnim.setValue(0);
    Animated.spring(actionOverlayAnim, {
      toValue: 1,
      damping: 17,
      stiffness: 230,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [actionOverlayAnim, selectedMessage]);

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
    const replyPreview = replyTarget
      ? {
          title: `Replying to ${replyTarget.senderId === user?.id ? "yourself" : name}`,
          body: getMessagePreviewText(replyTarget),
        }
      : null;

    const pendingMessage: PendingMessage = {
      id: `${roomId}-${Date.now()}`,
      chatId: roomId,
      senderId: user?.id || "me",
      type,
      content,
      mediaUrl,
      createdAt: new Date().toISOString(),
      isPending: true,
      replyPreview,
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

  const hideMessageForMe = (messageId: string) => {
    setPendingMessages((current) =>
      current.filter((message) => message.id !== messageId),
    );
    setHiddenMessageIds((current) =>
      current.includes(messageId) ? current : [...current, messageId],
    );
  };

  const showActionNotice = (message: string) => {
    setActionNotice(message);
    setTimeout(() => setActionNotice(null), 1600);
  };

  const closeMessageActions = useCallback(() => {
    Animated.timing(actionOverlayAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setSelectedMessage(null));
  }, [actionOverlayAnim]);

  const reportMessage = async (message: PendingMessage) => {
    closeMessageActions();
    try {
      await moderationService.report({
        contentId: message.id,
        contentType: "MESSAGE",
        reportedId: message.senderId,
        reason: "HARASSMENT",
        description: "Reported from a chat message",
      });
      showActionNotice("Report sent for review");
    } catch (error: any) {
      showActionNotice(
        error?.response?.data?.message || "Unable to report this message",
      );
    }
  };

  const showMessageActions = (message: PendingMessage) => {
    setSelectedMessage(message);
  };

  const replyToMessage = (message: PendingMessage) => {
    setReplyTarget(message);
    closeMessageActions();
    showActionNotice("Reply selected");
  };

  const reactToMessage = (message: PendingMessage, reaction: string) => {
    setMessageReactions((current) => ({ ...current, [message.id]: reaction }));
    closeMessageActions();
  };

  const copyMessageText = (message: PendingMessage) => {
    closeMessageActions();
    showActionNotice(message.content ? "Text ready to copy" : "No text to copy");
  };

  const deleteMessageForMe = (message: PendingMessage) => {
    closeMessageActions();
    hideMessageForMe(message.id);
    showActionNotice("Deleted for you");
  };
  const deleteMessageForEveryone = async (message: PendingMessage) => {
    closeMessageActions();

    if (message.isPending) {
      hideMessageForMe(message.id);
      showActionNotice("Message removed");
      return;
    }

    try {
      await deleteMessageMutation.mutateAsync(message.id);
      setMessageReactions((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
      showActionNotice("Deleted for everyone");
    } catch (error: any) {
      showActionNotice(
        error?.response?.data?.message || "Unable to delete for everyone",
      );
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
      {
        text: "Report user",
        onPress: async () => {
          const reportedId = otherParticipant?.id || getParam(params.userId);
          if (!reportedId) return;
          await moderationService.report({
            contentId: reportedId,
            contentType: "USER",
            reportedId,
            reason: "HARASSMENT",
            description: "Reported from a conversation",
          });
          Alert.alert("Report received", "Our safety team will review it.");
        },
      },
      {
        text: "Block user",
        style: "destructive",
        onPress: async () => {
          const reportedId = otherParticipant?.id || getParam(params.userId);
          if (!reportedId) return;
          await userService.blockUser(reportedId);
          router.replace("/(tabs)/chat");
        },
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
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
          data={timelineItems}
          keyExtractor={(item) => item.id}
          inverted
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: timelineItems.length ? "flex-start" : "center",
            paddingHorizontal: 12,
            paddingBottom: 14,
            paddingTop: 14,
          }}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
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
            if (item.type === "date") {
              return <MessageDateSeparator label={item.label} />;
            }

            const nextItem = timelineItems[index + 1];
            const nextMessage =
              nextItem?.type === "message" ? nextItem.message : undefined;
            const showAvatar =
              item.message.senderId !== user?.id &&
              nextMessage?.senderId !== item.message.senderId;
            const showReaction = item.message.senderId !== user?.id && index === 0;

            return (
              <MessageBubble
                message={item.message}
                isMine={item.message.senderId === user?.id}
                showAvatar={showAvatar}
                avatarUrl={avatarUrl}
                reaction={messageReactions[item.message.id] || (showReaction ? "\u2764\uFE0F" : undefined)}
                replyPreview={item.message.replyPreview}
                onLongPress={() => showMessageActions(item.message)}
              />
            );
          }}
        />

        <SafeAreaView edges={["bottom"]} className="bg-bg">
          <ChatInput
            placeholder={replyTarget ? "Reply to message..." : "Type a message..."}
            disabled={!isSocketConnected || isUploadingMedia}
            replyPreview={
              replyTarget
                ? {
                    title: `Replying to ${replyTarget.senderId === user?.id ? "yourself" : name}`,
                    body: replyTarget.isDeleted
                      ? "Message deleted"
                      : replyTarget.content ||
                        (replyTarget.mediaUrl ? "Shared media" : "Message"),
                    onClear: () => setReplyTarget(null),
                  }
                : null
            }
            onSend={(content) => {
              sendMessage(content);
              setReplyTarget(null);
            }}
            onPickImage={pickImage}
            onTypingChange={sendTypingState}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {actionNotice ? (
        <View className="absolute left-8 right-8 top-16 items-center" pointerEvents="none">
          <View className="rounded-full border border-border bg-bg-card px-4 py-2" style={styles.floatingNotice}>
            <Text className="text-xs font-extrabold text-text-primary">{actionNotice}</Text>
          </View>
        </View>
      ) : null}

      <MessageActionOverlay
        message={selectedMessage}
        isMine={selectedMessage?.senderId === user?.id}
        animatedValue={actionOverlayAnim}
        onClose={closeMessageActions}
        onReply={replyToMessage}
        onReact={reactToMessage}
        onCopy={copyMessageText}
        onDelete={deleteMessageForMe}
        onDeleteForEveryone={deleteMessageForEveryone}
        onReport={reportMessage}
      />
    </SafeAreaView>
  );
}

const MessageDateSeparator = ({ label }: { label: string }) => (
  <View className="items-center py-1">
    <Text
      className="overflow-hidden rounded-full border border-border bg-bg-card px-3 py-1 text-[11px] font-extrabold text-text-secondary"
      style={styles.datePill}
    >
      {label}
    </Text>
  </View>
);

const MessageActionOverlay = ({
  message,
  isMine,
  animatedValue,
  onClose,
  onReply,
  onReact,
  onCopy,
  onDelete,
  onDeleteForEveryone,
  onReport,
}: {
  message: PendingMessage | null;
  isMine: boolean;
  animatedValue: Animated.Value;
  onClose: () => void;
  onReply: (message: PendingMessage) => void;
  onReact: (message: PendingMessage, reaction: string) => void;
  onCopy: (message: PendingMessage) => void;
  onDelete: (message: PendingMessage) => void;
  onDeleteForEveryone: (message: PendingMessage) => void;
  onReport: (message: PendingMessage) => void;
}) => {
  if (!message) return null;

  const content =
    message.content ||
    (message.isDeleted
      ? "Message deleted"
      : message.mediaUrl
        ? "Shared media"
        : "Message");
  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-center px-5">
        <Pressable
          className="absolute inset-0"
          style={styles.actionBackdrop}
          onPress={onClose}
        />

        <Animated.View
          style={{
            opacity: animatedValue,
            transform: [{ scale }, { translateY }],
          }}
        >
          <View className={isMine ? "items-end" : "items-start"}>
            <View
              className={`mb-3 max-w-[82%] rounded-[22px] px-4 py-3 ${
                isMine ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={isMine ? styles.actionPreviewMine : styles.actionPreviewOther}
            >
              <Text
                className={`text-[14px] font-semibold leading-5 ${
                  isMine ? "text-inverse" : "text-text-primary"
                }`}
                numberOfLines={4}
              >
                {content}
              </Text>
            </View>
          </View>

          <View
            className="self-center rounded-full border border-border bg-bg-card px-2.5 py-2"
            style={styles.reactionDock}
          >
            <View className="flex-row items-center">
              {QUICK_REACTIONS.map((reaction) => (
                <Pressable
                  key={reaction}
                  className="mx-1 h-10 w-10 items-center justify-center rounded-full bg-bg-elevated"
                  onPress={() => onReact(message, reaction)}
                >
                  <Text className="text-[20px]">{reaction}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            className="mt-3 overflow-hidden rounded-[24px] border border-border bg-bg-card"
            style={styles.actionCard}
          >
            <MessageActionRow
              icon="return-up-back-outline"
              label="Reply"
              onPress={() => onReply(message)}
            />
            {message.content?.trim() ? (
              <MessageActionRow
                icon="copy-outline"
                label="Copy text"
                onPress={() => onCopy(message)}
              />
            ) : null}
            <MessageActionRow
              icon="trash-outline"
              label="Delete for me"
              destructive
              onPress={() => onDelete(message)}
            />
            {isMine ? (
              <MessageActionRow
                icon="close-circle-outline"
                label="Delete for everyone"
                destructive
                onPress={() => onDeleteForEveryone(message)}
              />
            ) : null}
            {!isMine ? (
              <MessageActionRow
                icon="flag-outline"
                label="Report message"
                destructive
                onPress={() => onReport(message)}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const MessageActionRow = ({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    className="min-h-[52px] flex-row items-center px-4"
    onPress={onPress}
    android_ripple={{ color: `${Colors.primaryLight}18` }}
  >
    <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-bg-elevated">
      <Ionicons
        name={icon}
        size={18}
        color={destructive ? Colors.error : Colors.textPrimary}
      />
    </View>
    <Text
      className="flex-1 text-[15px] font-extrabold"
      style={{ color: destructive ? Colors.error : Colors.textPrimary }}
    >
      {label}
    </Text>
    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
  </Pressable>
);
const styles = StyleSheet.create({
  actionBackdrop: {
    backgroundColor: Colors.overlayDark,
  },
  actionCard: {
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  actionPreviewMine: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  actionPreviewOther: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.black,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  floatingNotice: {
    shadowColor: Colors.black,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 7,
  },
  reactionDock: {
    shadowColor: Colors.black,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
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



















