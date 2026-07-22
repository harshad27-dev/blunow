import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useChatConversationsQuery,
  useDeleteChatMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/useChat";
import {
  useIncomingMatchRequestsQuery,
  useRespondMatchRequestMutation,
} from "@/hooks/queries";
import type {
  ChatConversation,
  ChatParticipant,
  ChatSettingsPayload,
} from "@/types/chat.types";
import type { MatchRequest } from "@/types/match.types";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import { useChatSocket } from "@/hooks/useSocket";
import { showToast } from "@/utils/toast";
import { DraggableBottomSheet } from "@/components/common/DraggableBottomSheet";

type ConversationItem = {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle: string;
  timeLabel: string;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  raw: ChatConversation;
};

type RequestItem = {
  id: string;
  chatId?: string;
  requestId?: string;
  name: string;
  avatarUrl?: string;
  subtitle: string;
  timeLabel: string;
  isIncoming: boolean;
  raw: ChatConversation | MatchRequest;
};

type ChatListItem = ConversationItem | RequestItem;

type ChatFilter = "all" | "unread" | "muted" | "archived";
type MessageSegment = "messages" | "requests";

const FILTERS: { label: string; value: ChatFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Muted", value: "muted" },
  { label: "Archived", value: "archived" },
];

const CARD_SHADOW = {
  shadowColor: Colors.black,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
};

