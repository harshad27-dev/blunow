import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CuratedMatchCard } from "@/components/discover/CuratedMatchCard";
import { DailyPromptBanner } from "@/components/discover/DailyPromptBanner";
import { DiscoverSectionHeader } from "@/components/discover/DiscoverSectionHeader";
import { EmptyMiniState } from "@/components/discover/EmptyMiniState";
import { NearbyMomentCard } from "@/components/discover/NearbyMomentCard";
import { SuggestedPersonCard } from "@/components/discover/SuggestedPersonCard";
import { TrendingPostCard } from "@/components/discover/TrendingPostCard";
import { Colors } from "@/constants/colors";
import {
  DAILY_CURATED_MATCH_LIMIT,
  DISCOVER_SCREEN_PADDING,
  EXPLORE_FILTERS,
  FALLBACK_PROFILE_IMAGE,
  TRENDING_POSTS,
} from "@/constants/discover";
import type { TrendingPost } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";
import {
  useDiscoverPeopleQuery,
  useSendMatchRequestMutation,
  useTrendingPostsQuery,
} from "@/hooks/queries";
import type { DiscoverProfile } from "@/types/match.types";

const { width } = Dimensions.get("window");

const getCuratedRank = (profile: DiscoverProfile) => {
  const onlineBoost = profile.online ? 8 : 0;
  const verifiedBoost = profile.verified ? 5 : 0;
  const interestBoost = Math.min(profile.interests?.length || 0, 4) * 2;
  return profile.matchScore + onlineBoost + verifiedBoost + interestBoost;
};

const getCuratedReasons = (profile: DiscoverProfile) => {
  const reasons: string[] = [];

  if (profile.matchScore >= 85) reasons.push("High compatibility");
  else if (profile.matchScore >= 70) reasons.push("Strong profile fit");

  if (profile.online) reasons.push("Active now");
  if (profile.verified) reasons.push("Verified profile");
  if (profile.interests?.[0]) reasons.push(`Likes ${profile.interests[0]}`);
  if (profile.distance) reasons.push(`${profile.distance} away`);

  return reasons.length > 0 ? reasons : ["Good conversation potential"];
};

const getNextDropLabel = () => {
  const now = new Date();
  const nextDrop = new Date(now);
  nextDrop.setDate(now.getDate() + 1);
  nextDrop.setHours(9, 0, 0, 0);

  return nextDrop.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};
