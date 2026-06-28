import React from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { storyService } from "@/services/story.service";
import { moderationService } from "@/services/moderation.service";
import { useAuthStore } from "@/store/authStore";

const getTimeLeft = (expiresAt?: string) => {
  if (!expiresAt) return "Story";

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.max(1, Math.floor(remainingMs / (1000 * 60)));
  return `${minutes}m left`;
};

export default function StoryDetailScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const {
    data: storyResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["story", storyId],
    queryFn: () => storyService.getStory(storyId),
    enabled: Boolean(storyId),
  });

  const story = storyResponse?.success ? storyResponse.data : null;
  const authorName =
    story?.author?.profile?.username || story?.author?.username || "Story";
  const authorAvatar = story?.author?.profile?.avatarUrl;
  const viewsCount = story?._count?.views || story?.viewsCount || 0;

  React.useEffect(() => {
    if (!storyId || !story) return;

    storyService
      .recordView(storyId)
      .then(() => {
        queryClient.setQueryData(["stories"], (current: any[] | undefined) => {
          if (!current) return current;
          return current.map((item) =>
            item.id === storyId ? { ...item, isViewed: true } : item,
          );
        });
      })
      .catch(() => {
        // Viewing should never block the story UI.
      });
  }, [queryClient, storyId, story]);

  const showStoryActions = () => {
    if (!story) return;
    if (story.authorId === currentUserId) {
      Alert.alert("Story actions", undefined, [
        {
          text: "Delete story",
          style: "destructive",
          onPress: async () => {
            await storyService.deleteStory(storyId);
            queryClient.invalidateQueries({ queryKey: ["stories"] });
            queryClient.invalidateQueries({ queryKey: ["user-stories"] });
            router.back();
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    Alert.alert("Story actions", undefined, [
      {
        text: "Report story",
        style: "destructive",
        onPress: async () => {
          await moderationService.report({
            contentId: story.id,
            contentType: "STORY",
            reportedId: story.authorId,
            reason: "OTHER",
            description: "Reported from story details",
          });
          Alert.alert("Report received", "Thank you for helping keep Datebl safe.");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      ) : !story ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-[#222222] bg-[#111111]">
            <Ionicons name="play-circle-outline" size={38} color="#888888" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-white">
            Story not found
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-[#888888]">
            This story may have expired or is no longer available.
          </Text>
          <TouchableOpacity
            className="mt-6 h-12 items-center justify-center rounded-full bg-white px-6"
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Text className="text-sm font-extrabold text-black">Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
        >
          <View className="relative flex-1 bg-[#090909]">
            {story.mediaUrl ? (
              <Image
                source={{ uri: story.mediaUrl }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="absolute inset-0 items-center justify-center bg-[#111111]">
                <Ionicons name="image-outline" size={48} color="#777777" />
              </View>
            )}

            <LinearGradient
              colors={[
                "rgba(0,0,0,0.78)",
                "rgba(0,0,0,0.1)",
                "rgba(0,0,0,0.88)",
              ]}
              locations={[0, 0.45, 1]}
              className="absolute inset-0"
            />

            <View className="px-4 pt-3">
              <View className="h-1 overflow-hidden rounded-full bg-white/25">
                <View className="h-full w-full rounded-full bg-white" />
              </View>

              <View className="mt-4 flex-row items-center">
                <TouchableOpacity
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-black/45"
                  onPress={() => router.back()}
                  activeOpacity={0.78}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View className="mr-3 h-11 w-11 overflow-hidden rounded-full border border-white/20 bg-[#1A1A1A]">
                  {authorAvatar ? (
                    <Image
                      source={{ uri: authorAvatar }}
                      className="h-full w-full"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name="person" size={22} color="#AAAAAA" />
                    </View>
                  )}
                </View>

                <View className="min-w-0 flex-1">
                  <Text
                    className="text-base font-extrabold text-white"
                    numberOfLines={1}
                  >
                    {authorName}
                  </Text>
                  <Text className="mt-0.5 text-xs font-semibold text-white/70">
                    {getTimeLeft(story.expiresAt)}
                  </Text>
                </View>

                <View className="flex-row items-center rounded-full bg-black/45 px-3 py-2">
                  <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
                  <Text className="ml-1.5 text-xs font-extrabold text-white">
                    {viewsCount}
                  </Text>
                </View>
                <TouchableOpacity
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-black/45"
                  onPress={showStoryActions}
                >
                  <Ionicons name="ellipsis-horizontal" size={21} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-auto px-5 pb-8">
              {story.caption ? (
                <Text className="text-xl font-extrabold leading-7 text-white">
                  {story.caption}
                </Text>
              ) : null}
              <View className="mt-4 flex-row items-center rounded-full border border-white/10 bg-black/45 px-4 py-3">
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                <Text className="ml-2 flex-1 text-sm font-bold text-white/85">
                  Story viewed
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