const getTimeLabel = (value?: string | null) => {
  if (!value) return "New";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

const getParticipantName = (participant?: ChatParticipant) =>
  participant?.profile?.username || participant?.username || "Datebl user";

const getOtherParticipant = (chat: ChatConversation, currentUserId?: string) =>
  chat.user1Id === currentUserId ? chat.user2 : chat.user1;

const getLastMessage = (chat: ChatConversation, currentUserId?: string) => {
  const latest = chat.messages?.[0];

  if (latest?.isDeleted) return "Message deleted";

  const content =
    chat.lastMessageContent ||
    latest?.content ||
    (latest?.mediaUrl
      ? latest.type === "IMAGE"
        ? "Photo"
        : latest.type === "VIDEO"
          ? "Video"
          : latest.type === "AUDIO"
            ? "Voice message"
            : "Shared media"
      : "");

  if (!content) return "Matched and ready to chat";
  if (latest?.senderId === currentUserId) return `You: ${content}`;
  return content;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "BN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const normalizeConversation = (
  chat: ChatConversation,
  currentUserId?: string,
): ConversationItem => {
  const participant = getOtherParticipant(chat, currentUserId);
  const isCurrentUser1 = chat.user1Id === currentUserId;
  const isArchived = isCurrentUser1 ? chat.archivedBy1 : chat.archivedBy2;
  const isMuted = isCurrentUser1 ? chat.mutedBy1 : chat.mutedBy2;
  const latest = chat.messages?.[0];

  return {
    id: chat.id,
    name: getParticipantName(participant),
    avatarUrl: participant?.profile?.avatarUrl || undefined,
    subtitle: getLastMessage(chat, currentUserId),
    timeLabel: getTimeLabel(
      chat.lastMessageAt || latest?.createdAt || chat.updatedAt,
    ),
    unreadCount: chat.unreadCount || 0,
    isMuted: Boolean(isMuted),
    isArchived: Boolean(isArchived),
    raw: chat,
  };
};

const normalizeLegacyRequest = (request: MatchRequest): RequestItem => {
  const sender = request.sender;
  const name =
    sender?.profile?.username ||
    sender?.username ||
    sender?.email ||
    "Datebl user";

  return {
    id: request.chat?.id || request.id,
    chatId: request.chat?.id,
    requestId: request.id,
    name,
    avatarUrl: sender?.profile?.avatarUrl || undefined,
    subtitle: request.message || "Wants to connect with you.",
    timeLabel: getTimeLabel(request.createdAt),
    isIncoming: true,
    raw: request,
  };
};
const normalizeRequestConversation = (
  chat: ChatConversation,
  currentUserId?: string,
): RequestItem => {
  const participant = getOtherParticipant(chat, currentUserId);
  const isIncoming = chat.requestedById !== currentUserId;
  const name = getParticipantName(participant);
  const latest = chat.messages?.[0];

  return {
    id: chat.id,
    chatId: chat.id,
    requestId: chat.requestId || chat.request?.id || undefined,
    name,
    avatarUrl: participant?.profile?.avatarUrl || undefined,
    subtitle:
      latest?.content ||
      chat.lastMessageContent ||
      (isIncoming ? "Wants to message you." : "Waiting for them to accept."),
    timeLabel: getTimeLabel(
      chat.lastMessageAt || latest?.createdAt || chat.updatedAt,
    ),
    isIncoming,
    raw: chat,
  };
};

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");
  const [activeSegment, setActiveSegment] =
    useState<MessageSegment>("messages");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [actionItem, setActionItem] = useState<ConversationItem | null>(null);

  const {
    data: conversations = [],
    isLoading,
    isFetching,
    refetch,
  } = useChatConversationsQuery();
  const {
    data: incomingRequests = [],
    isFetching: isRequestsFetching,
    refetch: refetchRequests,
  } = useIncomingMatchRequestsQuery();
  const deleteChatMutation = useDeleteChatMutation();
  const respondRequestMutation = useRespondMatchRequestMutation();
  const actionSettingsMutation = useUpdateChatSettingsMutation(
    actionItem?.id || "",
  );
  const socket = useChatSocket();

  const activeConversations = useMemo(
    () => conversations.filter((chat) => chat.status !== "REQUESTED"),
    [conversations],
  );
  const requestConversations = useMemo(
    () => conversations.filter((chat) => chat.status === "REQUESTED"),
    [conversations],
  );
  const allItems = useMemo(
    () =>
      activeConversations.map((chat) => normalizeConversation(chat, user?.id)),
    [activeConversations, user?.id],
  );

  const items = useMemo(
    () =>
      allItems.filter((item) => {
        if (activeFilter === "archived") return item.isArchived;
        if (item.isArchived) return false;
        if (activeFilter === "unread") return item.unreadCount > 0;
        if (activeFilter === "muted") return item.isMuted;
        return true;
      }),
    [activeFilter, allItems],
  );

  const requestItems = useMemo(() => {
    const byKey = new Map<string, RequestItem>();

    requestConversations.forEach((chat) => {
      const item = normalizeRequestConversation(chat, user?.id);
      byKey.set(item.chatId || item.requestId || item.id, item);
    });

    incomingRequests.map(normalizeLegacyRequest).forEach((item) => {
      const key = item.chatId || item.requestId || item.id;
      if (!byKey.has(key)) byKey.set(key, item);
    });

    return Array.from(byKey.values());
  }, [incomingRequests, requestConversations, user?.id]);

  const activeItems = allItems.filter((item) => !item.isArchived);
  const unreadTotal = activeItems.reduce(
    (sum, item) => sum + item.unreadCount,
    0,
  );
  const matchStories = activeItems.slice(0, 12);
  const rawListData = activeSegment === "requests" ? requestItems : items;
  const normalizedSearch = chatSearch.trim().toLowerCase();
  const listData = normalizedSearch
    ? rawListData.filter((item) =>
        `${item.name} ${item.subtitle}`
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : rawListData;
  const isRefreshing =
    activeSegment === "requests" ? isRequestsFetching : isFetching;

  const refreshActiveList = () => {
    if (activeSegment === "requests") {
      refetchRequests();
      return;
    }
    refetch();
    refetchRequests();
  };

  useEffect(() => {
    const refreshConversations = () => {
      refetch();
      refetchRequests();
    };
    const events = [
      "chat:message:new",
      "chat:read",
      "chat:request:accepted",
      "chat:request:updated",
      "chat:conversation:updated",
      "chat:conversation:deleted",
      "chat:message:deleted",
    ];

    events.forEach((event) => (socket as any).on(event, refreshConversations));

    return () => {
      events.forEach((event) =>
        (socket as any).off(event, refreshConversations),
      );
    };
  }, [refetch, refetchRequests, socket]);

  const openConversation = (item: ConversationItem) => {
    router.push({
      pathname: "/(screens)/chat/[roomId]",
      params: {
        roomId: item.id,
        name: item.name,
        avatarUrl: item.avatarUrl || "",
      },
    });
  };

  const showFilters = () => setFilterSheetVisible(true);

  const applyFilter = (filter: ChatFilter) => {
    setActiveFilter(filter);
    setActiveSegment("messages");
    setFilterSheetVisible(false);
  };

  const updateActionConversation = (
    payload: ChatSettingsPayload,
    successMessage: string,
  ) => {
    if (!actionItem) return;

    actionSettingsMutation.mutate(payload, {
      onSuccess: () => {
        setActionItem(null);
        showToast(successMessage);
      },
      onError: (error: any) => {
        showToast(
          error?.response?.data?.message || "Could not update conversation",
          "Update failed",
        );
      },
    });
  };

  const confirmDelete = (item: ConversationItem) => {
    Alert.alert("Delete chat?", `Delete your conversation with ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteChatMutation.mutate(item.id, {
            onSuccess: () => {
              setActionItem(null);
              showToast("Conversation deleted");
            },
            onError: (error: any) => {
              showToast(
                error?.response?.data?.message || "Could not delete chat",
                "Delete failed",
              );
            },
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-4 pt-3">
        <View className="relative h-11 flex-row items-center justify-center">
          <View className="absolute left-0">
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-card"
              onPress={() => router.back()}
              activeOpacity={0.82}
              style={CARD_SHADOW}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <Text
            className="px-24 text-center text-[34px] font-extrabold text-text-primary"
            numberOfLines={1}
          >
            Chats
          </Text>

          <View className="absolute right-0 flex-row items-center">
            <TouchableOpacity
              className="mr-2 h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-card"
              onPress={() => setSearchVisible((visible) => !visible)}
              activeOpacity={0.82}
              style={CARD_SHADOW}
              accessibilityRole="button"
              accessibilityLabel="Search chats"
            >
              <Ionicons name="search" size={19} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-card"
              onPress={showFilters}
              activeOpacity={0.82}
              style={CARD_SHADOW}
              accessibilityRole="button"
              accessibilityLabel="Filter messages"
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {searchVisible ? (
        <View className="mx-5 mb-4 h-12 flex-row items-center rounded-2xl border border-border bg-bg-card px-4">
          <Ionicons name="search" size={17} color={Colors.textSecondary} />
          <TextInput
            value={chatSearch}
            onChangeText={setChatSearch}
            placeholder="Search chats"
            placeholderTextColor={Colors.textMuted}
            className="ml-2 min-w-0 flex-1 text-sm font-semibold text-text-primary"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {chatSearch ? (
            <TouchableOpacity onPress={() => setChatSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {isLoading ? (
        <ConversationSkeletonList />
      ) : (
        <FlatList<ChatListItem>
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshActiveList}
              tintColor={Colors.textPrimary}
            />
          }
          contentContainerClassName="px-5 pb-8"
          contentContainerStyle={
            listData.length === 0 ? { flexGrow: 1 } : undefined
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <MatchStories
                items={matchStories}
                onPress={openConversation}
                onLikesPress={() => router.push("/(tabs)/matches")}
                unreadTotal={unreadTotal}
              />
              <MessagesSectionHeader
                activeSegment={activeSegment}
                onChangeSegment={setActiveSegment}
                requestCount={requestItems.length}
                unreadTotal={unreadTotal}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              segment={activeSegment}
              filter={activeSegment === "requests" ? "all" : activeFilter}
              hasSearch={Boolean(normalizedSearch)}
              onPrimaryPress={() =>
                normalizedSearch
                  ? setChatSearch("")
                  : router.push("/(tabs)/discover")
              }
            />
          }
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            activeSegment === "requests" ? (
              <RequestRow
                item={item as RequestItem}
                pendingStatus={
                  respondRequestMutation.isPending &&
                  respondRequestMutation.variables?.requestId ===
                    (item as RequestItem).requestId
                    ? respondRequestMutation.variables.status
                    : undefined
                }
                onPress={() => {
                  const requestItem = item as RequestItem;
                  if (!requestItem.chatId) return;
                  router.push({
                    pathname: "/(screens)/chat/[roomId]",
                    params: {
                      roomId: requestItem.chatId,
                      name: requestItem.name,
                      avatarUrl: requestItem.avatarUrl || "",
                    },
                  });
                }}
                onAccept={() => {
                  const requestId = (item as RequestItem).requestId;
                  if (!requestId) return;
                  respondRequestMutation.mutate(
                    { requestId, status: "ACCEPTED" },
                    {
                      onSuccess: () => showToast("Request accepted"),
                      onError: (error: any) =>
                        showToast(
                          error?.response?.data?.message ||
                            "Could not accept request",
                          "Request failed",
                        ),
                    },
                  );
                }}
                onReject={() => {
                  const requestId = (item as RequestItem).requestId;
                  if (!requestId) return;
                  respondRequestMutation.mutate(
                    { requestId, status: "REJECTED" },
                    {
                      onSuccess: () => showToast("Request rejected"),
                      onError: (error: any) =>
                        showToast(
                          error?.response?.data?.message ||
                            "Could not reject request",
                          "Request failed",
                        ),
                    },
                  );
                }}
              />
            ) : (
              <ConversationRow
                item={item as ConversationItem}
                onPress={() => openConversation(item as ConversationItem)}
                onMore={() => setActionItem(item as ConversationItem)}
              />
            )
          }
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        activeFilter={activeFilter}
        onApply={applyFilter}
        onClose={() => setFilterSheetVisible(false)}
      />

      <ConversationActionSheet
        item={actionItem}
        isPending={
          actionSettingsMutation.isPending || deleteChatMutation.isPending
        }
        onClose={() => setActionItem(null)}
        onMuteToggle={() =>
          actionItem &&
          updateActionConversation(
            { muted: !actionItem.isMuted },
            actionItem.isMuted ? "Conversation unmuted" : "Conversation muted",
          )
        }
        onArchiveToggle={() =>
          actionItem &&
          updateActionConversation(
            { archived: !actionItem.isArchived },
            actionItem.isArchived
              ? "Conversation unarchived"
              : "Conversation archived",
          )
        }
        onDelete={() => actionItem && confirmDelete(actionItem)}
      />
    </View>
  );
}

const FilterSheet = ({
  visible,
  activeFilter,
  onApply,
  onClose,
}: {
  visible: boolean;
  activeFilter: ChatFilter;
  onApply: (filter: ChatFilter) => void;
  onClose: () => void;
}) => (
  <DraggableBottomSheet
    visible={visible}
    onClose={onClose}
    sheetClassName="rounded-t-[30px] border border-border bg-bg-card px-5 pb-8 pt-3"
  >
    <View className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border" />
    <Text className="mb-4 text-xl font-extrabold text-text-primary">
      Filter messages
    </Text>
    {FILTERS.map((filter) => {
      const isSelected = activeFilter === filter.value;
      return (
        <TouchableOpacity
          key={filter.value}
          className="mb-2 flex-row items-center rounded-2xl border border-border bg-bg-elevated px-4 py-3.5"
          onPress={() => onApply(filter.value)}
          activeOpacity={0.82}
        >
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={isSelected ? Colors.primaryLight : Colors.textSecondary}
          />
          <Text className="ml-3 flex-1 text-[15px] font-extrabold text-text-primary">
            {filter.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </DraggableBottomSheet>
);

const ConversationActionSheet = ({
  item,
  isPending,
  onClose,
  onMuteToggle,
  onArchiveToggle,
  onDelete,
}: {
  item: ConversationItem | null;
  isPending: boolean;
  onClose: () => void;
  onMuteToggle: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) => (
  <DraggableBottomSheet
    visible={Boolean(item)}
    onClose={onClose}
    sheetClassName="rounded-t-[30px] border border-border bg-bg-card px-5 pb-8 pt-3"
  >
    <View className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border" />
    <View className="mb-4 flex-row items-center justify-between">
      <View className="min-w-0 flex-1">
        <Text
          className="text-xl font-extrabold text-text-primary"
          numberOfLines={1}
        >
          {item?.name || "Conversation"}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-text-secondary">
          Conversation options
        </Text>
      </View>
      {isPending ? <ActivityIndicator color={Colors.primaryLight} /> : null}
    </View>

    <SheetAction
      icon={
        item?.isMuted ? "notifications-outline" : "notifications-off-outline"
      }
      label={item?.isMuted ? "Unmute" : "Mute"}
      onPress={onMuteToggle}
      disabled={isPending}
    />
    <SheetAction
      icon={item?.isArchived ? "archive-outline" : "file-tray-full-outline"}
      label={item?.isArchived ? "Unarchive" : "Archive"}
      onPress={onArchiveToggle}
      disabled={isPending}
    />
    <SheetAction
      icon="trash-outline"
      label="Delete"
      destructive
      onPress={onDelete}
      disabled={isPending}
    />
  </DraggableBottomSheet>
);
const SheetAction = ({
  icon,
  label,
  destructive,
  disabled,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="mb-2 flex-row items-center rounded-2xl border border-border bg-bg-elevated px-4 py-3.5"
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.82}
  >
    <Ionicons
      name={icon}
      size={20}
      color={destructive ? Colors.error : Colors.textPrimary}
    />
    <Text
      className={`ml-3 flex-1 text-[15px] font-extrabold ${
        destructive ? "text-error" : "text-text-primary"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
const MatchStories = ({
  items,
  onPress,
  onLikesPress,
  unreadTotal,
}: {
  items: ConversationItem[];
  onPress: (item: ConversationItem) => void;
  onLikesPress: () => void;
  unreadTotal: number;
}) => (
  <View className="pb-6">
    <View className="mb-4 flex-row items-end justify-between">
      <View>
        <Text className="text-2xl font-extrabold text-text-primary">
          New matches
        </Text>
        <Text className="mt-1 text-sm font-semibold text-text-secondary">
          People ready to start a conversation
        </Text>
      </View>
      {unreadTotal > 0 ? (
        <View className="rounded-full bg-primary-light px-3 py-1.5">
          <Text className="text-xs font-extrabold text-inverse">
            {unreadTotal > 99 ? "99+" : unreadTotal} unread
          </Text>
        </View>
      ) : null}
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="pr-5"
    >
      <TouchableOpacity
        className="mr-3 w-[64px]"
        onPress={onLikesPress}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel="Open likes"
      >
        <View
          className="h-[64px] w-[64px] items-center justify-center rounded-full border border-primary-light bg-bg-card"
          style={CARD_SHADOW}
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="heart" size={21} color={Colors.white} />
          </View>
        </View>
        <Text
          className="mt-2 text-center text-xs font-extrabold text-text-primary"
          numberOfLines={1}
        >
          Likes You
        </Text>
      </TouchableOpacity>

      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          className="mr-3 w-[64px]"
          onPress={() => onPress(item)}
          activeOpacity={0.84}
        >
          <View
            className="h-[64px] w-[64px] items-center justify-center rounded-full border border-primary-light bg-bg-card"
            style={CARD_SHADOW}
          >
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                className="h-[56px] w-[56px] rounded-full bg-bg-elevated"
              />
            ) : (
              <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-primary-light">
                <Text className="text-base font-extrabold text-inverse">
                  {getInitials(item.name)}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg-card bg-success" />
          </View>
          <Text
            className="mt-2 text-center text-xs font-bold text-text-secondary"
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const MessagesSectionHeader = ({
  activeSegment,
  onChangeSegment,
  requestCount,
  unreadTotal,
}: {
  activeSegment: MessageSegment;
  onChangeSegment: (segment: MessageSegment) => void;
  requestCount: number;
  unreadTotal: number;
}) => (
  <View className="pb-2">
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-2xl font-extrabold text-text-primary">
        Messages
      </Text>
      <Text className="text-sm font-bold text-text-secondary">
        {unreadTotal > 0 ? `${unreadTotal} unread` : "All caught up"}
      </Text>
    </View>

    <View className="flex-row rounded-[24px] border border-border bg-bg-card p-1">
      <TouchableOpacity
        className={`flex-1 rounded-[20px] py-3 ${
          activeSegment === "messages" ? "bg-primary" : "bg-bg-card"
        }`}
        onPress={() => onChangeSegment("messages")}
        activeOpacity={0.84}
      >
        <Text
          className={`text-center text-sm font-extrabold ${
            activeSegment === "messages"
              ? "text-inverse"
              : "text-text-secondary"
          }`}
        >
          Messages
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 rounded-[20px] py-3 ${
          activeSegment === "requests" ? "bg-primary" : "bg-bg-card"
        }`}
        onPress={() => onChangeSegment("requests")}
        activeOpacity={0.84}
      >
        <Text
          className={`text-center text-sm font-extrabold ${
            activeSegment === "requests"
              ? "text-inverse"
              : "text-text-secondary"
          }`}
        >
          Requests{requestCount ? ` ${requestCount}` : ""}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const EmptyState = ({
  segment,
  filter,
  hasSearch,
  onPrimaryPress,
}: {
  segment: MessageSegment;
  filter: ChatFilter;
  hasSearch: boolean;
  onPrimaryPress: () => void;
}) => {
  const title = hasSearch
    ? "No chats found"
    : segment === "requests"
      ? "No requests"
      : filter === "unread"
        ? "You're all caught up"
        : filter === "muted"
          ? "No muted chats"
          : filter === "archived"
            ? "No archived chats"
            : "No messages yet";

  const description = hasSearch
    ? "Try another name or message."
    : segment === "requests"
      ? "Message requests from new matches will appear here."
      : filter === "unread"
        ? "New messages will collect here when someone replies."
        : filter === "muted"
          ? "Muted conversations will appear here."
          : filter === "archived"
            ? "Archived conversations stay tucked away here."
            : "When you match with someone or start a conversation, your messages will appear here.";

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="mb-5 h-24 w-24 items-center justify-center rounded-[30px] bg-primary">
        <Ionicons
          name="chatbubbles-outline"
          size={36}
          color={Colors.textInverse}
        />
      </View>
      <Text className="mb-2 text-center text-2xl font-extrabold text-text-primary">
        {title}
      </Text>
      <Text className="max-w-[310px] text-center text-sm font-medium leading-5 text-text-secondary">
        {description}
      </Text>
      <TouchableOpacity
        className="mt-6 rounded-full bg-primary px-5 py-3"
        onPress={onPrimaryPress}
        activeOpacity={0.84}
      >
        <Text className="text-sm font-extrabold text-text-inverse">
          {hasSearch ? "Clear search" : "Go to Discover"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const RequestRow = ({
  item,
  pendingStatus,
  onPress,
  onAccept,
  onReject,
}: {
  item: RequestItem;
  pendingStatus?: "ACCEPTED" | "REJECTED";
  onPress: () => void;
  onAccept: () => void;
  onReject: () => void;
}) => (
  <TouchableOpacity
    className="flex-row items-center py-3.5"
    onPress={onPress}
    activeOpacity={0.84}
  >
    {item.avatarUrl ? (
      <Image
        source={{ uri: item.avatarUrl }}
        className="h-14 w-14 rounded-full bg-bg-elevated"
      />
    ) : (
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light">
        <Text className="text-base font-extrabold text-inverse">
          {getInitials(item.name)}
        </Text>
      </View>
    )}

    <View className="ml-4 flex-1">
      <View className="flex-row items-center justify-between">
        <Text
          className="mr-3 flex-1 text-[16px] font-extrabold text-text-primary"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-xs font-bold text-text-secondary">
          {item.timeLabel}
        </Text>
      </View>
      <Text
        className="mt-1.5 text-sm font-semibold leading-5 text-text-secondary"
        numberOfLines={2}
      >
        {item.subtitle}
      </Text>
    </View>

    <View className="ml-3 flex-row items-center">
      {item.isIncoming ? (
        <>
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={onAccept}
            disabled={Boolean(pendingStatus)}
            activeOpacity={0.84}
          >
            {pendingStatus === "ACCEPTED" ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-card"
            onPress={onReject}
            disabled={Boolean(pendingStatus)}
            activeOpacity={0.84}
          >
            {pendingStatus === "REJECTED" ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </>
      ) : (
        <View className="rounded-full border border-border bg-bg-card px-3 py-2">
          <Text className="text-xs font-extrabold text-text-secondary">
            Waiting
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const ConversationSkeletonList = () => (
  <View className="px-5 pb-8 pt-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <View key={index} className="flex-row items-center py-4">
        <View className="h-14 w-14 rounded-full bg-bg-elevated" />
        <View className="ml-4 flex-1">
          <View className="h-4 w-2/3 rounded-full bg-border" />
          <View className="mt-3 h-3 w-full rounded-full bg-bg-elevated" />
          <View className="mt-3 h-3 w-24 rounded-full bg-bg-elevated" />
        </View>
      </View>
    ))}
  </View>
);

const ConversationRow = ({
  item,
  onPress,
  onMore,
}: {
  item: ConversationItem;
  onPress: () => void;
  onMore: () => void;
}) => {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View className="relative">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="h-14 w-14 rounded-full bg-bg-elevated"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light">
            <Text className="text-base font-extrabold text-inverse">
              {getInitials(item.name)}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 ? (
          <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg bg-primary-light px-1">
            <Text className="text-[10px] font-extrabold text-inverse">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="mr-3 flex-1 text-[16px] font-extrabold text-text-primary"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs font-bold text-text-secondary">
            {item.timeLabel}
          </Text>
        </View>

        <View className="mt-1.5 flex-row items-center">
          {item.isMuted ? (
            <Ionicons
              name="notifications-off-outline"
              size={13}
              color={Colors.primaryLight}
            />
          ) : null}
          <Text
            className={`flex-1 text-sm leading-5 ${
              item.unreadCount
                ? "font-extrabold text-text-primary"
                : "font-semibold text-text-secondary"
            } ${item.isMuted ? "ml-1" : ""}`}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-bg-card"
        onPress={onMore}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`Conversation options for ${item.name}`}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
