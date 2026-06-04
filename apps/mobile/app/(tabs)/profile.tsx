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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
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
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

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
  });
  const editProfile = () => router.push("/(screens)/edit-profile");
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

  const journeyMetrics: JourneyMetric[] = [
    {
      icon: "eye-outline",
      color: "#FF4F7B",
      label: "Profile Views",
      value: stats?.profileViews || 0,
      caption: "People viewed you",
    },
    {
      icon: "heart-half",
      color: "#8B5CF6",
      label: "Likes Received",
      value: stats?.likesReceived || 0,
      caption: "You're liked by",
    },
    {
      icon: "heart-circle",
      color: "#22C55E",
      label: "Matches",
      value: stats?.matchCount || 0,
      caption: "It's a match!",
    },
    {
      icon: "chatbubble-ellipses-outline",
      color: "#0EA5E9",
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
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-[#05070B]">
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
        <ProfileCompletionCard completion={completion} onPress={editProfile} />
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
            <ProfileMatchList currentUserId={user?.id} matches={matches} />
          ) : (
            <ProfileEmptyState
              icon="heart-outline"
              title="No matches yet"
              subtitle="Your matches will appear here when you connect."
            />
          )}
        </View>
      </ScrollView>
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
}: {
  currentUserId?: string;
  matches: any[];
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
          activeOpacity={0.85}
          className="mb-3 flex-row items-center rounded-2xl border border-[#232938] bg-[#080B11] p-4"
        >
          {matchedProfile?.avatarUrl ? (
            <Image
              source={{ uri: matchedProfile.avatarUrl }}
              className="h-14 w-14 rounded-2xl bg-[#111111]"
            />
          ) : (
            <View className="h-14 w-14 rounded-2xl bg-[#15151D]" />
          )}
          <View className="ml-4 flex-1">
            <Text className="text-base font-bold text-[#F5F5F5]">{name}</Text>
            <Text className="mt-1 text-sm text-[#A6ACB8]">
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
}: {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  interests?: string[];
}) => {
  const checks = [
    avatarUrl,
    bannerUrl,
    city,
    bio,
    interests?.length ? "interests" : null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
