import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfilePostGrid } from "@/components/profile/ProfilePostGrid";
import {
  useUserProfileQuery,
  useUserStatsQuery,
  useUserPostsQuery,
} from "@/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { matchService } from "@/services/match.service";

const calculateAge = (birthDateString?: string | null) => {
  if (!birthDateString) return 0;
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "connect" | "message" | null
  >(null);

  const isOwnProfile = currentUser?.id === userId;

  const { data: userProfile, isLoading: profileLoading } =
    useUserProfileQuery(userId);
  const { data: stats } = useUserStatsQuery(userId);
  const { data: posts, isLoading: postsLoading } = useUserPostsQuery(userId);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] }),
      queryClient.invalidateQueries({ queryKey: ["user-stats", userId] }),
      queryClient.invalidateQueries({ queryKey: ["user-posts", userId] }),
    ]);
    setRefreshing(false);
  }, [userId, queryClient]);

  const openPost = React.useCallback(
    (selectedPostId: string) => {
      router.push({
        pathname: "/(screens)/post/[postId]",
        params: { postId: selectedPostId },
      });
    },
    [router],
  );

  const getDisplayName = React.useCallback(() => {
    if (!userProfile) return "Chat";
    return userProfile.profile?.username || userProfile.username || "Chat";
  }, [userProfile]);

  const getAvatarUrl = React.useCallback(
    () => userProfile?.profile?.avatarUrl || "",
    [userProfile?.profile?.avatarUrl],
  );

  const openChat = React.useCallback(
    (chatId: string) => {
      router.push({
        pathname: "/(screens)/chat/[roomId]",
        params: {
          roomId: chatId,
          userId,
          name: getDisplayName(),
          avatarUrl: getAvatarUrl(),
        },
      });
    },
    [getAvatarUrl, getDisplayName, router, userId],
  );

  const findExistingChat = React.useCallback(async () => {
    if (!userId) return null;

    const response = await matchService.getMatches();
    if (!response?.success || !Array.isArray(response.data)) return null;

    const match = response.data.find((item: any) => {
      const otherUserId =
        item.user1Id === currentUser?.id ? item.user2Id : item.user1Id;
      return otherUserId === userId && item.chat?.id;
    });

    return match?.chat?.id || null;
  }, [currentUser?.id, userId]);

  const sendConnectionRequest = React.useCallback(
    async (message?: string) => {
      if (!userId || isOwnProfile) return null;
      const response = await matchService.sendRequest(userId, message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["match-recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
      ]);
      return response;
    },
    [isOwnProfile, queryClient, userId],
  );

  const handleConnect = React.useCallback(async () => {
    if (!userId || actionLoading) return;

    try {
      setActionLoading("connect");
      const existingChatId = await findExistingChat();
      if (existingChatId) {
        Alert.alert(
          "Already connected",
          "You already have a chat with this user.",
        );
        return;
      }

      const response = await sendConnectionRequest();
      const chatId = response?.data?.chat?.id;
      if (chatId) {
        openChat(chatId);
        return;
      }

      Alert.alert("Request sent", "They will see your connection request.");
    } catch (error: any) {
      Alert.alert(
        "Connect failed",
        error?.response?.data?.message || "Unable to send connection request.",
      );
    } finally {
      setActionLoading(null);
    }
  }, [
    actionLoading,
    findExistingChat,
    openChat,
    sendConnectionRequest,
    userId,
  ]);

  const handleMessage = React.useCallback(async () => {
    if (!userId || actionLoading) return;

    try {
      setActionLoading("message");
      const existingChatId = await findExistingChat();
      if (existingChatId) {
        openChat(existingChatId);
        return;
      }

      const response = await sendConnectionRequest(
        "Hi, I would like to chat with you.",
      );
      const chatId = response?.data?.chat?.id;
      if (chatId) {
        openChat(chatId);
        return;
      }

      Alert.alert(
        "Request sent",
        "They need to accept your request before chat opens.",
      );
    } catch (error: any) {
      Alert.alert(
        "Message failed",
        error?.response?.data?.message || "Unable to start this conversation.",
      );
    } finally {
      setActionLoading(null);
    }
  }, [
    actionLoading,
    findExistingChat,
    openChat,
    sendConnectionRequest,
    userId,
  ]);

  if (profileLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#050505] items-center justify-center">
        <ActivityIndicator color="#FFFFFF" size="large" />
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView className="flex-1 bg-[#050505] items-center justify-center px-5">
        <Text className="text-[#888888] font-medium text-lg mb-5">
          User not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#111] px-6 py-3 rounded-full border border-[#222]"
        >
          <Text className="text-[#F5F5F5] font-semibold text-sm">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        <ProfileHeader
          username={userProfile.username}
          bio={userProfile.profile?.bio}
          avatarUrl={userProfile.profile?.avatarUrl}
          bannerUrl={userProfile.profile?.bannerUrl}
          isOwnProfile={isOwnProfile}
          onBackPress={() => router.back()}
          onEditPress={() => router.push("/(screens)/edit-profile")}
          onConnectPress={handleConnect}
          onMessagePress={handleMessage}
        />

        {/* Stats Section */}
        <View className="mt-2">
          <ProfileStats
            postsCount={stats?.postsCount || 0}
            followersCount={stats?.followers || 0}
            followingCount={stats?.following || 0}
          />
        </View>

        {/* About & Info Section */}
        <View className="px-5 mt-6">
          <View className="bg-[#111] p-5 rounded-2xl border border-[#222]">
            <Text className="text-[#F5F5F5] font-bold text-lg mb-4">About</Text>

            <View className="flex-row items-center mb-3">
              <View className="w-8 items-center">
                <Ionicons name="calendar-outline" size={18} color="#888" />
              </View>
              <Text className="text-[#888888] text-sm ml-2">
                Age:{" "}
                <Text className="text-[#F5F5F5] font-medium">
                  {calculateAge(userProfile.profile?.birthDate)}
                </Text>
              </Text>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="w-8 items-center">
                <Ionicons name="location-outline" size={18} color="#888" />
              </View>
              <Text className="text-[#888888] text-sm ml-2">
                Location:{" "}
                <Text className="text-[#F5F5F3] font-medium">
                  {userProfile.profile?.location || "Not specified"}
                </Text>
              </Text>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 items-center mt-0.5">
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#888"
                />
              </View>
              <Text className="flex-1 text-[#888888] text-sm ml-2 leading-5">
                {userProfile.profile?.bio || "No bio provided."}
              </Text>
            </View>
          </View>
        </View>

        {/* Interests Section */}
        {userProfile.profile?.interests &&
          userProfile.profile.interests.length > 0 && (
            <View className="px-5 mt-4">
              <View className="bg-[#111] p-5 rounded-2xl border border-[#222]">
                <Text className="text-[#F5F5F5] font-bold text-lg mb-4">
                  Interests
                </Text>
                <View className="flex-row flex-wrap">
                  {userProfile.profile.interests.map(
                    (interest: string, index: number) => (
                      <View
                        key={`${interest}-${index}`}
                        className="bg-[#050505] px-4 py-2 rounded-xl mr-2 mb-2 border border-[#222]"
                      >
                        <Text className="text-[#F5F5F5] font-medium text-xs">
                          #{interest}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </View>
            </View>
          )}

        {/* Action Buttons (Sticky-like feel but in scroll) */}
        {!isOwnProfile && (
          <View className="flex-row px-5 mt-6 gap-3">
            <TouchableOpacity
              className="flex-1 bg-[#F5F5F5] h-14 rounded-2xl items-center justify-center flex-row"
              onPress={handleConnect}
              disabled={!!actionLoading}
              activeOpacity={0.84}
            >
              {actionLoading === "connect" ? (
                <ActivityIndicator color="#050505" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#050505" />
                  <Text className="text-[#050505] font-bold text-base ml-2">
                    Connect
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="w-14 h-14 bg-[#111] rounded-2xl items-center justify-center border border-[#222]"
              onPress={handleMessage}
              disabled={!!actionLoading}
              activeOpacity={0.84}
            >
              {actionLoading === "message" ? (
                <ActivityIndicator color="#F5F5F5" size="small" />
              ) : (
                <Ionicons name="chatbubble-outline" size={24} color="#F5F5F5" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs / Post Section */}
        <View className="mt-8 px-5 border-b border-[#222]">
          <View className="pb-3 border-b-2 border-[#F5F5F5] self-start px-2">
            <Text className="text-[#F5F5F5] font-bold text-base">Posts</Text>
          </View>
        </View>

        <View className="flex-1">
          {postsLoading && !refreshing ? (
            <View className="py-20 items-center">
              <ActivityIndicator color="#F5F5F5" size="small" />
            </View>
          ) : (
            <ProfilePostGrid posts={posts || []} onPostPress={openPost} />
          )}
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
