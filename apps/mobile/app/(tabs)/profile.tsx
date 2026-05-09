import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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
import { useUserPostsQuery, useUserStatsQuery } from "@/hooks/queries";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=1600&auto=format&fit=crop";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  const { data: stats, isLoading: statsLoading } = useUserStatsQuery(user?.id);
  const { data: posts, isLoading: postsLoading } = useUserPostsQuery(user?.id);

  const profile = user?.profile;
  const displayName = profile?.username || user?.username || "Your Name";
  const handle = user?.username || profile?.username || "username";
  const city = profile?.location || "Add your city";
  const age = calculateAge(profile?.birthDate);
  const gender = formatLabel(
    profile?.gender || user?.sexuality || "Add gender",
  );
  const sexuality = formatLabel(user?.sexuality || "STRAIGHT");
  const interests = profile?.interests?.length
    ? profile.interests
    : ["Fitness", "Travel", "Music", "Coffee"];
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

  const journeyMetrics: JourneyMetric[] = [
    {
      icon: "eye-outline",
      color: "#FF4F7B",
      label: "Profile Views",
      value: 128,
      caption: "People viewed you",
    },
    {
      icon: "heart-half",
      color: "#8B5CF6",
      label: "Likes Received",
      value: 34,
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
      value: 8,
      caption: "Active chats",
    },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-posts", user?.id] }),
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

        <ProfileJourneyCard loading={statsLoading} metrics={journeyMetrics} />
        <ProfileCompletionCard completion={completion} onPress={editProfile} />
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="mt-4">
          {postsLoading && activeTab === "posts" ? (
            <View className="items-center py-12">
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : activeTab === "posts" ? (
            <ProfilePostGrid posts={posts || []} />
          ) : activeTab === "stories" ? (
            <ProfileEmptyState
              icon="radio-button-on-outline"
              title="No stories yet"
              subtitle="Stories you share will appear here."
            />
          ) : activeTab === "saved" ? (
            <ProfileEmptyState
              icon="bookmark-outline"
              title="No saved posts yet"
              subtitle="Posts you save will show up here."
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
    </SafeAreaView>
  );
}

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
