import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { FontFamily } from "@/constants/typography";
import { showToast } from "@/utils/toast";

const interestIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: "barbell-outline",
  travel: "airplane-outline",
  music: "musical-notes-outline",
  coffee: "cafe-outline",
  coding: "code-slash-outline",
  gaming: "game-controller-outline",
  art: "color-palette-outline",
  photography: "camera-outline",
  food: "restaurant-outline",
  reading: "book-outline",
  yoga: "body-outline",
  hiking: "trail-sign-outline",
};

const interestColors = [
  Colors.primaryLight,
  Colors.secondary,
  "#7C6E5E",
  Colors.warning,
  Colors.success,
  "#9A7B6A",
];

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

const formatLabel = (str?: string | null) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace(/_/g, " ");
};

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
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
        showToast("You already have a chat with this user.", "Already connected");
        return;
      }

      const response = await sendConnectionRequest();
      const chatId = response?.data?.chat?.id;
      if (chatId) {
        openChat(chatId);
        return;
      }

      showToast("They will see your connection request.", "Request sent");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Unable to send connection request.",
        "Connect failed",
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

      showToast(
        "They need to accept your request before chat opens.",
        "Request sent",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Unable to start this conversation.",
        "Message failed",
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
      showToast(
        error?.response?.data?.message || "Please try again.",
        "Unable to update follow",
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
          showToast("Thank you for helping keep Datebl safe.", "Report received");
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
      <View style={[styles.screen, styles.centerContent]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
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

  const profile = userProfile.profile;
  const displayName = profile?.username || userProfile.username || "User Detail";
  const handle = userProfile.username || profile?.username || "username";
  const avatarUrl = profile?.avatarUrl;
  const age = calculateAge(profile?.birthDate);
  const city = profile?.location || "Not specified";
  const gender = formatLabel(profile?.gender || userProfile.gender || "Add gender");
  const sexuality = formatLabel(userProfile.sexuality || "Straight");
  const interests = profile?.interests || [];
  const bio = profile?.bio || "No bio provided.";

  const getInterestIcon = (interest: string): keyof typeof Ionicons.glyphMap => {
    const norm = interest.toLowerCase().trim();
    return interestIcons[norm] || "sparkles-outline";
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + (isOwnProfile ? 40 : 120), 140),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Profile navigation */}
        <View style={styles.bannerContainer}>
          {/* Floating nav controls */}
          <View style={[styles.headerControls, { top: Math.max(insets.top + 8, 14) }]}>
            <TouchableOpacity
              style={styles.glassHeaderBtn}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            {!isOwnProfile && (
              <TouchableOpacity
                style={styles.glassHeaderBtn}
                onPress={showSafetyActions}
                activeOpacity={0.82}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.glassHeaderBtn}
                onPress={() => router.push("/(screens)/edit-profile")}
                activeOpacity={0.82}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content lift section */}
        <View style={styles.mainContentLift}>
          {/* Avatar double-bordered ring */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorderRing}>
              <View style={styles.avatarInnerBorder}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {isOwnProfile && (
              <TouchableOpacity
                style={styles.avatarEditBadge}
                onPress={() => router.push("/(screens)/edit-profile")}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Identity details */}
          <View style={styles.identityContainer}>
            <View style={styles.nameVerifiedRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={13} color="#fff" />
              </View>
            </View>

            <View style={styles.handleStatusRow}>
              <Text style={styles.handleText}>@{handle}</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>

          {/* Horizontal Meta Pills Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.metaScroll}
            contentContainerStyle={styles.metaScrollContent}
          >
            {age > 0 && <MetaPill icon="calendar-outline" label={`${age} years`} />}
            <MetaPill icon="location-outline" label={city} />
            {gender && <MetaPill icon="male-female-outline" label={gender} />}
            {sexuality && <MetaPill icon="heart-outline" label={sexuality} />}
          </ScrollView>

          {/* Stats section */}
          <View style={styles.statsPanel}>
            <StatItem
              label="Posts"
              value={stats?.postsCount || 0}
            />
            <View style={styles.statsSeparator} />
            <StatItem
              label="Followers"
              value={stats?.followers || 0}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/social-list",
                  params: { userId, mode: "followers" },
                })
              }
            />
            <View style={styles.statsSeparator} />
            <StatItem
              label="Following"
              value={stats?.following || 0}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/social-list",
                  params: { userId, mode: "following" },
                })
              }
            />
          </View>

          {/* Bio block card */}
          <View style={styles.editorialCard}>
            <Text style={styles.editorialCardTitle}>Vibe & Bio</Text>
            <Text style={styles.bioContentText}>{bio}</Text>
          </View>

          {/* Interests section scroll */}
          {interests.length > 0 && (
            <View style={styles.editorialCard}>
              <Text style={styles.editorialCardTitle}>Interests</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.interestsScrollContent}
              >
                {interests.map((interest: string, idx: number) => {
                  const tagColor = interestColors[idx % interestColors.length];
                  return (
                    <View
                      key={`${interest}-${idx}`}
                      style={[styles.interestChip, { borderColor: tagColor + "3a", backgroundColor: tagColor + "0e" }]}
                    >
                      <Ionicons name={getInterestIcon(interest)} size={14} color={tagColor} />
                      <Text style={[styles.interestChipText, { color: tagColor }]}>
                        {interest}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Section tab segmented control */}
          <View style={styles.tabSectionWrap}>
            <View style={styles.tabIndicatorBar}>
              <Text style={styles.tabIndicatorText}>Shared Posts</Text>
              <View style={styles.tabCountBadge}>
                <Text style={styles.tabCountText}>{stats?.postsCount || 0}</Text>
              </View>
            </View>
          </View>

          {/* Posts list grid */}
          <View style={styles.postsGridWrap}>
            {postsLoading && !refreshing ? (
              <View style={styles.postsLoadingSpinner}>
                <ActivityIndicator color={Colors.primary} size="small" />
              </View>
            ) : (
              <ProfilePostGrid posts={posts || []} onPostPress={openPost} />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Glass Actions Bar (non-own profile only) */}
      {!isOwnProfile && (
        <View
          style={[
            styles.floatingActionBar,
            { bottom: Math.max(insets.bottom + 12, 20) },
          ]}
        >
          {/* Follow Button */}
          <TouchableOpacity
            style={[styles.actionRoundBtn, styles.actionRoundBtnMuted]}
            onPress={handleFollow}
            disabled={actionLoading !== null}
            activeOpacity={0.84}
          >
            {actionLoading === "follow" ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Ionicons
                name={userProfile.isFollowing ? "person-remove" : "person-add"}
                size={20}
                color={userProfile.isFollowing ? Colors.primaryLight : Colors.textPrimary}
              />
            )}
          </TouchableOpacity>

          {/* Connect (Like/Heart) Button */}
          <TouchableOpacity
            style={[styles.actionConnectBtn, actionLoading !== null && styles.actionDisabled]}
            onPress={handleConnect}
            disabled={actionLoading !== null}
            activeOpacity={0.84}
          >
            {actionLoading === "connect" ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={18} color={Colors.textInverse} />
                <Text style={styles.actionConnectText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Chat/Message Button */}
          <TouchableOpacity
            style={[styles.actionRoundBtn, styles.actionRoundBtnChat]}
            onPress={handleMessage}
            disabled={actionLoading !== null}
            activeOpacity={0.84}
          >
            {actionLoading === "message" ? (
              <ActivityIndicator color={Colors.primaryLight} size="small" />
            ) : (
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primaryLight} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const MetaPill = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
  <View style={styles.metaPill}>
    <Ionicons name={icon} size={13} color={Colors.textSecondary} />
    <Text style={styles.metaPillLabel}>{label}</Text>
  </View>
);

const StatItem = ({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    style={styles.statItemWrap}
    activeOpacity={0.8}
  >
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  // Banner Cover photo
  bannerContainer: {
    height: 112,
    width: "100%",
    position: "relative",
    backgroundColor: Colors.bgElevated,
  },
  headerControls: {
    position: "absolute",
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  glassHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Main lifted content
  mainContentLift: {
    marginTop: 12,
    paddingHorizontal: 18,
    zIndex: 5,
  },
  avatarContainer: {
    alignSelf: "flex-start",
    position: "relative",
    marginBottom: 16,
  },
  avatarBorderRing: {
    padding: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 36,
  },
  avatarInnerBorder: {
    padding: 2,
    backgroundColor: Colors.bg,
    borderRadius: 34,
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: Colors.bgElevated,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Identity block
  identityContainer: {
    marginBottom: 18,
  },
  nameVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  handleStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  handleText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.success,
  },

  // Meta pills scroll
  metaScroll: {
    marginBottom: 20,
  },
  metaScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  metaPillLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  // Stats row panel
  statsPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    marginBottom: 20,
  },
  statItemWrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  statsSeparator: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // Editorial content card blocks
  editorialCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  editorialCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  bioContentText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
  },
  interestsScrollContent: {
    gap: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Tab segmented control
  tabSectionWrap: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  tabIndicatorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  tabIndicatorText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  tabCountBadge: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
  },

  // Posts listing
  postsGridWrap: {
    flex: 1,
  },
  postsLoadingSpinner: {
    alignItems: "center",
    paddingVertical: 40,
  },

  // Empty state profile loading errors
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    marginBottom: 16,
    width: 82,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: 14,
  },

  // Floating Actions bar overlay
  floatingActionBar: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  actionRoundBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionRoundBtnMuted: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderColor: Colors.border,
  },
  actionRoundBtnChat: {
    backgroundColor: `${Colors.primaryLight}14`,
    borderColor: `${Colors.primaryLight}30`,
  },
  actionConnectBtn: {
    flex: 1,
    height: 50,
    marginHorizontal: 12,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionConnectText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: 14,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
