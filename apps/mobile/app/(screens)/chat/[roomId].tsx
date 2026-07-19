import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput, type ChatInputHandle } from "@/components/chat/ChatInput";
import {
  MessageBubble,
  type MessageDeliveryStatus,
  type MessageReplyPreview,
  type GroupedReaction,
} from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import {
  useChatConversationQuery,
  useDeleteChatMessageMutation,
  useInfiniteChatMessagesQuery,
  useMarkChatReadMutation,
  useUpdateChatSettingsMutation,
  useReactToMessageMutation,
  chatKeys,
} from "@/hooks/useChat";
import { useChatSocket, type ChatSocketError } from "@/hooks/useSocket";
import { useRespondMatchRequestMutation } from "@/hooks/queries";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import type { ChatMessage, ChatMessageType } from "@/types/chat.types";
import { postService } from "@/services/post.service";
import { moderationService } from "@/services/moderation.service";
import { userService } from "@/services/user.service";
import { useQueryClient } from "@tanstack/react-query";

type PendingMessage = ChatMessage & {
  isPending?: boolean;
  sendStatus?: MessageDeliveryStatus;
  failureReason?: string;
  replyPreview?: MessageReplyPreview | null;
};

type TimelineItem =
  | { type: "message"; id: string; message: PendingMessage }
  | { type: "date"; id: string; label: string };

type ChatDialogAction = {
  label: string;
  description?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  variant?: "primary" | "secondary" | "danger";
  closeOnPress?: boolean;
  onPress: () => void | Promise<void>;
};

type ChatDialogState = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  accent?: string;
  details?: { label: string; value: string }[];
  actions?: ChatDialogAction[];
};

const QUICK_REACTIONS = [
  "\u2764\uFE0F",
  "\uD83D\uDE02",
  "\uD83D\uDC4D",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDD25",
] as const;

const STARTER_PROMPTS = [
  {
    id: "hello",
    icon: "hand-left-outline",
    text: "Hey! How is your day going?",
  },
  {
    id: "content",
    icon: "film-outline",
    text: "What kind of content do you enjoy?",
  },
  {
    id: "coffee",
    icon: "cafe-outline",
    text: "Want to grab coffee sometime?",
  },
] as const;

const BOTTOM_SCROLL_THRESHOLD = 96;
const STICKY_DATE_HIDE_DELAY = 950;

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
  if (getDateKey(value) === getDateKey(yesterday.toISOString()))
    return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const getMessagePreviewText = (
  message: Pick<PendingMessage, "content" | "mediaUrl" | "isDeleted">,
) => {
  if (message.isDeleted) return "Message deleted";
  return message.content || (message.mediaUrl ? "Shared media" : "Message");
};

