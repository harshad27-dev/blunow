import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { CustomDialog } from "@/components/common/Modal";
import { ProfilePostGrid } from "@/components/profile/ProfilePostGrid";
import {
  ProfileCompletionCard,
  ProfileEmptyState,
  ProfileHero,
  ProfileJourneyCard,
  ProfileTabs,
} from "@/components/ui/ProfileScreenUi";
import type {
  JourneyMetric,
  ProfileTab,
} from "@/components/ui/ProfileScreenUi";
import type { Match, MatchRequest } from "@/types/match.types";
import { useAuthStore } from "@/store/authStore";
import {
  useMatchesQuery,
  useSavedPostsQuery,
  useUserPostsQuery,
  useUserProfileQuery,
  useUserStatsQuery,
  useUserStoriesQuery,
  useIncomingMatchRequestsQuery,
  useRespondMatchRequestMutation,
} from "@/hooks/queries";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);
  const [pendingRequestAction, setPendingRequestAction] = useState<{
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);

  const { data: liveUser } = useUserProfileQuery(user?.id);
  const { data: stats, isLoading: statsLoading } = useUserStatsQuery(user?.id);
  const { data: posts, isLoading: postsLoading } = useUserPostsQuery(user?.id);
  const { data: stories, isLoading: storiesLoading } = useUserStoriesQuery(
    user?.id,
    activeTab === "stories",
  );
  const { data: savedPosts, isLoading: savedPostsLoading } = useSavedPostsQuery(
    activeTab === "saved",
  );
  const { data: matches, isLoading: matchesLoading } = useMatchesQuery(
    activeTab === "matches",
  );
  const { data: incomingRequests = [] } = useIncomingMatchRequestsQuery();
  const respondToIncomingRequest = useRespondMatchRequestMutation();

  const handleAcceptRequest = (request: MatchRequest) => {
    setPendingRequestAction({ requestId: request.id, status: "ACCEPTED" });
    respondToIncomingRequest.mutate(
      { requestId: request.id, status: "ACCEPTED" },
      {
        onSettled: () => setPendingRequestAction(null),
      }
    );
  };

  const handleRejectRequest = (request: MatchRequest) => {
    setPendingRequestAction({ requestId: request.id, status: "REJECTED" });
    respondToIncomingRequest.mutate(
      { requestId: request.id, status: "REJECTED" },
      {
        onSettled: () => setPendingRequestAction(null),
      }
    );
  };

  const currentUser = liveUser || user;
  const profile = currentUser?.profile;
  const displayName = profile?.name || profile?.username || currentUser?.username || "Your Name";
  const handle = currentUser?.username || profile?.username || "username";
  const city = profile?.location || "Add your city";
  const age = calculateAge(profile?.birthDate);
  const gender = formatLabel(
    profile?.gender || currentUser?.sexuality || "Add gender",
  );
  const sexuality = formatLabel(currentUser?.sexuality || "STRAIGHT");
  const interests = profile?.interests || [];
  const bio =
    profile?.bio ||
    "Based in your city. Add a short bio to help people know your vibe.";
  const completion = getProfileCompletion({
    avatarUrl: profile?.avatarUrl,
    city: profile?.location,
    bio: profile?.bio,
    interests: profile?.interests,
    lookingFor: profile?.lookingFor,
  });
  const editProfile = () => router.push("/(screens)/edit-profile");
  const openCompletionDialog = () => setShowCompletionDialog(true);
  const closeCompletionDialog = () => setShowCompletionDialog(false);
  const goToEditProfileFromDialog = () => {
    closeCompletionDialog();
    editProfile();
  };
  const openSettings = () => router.push("/(screens)/settings");
  const openPost = (postId: string) =>
    router.push({
      pathname: "/(screens)/post/[postId]",
      params: { postId },
    });
  const openStory = (storyId: string) =>
    router.push({
      pathname: "/(screens)/story/[storyId]",
      params: { storyId },
    });
  const openMatch = (match: Match) => {
    const matchedUser =
      match.user1Id === user?.id ? match.user2 : match.user1;

    if (match.chat?.id) {
      router.push({
        pathname: "/(screens)/chat/[roomId]",
        params: {
          roomId: match.chat.id,
          userId: matchedUser?.id || "",
          name:
            matchedUser?.profile?.username ||
            matchedUser?.username ||
            "Match",
          avatarUrl: matchedUser?.profile?.avatarUrl || "",
        },
      });
      return;
    }

    if (matchedUser?.id) {
      router.push({
        pathname: "/(screens)/user/[userId]",
        params: { userId: matchedUser.id },
      });
    }
  };

  const journeyMetrics: JourneyMetric[] = [
    {
      icon: "eye-outline",
      color: Colors.primaryLight,
      label: "Profile Views",
      value: stats?.profileViews || 0,
      caption: "People viewed you",
    },
    {
      icon: "heart-half",
      color: Colors.secondary,
      label: "Likes Received",
      value: stats?.likesReceived || 0,
      caption: "You're liked by",
    },
    {
      icon: "heart-circle",
      color: Colors.success,
      label: "Matches",
      value: stats?.matchCount || 0,
      caption: "It's a match!",
    },
    {
      icon: "chatbubble-ellipses-outline",
      color: Colors.primary,
      label: "Conversations",
      value: stats?.conversationsCount || 0,
      caption: "Active chats",
    },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-posts", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-stories", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["matches"] }),
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["match-requests-incoming"] }),
    ]);
    setRefreshing(false);
  }, [queryClient, user?.id]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-16" keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <ProfileHero
          avatarUrl={profile?.avatarUrl}
          displayName={displayName}
          handle={handle}
          bio={bio}
          ageLabel={age ? `${age}` : "Add age"}
          city={city}
          gender={gender}
          sexuality={sexuality}
          interests={interests}
          onEditProfile={editProfile}
          onSettings={openSettings}
          followersCount={stats?.followers || 0}
          followingCount={stats?.following || 0}
          requestsCount={incomingRequests.length}
          onFollowersPress={() =>
            router.push({
              pathname: "/(screens)/social-list",
              params: { userId: user?.id, mode: "followers" },
            })
          }
          onFollowingPress={() =>
            router.push({
              pathname: "/(screens)/social-list",
              params: { userId: user?.id, mode: "following" },
            })
          }
          onRequestsPress={() => setIsRequestsModalVisible(true)}
        />

        {/* <ProfileJourneyCard
          loading={statsLoading}
          metrics={journeyMetrics}
          updatedAt={stats?.lastUpdated}
        /> */}
        <ProfileCompletionCard completion={completion} onPress={openCompletionDialog} />
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            posts: stats?.postsCount || posts?.length || 0,
            stories: stats?.storiesCount || stories?.length || 0,
            saved: stats?.savedPostsCount || savedPosts?.length || 0,
            matches: stats?.matchCount || matches?.length || 0,
          }}
        />

        <View className="mt-4">
          {isTabLoading(
            activeTab,
            postsLoading,
            storiesLoading,
            savedPostsLoading,
            matchesLoading,
          ) ? (
            <View className="items-center py-12">
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : activeTab === "posts" ? (
            <ProfilePostGrid posts={posts || []} onPostPress={openPost} />
          ) : activeTab === "stories" ? (
            stories?.length ? (
              <ProfilePostGrid posts={stories} onPostPress={openStory} />
            ) : (
              <ProfileEmptyState
                icon="radio-button-on-outline"
                title="No stories yet"
                subtitle="Stories you share will appear here."
              />
            )
          ) : activeTab === "saved" ? (
            savedPosts?.length ? (
              <ProfilePostGrid posts={savedPosts} onPostPress={openPost} />
            ) : (
              <ProfileEmptyState
                icon="bookmark-outline"
                title="No saved posts yet"
                subtitle="Posts you save will show up here."
              />
            )
          ) : matches?.length ? (
            <ProfileMatchList
              currentUserId={user?.id}
              matches={matches}
              onMatchPress={openMatch}
            />
          ) : (
            <ProfileEmptyState
              icon="heart-outline"
              title="No matches yet"
              subtitle="Your matches will appear here when you connect."
            />
          )}
        </View>
      </ScrollView>

      <CustomDialog
        visible={showCompletionDialog}
        title="Complete your profile"
        message="Add your best photos, interests, and a short bio so people can get a better feel for you."
        icon="sparkles-outline"
        accent={Colors.primary}
        actions={[
          { label: "Later", onPress: closeCompletionDialog },
          {
            label: "Edit Profile",
            onPress: goToEditProfileFromDialog,
            variant: "primary",
          },
        ]}
        onClose={closeCompletionDialog}
      />

      <RequestsModal
        visible={isRequestsModalVisible}
        requests={incomingRequests}
        pendingAction={pendingRequestAction}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        onClose={() => setIsRequestsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const RequestsModal = ({
  visible,
  requests,
  pendingAction,
  onAccept,
  onReject,
  onClose,
}: {
  visible: boolean;
  requests: MatchRequest[];
  pendingAction: { requestId: string; status: "ACCEPTED" | "REJECTED" } | null;
  onAccept: (request: MatchRequest) => void;
  onReject: (request: MatchRequest) => void;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
    accessibilityViewIsModal
    onRequestClose={onClose}
  >
    <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlayDark }}>
      <View className="max-h-[84%] rounded-t-[32px] border-t border-border bg-bg-card px-5 pb-8 pt-2">
        {/* Handle */}
        <View className="mb-5 mt-1 h-1 w-10 self-center rounded-full bg-border" />

        <View className="mb-5 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="flex-row items-center">
              <View className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-bg-elevated">
                <Ionicons name="people-outline" size={18} color={Colors.primary} />
              </View>
              <Text className="text-xl font-extrabold text-text-primary">Incoming requests</Text>
            </View>
            <Text className="ml-11 mt-1 text-xs leading-5 text-text-secondary">{requests.length} people want to connect</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close requests"
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated"
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-[72%]"
          contentContainerClassName="pb-2"
        >
          {requests.length === 0 ? (
            <View className="items-center py-12">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] bg-bg-elevated">
                <Ionicons name="mail-open-outline" size={27} color={Colors.textSecondary} />
              </View>
              <Text className="text-base font-extrabold text-text-primary">All caught up</Text>
              <Text className="mt-1.5 text-center text-xs text-text-secondary">New connection requests will appear here.</Text>
            </View>
          ) : requests.map((request) => (
            <IncomingRequestRow
              key={request.id}
              request={request}
              disabled={Boolean(pendingAction)}
              pendingStatus={pendingAction?.requestId === request.id ? pendingAction.status : null}
              onAccept={() => onAccept(request)}
              onReject={() => onReject(request)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const IncomingRequestRow = ({
  request,
  disabled,
  pendingStatus,
  onAccept,
  onReject,
}: {
  request: MatchRequest;
  disabled: boolean;
  pendingStatus?: "ACCEPTED" | "REJECTED" | null;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const name =
    request.sender?.profile?.username ||
    request.sender?.username ||
    request.sender?.email ||
    "Someone";
  const avatarUrl = request.sender?.profile?.avatarUrl;

  return (
    <View className="mb-3 flex-row items-center rounded-[22px] border border-border bg-bg p-4">
      {/* Avatar */}
      {avatarUrl ? (
        <View className="rounded-2xl border border-border p-[2px] bg-bg-card">
          <Image source={{ uri: avatarUrl }} className="h-14 w-14 rounded-2xl bg-bg-elevated" />
        </View>
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elevated">
          <Text className="text-sm font-extrabold text-text-secondary">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      {/* Info */}
      <View className="ml-4 mr-3 flex-1">
        <Text className="text-[15px] font-extrabold text-text-primary" numberOfLines={1}>{name}</Text>
        <Text className="mt-1 text-xs leading-4 text-text-secondary" numberOfLines={1}>
          {request.message || "Wants to connect with you"}
        </Text>
      </View>

      {/* Reject */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reject request from ${name}`}
        accessibilityState={{ disabled }}
        className="mr-2 h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated"
        onPress={onReject}
        disabled={disabled}
      >
        {pendingStatus === "REJECTED" ? (
          <ActivityIndicator color={Colors.textSecondary} size="small" />
        ) : (
          <Ionicons name="close" size={19} color={Colors.textSecondary} />
        )}
      </Pressable>

      {/* Accept */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Accept request from ${name}`}
        accessibilityState={{ disabled }}
        className="h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: Colors.primary, opacity: disabled ? 0.5 : 1 }}
        onPress={onAccept}
        disabled={disabled}
      >
        {pendingStatus === "ACCEPTED" ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Ionicons name="checkmark" size={20} color={Colors.white} />
        )}
      </Pressable>
    </View>
  );
};

const isTabLoading = (
  activeTab: ProfileTab,
  postsLoading: boolean,
  storiesLoading: boolean,
  savedPostsLoading: boolean,
  matchesLoading: boolean,
) =>
  (activeTab === "posts" && postsLoading) ||
  (activeTab === "stories" && storiesLoading) ||
  (activeTab === "saved" && savedPostsLoading) ||
  (activeTab === "matches" && matchesLoading);

const ProfileMatchList = ({
  currentUserId,
  matches,
  onMatchPress,
}: {
  currentUserId?: string;
  matches: Match[];
  onMatchPress: (match: Match) => void;
}) => (
  <View className="px-5 pb-4">
    {matches.map((match) => {
      const matchedUser =
        match.user1Id === currentUserId ? match.user2 : match.user1;
      const matchedProfile = matchedUser?.profile;
      const name = matchedProfile?.username || matchedUser?.username || "Match";

      return (
        <Pressable
          key={match.id}
          accessibilityRole="button"
          accessibilityLabel={`Open chat with ${name}`}
          onPress={() => onMatchPress(match)}
          className="mb-3 min-h-[88px] flex-row items-center rounded-[22px] border border-border bg-bg-card p-4"
        >
          {matchedProfile?.avatarUrl ? (
            <Image
              source={{ uri: matchedProfile.avatarUrl }}
              className="h-14 w-14 rounded-2xl bg-bg-elevated"
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated">
              <Text className="text-base font-extrabold text-text-secondary">
                {name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-4 flex-1">
            <Text className="text-base font-bold text-text-primary">{name}</Text>
            <View className="mt-1.5 flex-row items-center">
              <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" />
              <Text className="text-xs font-medium text-text-secondary">Matched · Tap to chat</Text>
            </View>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated">
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
          </View>
        </Pressable>
      );
    })}
  </View>
);

const calculateAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const birthday = new Date(birthDate);
  if (Number.isNaN(birthday.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getProfileCompletion = ({
  avatarUrl,
  city,
  bio,
  interests,
  lookingFor,
}: {
  avatarUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  interests?: string[];
  lookingFor?: string[];
}) => {
  const checks = [
    avatarUrl,
    city,
    bio,
    interests?.length ? "interests" : null,
    lookingFor?.length ? "lookingFor" : null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