export default function DiscoverScreen() {
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState(
    EXPLORE_FILTERS[0].label,
  );

  const [skippedProfileIds, setSkippedProfileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [savedProfileIds, setSavedProfileIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    data: discoverData,
    isLoading,
    refetch,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useDiscoverPeopleQuery(selectedFilter);

  const sendMatchRequest = useSendMatchRequestMutation();
  const { data: realTrendingPosts = [] } = useTrendingPostsQuery(12);

  const profiles = useMemo(
    () => discoverData?.pages.flatMap((page) => page.data) || [],
    [discoverData],
  );

  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => !skippedProfileIds.has(profile.id)),
    [profiles, skippedProfileIds],
  );

  const dailyCuratedMatches = useMemo(
    () =>
      [...visibleProfiles]
        .sort((first, second) => getCuratedRank(second) - getCuratedRank(first))
        .slice(0, DAILY_CURATED_MATCH_LIMIT)
        .map((profile) => ({
          profile,
          reasons: getCuratedReasons(profile),
        })),
    [visibleProfiles],
  );

  const dailyCuratedProfileIds = useMemo(
    () => new Set(dailyCuratedMatches.map((item) => item.profile.id)),
    [dailyCuratedMatches],
  );

  const suggestedPeople = useMemo(
    () =>
      visibleProfiles
        .filter((profile) => !dailyCuratedProfileIds.has(profile.id))
        .slice(0, 8),
    [dailyCuratedProfileIds, visibleProfiles],
  );

  const nearbyPeople = useMemo(
    () => visibleProfiles.slice(0, 4),
    [visibleProfiles],
  );

  const nextDropLabel = useMemo(getNextDropLabel, []);

  const trendingPosts: TrendingPost[] = realTrendingPosts.length > 0
    ? realTrendingPosts
    : TRENDING_POSTS;

  const trendingColumns = useMemo(
    () => [
      trendingPosts.filter((_, index) => index % 2 === 0),
      trendingPosts.filter((_, index) => index % 2 === 1),
    ],
    [trendingPosts],
  );

  const onlineCount = profiles.filter((profile) => profile.online).length;
  const strongMatchCount = profiles.filter(
    (profile) => profile.matchScore >= 80,
  ).length;

  const openProfile = (id: string) => {
    router.push(`/(screens)/user/${id}`);
  };

  const refreshExplore = () => {
    setSkippedProfileIds(new Set());
    refetch();
  };

  const skipProfile = (id: string) => {
    setSkippedProfileIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const toggleSavedProfile = (id: string) => {
    setSavedProfileIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleFilterPress = (filter: string) => {
    setSelectedFilter(filter);
    setSkippedProfileIds(new Set());
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom < 280 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const sendRequest = (
    profile: DiscoverProfile,
    message = "I would like to connect with you.",
  ) => {
    if (sendMatchRequest.isPending) return;

    sendMatchRequest.mutate(
      { receiverId: profile.id, message },
      {
        onSuccess: (response: any) => {
          skipProfile(profile.id);

          const chatId = response?.data?.chat?.id;

          if (chatId) {
            router.push({
              pathname: "/(screens)/chat/[roomId]",
              params: {
                roomId: chatId,
                userId: profile.id,
                name: profile.name,
                avatarUrl:
                  profile.avatarUrl || profile.imageUrl || FALLBACK_PROFILE_IMAGE,
              },
            });

            return;
          }

          Alert.alert("Request sent", "They will see your connection request.");
        },
        onError: (error: any) => {
          Alert.alert(
            "Request failed",
            error?.response?.data?.message || "Unable to send request.",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.textPrimary} size="large" />
          <Text style={styles.centerStateText}>Building your explore feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isFetchingNextPage}
            onRefresh={refreshExplore}
            tintColor={Colors.textPrimary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Explore</Text>
            <Text style={styles.title}>Find people who match your vibe</Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={refreshExplore}
            activeOpacity={0.82}
          >
            {isFetching ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Ionicons name="refresh" size={21} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/(screens)/search")}
          activeOpacity={0.86}
        >
          <View style={styles.searchIconBox}>
            <Ionicons name="search" size={18} color={Colors.black} />
          </View>

          <View style={styles.searchBody}>
            <Text style={styles.searchLabel}>Search people</Text>
            <Text style={styles.searchText}>
              Names, interests, cities, and vibes...
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        <FlatList
          data={EXPLORE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = selectedFilter === item.label;

            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleFilterPress(item.label)}
                activeOpacity={0.84}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={active ? Colors.black : Colors.textSecondary}
                />
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <DailyPromptBanner
          peopleCount={profiles.length}
          onlineCount={onlineCount}
          strongMatchCount={strongMatchCount}
        />

        <DiscoverSectionHeader
          title="Today's curated picks"
          subtitle={`Only ${DAILY_CURATED_MATCH_LIMIT} intentional matches, ranked by compatibility and activity`}
          action={`Next ${nextDropLabel}`}
        />

        <View style={styles.curatedSummary}>
          <View style={styles.curatedSummaryItem}>
            <Ionicons name="albums-outline" size={15} color={Colors.textPrimary} />
            <Text style={styles.curatedSummaryText}>
              {dailyCuratedMatches.length}/{DAILY_CURATED_MATCH_LIMIT} picks left
            </Text>
          </View>
          <View style={styles.curatedSummaryItem}>
            <Ionicons name="bookmark-outline" size={15} color={Colors.textPrimary} />
            <Text style={styles.curatedSummaryText}>{savedProfileIds.size} saved</Text>
          </View>
        </View>

        {dailyCuratedMatches.length > 0 ? (
          <FlatList
            data={dailyCuratedMatches}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.profile.id}
            contentContainerStyle={styles.curatedList}
            renderItem={({ item, index }) => (
              <CuratedMatchCard
                profile={item.profile}
                reasons={item.reasons}
                position={index + 1}
                total={dailyCuratedMatches.length}
                disabled={sendMatchRequest.isPending}
                saved={savedProfileIds.has(item.profile.id)}
                onPress={() => openProfile(item.profile.id)}
                onConnect={() =>
                  sendRequest(
                    item.profile,
                    `Hi ${item.profile.name}, you showed up in my curated picks.`,
                  )
                }
                onPass={() => skipProfile(item.profile.id)}
                onSave={() => toggleSavedProfile(item.profile.id)}
              />
            )}
          />
        ) : (
          <EmptyMiniState
            icon="sparkles-outline"
            title="Today's picks are done"
            text="Check back at the next drop for a fresh curated set."
          />
        )}

        <DiscoverSectionHeader
          title="Suggested people"
          subtitle="Browse more people after your daily picks"
          action="See all"
        />

        {suggestedPeople.length > 0 ? (
          <FlatList
            data={suggestedPeople}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.suggestedList}
            renderItem={({ item }) => (
              <SuggestedPersonCard
                profile={item}
                disabled={sendMatchRequest.isPending}
                onPress={() => openProfile(item.id)}
                onConnect={() => sendRequest(item)}
              />
            )}
          />
        ) : (
          <EmptyMiniState
            icon="people-outline"
            title="No suggestions yet"
            text="Complete your profile to get better people suggestions."
          />
        )}

        <DiscoverSectionHeader
          title="Nearby moments"
          subtitle="Active people around you, ready for a real conversation"
          action="Refresh"
        />

        <View style={styles.nearbyList}>
          {nearbyPeople.length > 0 ? (
            nearbyPeople.map((profile) => (
              <NearbyMomentCard
                key={profile.id}
                profile={profile}
                disabled={sendMatchRequest.isPending}
                onPress={() => openProfile(profile.id)}
                onConnect={() =>
                  sendRequest(profile, "Hi, I saw you in nearby moments.")
                }
              />
            ))
          ) : (
            <EmptyMiniState
              icon="location-outline"
              title="No nearby moments"
              text="New moments will appear here when people are active nearby."
            />
          )}
        </View>

        <DiscoverSectionHeader
          title="Trending posts"
          subtitle="Conversation starters people are reacting to right now"
          action="View all"
        />

        <View style={styles.trendingGrid}>
          {trendingColumns.map((column, columnIndex) => (
            <View key={`trending-column-${columnIndex}`} style={styles.trendingColumn}>
              {column.map((post) => (
                <TrendingPostCard key={post.id} post={post} />
              ))}
            </View>
          ))}
        </View>

        {isFetchingNextPage ? (
          <View style={styles.loadMore}>
            <ActivityIndicator color={Colors.textPrimary} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  centerStateText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginTop: 14,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
    paddingTop: 10,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    lineHeight: 35,
    maxWidth: width - 110,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: DISCOVER_SCREEN_PADDING,
    marginTop: 22,
    minHeight: 68,
    paddingHorizontal: 14,
  },
  searchIconBox: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  searchBody: {
    flex: 1,
    marginLeft: 12,
  },
  searchLabel: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  searchText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  filterList: {
    gap: 10,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
    paddingTop: 18,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    height: 42,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  filterText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginLeft: 7,
  },
  filterTextActive: {
    color: Colors.black,
  },
  curatedSummary: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
  },
  curatedSummaryItem: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  curatedSummaryText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    marginLeft: 7,
  },
  curatedList: {
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
    paddingTop: 14,
  },
  suggestedList: {
    gap: 14,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
    paddingTop: 14,
  },
  nearbyList: {
    gap: 12,
    marginTop: 14,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
  },
  trendingGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
  },
  trendingColumn: {
    flex: 1,
    gap: 12,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: 22,
  },
});