const getSenderLabel = (
  message: Pick<PendingMessage, "senderId" | "sender">,
  currentUserId?: string,
  fallbackName = "them",
) => {
  if (message.senderId === currentUserId) return "you";
  return (
    message.sender?.profile?.username ||
    message.sender?.username ||
    fallbackName
  );
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

const createClientId = (roomId: string) =>
  `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  const listRef = useRef<FlatList<TimelineItem>>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(
    null,
  );
  // string = emoji set, null = reaction removed/cleared
  const [messageReactions, setMessageReactions] = useState<
    Record<string, string | null>
  >({});
  const [replyTarget, setReplyTarget] = useState<PendingMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [chatDialog, setChatDialog] = useState<ChatDialogState | null>(null);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
  const [newMessagesWhileAway, setNewMessagesWhileAway] = useState(0);
  const [stickyDateLabel, setStickyDateLabel] = useState<string | null>(null);
  const [showStickyDate, setShowStickyDate] = useState(false);
  const actionOverlayAnim = useRef(new Animated.Value(0)).current;
  const emptyStateAnim = useRef(new Animated.Value(0)).current;
  const emptyBadgePulseAnim = useRef(new Animated.Value(0)).current;
  const promptEntranceAnims = useRef(
    STARTER_PROMPTS.map(() => new Animated.Value(0)),
  ).current;
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stickyDateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const reactMutation = useReactToMessageMutation(roomId);
  const respondRequestMutation = useRespondMatchRequestMutation();

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
  const messageIndexById = useMemo(() => {
    const map = new Map<string, number>();
    timelineItems.forEach((item, index) => {
      if (item.type === "message") map.set(item.message.id, index);
    });
    return map;
  }, [timelineItems]);

  const emptyStateAnimatedStyle = {
    opacity: emptyStateAnim,
    transform: [
      {
        translateY: emptyStateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
      {
        scale: emptyStateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  const emptyBadgePulseStyle = {
    transform: [
      {
        scale: emptyBadgePulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
    opacity: emptyBadgePulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.72, 1],
    }),
  };
  const isCurrentUser1 = conversation?.user1Id === user?.id;
  const isMuted = isCurrentUser1
    ? conversation?.mutedBy1
    : conversation?.mutedBy2;
  const isArchived = isCurrentUser1
    ? conversation?.archivedBy1
    : conversation?.archivedBy2;
  const isRequestChat = conversation?.status === "REQUESTED";
  const isIncomingRequest = Boolean(
    isRequestChat && conversation?.requestedById !== user?.id,
  );
  const requestId = conversation?.requestId || conversation?.request?.id;
  const requestMessagesSentByMe = messages.filter(
    (message) => message.senderId === user?.id,
  ).length;
  const isRequestInputLocked = Boolean(
    isRequestChat &&
      (isIncomingRequest || requestMessagesSentByMe >= 3),
  );

  const showActionNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setActionNotice(message);
    noticeTimerRef.current = setTimeout(() => setActionNotice(null), 1600);
  }, []);

  const closeChatDialog = useCallback(() => setChatDialog(null), []);

  const showChatDialog = useCallback(
    (dialog: Omit<ChatDialogState, "visible">) => {
      setChatDialog({ ...dialog, visible: true });
    },
    [],
  );

  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "success" | "error" = "light") => {
      if (type === "success") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
        return;
      }
      if (type === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => undefined,
        );
        return;
      }
      Haptics.impactAsync(
        type === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
    },
    [],
  );

  const flashMessage = useCallback((messageId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedMessageId(messageId);
    highlightTimerRef.current = setTimeout(
      () => setHighlightedMessageId(null),
      1400,
    );
  }, []);

  const getReplyPreview = useCallback(
    (message: PendingMessage): MessageReplyPreview | null => {
      if (message.replyPreview) return message.replyPreview;
      const replyMessage = message.replyToMessage;
      if (!replyMessage) return null;
      return {
        title: `Replying to ${getSenderLabel(replyMessage, user?.id, name)}`,
        body: getMessagePreviewText(replyMessage),
      };
    },
    [name, user?.id],
  );

  const getDeliveryStatus = useCallback(
    (message: PendingMessage): MessageDeliveryStatus => {
      if (message.sendStatus) return message.sendStatus;
      if (message.readReceipts?.length) return "read";
      if (message.deliveredAt) return "delivered";
      return "sent";
    },
    [],
  );

  const scrollToMessage = useCallback(
    (messageId?: string | null) => {
      if (!messageId) return;
      const index = messageIndexById.get(messageId);
      if (index === undefined) {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        showActionNotice("Original message is loading");
        return;
      }
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      flashMessage(messageId);
      triggerHaptic("light");
    },
    [
      fetchNextPage,
      flashMessage,
      hasNextPage,
      isFetchingNextPage,
      messageIndexById,
      showActionNotice,
      triggerHaptic,
    ],
  );

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setIsAwayFromBottom(false);
    setNewMessagesWhileAway(0);
    triggerHaptic("light");
  }, [triggerHaptic]);

  const handleStarterPrompt = useCallback(
    (prompt: string) => {
      inputRef.current?.setDraft(prompt);
      triggerHaptic("light");
    },
    [triggerHaptic],
  );

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const away = offsetY > BOTTOM_SCROLL_THRESHOLD;
      setIsAwayFromBottom((current) => (current === away ? current : away));
      if (!away) setNewMessagesWhileAway(0);

      setShowStickyDate(away);
      if (stickyDateTimerRef.current) clearTimeout(stickyDateTimerRef.current);
      stickyDateTimerRef.current = setTimeout(() => {
        setShowStickyDate(false);
      }, STICKY_DATE_HIDE_DELAY);
    },
    [],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<TimelineItem>[] }) => {
      const visibleMessage = viewableItems.find(
        (viewableItem) => viewableItem.item?.type === "message",
      );
      if (visibleMessage?.item?.type === "message") {
        setStickyDateLabel(getDateLabel(visibleMessage.item.message.createdAt));
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
  }).current;
  const closeMessageActions = useCallback(() => {
    Animated.timing(actionOverlayAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setSelectedMessage(null));
  }, [actionOverlayAnim]);

  const emitPendingMessage = useCallback(
    (message: PendingMessage) => {
      if (!isSocketConnected) {
        setPendingMessages((current) =>
          current.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  isPending: true,
                  sendStatus: "failed",
                  failureReason: "Chat is offline",
                }
              : item,
          ),
        );
        triggerHaptic("error");
        showActionNotice("Message queued offline");
        return;
      }

      setPendingMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, isPending: true, sendStatus: "sending" }
            : item,
        ),
      );
      socket.emit("chat:message", {
        chatId: roomId,
        type: message.type,
        content: message.content || undefined,
        mediaUrl: message.mediaUrl || undefined,
        replyToMessageId: message.replyToMessageId || undefined,
        clientId: message.clientId || message.id,
      });
    },
    [isSocketConnected, roomId, showActionNotice, socket, triggerHaptic],
  );

  const retryMessage = useCallback(
    (message: PendingMessage) => {
      triggerHaptic("medium");
      emitPendingMessage(message);
    },
    [emitPendingMessage, triggerHaptic],
  );

  const sendMessage = useCallback(
    (content: string, type: ChatMessageType = "TEXT", mediaUrl?: string) => {
      const clientId = createClientId(roomId);
      const replyPreview = replyTarget
        ? {
            title: `Replying to ${getSenderLabel(replyTarget, user?.id, name)}`,
            body: getMessagePreviewText(replyTarget),
          }
        : null;
      const pendingMessage: PendingMessage = {
        id: clientId,
        clientId,
        chatId: roomId,
        senderId: user?.id || "me",
        type,
        content,
        mediaUrl,
        createdAt: new Date().toISOString(),
        isPending: true,
        sendStatus: isSocketConnected ? "sending" : "failed",
        failureReason: isSocketConnected ? undefined : "Chat is offline",
        replyToMessageId: replyTarget?.id,
        replyToMessage: replyTarget || undefined,
        replyPreview,
      };
      setPendingMessages((current) => [...current, pendingMessage]);
      triggerHaptic(isSocketConnected ? "light" : "error");
      emitPendingMessage(pendingMessage);
    },
    [
      emitPendingMessage,
      isSocketConnected,
      name,
      replyTarget,
      roomId,
      triggerHaptic,
      user?.id,
    ],
  );

  const replyToMessage = useCallback(
    (message: PendingMessage) => {
      setReplyTarget(message);
      closeMessageActions();
      triggerHaptic("medium");
      showActionNotice("Reply selected");
      setTimeout(() => inputRef.current?.focus(), 120);
    },
    [closeMessageActions, showActionNotice, triggerHaptic],
  );

  useEffect(() => {
    if (isLoading || messages.length > 0) return;

    emptyStateAnim.setValue(0);
    emptyBadgePulseAnim.setValue(0);
    promptEntranceAnims.forEach((anim) => anim.setValue(0));

    Animated.parallel([
      Animated.timing(emptyStateAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        promptEntranceAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(emptyBadgePulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(emptyBadgePulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [
    emptyBadgePulseAnim,
    emptyStateAnim,
    isLoading,
    messages.length,
    promptEntranceAnims,
  ]);
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (stickyDateTimerRef.current) clearTimeout(stickyDateTimerRef.current);
    };
  }, []);

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
    const handleDisconnect = () => setIsSocketConnected(false);
    const handleNewMessage = (message: unknown) => {
      const nextMessage = message as ChatMessage;
      if (nextMessage.chatId !== roomId) return;
      setPendingMessages((current) =>
        current.filter((pending) => {
          if (pending.clientId && nextMessage.clientId)
            return pending.clientId !== nextMessage.clientId;
          return (
            pending.senderId !== nextMessage.senderId ||
            (pending.content !== nextMessage.content &&
              pending.mediaUrl !== nextMessage.mediaUrl)
          );
        }),
      );
      queryClient.setQueryData<any>(
        chatKeys.messages(roomId),
        (current: any) => {
          if (!current?.pages) return current;
          if (
            current.pages.some((page: ChatMessage[]) =>
              page.some((item) => item.id === nextMessage.id),
            )
          )
            return current;
          const pages = [...current.pages];
          pages[0] = [nextMessage, ...(pages[0] ?? [])];
          return { ...current, pages };
        },
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      if (nextMessage.senderId !== user?.id) {
        if (isAwayFromBottom) {
          setNewMessagesWhileAway((count) => count + 1);
        } else {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          });
        }
      }
    };
    const handleTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId === user?.id) return;
      setTypingUserIds((current) => {
        if (!payload.isTyping)
          return current.filter((id) => id !== payload.userId);
        if (current.includes(payload.userId)) return current;
        return [...current, payload.userId];
      });
    };
    const handleRead = (payload: { chatId: string; userId: string }) => {
      if (payload.chatId !== roomId || payload.userId === user?.id) return;
      queryClient.setQueryData<any>(
        chatKeys.messages(roomId),
        (current: any) => {
          if (!current?.pages) return current;
          return {
            ...current,
            pages: current.pages.map((page: ChatMessage[]) =>
              page.map((message) => {
                if (message.senderId !== user?.id) return message;
                const hasReceipt = message.readReceipts?.some(
                  (receipt) => receipt.readByUserId === payload.userId,
                );
                if (hasReceipt) return message;
                return {
                  ...message,
                  isRead: true,
                  readReceipts: [
                    ...(message.readReceipts ?? []),
                    {
                      messageId: message.id,
                      readByUserId: payload.userId,
                      readAt: new Date().toISOString(),
                    },
                  ],
                };
              }),
            ),
          };
        },
      );
    };
    const handleSocketError = (payload: ChatSocketError) => {
      let matched = false;
      setPendingMessages((current) =>
        current.map((message) => {
          if (payload.clientId && message.clientId === payload.clientId) {
            matched = true;
            return {
              ...message,
              isPending: true,
              sendStatus: "failed",
              failureReason: payload.message || "Unable to send message",
            };
          }
          return message;
        }),
      );
      triggerHaptic("error");
      showActionNotice(payload.message || "Message failed");
      if (!payload.clientId || !matched) {
        showChatDialog({
          title: "Message failed",
          message: payload.message || "Unable to send your message.",
          icon: "alert-circle-outline",
          accent: Colors.error,
          actions: [{
            label: "Got it",
            icon: "checkmark",
            variant: "primary",
            onPress: closeChatDialog,
          }],
        });
      }
    };
    const handleReaction = (payload: {
      chatId: string;
      messageId: string;
      userId: string;
      emoji: string | null;
    }) => {
      if (payload.chatId !== roomId || payload.userId === user?.id) return;
      setMessageReactions((current) => ({
        ...current,
        [payload.messageId]: payload.emoji,
      }));
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:message:new", handleNewMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:read", handleRead);
    socket.on("chat:error", handleSocketError);
    socket.on("chat:reaction" as any, handleReaction);
    if (socket.connected) handleConnect();
    return () => {
      socket.emit("chat:leave", roomId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:message:new", handleNewMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:read", handleRead);
      socket.off("chat:error", handleSocketError);
      socket.off("chat:reaction" as any, handleReaction);
    };
  }, [
    isAwayFromBottom,
    queryClient,
    roomId,
    showActionNotice,
    showChatDialog,
    closeChatDialog,
    socket,
    triggerHaptic,
    user?.id,
  ]);

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
    if (typingUserIds.length > 0) return `${name} is typing...`;
    if (!isSocketConnected) return "Reconnecting...";
    if (isConversationFetching) return "Syncing...";
    if (messages.length === 0) return "Start the conversation";
    if (isMuted) return "Muted";
    return "Online now";
  }, [
    isConversationFetching,
    isMuted,
    isSocketConnected,
    messages.length,
    name,
    typingUserIds.length,
  ]);

  const sendTypingState = useCallback(
    (isTyping: boolean) => {
      if (!roomId || !isSocketConnected) return;
      socket.emit("chat:typing", { chatId: roomId, isTyping });
    },
    [isSocketConnected, roomId, socket],
  );

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showChatDialog({
          title: "Photos permission needed",
          message: "Allow photo access to send an image.",
          icon: "images-outline",
          accent: Colors.primaryLight,
          actions: [{
            label: "Got it",
            icon: "checkmark",
            variant: "primary",
            onPress: closeChatDialog,
          }],
        });
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
      showChatDialog({
        title: "Image failed",
        message: error.message || "Unable to send image.",
        icon: "image-outline",
        accent: Colors.error,
        actions: [{
          label: "Got it",
          icon: "checkmark",
          variant: "primary",
          onPress: closeChatDialog,
        }],
      });
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
      triggerHaptic("success");
      showActionNotice("Report sent for review");
    } catch (error: any) {
      triggerHaptic("error");
      showActionNotice(
        error?.response?.data?.message || "Unable to report this message",
      );
    }
  };

  const showMessageActions = (message: PendingMessage) => {
    triggerHaptic("medium");
    setSelectedMessage(message);
  };

  const reactToMessage = (message: PendingMessage, emoji: string | null) => {
    const currentEmoji = messageReactions[message.id];
    // Toggle: tapping the same emoji removes it; tapping a new one sets it
    const nextEmoji = emoji === currentEmoji ? null : emoji;
    setMessageReactions((current) => ({ ...current, [message.id]: nextEmoji }));
    triggerHaptic(nextEmoji ? "light" : "medium");
    closeMessageActions();

    // Persist via REST (fire-and-forget; optimistic state is source of truth)
    if (!message.isPending) {
      reactMutation.mutate({ messageId: message.id, emoji: nextEmoji });
    }

    // Broadcast to partner via socket
    if (isSocketConnected) {
      socket.emit("chat:reaction" as any, {
        chatId: roomId,
        messageId: message.id,
        emoji: nextEmoji,
      });
    }
  };

  const copyMessageText = (message: PendingMessage) => {
    closeMessageActions();
    triggerHaptic("light");
    showActionNotice(
      message.content ? "Text ready to copy" : "No text to copy",
    );
  };

  const showMessageInfo = (message: PendingMessage) => {
    closeMessageActions();
    const status = getDeliveryStatus(message);
    showChatDialog({
      title: "Message info",
      message: "Delivery and timestamp details for this message.",
      icon: "information-circle-outline",
      accent: Colors.primaryLight,
      details: [
        {
          label: "Status",
          value: `${status.charAt(0).toUpperCase()}${status.slice(1)}`,
        },
        {
          label: "Sent",
          value: new Date(message.createdAt).toLocaleString(),
        },
      ],
      actions: [{
        label: "Done",
        icon: "checkmark",
        variant: "primary",
        onPress: closeChatDialog,
      }],
    });
  };

  const deleteMessageForMe = (message: PendingMessage) => {
    closeMessageActions();
    hideMessageForMe(message.id);
    triggerHaptic("light");
    showActionNotice("Deleted for you");
  };

  const respondToMessageRequest = (status: "ACCEPTED" | "REJECTED") => {
    if (!requestId) return;
    triggerHaptic(status === "ACCEPTED" ? "success" : "light");
    respondRequestMutation.mutate(
      { requestId, status },
      {
        onSuccess: () => {
          showActionNotice(
            status === "ACCEPTED" ? "Request accepted" : "Request rejected",
          );
          if (status === "REJECTED") router.back();
        },
        onError: (error: any) => {
          triggerHaptic("error");
          showActionNotice(
            error?.response?.data?.message || "Unable to update request",
          );
        },
      },
    );
  };
  const deleteMessageForEveryone = async (message: PendingMessage) => {
    closeMessageActions();
    if (message.isPending) {
      hideMessageForMe(message.id);
      triggerHaptic("light");
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
      triggerHaptic("success");
      showActionNotice("Deleted for everyone");
    } catch (error: any) {
      triggerHaptic("error");
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
    showChatDialog({
      title: name,
      message: "Conversation options",
      icon: "ellipsis-horizontal-circle-outline",
      accent: Colors.primaryLight,
      actions: [
        {
          label: isMuted ? "Unmute" : "Mute",
          description: isMuted
            ? "Allow notifications from this conversation."
            : "Quiet notifications for this conversation.",
          icon: isMuted ? "notifications-outline" : "notifications-off-outline",
          onPress: () => {
            closeChatDialog();
            updateSettingsMutation.mutate({ muted: !isMuted });
          },
        },
        {
          label: isArchived ? "Unarchive" : "Archive",
          description: isArchived
            ? "Move this chat back to your main inbox."
            : "Move this chat out of the main inbox.",
          icon: isArchived ? "archive-outline" : "file-tray-full-outline",
          onPress: () => {
            closeChatDialog();
            updateSettingsMutation.mutate({ archived: !isArchived });
          },
        },
        {
          label: "Report user",
          description: "Send this profile to the safety team for review.",
          icon: "flag-outline",
          variant: "danger",
          onPress: async () => {
            closeChatDialog();
            const reportedId = otherParticipant?.id || getParam(params.userId);
            if (!reportedId) return;
            try {
              await moderationService.report({
                contentId: reportedId,
                contentType: "USER",
                reportedId,
                reason: "HARASSMENT",
                description: "Reported from a conversation",
              });
              triggerHaptic("success");
              showChatDialog({
                title: "Report received",
                message: "Our safety team will review it.",
                icon: "shield-checkmark-outline",
                accent: Colors.success,
                actions: [{
                  label: "Done",
                  icon: "checkmark",
                  variant: "primary",
                  onPress: closeChatDialog,
                }],
              });
            } catch (error: any) {
              triggerHaptic("error");
              showChatDialog({
                title: "Report failed",
                message:
                  error?.response?.data?.message || "Unable to report this user.",
                icon: "alert-circle-outline",
                accent: Colors.error,
                actions: [{
                  label: "Got it",
                  icon: "checkmark",
                  variant: "primary",
                  onPress: closeChatDialog,
                }],
              });
            }
          },
        },
        {
          label: "Block user",
          description: "They will not be able to contact or find you.",
          icon: "ban-outline",
          variant: "danger",
          onPress: async () => {
            closeChatDialog();
            const reportedId = otherParticipant?.id || getParam(params.userId);
            if (!reportedId) return;
            await userService.blockUser(reportedId);
            router.replace("/(tabs)/chat");
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1 bg-bg"
        style={styles.keyboardAvoidingView}
        behavior="padding"
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={0}
      >
        <View className="flex-row items-center border-b border-border bg-bg px-5 py-3.5">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-bg-card"
            onPress={() => router.back()}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.textPrimary}
            />
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
                {subtitle}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card"
            onPress={showChatActions}
            activeOpacity={0.82}
            style={styles.navButton}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {isRequestChat ? (
          <MessageRequestBanner
            isIncoming={isIncomingRequest}
            disabled={respondRequestMutation.isPending}
            sentCount={requestMessagesSentByMe}
            onAccept={() => respondToMessageRequest("ACCEPTED")}
            onReject={() => respondToMessageRequest("REJECTED")}
          />
        ) : null}
        <FlatList
          ref={listRef}
          className="flex-1"
          data={timelineItems}
          keyExtractor={(item) => item.id}
          inverted
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
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
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
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
              <Animated.View
                className="w-full items-center px-4"
                style={emptyStateAnimatedStyle}
              >
                <View className="items-center">
                  <Animated.View
                    className="absolute h-28 w-28 rounded-full bg-primary-light/20"
                    style={emptyBadgePulseStyle}
                  />
                  <View
                    className="h-24 w-24 items-center justify-center rounded-full border border-border bg-bg-card"
                    style={styles.emptyBadgeShell}
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        className="h-20 w-20 rounded-full bg-bg-elevated"
                      />
                    ) : (
                      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-light">
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={30}
                          color={Colors.textInverse}
                        />
                      </View>
                    )}
                  </View>
                </View>

                <Text className="mt-6 text-center text-[24px] font-extrabold leading-8 text-text-primary">
                  Chat with {name}
                </Text>
                <Text className="mt-2 max-w-[300px] text-center text-[13px] font-semibold leading-5 text-text-secondary">
                  Start with something warm, specific, and easy to reply to.
                </Text>

                <View className="mt-7 w-full max-w-[360px]">
                  {STARTER_PROMPTS.map((prompt, promptIndex) => {
                    const entrance = promptEntranceAnims[promptIndex];
                    return (
                      <Animated.View
                        key={prompt.id}
                        style={{
                          opacity: entrance,
                          transform: [
                            {
                              translateY: entrance.interpolate({
                                inputRange: [0, 1],
                                outputRange: [18, 0],
                              }),
                            },
                            {
                              scale: entrance.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.97, 1],
                              }),
                            },
                          ],
                        }}
                      >
                        <Pressable
                          className="mb-3 flex-row items-center rounded-full border border-border bg-bg-card px-3.5 py-3"
                          style={styles.promptChip}
                          onPress={() => handleStarterPrompt(prompt.text)}
                        >
                          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-bg-elevated">
                            <Ionicons
                              name={
                                prompt.icon as React.ComponentProps<
                                  typeof Ionicons
                                >["name"]
                              }
                              size={18}
                              color={Colors.textPrimary}
                            />
                          </View>
                          <Text
                            className="min-w-0 flex-1 text-[13px] font-extrabold leading-4 text-text-primary"
                            numberOfLines={2}
                          >
                            {prompt.text}
                          </Text>
                          <View className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-primary-light/20">
                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color={Colors.textPrimary}
                            />
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              </Animated.View>
            )
          }
          renderItem={({ item, index }) => {
            if (item.type === "date")
              return <MessageDateSeparator label={item.label} />;
            const nextItem = timelineItems[index + 1];
            const nextMessage =
              nextItem?.type === "message" ? nextItem.message : undefined;
            const showAvatar =
              item.message.senderId !== user?.id &&
              nextMessage?.senderId !== item.message.senderId;
            const replyPreview = getReplyPreview(item.message);
            const replyTargetId =
              item.message.replyToMessageId || item.message.replyToMessage?.id;

            // Build grouped reactions from local state (optimistic) merged with server data
            const localEmoji = messageReactions[item.message.id];
            const isMine = item.message.senderId === user?.id;

            // Build GroupedReaction[] from local optimistic state
            const groupedReactions: GroupedReaction[] = (() => {
              const serverReactions = item.message.reactions ?? [];
              // Start from server reactions, then apply local overrides
              const emojiMap = new Map<
                string,
                { count: number; reactedByMe: boolean }
              >();

              for (const r of serverReactions) {
                const existing = emojiMap.get(r.emoji) ?? {
                  count: 0,
                  reactedByMe: false,
                };
                emojiMap.set(r.emoji, {
                  count: existing.count + 1,
                  reactedByMe: existing.reactedByMe || r.userId === user?.id,
                });
              }

              // Apply local override from optimistic state
              if (localEmoji !== undefined) {
                // Remove any previous "mine" count from server data
                for (const [emoji, data] of emojiMap.entries()) {
                  if (data.reactedByMe) {
                    if (data.count <= 1) {
                      emojiMap.delete(emoji);
                    } else {
                      emojiMap.set(emoji, {
                        count: data.count - 1,
                        reactedByMe: false,
                      });
                    }
                  }
                }
                // Add the local optimistic emoji (if not null/removed)
                if (localEmoji !== null) {
                  const existing = emojiMap.get(localEmoji) ?? {
                    count: 0,
                    reactedByMe: false,
                  };
                  emojiMap.set(localEmoji, {
                    count: existing.count + 1,
                    reactedByMe: true,
                  });
                }
              }

              return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
                emoji,
                ...data,
              }));
            })();

            return (
              <MessageBubble
                message={item.message}
                isMine={isMine}
                showAvatar={showAvatar}
                avatarUrl={avatarUrl}
                groupedReactions={
                  groupedReactions.length > 0 ? groupedReactions : undefined
                }
                replyPreview={replyPreview}
                deliveryStatus={
                  isMine ? getDeliveryStatus(item.message) : undefined
                }
                isHighlighted={highlightedMessageId === item.message.id}
                onLongPress={() => showMessageActions(item.message)}
                onSwipeReply={() => replyToMessage(item.message)}
                onReplyPreviewPress={
                  replyTargetId
                    ? () => scrollToMessage(replyTargetId)
                    : undefined
                }
                onRetry={
                  item.message.sendStatus === "failed"
                    ? () => retryMessage(item.message)
                    : undefined
                }
                onReactionPress={(currentEmoji) => {
                  if (currentEmoji) {
                    // Tapping the pill for "my" reaction toggles it off
                    reactToMessage(item.message, currentEmoji);
                  } else {
                    // Tapping a partner's reaction opens the action overlay
                    showMessageActions(item.message);
                  }
                }}
              />
            );
          }}
        />

        <SafeAreaView
          edges={["bottom"]}
          className="bg-bg"
          style={styles.inputSafeArea}
        >
          <ChatInput
            ref={inputRef}
            placeholder={
              replyTarget ? "Reply to message..." : "Type a message..."
            }
            disabled={isUploadingMedia}
            replyPreview={
              replyTarget
                ? {
                    title: `Replying to ${getSenderLabel(replyTarget, user?.id, name)}`,
                    body: getMessagePreviewText(replyTarget),
                    onClear: () => {
                      setReplyTarget(null);
                      triggerHaptic("light");
                    },
                  }
                : null
            }
            onSend={(content) => {
              sendMessage(content);
              setReplyTarget(null);
              triggerHaptic("light");
            }}
            onPickImage={isRequestChat ? undefined : pickImage}
            onTypingChange={sendTypingState}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {showStickyDate && stickyDateLabel ? (
        <View
          className="absolute left-0 right-0 top-24 items-center"
          pointerEvents="none"
        >
          <Text
            className="overflow-hidden rounded-full border border-border bg-bg-card px-3.5 py-1.5 text-[11px] font-extrabold text-text-secondary"
            style={styles.floatingDatePill}
          >
            {stickyDateLabel}
          </Text>
        </View>
      ) : null}

      {isAwayFromBottom || newMessagesWhileAway > 0 ? (
        <Pressable
          className="absolute bottom-28 right-5 flex-row items-center rounded-full border border-border bg-bg-card px-3.5 py-2.5"
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <Ionicons name="arrow-down" size={17} color={Colors.textPrimary} />
          {newMessagesWhileAway > 0 ? (
            <Text className="ml-2 text-xs font-extrabold text-text-primary">
              {newMessagesWhileAway} new message
              {newMessagesWhileAway === 1 ? "" : "s"}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
      {actionNotice ? (
        <View
          className="absolute left-8 right-8 top-16 items-center"
          pointerEvents="none"
        >
          <View
            className="rounded-full border border-border bg-bg-card px-4 py-2"
            style={styles.floatingNotice}
          >
            <Text className="text-xs font-extrabold text-text-primary">
              {actionNotice}
            </Text>
          </View>
        </View>
      ) : null}

      <MessageActionOverlay
        message={selectedMessage}
        isMine={selectedMessage?.senderId === user?.id}
        animatedValue={actionOverlayAnim}
        activeReaction={
          selectedMessage ? (messageReactions[selectedMessage.id] ?? null) : null
        }
        deliveryStatus={
          selectedMessage ? getDeliveryStatus(selectedMessage) : undefined
        }
        onClose={closeMessageActions}
        onReply={replyToMessage}
        onReact={reactToMessage}
        onCopy={copyMessageText}
        onInfo={showMessageInfo}
        onRetry={retryMessage}
        onDelete={deleteMessageForMe}
        onDeleteForEveryone={deleteMessageForEveryone}
        onReport={reportMessage}
      />
    </SafeAreaView>
  );
}

const ChatDialog = ({
  dialog,
  onClose,
}: {
  dialog: ChatDialogState | null;
  onClose: () => void;
}) => {
  if (!dialog?.visible) return null;
  const accent = dialog.accent || Colors.primaryLight;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center px-5">
        <Pressable
          className="absolute inset-0"
          style={styles.dialogBackdrop}
          onPress={onClose}
        />
        <View
          className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-border bg-bg-card"
          style={styles.dialogCard}
        >
          <View className="items-center px-5 pb-4 pt-5">
            {dialog.icon ? (
              <View
                className="mb-3 h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}18` }}
              >
                <Ionicons name={dialog.icon} size={25} color={accent} />
              </View>
            ) : null}
            <Text className="text-center text-[20px] font-extrabold text-text-primary">
              {dialog.title}
            </Text>
            {dialog.message ? (
              <Text className="mt-2 text-center text-sm font-semibold leading-5 text-text-secondary">
                {dialog.message}
              </Text>
            ) : null}
          </View>

          {dialog.details?.length ? (
            <View className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-border bg-bg-elevated">
              {dialog.details.map((detail, index) => (
                <View
                  key={`${detail.label}-${detail.value}`}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index ? "border-t border-border" : ""
                  }`}
                >
                  <Text className="text-xs font-extrabold uppercase text-text-muted">
                    {detail.label}
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-sm font-extrabold text-text-primary"
                    numberOfLines={2}
                  >
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {dialog.actions?.length ? (
            <View className="px-3 pb-3">
              {dialog.actions.map((action) => {
                const isDanger = action.variant === "danger";
                const isPrimary = action.variant === "primary";
                const iconColor = isDanger
                  ? Colors.error
                  : isPrimary
                    ? accent
                    : Colors.textPrimary;

                return (
                  <Pressable
                    key={action.label}
                    className="my-1 flex-row items-center rounded-[18px] px-3 py-3"
                    style={isPrimary ? styles.dialogPrimaryAction : styles.dialogAction}
                    onPress={async () => {
                      if (action.closeOnPress !== false && action.variant === "primary") {
                        onClose();
                      }
                      await action.onPress();
                    }}
                  >
                    <View
                      className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isDanger
                          ? `${Colors.error}14`
                          : isPrimary
                            ? `${accent}14`
                            : Colors.bgElevated,
                      }}
                    >
                      <Ionicons name={action.icon} size={19} color={iconColor} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[15px] font-extrabold"
                        style={{ color: isDanger ? Colors.error : Colors.textPrimary }}
                      >
                        {action.label}
                      </Text>
                      {action.description ? (
                        <Text
                          className="mt-0.5 text-[12px] font-semibold leading-4 text-text-secondary"
                          numberOfLines={2}
                        >
                          {action.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                );
              })}
              <Pressable
                className="mt-1 items-center justify-center rounded-[18px] bg-bg-elevated px-4 py-3"
                onPress={onClose}
              >
                <Text className="text-sm font-extrabold text-text-secondary">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
const MessageRequestBanner = ({
  isIncoming,
  disabled,
  sentCount,
  onAccept,
  onReject,
}: {
  isIncoming: boolean;
  disabled: boolean;
  sentCount: number;
  onAccept: () => void;
  onReject: () => void;
}) => (
  <View className="border-b border-border bg-bg px-4 py-3">
    <View
      className="rounded-[22px] border border-border bg-bg-card px-4 py-3"
      style={styles.requestBanner}
    >
      <View className="flex-row items-start">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-light">
          <Ionicons
            name={isIncoming ? "mail-unread-outline" : "hourglass-outline"}
            size={19}
            color={Colors.textInverse}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-extrabold text-text-primary">
            {isIncoming ? "Message request" : "Request sent"}
          </Text>
          <Text className="mt-1 text-[12px] font-semibold leading-4 text-text-secondary">
            {isIncoming
              ? "Accept to continue the conversation and unlock full chat features."
              : sentCount >= 3
                ? "You have sent the request limit. Wait for them to accept."
                : "They can read your request before accepting. Media unlocks after acceptance."}
          </Text>
        </View>
      </View>

      {isIncoming ? (
        <View className="mt-3 flex-row items-center">
          <Pressable
            className="mr-2 flex-1 flex-row items-center justify-center rounded-full bg-primary px-4 py-2.5"
            onPress={onAccept}
            disabled={disabled}
          >
            <Ionicons name="checkmark" size={16} color={Colors.textInverse} />
            <Text className="ml-1.5 text-sm font-extrabold text-inverse">
              Accept
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-full border border-border bg-bg-elevated px-4 py-2.5"
            onPress={onReject}
            disabled={disabled}
          >
            <Ionicons name="close" size={16} color={Colors.textPrimary} />
            <Text className="ml-1.5 text-sm font-extrabold text-text-primary">
              Reject
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  </View>
);
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
  activeReaction,
  deliveryStatus,
  onClose,
  onReply,
  onReact,
  onCopy,
  onInfo,
  onRetry,
  onDelete,
  onDeleteForEveryone,
  onReport,
}: {
  message: PendingMessage | null;
  isMine: boolean;
  animatedValue: Animated.Value;
  activeReaction?: string | null;
  deliveryStatus?: MessageDeliveryStatus;
  onClose: () => void;
  onReply: (message: PendingMessage) => void;
  onReact: (message: PendingMessage, emoji: string | null) => void;
  onCopy: (message: PendingMessage) => void;
  onInfo: (message: PendingMessage) => void;
  onRetry: (message: PendingMessage) => void;
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
              className={`mb-3 max-w-[82%] rounded-[22px] px-4 py-3 ${isMine ? "rounded-br-md" : "rounded-bl-md"}`}
              style={
                isMine ? styles.actionPreviewMine : styles.actionPreviewOther
              }
            >
              <Text
                className={`text-[14px] font-semibold leading-5 ${isMine ? "text-inverse" : "text-text-primary"}`}
                numberOfLines={4}
              >
                {content}
              </Text>
              {isMine && deliveryStatus ? (
                <Text className="mt-2 text-[11px] font-extrabold text-inverse/70">
                  {deliveryStatus.charAt(0).toUpperCase() +
                    deliveryStatus.slice(1)}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            className="self-center rounded-full border border-border bg-bg-card px-2.5 py-2"
            style={styles.reactionDock}
          >
            <View className="flex-row items-center">
              {QUICK_REACTIONS.map((reaction) => {
                const isActive = activeReaction === reaction;
                return (
                  <Pressable
                    key={reaction}
                    className="mx-1 h-10 w-10 items-center justify-center rounded-full"
                    style={[
                      styles.reactionDockItem,
                      isActive && styles.reactionDockItemActive,
                    ]}
                    onPress={() => onReact(message, isActive ? null : reaction)}
                  >
                    <Text
                      style={[
                        styles.reactionDockEmoji,
                        isActive && styles.reactionDockEmojiActive,
                      ]}
                    >
                      {reaction}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            className="mt-3 overflow-hidden rounded-[24px] border border-border bg-bg-card"
            style={styles.actionCard}
          >
            {message.sendStatus === "failed" ? (
              <MessageActionRow
                icon="refresh-outline"
                label="Retry send"
                onPress={() => onRetry(message)}
              />
            ) : null}
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
              icon="information-circle-outline"
              label="Message info"
              onPress={() => onInfo(message)}
            />
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
  keyboardAvoidingView: {
    backgroundColor: Colors.bg,
  },
  inputSafeArea: {
    backgroundColor: Colors.bg,
  },
  actionBackdrop: {
    backgroundColor: Colors.overlayDark,
  },
  dialogBackdrop: {
    backgroundColor: Colors.overlayDark,
  },
  dialogCard: {
    shadowColor: Colors.black,
    shadowOffset: { height: 22, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 34,
    elevation: 14,
  },
  dialogAction: {
    backgroundColor: "transparent",
  },
  dialogPrimaryAction: {
    backgroundColor: Colors.bgElevated,
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
  },  requestBanner: {
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  reactionDock: {
    shadowColor: Colors.black,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
  reactionDockItem: {
    backgroundColor: Colors.bgElevated,
  },
  reactionDockItemActive: {
    backgroundColor: `${Colors.primaryLight}22`,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  reactionDockEmoji: {
    fontSize: 20,
  },
  reactionDockEmojiActive: {
    fontSize: 22,
  },
  navButton: {
    shadowColor: Colors.black,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyBadgeShell: {
    shadowColor: Colors.black,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 24,
    elevation: 7,
  },
  floatingDatePill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  promptChip: {
    shadowColor: Colors.black,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  scrollToBottomButton: {
    shadowColor: Colors.black,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  datePill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
});











