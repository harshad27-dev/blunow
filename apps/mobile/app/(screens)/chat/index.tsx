import { useMemo, useState } from "react";
import {
  Alert,
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
import type { ChatConversation, ChatParticipant } from "@/types/chat.types";
import { useAuthStore } from "@/store/authStore";

type ConversationItem = {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle: string;
  timeLabel: string;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  messageCount: number;
  raw: ChatConversation;
};

type ChatFilter = "all" | "unread" | "muted" | "archived";
type MessageSegment = "messages" | "requests";

const FILTERS: { label: string; value: ChatFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Muted", value: "muted" },
  { label: "Archived", value: "archived" },
];

const CARD_SHADOW = {
  shadowColor: "#1C1C1C",
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
  participant?.profile?.username || participant?.username || "Blunow user";

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
    messageCount: chat._count?.messages || 0,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const {
    data: conversations = [],
    isLoading,
    isFetching,
    refetch,
  } = useChatConversationsQuery();
  const deleteChatMutation = useDeleteChatMutation();

  const allItems = useMemo(
    () => conversations.map((chat) => normalizeConversation(chat, user?.id)),
    [conversations, user?.id],
  );

  const items = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (activeSegment === "requests") return [];

    return allItems
      .filter((item) => {
        if (activeFilter === "archived") return item.isArchived;
        if (item.isArchived) return false;
        if (activeFilter === "unread") return item.unreadCount > 0;
        if (activeFilter === "muted") return item.isMuted;
        return true;
      })
      .filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
        );
      });
  }, [activeFilter, activeSegment, allItems, searchQuery]);

  const activeItems = allItems.filter((item) => !item.isArchived);
  const unreadTotal = activeItems.reduce(
    (sum, item) => sum + item.unreadCount,
    0,
  );
  const hasSearch = searchQuery.trim().length > 0;
  const matchStories = activeItems.slice(0, 12);

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

  const showFilters = () => {
    Alert.alert("Filter messages", "Choose which conversations to show.", [
      ...FILTERS.map((filter) => ({
        text: filter.label,
        onPress: () => setActiveFilter(filter.value),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const confirmDelete = (item: ConversationItem) => {
    Alert.alert("Delete chat?", `Delete your conversation with ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteChatMutation.mutate(item.id),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F8F4F0]" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-4 pt-3">
        <View className="relative h-11 flex-row items-center justify-center">
          <View className="absolute left-0">
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full border border-[#E4DDD7] bg-white"
              onPress={() => router.back()}
              activeOpacity={0.82}
              style={CARD_SHADOW}
            >
              <Ionicons name="chevron-back" size={24} color="#1C1C1C" />
            </TouchableOpacity>
          </View>

          <Text
            className="px-24 text-center text-[34px] font-extrabold text-[#1C1C1C]"
            numberOfLines={1}
          >
            Matches
          </Text>

          <View className="absolute right-0 flex-row items-center">
            <TouchableOpacity
              className="mr-2 h-11 w-11 items-center justify-center rounded-full border border-[#E4DDD7] bg-white"
              onPress={() => setIsSearchVisible((value) => !value)}
              activeOpacity={0.82}
              style={CARD_SHADOW}
            >
              <Ionicons name="search" size={19} color="#1C1C1C" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full border border-[#E4DDD7] bg-white"
              onPress={showFilters}
              activeOpacity={0.82}
              style={CARD_SHADOW}
            >
              <Ionicons name="options-outline" size={20} color="#1C1C1C" />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchVisible ? (
          <View className="mt-5 flex-row items-center rounded-[24px] border border-[#E4DDD7] bg-white px-4">
            <Ionicons name="search" size={18} color="#6F6259" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search matches"
              placeholderTextColor="#A99B91"
              className="h-[52px] flex-1 px-3 text-[15px] font-semibold text-[#1C1C1C]"
              autoCorrect={false}
              returnKeyType="search"
              style={{ paddingVertical: 0 }}
            />
            {hasSearch ? (
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F8F4F0]"
                onPress={() => setSearchQuery("")}
                activeOpacity={0.82}
              >
                <Ionicons name="close" size={16} color="#1C1C1C" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ConversationSkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#1C1C1C"
            />
          }
          contentContainerClassName="px-5 pb-8"
          contentContainerStyle={
            items.length === 0 ? { flexGrow: 1 } : undefined
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <MatchStories
                items={matchStories}
                onPress={openConversation}
                unreadTotal={unreadTotal}
              />
              <MessagesSectionHeader
                activeSegment={activeSegment}
                onChangeSegment={setActiveSegment}
                requestCount={0}
                unreadTotal={unreadTotal}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              segment={activeSegment}
              filter={activeSegment === "requests" ? "all" : activeFilter}
              hasSearch={hasSearch}
              onClearSearch={() => setSearchQuery("")}
            />
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => openConversation(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const MatchStories = ({
  items,
  onPress,
  unreadTotal,
}: {
  items: ConversationItem[];
  onPress: (item: ConversationItem) => void;
  unreadTotal: number;
}) => (
  <View className="pb-6">
    <View className="mb-4 flex-row items-end justify-between">
      <View>
        <Text className="text-2xl font-extrabold text-[#1C1C1C]">
          New matches
        </Text>
        <Text className="mt-1 text-sm font-semibold text-[#6F6259]">
          People ready to start a conversation
        </Text>
      </View>
      {unreadTotal > 0 ? (
        <View className="rounded-full bg-[#B19F91] px-3 py-1.5">
          <Text className="text-xs font-extrabold text-white">
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
      <TouchableOpacity className="mr-4 w-[76px]" activeOpacity={0.84}>
        <View
          className="h-[76px] w-[76px] items-center justify-center rounded-full border border-[#B19F91] bg-white"
          style={CARD_SHADOW}
        >
          <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-[#B19F91]">
            <Ionicons name="heart" size={24} color="#FFFFFF" />
          </View>
        </View>
        <Text
          className="mt-2 text-center text-xs font-extrabold text-[#1C1C1C]"
          numberOfLines={1}
        >
          Likes You
        </Text>
      </TouchableOpacity>

      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          className="mr-4 w-[76px]"
          onPress={() => onPress(item)}
          activeOpacity={0.84}
        >
          <View
            className="h-[76px] w-[76px] items-center justify-center rounded-full border border-[#B19F91] bg-white"
            style={CARD_SHADOW}
          >
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                className="h-[66px] w-[66px] rounded-full bg-[#E4DDD7]"
              />
            ) : (
              <View className="h-[66px] w-[66px] items-center justify-center rounded-full bg-[#B19F91]">
                <Text className="text-lg font-extrabold text-white">
                  {getInitials(item.name)}
                </Text>
              </View>
            )}
            <View className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-[#5CB879]" />
          </View>
          <Text
            className="mt-2 text-center text-xs font-bold text-[#6F6259]"
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
      <Text className="text-2xl font-extrabold text-[#1C1C1C]">Messages</Text>
      <Text className="text-sm font-bold text-[#6F6259]">
        {unreadTotal > 0 ? `${unreadTotal} unread` : "All caught up"}
      </Text>
    </View>

    <View className="flex-row rounded-[24px] border border-[#E4DDD7] bg-white p-1">
      <TouchableOpacity
        className={`flex-1 rounded-[20px] py-3 ${
          activeSegment === "messages" ? "bg-[#1C1C1C]" : "bg-white"
        }`}
        onPress={() => onChangeSegment("messages")}
        activeOpacity={0.84}
      >
        <Text
          className={`text-center text-sm font-extrabold ${
            activeSegment === "messages" ? "text-white" : "text-[#6F6259]"
          }`}
        >
          Messages
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 rounded-[20px] py-3 ${
          activeSegment === "requests" ? "bg-[#1C1C1C]" : "bg-white"
        }`}
        onPress={() => onChangeSegment("requests")}
        activeOpacity={0.84}
      >
        <Text
          className={`text-center text-sm font-extrabold ${
            activeSegment === "requests" ? "text-white" : "text-[#6F6259]"
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
  onClearSearch,
}: {
  segment: MessageSegment;
  filter: ChatFilter;
  hasSearch: boolean;
  onClearSearch: () => void;
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
    ? "Try a different name or message preview."
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
      <View className="mb-5 h-24 w-24 items-center justify-center rounded-[30px] bg-[#1C1C1C]">
        <Ionicons
          name={hasSearch ? "search" : "chatbubbles-outline"}
          size={36}
          color="#F8F4F0"
        />
      </View>
      <Text className="mb-2 text-center text-2xl font-extrabold text-[#1C1C1C]">
        {title}
      </Text>
      <Text className="max-w-[310px] text-center text-sm font-medium leading-5 text-[#48494B]">
        {description}
      </Text>
      {hasSearch ? (
        <TouchableOpacity
          className="mt-5 rounded-full bg-[#1C1C1C] px-5 py-3"
          onPress={onClearSearch}
          activeOpacity={0.84}
        >
          <Text className="text-sm font-extrabold text-[#F8F4F0]">
            Clear search
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const ConversationSkeletonList = () => (
  <View className="px-5 pb-8 pt-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <View key={index} className="flex-row items-center py-4">
        <View className="h-14 w-14 rounded-full bg-[#D9CEC5]" />
        <View className="ml-4 flex-1">
          <View className="h-4 w-2/3 rounded-full bg-[#CBBDB2]" />
          <View className="mt-3 h-3 w-full rounded-full bg-[#D9CEC5]" />
          <View className="mt-3 h-3 w-24 rounded-full bg-[#D9CEC5]" />
        </View>
      </View>
    ))}
  </View>
);

const ConversationRow = ({
  item,
  onPress,
  onDelete,
}: {
  item: ConversationItem;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const settingsMutation = useUpdateChatSettingsMutation(item.id);

  const showActions = () => {
    Alert.alert(item.name, "Conversation options", [
      {
        text: item.isMuted ? "Unmute" : "Mute",
        onPress: () => settingsMutation.mutate({ muted: !item.isMuted }),
      },
      {
        text: item.isArchived ? "Unarchive" : "Archive",
        onPress: () => settingsMutation.mutate({ archived: !item.isArchived }),
      },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      onLongPress={showActions}
      activeOpacity={0.84}
    >
      <View className="relative">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="h-14 w-14 rounded-full bg-[#E4DDD7]"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#B19F91]">
            <Text className="text-base font-extrabold text-[#F8F4F0]">
              {getInitials(item.name)}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 ? (
          <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#F8F4F0] bg-[#B19F91] px-1">
            <Text className="text-[10px] font-extrabold text-white">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="mr-3 flex-1 text-[16px] font-extrabold text-[#1C1C1C]"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs font-bold text-[#6F6259]">
            {item.timeLabel}
          </Text>
        </View>

        <View className="mt-1.5 flex-row items-center">
          {item.isMuted ? (
            <Ionicons
              name="notifications-off-outline"
              size={13}
              color="#B19F91"
            />
          ) : null}
          <Text
            className={`flex-1 text-sm leading-5 ${
              item.unreadCount
                ? "font-extrabold text-[#1C1C1C]"
                : "font-semibold text-[#6F6259]"
            } ${item.isMuted ? "ml-1" : ""}`}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
