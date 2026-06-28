import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
import type { Match } from "@/types/match.types";
import { useAuthStore } from "@/store/authStore";
import {
  useMatchesQuery,
  useSavedPostsQuery,
  useUserPostsQuery,
  useUserProfileQuery,
  useUserStatsQuery,
  useUserStoriesQuery,
} from "@/hooks/queries";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=1600&auto=format&fit=crop";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

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

  const currentUser = liveUser || user;
  const profile = currentUser?.profile;
  const displayName = profile?.username || currentUser?.username || "Your Name";
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
    bannerUrl: profile?.bannerUrl,
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
    ]);
    setRefreshing(false);
  }, [queryClient, user?.id]);

  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-bg">
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 z-30 bg-bg"
        style={{ height: insets.top }}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
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
          coverUrl={profile?.bannerUrl || DEFAULT_COVER}
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
          onEditCover={editProfile}
          onSettings={openSettings}
        />

        <ProfileJourneyCard
          loading={statsLoading}
          metrics={journeyMetrics}
          updatedAt={stats?.lastUpdated}
        />
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
    </SafeAreaView>
  );
}

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
  <View className="px-5">
    {matches.map((match) => {
      const matchedUser =
        match.user1Id === currentUserId ? match.user2 : match.user1;
      const matchedProfile = matchedUser?.profile;
      const name = matchedProfile?.username || matchedUser?.username || "Match";

      return (
        <TouchableOpacity
          key={match.id}
          onPress={() => onMatchPress(match)}
          activeOpacity={0.85}
          className="mb-3 flex-row items-center rounded-2xl border border-border bg-bg-card p-4"
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
            <Text className="mt-1 text-sm text-text-secondary">
              Matched and ready to chat
            </Text>
          </View>
        </TouchableOpacity>
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
  bannerUrl,
  city,
  bio,
  interests,
  lookingFor,
}: {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  interests?: string[];
  lookingFor?: string[];
}) => {
  const checks = [
    avatarUrl,
    bannerUrl,
    city,
    bio,
    interests?.length ? "interests" : null,
    lookingFor?.length ? "lookingFor" : null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
