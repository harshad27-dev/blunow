import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { userService } from "@/services/user.service";
import { moderationService } from "@/services/moderation.service";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";

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
    "connect" | "message" | "follow" | null
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

  const handleFollow = React.useCallback(async () => {
    if (!userId || actionLoading) return;
    const isFollowing = Boolean(userProfile?.isFollowing);
    try {
      setActionLoading("follow");
      if (isFollowing) {
        await userService.unfollowUser(userId);
      } else {
        await userService.followUser(userId);
      }
      queryClient.setQueryData(
        ["user-profile", userId],
        { ...userProfile, isFollowing: !isFollowing },
      );
      queryClient.invalidateQueries({ queryKey: ["user-stats", userId] });
    } catch (error: any) {
      Alert.alert(
        "Unable to update follow",
        error?.response?.data?.message || "Please try again.",
      );
    } finally {
      setActionLoading(null);
    }
  }, [actionLoading, queryClient, userId, userProfile]);

  const showSafetyActions = React.useCallback(() => {
    if (!userId) return;
    Alert.alert(getDisplayName(), "Profile actions", [
      {
        text: "Report profile",
        onPress: async () => {
          await moderationService.report({
            contentId: userId,
            contentType: "USER",
            reportedId: userId,
            reason: "OTHER",
            description: "Reported from profile",
          });
          Alert.alert("Report received", "Thank you for helping keep Datebl safe.");
        },
      },
      {
        text: "Block user",
        style: "destructive",
        onPress: async () => {
          await userService.blockUser(userId);
          queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
          router.back();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [getDisplayName, queryClient, router, userId]);

  if (profileLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.emptyState}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="person-circle-outline" size={42} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>User not found</Text>
        <Text style={styles.emptySubtitle}>
          This profile may have moved or is no longer available.
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
          <Text style={styles.emptyButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
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
          onMorePress={showSafetyActions}
        />

        {/* Stats Section */}
        <View style={styles.statsWrap}>
          <ProfileStats
            postsCount={stats?.postsCount || 0}
            followersCount={stats?.followers || 0}
            followingCount={stats?.following || 0}
            onFollowersPress={() =>
              router.push({
                pathname: "/(screens)/social-list",
                params: { userId, mode: "followers" },
              })
            }
            onFollowingPress={() =>
              router.push({
                pathname: "/(screens)/social-list",
                params: { userId, mode: "following" },
              })
            }
          />
        </View>

        {/* About & Info Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </View>
              <View style={styles.infoBody}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>
                  {calculateAge(userProfile.profile?.birthDate) || "Not specified"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </View>
              <View style={styles.infoBody}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {userProfile.profile?.location || "Not specified"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </View>
              <View style={styles.infoBody}>
                <Text style={styles.infoLabel}>Bio</Text>
                <Text style={styles.bioText}>
                  {userProfile.profile?.bio || "No bio provided."}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Interests Section */}
        {userProfile.profile?.interests &&
          userProfile.profile.interests.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Interests</Text>
                <View style={styles.chipRow}>
                  {userProfile.profile.interests.map(
                    (interest: string, index: number) => (
                      <View
                        key={`${interest}-${index}`}
                        style={styles.interestChip}
                      >
                        <Text style={styles.interestText}>
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
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followAction, !!actionLoading && styles.disabledAction]}
              onPress={handleFollow}
              disabled={!!actionLoading}
              activeOpacity={0.84}
            >
              {actionLoading === "follow" ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={userProfile.isFollowing ? "person-remove-outline" : "person-add-outline"}
                    size={19}
                    color={Colors.textPrimary}
                  />
                  <Text style={styles.followActionText}>
                    {userProfile.isFollowing ? "Following" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryAction, !!actionLoading && styles.disabledAction]}
              onPress={handleConnect}
              disabled={!!actionLoading}
              activeOpacity={0.84}
            >
              {actionLoading === "connect" ? (
                <ActivityIndicator color={Colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color={Colors.textInverse} />
                  <Text style={styles.primaryActionText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryAction, !!actionLoading && styles.disabledAction]}
              onPress={handleMessage}
              disabled={!!actionLoading}
              activeOpacity={0.84}
            >
              {actionLoading === "message" ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={Colors.textPrimary}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs / Post Section */}
        <View style={styles.tabsWrap}>
          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>Posts</Text>
          </View>
        </View>

        <View style={styles.postsWrap}>
          {postsLoading && !refreshing ? (
            <View style={styles.postsLoading}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          ) : (
            <ProfilePostGrid posts={posts || []} onPostPress={openPost} />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  followAction: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  followActionText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  statsWrap: {
    marginTop: Spacing.sm,
  },
  sectionWrap: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md + 4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: Spacing.sm,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    height: 38,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 38,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    textTransform: "uppercase",
  },
  infoValue: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    marginTop: 2,
  },
  bioText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  interestChip: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  interestText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm + 4,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md + 4,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    flex: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "center",
  },
  primaryActionText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginLeft: Spacing.sm,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  disabledAction: {
    opacity: 0.62,
  },
  tabsWrap: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md + 4,
  },
  activeTab: {
    alignSelf: "flex-start",
    borderBottomColor: Colors.textPrimary,
    borderBottomWidth: 2,
    paddingBottom: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
  },
  activeTabText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  postsWrap: {
    flex: 1,
  },
  postsLoading: {
    alignItems: "center",
    paddingVertical: 80,
  },
  bottomSpacer: {
    height: 40,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 82,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
  },
  emptyButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
});
