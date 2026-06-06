import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/types/notification.types";

const iconByType: Record<AppNotification["type"], keyof typeof Ionicons.glyphMap> = {
  MATCH: "heart",
  MESSAGE: "chatbubble-ellipses",
  LIKE: "thumbs-up",
  COMMENT: "chatbox",
  STORY_VIEW: "eye",
  CONFESSION: "sparkles",
  ROOM_INVITE: "people",
  SYSTEM: "notifications",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications = [], isLoading, refetch, isFetching } =
    useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }

    const data = notification.data || {};
    const chatId = typeof data.chatId === "string" ? data.chatId : null;
    const requestId = typeof data.requestId === "string" ? data.requestId : null;

    if (chatId) {
      router.push({
        pathname: "/(screens)/chat/[roomId]",
        params: { roomId: chatId },
      });
      return;
    }

    if (requestId || notification.type === "MATCH") {
      router.push("/(tabs)/matches");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full border border-[#222] bg-[#111]"
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-1 px-4">
          <Text className="text-xl font-extrabold text-white">Notifications</Text>
          <Text className="mt-0.5 text-xs font-semibold text-[#888]">
            {unreadCount ? `${unreadCount} unread` : "All caught up"}
          </Text>
        </View>
        <TouchableOpacity
          className="h-11 min-w-11 items-center justify-center rounded-full border border-[#222] bg-[#111] px-3"
          disabled={!unreadCount || markAllRead.isPending}
          onPress={() => markAllRead.mutate()}
          activeOpacity={0.82}
        >
          {markAllRead.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons
              name="checkmark-done"
              size={21}
              color={unreadCount ? "#FFFFFF" : "#555"}
            />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text className="mt-4 text-sm font-semibold text-[#888]">
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mb-3 flex-row rounded-[22px] border p-4 ${
                item.isRead
                  ? "border-[#1d1d1d] bg-[#0d0d0d]"
                  : "border-white/15 bg-white/10"
              }`}
              onPress={() => openNotification(item)}
              activeOpacity={0.84}
            >
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name={iconByType[item.type] || "notifications"}
                  size={20}
                  color="#050505"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-white">
                  {item.title}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-[#BDBDBD]">
                  {item.body}
                </Text>
                <Text className="mt-2 text-xs font-semibold text-[#666]">
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              {!item.isRead ? (
                <View className="ml-3 mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center px-6">
              <View className="h-20 w-20 items-center justify-center rounded-full border border-[#222] bg-[#111]">
                <Ionicons name="notifications-outline" size={34} color="#888" />
              </View>
              <Text className="mt-5 text-center text-2xl font-bold text-white">
                No notifications yet
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#888]">
                Matches, messages, comments, and system updates will appear here.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
