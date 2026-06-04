import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import {
  chatService,
  type ChatConversation,
  type ChatParticipant,
} from "@/services/chat.service";
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
  const content =
    chat.lastMessageContent ||
    latest?.content ||
    (latest?.mediaUrl ? "Shared media" : "");

  if (!content) return "Matched and ready to chat";
  if (latest?.senderId === currentUserId) return `You: ${content}`;
  return content;
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
  };
};

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const {
    data: conversations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: async () => {
      const response = await chatService.getConversations();
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data as ChatConversation[];
    },
  });

  const items = useMemo(
    () =>
      conversations
        .map((chat) => normalizeConversation(chat, user?.id))
        .filter((chat) => !chat.isArchived),
    [conversations, user?.id],
  );

  const unreadTotal = items.reduce((sum, item) => sum + item.unreadCount, 0);

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

  return (
    <View className="flex-1 bg-[#050505]" style={{ paddingTop: insets.top }}>
      <View className="border-b border-[#141414] px-4 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="-ml-2 h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.78}
            >
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <View className="ml-2">
              <Text className="text-2xl font-extrabold text-white">
                Messages
              </Text>
              <Text className="mt-0.5 text-xs font-semibold text-[#777]">
                {items.length
                  ? `${items.length} conversation${items.length === 1 ? "" : "s"}`
                  : "Your chats will appear here"}
              </Text>
            </View>
          </View>

          <View className="h-11 min-w-11 items-center justify-center rounded-full border border-[#222] bg-[#101010] px-3">
            <Text className="text-sm font-extrabold text-white">
              {unreadTotal}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text className="mt-3 text-sm font-semibold text-[#888]">
            Loading conversations
          </Text>
        </View>
      ) : items.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
          contentContainerClassName="px-4 pb-8 pt-4"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => openConversation(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const EmptyState = () => (
  <View className="flex-1 items-center justify-center px-6">
    <View className="mb-5 h-24 w-24 items-center justify-center rounded-[32px] border border-[#222] bg-[#111]">
      <Ionicons name="chatbubbles-outline" size={36} color="#888" />
    </View>
    <Text className="mb-2 text-center text-xl font-extrabold text-white">
      No messages yet
    </Text>
    <Text className="max-w-[310px] text-center text-sm leading-5 text-[#888]">
      When you match with someone or start a conversation, your messages will
      appear here.
    </Text>
  </View>
);

const ConversationRow = ({
  item,
  onPress,
}: {
  item: ConversationItem;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="mb-3 flex-row items-center rounded-[24px] border border-[#1E1E1E] bg-[#0F0F0F] p-3"
    onPress={onPress}
    activeOpacity={0.84}
  >
    <View className="relative">
      {item.avatarUrl ? (
        <Image
          source={{ uri: item.avatarUrl }}
          className="h-16 w-16 rounded-[22px] bg-[#1A1A1A]"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-[#1A1A1A]">
          <Ionicons name="person" size={24} color="#888" />
        </View>
      )}
      {item.unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0F0F0F] bg-white px-1">
          <Text className="text-[10px] font-extrabold text-black">
            {item.unreadCount > 9 ? "9+" : item.unreadCount}
          </Text>
        </View>
      ) : null}
    </View>

    <View className="ml-4 flex-1">
      <View className="flex-row items-center justify-between">
        <Text
          className="mr-3 flex-1 text-base font-extrabold text-white"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-xs font-bold text-[#777]">{item.timeLabel}</Text>
      </View>

      <View className="mt-1.5 flex-row items-center">
        {item.isMuted ? (
          <Ionicons name="notifications-off-outline" size={13} color="#777" />
        ) : null}
        <Text
          className={`flex-1 text-sm leading-5 ${
            item.unreadCount
              ? "font-bold text-[#EDEDED]"
              : "font-medium text-[#8A8A8A]"
          } ${item.isMuted ? "ml-1" : ""}`}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      </View>

      <View className="mt-2 flex-row items-center">
        <View className="rounded-full bg-[#181818] px-2.5 py-1">
          <Text className="text-[11px] font-bold text-[#9A9A9A]">
            {item.messageCount || 0} messages
          </Text>
        </View>
      </View>
    </View>

    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);
