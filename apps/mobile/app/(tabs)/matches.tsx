import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  AccessibilityInfo,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import { RangeSlider } from "@/components/common/RangeSlider";
import {
  useMatchRecommendationsQuery,
  useIncomingMatchRequestsQuery,
  useRespondMatchRequestMutation,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type {
  MatchRecommendation,
  MatchRecommendationFilters,
  MatchRequest,
} from "@/types/match.types";
import { showToast } from "@/utils/toast";

const bottomActionHeight = 100;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 90;
const INTEREST_OPTIONS = [
  "Music",
  "Travel",
  "Fitness",
  "Gaming",
  "Food",
  "Movies",
  "Books",
  "Coding",
  "Fashion",
  "Nature",
  "Photography",
  "Coffee",
];
const GENDER_OPTIONS: {
  label: string;
  value: NonNullable<MatchRecommendationFilters["gender"]>;
}[] = [
    { label: "Any", value: "ANY" },
    { label: "Men", value: "MALE" },
    { label: "Women", value: "FEMALE" },
    { label: "Non-binary", value: "NON_BINARY" },
    { label: "Other", value: "OTHER" },
  ];

const defaultFilters: MatchRecommendationFilters = {
  minAge: 18,
  maxAge: 50,
  maxDistance: 50,
  gender: "ANY",
  useMyPreference: true,
  interests: [],
  verifiedOnly: false,
  onlineOnly: false,
};

const EMPTY_RECOMMENDATIONS: MatchRecommendation[] = [];

type PendingAction = "pass" | "chat" | "like" | "boost" | null;

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<{
    name: string;
    chatId: string;
    profile: MatchRecommendation;
  } | null>(null);
  const [filters, setFilters] =
    useState<MatchRecommendationFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] =
    useState<MatchRecommendationFilters>(defaultFilters);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [pendingRequestAction, setPendingRequestAction] = useState<{
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const pan = useMemo(() => new Animated.ValueXY(), []);
  const viewedProfileIds = useRef(new Set<string>()).current;
  const committedInteractionProfileIds = useRef(new Set<string>()).current;
  const discoveredProfilesByFilter = useRef(
    new Map<string, MatchRecommendation[]>(),
  ).current;
  const swipeEnabledRef = useRef(true);

  // Derived interpolations for swipe tilt + overlays based on vertical swipe (pan.y)
  const cardRotation = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });
  // Down swipe is LIKE (positive y)
  const likeOpacity = pan.y.interpolate({
    inputRange: [10, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  // Up swipe is PASS (negative y)
  const passOpacity = pan.y.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -10],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        swipeEnabledRef.current &&
        Math.abs(dy) > 8 &&
        Math.abs(dy) > Math.abs(dx),
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        swipeEnabledRef.current &&
        Math.abs(dy) > 8 &&
        Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, { dy }) => {
        if (dy > SWIPE_THRESHOLD) {
          // Down is LIKE (Y goes positive)
          Animated.timing(pan, {
            toValue: { x: 0, y: SCREEN_HEIGHT * 1.5 },
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            handleLikeRef.current();
          });
        } else if (dy < -SWIPE_THRESHOLD) {
          // Up is PASS (Y goes negative)
          Animated.timing(pan, {
            toValue: { x: 0, y: -SCREEN_HEIGHT * 1.5 },
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            handleSkipRef.current();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 7,
            tension: 70,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 7,
          tension: 70,
        }).start();
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Stable refs so panResponder closure always has latest handlers
  const handleLikeRef = useRef(() => { });
  const handleSkipRef = useRef(() => { });

  const {
    data: fetchedProfiles,
    isLoading,
    isError: isRecommendationsError,
    refetch: refetchRecommendations,
    isRefetching,
  } = useMatchRecommendationsQuery(filters);
  const { data: incomingRequests = [] } = useIncomingMatchRequestsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();
  const respondMatchRequest = useRespondMatchRequestMutation();

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [deck, setDeck] = useState<{
    filterKey: string;
    profiles: MatchRecommendation[];
  }>(() => ({ filterKey, profiles: [] }));
  const [completedSingleDeckKey, setCompletedSingleDeckKey] = useState<string | null>(null);
  const profiles = deck.filterKey === filterKey ? deck.profiles : EMPTY_RECOMMENDATIONS;
  const isSingleProfileComplete =
    completedSingleDeckKey === filterKey;

  React.useEffect(() => {
    const recommendations = fetchedProfiles ?? EMPTY_RECOMMENDATIONS;

    if (recommendations.length > 0) {
      const discovered = [
        ...(discoveredProfilesByFilter.get(filterKey) ?? EMPTY_RECOMMENDATIONS),
      ];

      recommendations.forEach((recommendation) => {
        const index = discovered.findIndex(
          (item) => item.id === recommendation.id,
        );
        if (index === -1) discovered.push(recommendation);
        else discovered[index] = recommendation;
      });

      discoveredProfilesByFilter.set(filterKey, discovered);
    }

    setDeck((current) => {
      const existing = current.filterKey === filterKey ? current.profiles : [];
      if (recommendations.length === 0) {
        return current.filterKey === filterKey
          ? current
          : { filterKey, profiles: [] };
      }

      const merged = existing.filter(
        (recommendation) =>
          !viewedProfileIds.has(recommendation.id) &&
          !committedInteractionProfileIds.has(recommendation.id),
      );
      recommendations
        .filter(
          (recommendation) =>
            !viewedProfileIds.has(recommendation.id) &&
            !committedInteractionProfileIds.has(recommendation.id),
        )
        .forEach((recommendation) => {
          const index = merged.findIndex((item) => item.id === recommendation.id);
          if (index === -1) merged.push(recommendation);
          else merged[index] = recommendation;
        });

      return { filterKey, profiles: merged };
    });
  }, [
    committedInteractionProfileIds,
    discoveredProfilesByFilter,
    fetchedProfiles,
    filterKey,
    viewedProfileIds,
  ]);

  const profile = isSingleProfileComplete
    ? undefined
    : (profiles[activeIndex] as MatchRecommendation | undefined);
  const isDeckActionPending = pendingAction !== null;
  swipeEnabledRef.current = Boolean(
    profile &&
    !isDeckActionPending &&
    !matchBanner &&
    !isFilterModalVisible &&
    !isRequestsModalVisible,
  );

  const filterCount = getActiveFilterCount(filters);
  const availableInterests = useMemo(
    () =>
      Array.from(
        new Set([
          ...INTEREST_OPTIONS,
          ...(filters.interests ?? []),
          ...profiles.flatMap((item) => item.interests ?? []),
        ]),
      ),
    [filters.interests, profiles],
  );

  React.useEffect(() => {
    if (profiles.length > 0 && activeIndex >= profiles.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, profiles.length]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filters]);

  React.useEffect(() => {
    setActivePhotoIndex(0);
  }, [profile?.id]);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);
  // Pulse animation for match banner
  React.useEffect(() => {
    if (!matchBanner || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.18, duration: 480, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 0.92, duration: 360, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1.0, duration: 280, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [matchBanner, heartScale, reduceMotion]);

  const removeProfileFromDeck = (profileId: string) => {
    viewedProfileIds.add(profileId);
    pan.setValue({ x: 0, y: 0 });
    setDeck((current) => ({
      ...current,
      profiles: current.profiles.filter((item) => item.id !== profileId),
    }));
    setActiveIndex(0);
  };

  const restoreCurrentCard = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 7,
      tension: 70,
    }).start();
  };


  const moveToNextCard = (profileId: string) => {
    if (profiles.length === 0) return;
    if (profiles.length === 1) setCompletedSingleDeckKey(filterKey);
    viewedProfileIds.add(profileId);
    Animated.timing(fade, {
      toValue: 0,
      duration: reduceMotion ? 0 : 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      removeProfileFromDeck(profileId);
      Animated.timing(fade, {
        toValue: 1,
        duration: reduceMotion ? 0 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  // Swipe hint nudge: subtle up/down nudge on first load
  React.useEffect(() => {
    if (!profile || reduceMotion) return;
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(pan.y, { toValue: -30, duration: 250, useNativeDriver: false }),
        Animated.timing(pan.y, { toValue: 30, duration: 350, useNativeDriver: false }),
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }),
      ]).start();
    }, 1200);
    return () => clearTimeout(timer);
  }, [profile, reduceMotion, pan]);

  const handleLike = () => {
    if (!profile || isDeckActionPending) return;
    setPendingAction("like");
    if (profile.alreadyLikedMe) {
      sendMatchRequest.mutate(
        { receiverId: profile.id },
        {
          onSuccess: (response: any) => {
            const chatId = response?.data?.chat?.id;
            if (!chatId) {
              committedInteractionProfileIds.add(profile.id);
              showToast("Match created, but chat is not ready yet.", "Chat not ready");
              moveToNextCard(profile.id);
              return;
            }
            committedInteractionProfileIds.add(profile.id);
            setMatchBanner({ name: `${profile.name} ${profile.lastName}`, chatId, profile });
          },
          onError: restoreCurrentCard,
          onSettled: () => setPendingAction(null),
        },
      );
      return;
    }
    sendMatchRequest.mutate(
      { receiverId: profile.id },
      {
        onSuccess: () => {
          committedInteractionProfileIds.add(profile.id);
          moveToNextCard(profile.id);
        },
        onError: restoreCurrentCard,
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handleChatRequest = () => {
    if (!profile || isDeckActionPending) return;
    setPendingAction("chat");
    sendMatchRequest.mutate(
      { receiverId: profile.id, message: "Hi, I would like to chat with you." },
      {
        onSuccess: (response: any) => {
          const chatId = response?.data?.chat?.id;
          if (chatId) {
            committedInteractionProfileIds.add(profile.id);
            removeProfileFromDeck(profile.id);
            openChat(profile, chatId);
            return;
          }
          committedInteractionProfileIds.add(profile.id);
          showToast("They need to accept your request before chat opens.", "Request sent");
          moveToNextCard(profile.id);
        },
        onError: restoreCurrentCard,
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handleMatchRequest = () => {
    if (!profile || isDeckActionPending) return;
    setPendingAction("boost");
    sendMatchRequest.mutate(
      { receiverId: profile.id, message: "I would like to connect with you." },
      {
        onSuccess: () => {
          committedInteractionProfileIds.add(profile.id);
          moveToNextCard(profile.id);
        },
        onError: restoreCurrentCard,
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handleSkip = () => {
    if (!profile || isDeckActionPending) return;
    setPendingAction("pass");
    moveToNextCard(profile.id);
    setTimeout(() => setPendingAction(null), reduceMotion ? 0 : 420);
  };

  // Keep stable refs in sync so panResponder closure always calls latest handlers
  handleLikeRef.current = handleLike;
  handleSkipRef.current = handleSkip;

  const openProfileDetail = () => {
    if (!profile) return;
    router.push({ pathname: "/(screens)/user/[userId]", params: { userId: profile.id } });
  };

  const openChat = (selectedProfile: MatchRecommendation, chatId: string) => {
    router.push({
      pathname: "/(screens)/chat/[roomId]",
      params: {
        roomId: chatId,
        userId: selectedProfile.id,
        name: `${selectedProfile.name} ${selectedProfile.lastName}`,
        avatarUrl: selectedProfile.imageUrl || selectedProfile.avatarUrl || "",
      },
    });
  };

  const respondToIncomingRequest = (request: MatchRequest, status: "ACCEPTED" | "REJECTED") => {
    if (pendingRequestAction) return;
    setPendingRequestAction({ requestId: request.id, status });
    respondMatchRequest.mutate(
      { requestId: request.id, status },
      {
        onSuccess: (response: any) => {
          setIsRequestsModalVisible(false);
          const chatId = response?.data?.chat?.id;
          if (status === "ACCEPTED" && chatId) {
            const sender = request.sender;
            router.push({
              pathname: "/(screens)/chat/[roomId]",
              params: {
                roomId: chatId,
                userId: request.senderId,
                name: sender?.profile?.username || sender?.username || sender?.email || "Match",
                avatarUrl: sender?.profile?.avatarUrl || "",
              },
            });
          }
        },
        onError: (error: any) => {
          showToast(error?.response?.data?.message || "Unable to update request.", "Request failed");
        },
        onSettled: () => setPendingRequestAction(null),
      },
    );
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters, interests: draftFilters.interests ?? [] });
    setIsFilterModalVisible(false);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    setIsFilterModalVisible(false);
  };

  const refreshDiscovery = async () => {
    const profilesToRestore =
      discoveredProfilesByFilter.get(filterKey) ??
      fetchedProfiles ??
      EMPTY_RECOMMENDATIONS;
    const restoredProfiles = mergeRecommendations(profilesToRestore).filter(
      (recommendation) => !committedInteractionProfileIds.has(recommendation.id),
    );

    setCompletedSingleDeckKey(null);
    viewedProfileIds.clear();
    setActiveIndex(0);
    setActivePhotoIndex(0);
    pan.setValue({ x: 0, y: 0 });
    fade.setValue(1);
    setDeck({
      filterKey,
      profiles: restoredProfiles,
    });

    const result = await refetchRecommendations();
    if (result.data?.length) {
      const refreshedProfiles = mergeRecommendations([
        ...restoredProfiles,
        ...result.data,
      ]).filter(
        (recommendation) => !committedInteractionProfileIds.has(recommendation.id),
      );
      discoveredProfilesByFilter.set(filterKey, refreshedProfiles);
      setDeck({
        filterKey,
        profiles: refreshedProfiles,
      });
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <View style={styles.loadingCard}>
          <LinearGradient
            colors={[Colors.bgCard, Colors.bgElevated]}
            style={styles.loadingGradient}
          >
            <View style={styles.loadingIconWrap}>
              <Ionicons name="heart-circle-outline" size={52} color={Colors.primaryLight} />
            </View>
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
            <Text style={styles.loadingTitle}>Finding your people</Text>
            <Text style={styles.loadingSubtitle}>Matching you with real profiles nearby...</Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (isRecommendationsError) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.primaryLight} />
        <Text style={styles.emptyTitle}>Could not load matches</Text>
        <Text style={styles.emptySubtitle}>Check your connection and try again.</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => refetchRecommendations()}
          disabled={isRefetching}
          accessibilityRole="button"
          accessibilityLabel="Retry loading matches"
        >
          {isRefetching ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.emptyButtonText}>Try again</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
  // ── Empty state ────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.screen, { flex: 1 }]} edges={["top", "left", "right"]}>
          {/* Header */}
          <View style={styles.emptyHeader}>
            <TouchableOpacity
              style={styles.overlayIconButton}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overlayIconButton}
              onPress={openFilters}
              activeOpacity={0.82}
            >
              <Ionicons name="options-outline" size={20} color={Colors.textPrimary} />
              {filterCount ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Empty card */}
          <View style={styles.emptyBody}>
            <LinearGradient
              colors={[Colors.bg, Colors.bgCard, Colors.bg]}
              style={styles.emptyDiscoveryWrap}
            >
              <View style={styles.emptyOrbit}>
                <View style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarOne]}>
                  <Ionicons name="person" size={22} color={Colors.textSecondary} />
                </View>

                <View style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarTwo]}>
                  <Ionicons name="heart" size={20} color={Colors.primaryLight} />
                </View>

                <View style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarThree]}>
                  <Ionicons name="sparkles" size={20} color={Colors.warning} />
                </View>

                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={styles.emptyCenterBubble}
                >
                  <Ionicons
                    name={
                      isSingleProfileComplete
                        ? "checkmark-done"
                        : filterCount
                          ? "options"
                          : "person-add"
                    }
                    size={34}
                    color="#fff"
                  />
                </LinearGradient>
              </View>

              <Text style={styles.emptyKicker}>
                {isSingleProfileComplete
                  ? "Fresh faces loading soon"
                  : filterCount
                    ? `${filterCount} filter${filterCount > 1 ? "s" : ""} active`
                    : "Discovery is getting ready"}
              </Text>

              <Text style={styles.emptyTitle}>
                {isSingleProfileComplete
                  ? "You're all caught up"
                  : filterCount
                    ? "No matches with these filters"
                    : "No profiles yet"}
              </Text>

              <Text style={styles.emptySubtitle}>
                {isSingleProfileComplete
                  ? "You've seen everyone available for now. Want to give someone another look? Browse previously viewed profiles while we look for new ones."
                  : filterCount
                    ? "Your preferences may be too narrow. Try widening distance, age, or interests."
                    : "New people will appear here once more real profiles are available near you."}
              </Text>

              {filterCount ? (
                <View style={styles.emptyHintBox}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.primaryLight} />
                  <Text style={styles.emptyHintText}>
                    Tip: Start broad first, then narrow it after you get enough matches.
                  </Text>
                </View>
              ) : null}

              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={styles.emptyPrimaryButton}
                  onPress={
                    isSingleProfileComplete
                      ? refreshDiscovery
                      : filterCount
                        ? resetFilters
                        : refreshDiscovery
                  }
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSingleProfileComplete
                      ? "Browse previous match profiles again"
                      : filterCount
                        ? "Clear match filters"
                        : "Check for new profiles"
                  }
                >
                  <Ionicons
                    name={
                      isSingleProfileComplete
                        ? "play-back-outline"
                        : filterCount
                          ? "close-circle-outline"
                          : "refresh-outline"
                    }
                    size={18}
                    color={Colors.textInverse}
                  />
                  <Text style={styles.emptyPrimaryButtonText}>
                    {isSingleProfileComplete
                      ? "Browse Again"
                      : filterCount
                        ? "Clear filters"
                        : "Check again"}
                  </Text>
                </TouchableOpacity>

                {filterCount ? (
                  <TouchableOpacity
                    style={styles.emptySecondaryButton}
                    onPress={openFilters}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.emptySecondaryButtonText}>Edit filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </LinearGradient>
          </View>
        </SafeAreaView>

        <FilterModal
          visible={isFilterModalVisible}
          filters={draftFilters}
          interests={availableInterests}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={() => setIsFilterModalVisible(false)}
        />
      </View>
    );
  }

  // ── Main card ──────────────────────────────────────────────────────────────
  const profileImages = getProfileImages(profile);
  const profileImage = profileImages[activePhotoIndex] || profileImages[0];
  const profileInterests = (profile.interests ?? []).slice(0, 5);
  const profileInitial = profile.name?.charAt(0)?.toUpperCase() ?? "?";

  // Photo tap navigation: left 38% → prev, right 38% → next, center → profile detail
  const handlePhotoTap = (x: number, screenW: number) => {
    const leftZone = screenW * 0.35;
    const rightZone = screenW * 0.65;
    if (x < leftZone) {
      setActivePhotoIndex((i) => Math.max(0, i - 1));
    } else if (x > rightZone) {
      setActivePhotoIndex((i) => Math.min(profileImages.length - 1, i + 1));
    } else {
      openProfileDetail();
    }
  };

  return (
    <View style={styles.screen} {...panResponder.panHandlers}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Full-screen photo or gradient fallback */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: fade },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate: cardRotation },
              ],
            },
          ]}
        >
          {profileImage ? (
            <Image
              key={`${profile.id}-${activePhotoIndex}`}
              source={{ uri: profileImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <ProfileImageFallback initial={profileInitial} />
          )}

          {/* Transparent tap zones over photo */}
          <TouchableOpacity
            style={styles.photoTapZone}
            activeOpacity={1}
            onPress={(e) => handlePhotoTap(e.nativeEvent.locationX, SCREEN_WIDTH)}
            accessibilityRole="button"
            accessibilityLabel="Profile photo. Tap left or right to change photo, or center to open profile."
          />

          {/* LIKE indicator */}
          <Animated.View
            style={[styles.swipeOverlay, styles.swipeOverlayLike, { opacity: likeOpacity }]}
            pointerEvents="none"
          >
            <View style={styles.swipeLabel}>
              <Ionicons name="heart" size={22} color={Colors.success} />
              <Text style={[styles.swipeLabelText, { color: Colors.success }]}>LIKE</Text>
            </View>
          </Animated.View>

          {/* PASS indicator */}
          <Animated.View
            style={[styles.swipeOverlay, styles.swipeOverlayPass, { opacity: passOpacity }]}
            pointerEvents="none"
          >
            <View style={styles.swipeLabel}>
              <Ionicons name="close" size={22} color={Colors.error} />
              <Text style={[styles.swipeLabelText, { color: Colors.error }]}>PASS</Text>
            </View>
          </Animated.View>

          {/* Top vignette */}
          <LinearGradient
            colors={["rgba(0,0,0,0.52)", "rgba(0,0,0,0.10)", "transparent"]}
            locations={[0, 0.28, 0.56]}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* Bottom content gradient — warm sepia tint */}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(18,14,10,0.42)",
              "rgba(18,14,10,0.82)",
              "rgba(18,14,10,0.97)",
            ]}
            locations={[0.1, 0.46, 0.74, 1]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          <SafeAreaView style={styles.controlsLayer} edges={["top", "left", "right"]} pointerEvents="box-none">
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.glassIconBtn}
                  onPress={() => router.back()}
                  activeOpacity={0.82}
                >
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.headerRight}>
                {/* Profile count pill */}
                <View style={styles.countPill}>
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.countPillText}>{profiles.length}</Text>
                </View>

                {/* Photo thumbnails in header */}
                {profileImages.length > 1 && (
                  <View style={styles.thumbRow}>
                    {profileImages.map((imgUrl, idx) => (
                      <TouchableOpacity
                        key={`thumb-${idx}`}
                        onPress={() => setActivePhotoIndex(idx)}
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityLabel={`Show profile photo ${idx + 1} of ${profileImages.length}`}
                        accessibilityState={{ selected: idx === activePhotoIndex }}
                        style={[styles.thumb, idx === activePhotoIndex && styles.thumbActive]}
                      >
                        <Image source={{ uri: imgUrl }} style={styles.thumbImage} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Filter button */}
                <TouchableOpacity
                  style={styles.glassIconBtn}
                  onPress={openFilters}
                  activeOpacity={0.82}
                >
                  <Ionicons name="options-outline" size={20} color="#fff" />
                  {filterCount ? (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{filterCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Incoming requests ── */}
            {incomingRequests.length ? (
              <View style={styles.requestPanel}>
                <View style={styles.requestPanelHeader}>
                  <View style={styles.requestPanelTitleRow}>
                    <Ionicons name="mail-unread-outline" size={16} color="#fff" />
                    <Text style={styles.requestPanelTitle}>Waiting for you</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsRequestsModalVisible(true)}
                    activeOpacity={0.84}
                  >
                    <View style={styles.requestPanelBadge}>
                      <Text style={styles.requestPanelBadgeText}>
                        {incomingRequests.length > 2
                          ? `+${incomingRequests.length - 2} more`
                          : `${incomingRequests.length} waiting`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {incomingRequests.slice(0, 2).map((request) => (
                  <IncomingRequestRow
                    key={request.id}
                    request={request}
                    disabled={Boolean(pendingRequestAction)}
                    pendingStatus={
                      pendingRequestAction?.requestId === request.id
                        ? pendingRequestAction.status
                        : null
                    }
                    onAccept={() => respondToIncomingRequest(request, "ACCEPTED")}
                    onReject={() => respondToIncomingRequest(request, "REJECTED")}
                  />
                ))}
              </View>
            ) : null}

            {/* ── Bottom content area ── */}
            <View
              style={[
                styles.bottomContent,
                { paddingBottom: Math.max(insets.bottom + bottomActionHeight + 20, 130) },
              ]}
            >
              <Animated.View style={{ opacity: fade, width: "100%" }}>

                {/* Status + score */}
                <View style={styles.pillRow}>
                  <StatusPill online={profile.online} />
                  <ScorePill score={profile.matchScore} />
                </View>

                {/* Name row */}
                <View style={styles.nameRow}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.nameText, { fontFamily: FontFamily.darleston }]}
                  >
                    {profile.name}
                  </Text>
                  <View style={styles.agePill}>
                    <Text style={styles.agePillText}>{profile.age}</Text>
                    {profile.verified ? (
                      <View style={styles.verifiedDot}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Location row */}
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={13} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {profile.city}
                  </Text>
                  {profile.distance ? (
                    <>
                      <View style={styles.locationDot} />
                      <Ionicons name="navigate" size={13} color="rgba(255,255,255,0.65)" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {profile.distance}
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* Interests */}
                {profileInterests.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.interestsScroll}
                    contentContainerStyle={styles.interestsContent}
                  >
                    {profileInterests.map((interest, idx) => (
                      <View key={`${interest}-${idx}`} style={styles.interestChip}>
                        <Text style={styles.interestChipText}>{interest}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* View profile CTA */}
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={openProfileDetail}
                  activeOpacity={0.84}
                >
                  <Text style={styles.viewProfileText}>Full Profile</Text>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ── Action bar ── */}
            <View
              style={[
                styles.actionBar,
                { bottom: Math.max(insets.bottom + 14, 26) },
              ]}
            >
              {/* Pass */}
              <ActionButton
                accessibilityLabel="Pass on this profile"
                icon="close"
                iconColor="rgba(255,255,255,0.82)"
                bgStyle={styles.actionCircleMuted}
                onPress={handleSkip}
                disabled={isDeckActionPending}
                loading={pendingAction === "pass"}
              />

              {/* Chat */}
              <ActionButton
                accessibilityLabel="Send chat request"
                icon="chatbubble-ellipses"
                iconColor={Colors.primaryLight}
                bgStyle={styles.actionCircleChat}
                badge={profile.chatRequests}
                onPress={handleChatRequest}
                disabled={isDeckActionPending}
                loading={pendingAction === "chat"}
              />

              {/* Like — large heart */}
              <HeartAction
                onPress={handleLike}
                disabled={isDeckActionPending}
                loading={pendingAction === "like"}
              />

              {/* Boost */}
              <ActionButton
                accessibilityLabel="Send priority match request"
                icon="flash"
                iconColor={Colors.warning}
                bgStyle={styles.actionCircleBoost}
                onPress={handleMatchRequest}
                disabled={isDeckActionPending}
                loading={pendingAction === "boost"}
              />

              {/* Profile detail shortcut */}
              <ActionButton
                accessibilityLabel="Open full profile"
                icon="person"
                iconColor="rgba(255,255,255,0.82)"
                bgStyle={styles.actionCircleMuted}
                onPress={openProfileDetail}
                disabled={false}
                loading={false}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>

      {/* ── Modals ── */}
      <FilterModal
        visible={isFilterModalVisible}
        filters={draftFilters}
        interests={availableInterests}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        onClose={() => setIsFilterModalVisible(false)}
      />

      <RequestsModal
        visible={isRequestsModalVisible}
        requests={incomingRequests}
        pendingAction={pendingRequestAction}
        onAccept={(request) => respondToIncomingRequest(request, "ACCEPTED")}
        onReject={(request) => respondToIncomingRequest(request, "REJECTED")}
        onClose={() => setIsRequestsModalVisible(false)}
      />

      {/* ── Match banner overlay ── */}
      {matchBanner ? (
        <View style={styles.matchOverlay}>
          <LinearGradient
            colors={["rgba(18,14,10,0.96)", "rgba(28,20,14,0.98)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.matchContent}>
            <Animated.View style={[styles.matchHeartWrap, { transform: [{ scale: heartScale }] }]}>
              <LinearGradient
                colors={[Colors.bgCard, Colors.bgElevated]}
                style={styles.matchHeartGradient}
              >
                <Ionicons name="heart" size={52} color={Colors.primary} />
              </LinearGradient>
            </Animated.View>

            <Text style={[styles.matchTitle, { fontFamily: FontFamily.darleston }]}>
              {"It's a Match!"}
            </Text>
            <Text style={styles.matchSubtitle}>
              {matchBanner.name} already liked you.{"\n"}Your chat is ready to open.
            </Text>

            <View style={styles.matchButtons}>
              <TouchableOpacity
                style={styles.matchOpenChat}
                onPress={() => {
                  const matched = matchBanner;
                  setMatchBanner(null);
                  removeProfileFromDeck(matched.profile.id);
                  openChat(matched.profile, matched.chatId);
                }}
                activeOpacity={0.86}
              >
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.matchOpenChatText}>Open Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.matchKeepGoing}
                onPress={() => {
                  const matchedProfileId = matchBanner.profile.id;
                  setMatchBanner(null);
                  moveToNextCard(matchedProfileId);
                }}
                activeOpacity={0.86}
              >
                <Text style={styles.matchKeepGoingText}>Keep Matching</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const StatusPill = ({ online }: { online: boolean }) => (
  <View style={styles.statusPill}>
    <View
      style={[
        styles.statusDot,
        { backgroundColor: online ? Colors.success : "rgba(255,255,255,0.4)" },
      ]}
    />
    <Text style={styles.statusPillText}>{online ? "Online now" : "Away"}</Text>
  </View>
);

const ScorePill = ({ score }: { score: number }) => (
  <View style={styles.scorePill}>
    <Ionicons name="sparkles" size={13} color="#fff" />
    <Text style={styles.scorePillText}>{score}% match</Text>
  </View>
);

// ─── Action buttons ───────────────────────────────────────────────────────────

const ActionButton = ({
  accessibilityLabel,
  icon,
  iconColor,
  bgStyle,
  onPress,
  badge,
  disabled,
  loading,
}: {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgStyle: object;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.actionBtnWrap, disabled && styles.disabledAction]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
  >
    <View style={[styles.actionCircle, bgStyle]}>
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <Ionicons name={icon} size={22} color={iconColor} />
      )}
      {badge ? (
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  </TouchableOpacity>
);

const HeartAction = ({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.heartBtnWrap, disabled && styles.disabledAction]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityLabel="Like this profile"
    accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
  >
    <LinearGradient
      colors={[Colors.bgCard, Colors.bgElevated]}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 0.9, y: 0.9 }}
      style={styles.heartCircle}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" />
      ) : (
        <Ionicons name="heart" size={38} color={Colors.primary} />
      )}
    </LinearGradient>
  </TouchableOpacity>
);

// ─── Incoming request row ─────────────────────────────────────────────────────

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
    <View style={styles.requestRow}>
      {/* Avatar */}
      {avatarUrl ? (
        <View style={styles.requestAvatarRing}>
          <Image source={{ uri: avatarUrl }} style={styles.requestAvatar} />
        </View>
      ) : (
        <View style={[styles.requestAvatarRing, styles.requestAvatarFallback]}>
          <Text style={styles.requestAvatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>{name}</Text>
        <Text style={styles.requestMessage} numberOfLines={1}>
          {request.message || "Wants to connect with you"}
        </Text>
      </View>

      {/* Reject */}
      <TouchableOpacity
        style={styles.requestRejectBtn}
        onPress={onReject}
        disabled={disabled}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`Reject ${name}`}
      >
        {pendingStatus === "REJECTED" ? (
          <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
        ) : (
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
        )}
      </TouchableOpacity>

      {/* Accept */}
      <TouchableOpacity
        style={styles.requestAcceptBtn}
        onPress={onAccept}
        disabled={disabled}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`Accept ${name}`}
      >
        {pendingStatus === "ACCEPTED" ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

// ─── Requests modal ───────────────────────────────────────────────────────────

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
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.requestSheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Incoming requests</Text>
            <Text style={styles.sheetSubtitle}>{requests.length} people want to connect</Text>
          </View>
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.84} accessibilityRole="button" accessibilityLabel="Close dialog">
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "72%" }}>
          {requests.map((request) => (
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

// ─── Filter modal ─────────────────────────────────────────────────────────────

const FilterModal = ({
  visible,
  filters,
  interests,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  visible: boolean;
  filters: MatchRecommendationFilters;
  interests: string[];
  onChange: (filters: MatchRecommendationFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) => {
  const selectedInterests = filters.interests ?? [];
  const updateFilters = (patch: Partial<MatchRecommendationFilters>) =>
    onChange({ ...filters, ...patch });
  const toggleInterest = (interest: string) =>
    updateFilters({
      interests: selectedInterests.includes(interest)
        ? selectedInterests.filter((item) => item !== interest)
        : [...selectedInterests, interest],
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.filterSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Text style={styles.sheetSubtitle}>Refine who you see</Text>
            </View>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.84} accessibilityRole="button" accessibilityLabel="Close dialog">
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Age */}
            <FilterSection title="Age range" icon="calendar-outline">
              <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                <RangeSlider
                  mode={'range'}
                  min={18}
                  max={50}
                  minValue={filters.minAge ?? 18}
                  maxValue={filters.maxAge ?? 50}
                  onValuesChange={(vals) =>
                    updateFilters({ minAge: vals.min, maxAge: vals.max })
                  }
                />
              </View>
            </FilterSection>

            {/* Distance */}
            <FilterSection title="Max distance" icon="navigate-outline">
              <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                <RangeSlider
                  mode={'single'}
                  min={10}
                  max={500}
                  minValue={10}
                  maxValue={filters.maxDistance ?? 50}
                  step={10}
                  minDifference={0}
                  singleThumb="max"
                  valueFormatter={(_, distance) => `Within ${distance} mi`}
                  onValuesChange={({ max: distance }) =>
                    updateFilters({ maxDistance: distance })
                  }
                />
              </View>
            </FilterSection>

            {/* Gender */}
            <FilterSection title="Show me" icon="people-outline">
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={filters.gender === option.value}
                    onPress={() => updateFilters({ gender: option.value })}
                  />
                ))}
              </View>
            </FilterSection>

            {/* Toggles */}
            <View style={styles.togglesCard}>
              <SwitchRow
                label="Use my preference"
                icon="heart-outline"
                value={Boolean(filters.useMyPreference)}
                onValueChange={(value) => updateFilters({ useMyPreference: value })}
                last={false}
              />
              <SwitchRow
                label="Verified profiles only"
                icon="shield-checkmark-outline"
                value={Boolean(filters.verifiedOnly)}
                onValueChange={(value) => updateFilters({ verifiedOnly: value })}
                last={false}
              />
              <SwitchRow
                label="Online now only"
                icon="radio-outline"
                value={Boolean(filters.onlineOnly)}
                onValueChange={(value) => updateFilters({ onlineOnly: value })}
                last
              />
            </View>

            {/* Interests */}
            <FilterSection title="Interests" icon="sparkles-outline">
              <View style={styles.chipRow}>
                {interests.map((interest) => (
                  <FilterChip
                    key={interest}
                    label={interest}
                    selected={selectedInterests.includes(interest)}
                    onPress={() => toggleInterest(interest)}
                  />
                ))}
              </View>
            </FilterSection>
          </ScrollView>

          {/* Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.84}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.84}>
              <Text style={styles.applyBtnText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Filter sub-components ────────────────────────────────────────────────────

const FilterSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) => (
  <View style={styles.filterSection}>
    <View style={styles.filterSectionHeader}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.filterSectionTitle}>{title.toUpperCase()}</Text>
    </View>
    {children}
  </View>
);

const FilterChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterChip, selected && styles.filterChipSelected]}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SwitchRow = ({
  label,
  icon,
  value,
  onValueChange,
  last,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last: boolean;
}) => (
  <View style={[styles.switchRow, !last && styles.switchRowBorder]}>
    <View style={styles.switchRowLeft}>
      <View style={styles.switchRowIcon}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      </View>
      <Text style={styles.switchRowLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
      thumbColor={value ? Colors.primary : Colors.bgCard}
    />
  </View>
);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// ─── Profile image fallback ───────────────────────────────────────────────────

const ProfileImageFallback = ({ initial, small }: { initial: string; small?: boolean }) => (
  <LinearGradient
    colors={[Colors.bgElevated, Colors.bgCard]}
    style={StyleSheet.absoluteFillObject}
  >
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          fontSize: small ? 18 : 72,
          fontWeight: "800",
          color: Colors.textSecondary,
          includeFontPadding: false,
        }}
      >
        {initial}
      </Text>
    </View>
  </LinearGradient>
);

const getProfileImages = (profile: MatchRecommendation) => {
  const images = [
    ...(profile.profilePhotoUrls ?? []),
    profile.imageUrl,
    profile.avatarUrl ?? undefined,
  ].filter((value): value is string => Boolean(value));
  return Array.from(new Set(images)).slice(0, 4);
};

const mergeRecommendations = (recommendations: MatchRecommendation[]) => {
  const merged = new Map<string, MatchRecommendation>();
  recommendations.forEach((recommendation) => {
    merged.set(recommendation.id, recommendation);
  });
  return Array.from(merged.values());
};

const getActiveFilterCount = (filters: MatchRecommendationFilters) => {
  let count = 0;
  if (filters.minAge !== defaultFilters.minAge) count += 1;
  if (filters.maxAge !== defaultFilters.maxAge) count += 1;
  if (filters.maxDistance !== defaultFilters.maxDistance) count += 1;
  if (filters.gender !== defaultFilters.gender) count += 1;
  if (filters.useMyPreference !== defaultFilters.useMyPreference) count += 1;
  if (filters.verifiedOnly) count += 1;
  if (filters.onlineOnly) count += 1;
  if (filters.interests?.length) count += 1;
  return count;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  screen: { flex: 1, backgroundColor: Colors.bg },
  centerContent: { alignItems: "center", justifyContent: "center" },

  // Gradients
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 500,
  },

  // Photo tap zone (full-photo transparent overlay for tap navigation)
  photoTapZone: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  controlsLayer: { flex: 1, zIndex: 6, elevation: 6 },
  emptyBody: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
},

emptyDiscoveryWrap: {
  width: "100%",
  alignItems: "center",
  borderRadius: 34,
  paddingHorizontal: 24,
  paddingVertical: 34,
  borderWidth: 1,
  borderColor: Colors.border,
  overflow: "hidden",
},

emptyOrbit: {
  width: 178,
  height: 148,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
},

emptyCenterBubble: {
  width: 86,
  height: 86,
  borderRadius: 30,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.16,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
},

emptyMiniAvatar: {
  position: "absolute",
  width: 54,
  height: 54,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: Colors.bgElevated,
  borderWidth: 1,
  borderColor: Colors.border,
},

emptyMiniAvatarOne: {
  top: 8,
  left: 10,
  transform: [{ rotate: "-10deg" }],
},

emptyMiniAvatarTwo: {
  top: 0,
  right: 18,
  transform: [{ rotate: "12deg" }],
},

emptyMiniAvatarThree: {
  bottom: 6,
  right: 2,
  transform: [{ rotate: "-8deg" }],
},

emptyKicker: {
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: 1,
  textTransform: "uppercase",
  color: Colors.primaryLight,
  marginBottom: 8,
},

emptyTitle: {
  fontSize: 26,
  fontWeight: "900",
  color: Colors.textPrimary,
  textAlign: "center",
  letterSpacing: -0.4,
},

emptySubtitle: {
  fontSize: 14,
  color: Colors.textSecondary,
  marginTop: 10,
  textAlign: "center",
  lineHeight: 22,
  maxWidth: 300,
},

emptyHintBox: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 8,
  marginTop: 18,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 18,
  backgroundColor: `${Colors.primaryLight}12`,
  borderWidth: 1,
  borderColor: `${Colors.primaryLight}28`,
},

emptyHintText: {
  flex: 1,
  fontSize: 12,
  lineHeight: 18,
  color: Colors.textSecondary,
  fontWeight: "600",
},

emptyActions: {
  width: "100%",
  marginTop: 24,
  gap: 10,
},

emptyPrimaryButton: {
  height: 52,
  borderRadius: 26,
  backgroundColor: Colors.primary,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

emptyPrimaryButtonText: {
  fontSize: 15,
  fontWeight: "900",
  color: Colors.textInverse,
},

emptySecondaryButton: {
  height: 48,
  borderRadius: 24,
  backgroundColor: Colors.bgElevated,
  borderWidth: 1,
  borderColor: Colors.border,
  alignItems: "center",
  justifyContent: "center",
},

emptySecondaryButtonText: {
  fontSize: 14,
  fontWeight: "800",
  color: Colors.textPrimary,
},
  // Swipe LIKE / PASS overlays
  swipeOverlay: {
    position: "absolute",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 2.5,
    zIndex: 5,
    alignSelf: "center",
  },
  swipeOverlayLike: {
    top: 140,
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}18`,
  },
  swipeOverlayPass: {
    top: 260,
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}18`,
  },
  swipeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swipeLabelText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    zIndex: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  glassIconBtn: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    backgroundColor: Colors.primaryLight,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },

  // Photo thumbnails
  thumbRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  thumb: {
    width: 32,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  thumbActive: { borderColor: "#fff", borderWidth: 2 },
  thumbImage: { width: "100%", height: "100%" },

  // Incoming requests panel
  requestPanel: {
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "rgba(18,14,10,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
  },
  requestPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  requestPanelTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  requestPanelTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  requestPanelBadge: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  requestPanelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },

  // Request row
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 8,
    marginBottom: 6,
  },
  requestAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    overflow: "hidden",
  },
  requestAvatar: { width: "100%", height: "100%" },
  requestAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  requestAvatarInitial: { fontSize: 16, fontWeight: "800", color: "#fff" },
  requestInfo: { flex: 1, marginLeft: 10, marginRight: 8 },
  requestName: { fontSize: 13, fontWeight: "800", color: "#fff" },
  requestMessage: {
    fontSize: 11,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  requestRejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 6,
  },
  requestAcceptBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
  },

  // Bottom content
  bottomContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    zIndex: 10,
  },

  // Deck row
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  nextAvatarsWrap: { width: 68, height: 44, position: "relative" },
  nextAvatar: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    overflow: "hidden",
  },

  // Story progress bar
  storyBarWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 12,
    alignItems: "center",
    height: 24,
  },
  storyBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  storyBarSegmentActive: {
    backgroundColor: "#fff",
  },

  // Pills
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  statusPillText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  scorePillText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  // Name row
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  nameText: {
    flex: 1,
    fontSize: 62,
    includeFontPadding: false,
    lineHeight: 70,
    color: "#fff",
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
    gap: 5,
  },
  agePillText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Location
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  locationDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 2,
  },

  // Interests
  interestsScroll: { marginBottom: 14 },
  interestsContent: { gap: 8 },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  interestChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  // View profile button
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    marginBottom: 4,
  },
  viewProfileText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Action bar
  actionBar: {
    position: "absolute",
    left: 18,
    right: 18,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: 32,
    backgroundColor: "rgba(18,14,10,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
  },
  actionBtnWrap: { alignItems: "center", justifyContent: "center", minWidth: 52 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionCircleMuted: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  actionCircleChat: {
    backgroundColor: `${Colors.primaryLight}22`,
    borderColor: `${Colors.primaryLight}44`,
  },
  actionCircleBoost: {
    backgroundColor: `${Colors.warning}1A`,
    borderColor: `${Colors.warning}44`,
  },
  actionBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    backgroundColor: Colors.primaryLight,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  actionBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  heartBtnWrap: { alignItems: "center", justifyContent: "center" },
  heartCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledAction: { opacity: 0.5 },

  // Match overlay
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  matchContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 1,
  },
  matchHeartWrap: { marginBottom: 4 },
  matchHeartGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  matchTitle: {
    fontSize: 52,
    color: "#fff",
    marginTop: 20,
    textAlign: "center",
    includeFontPadding: false,
  },
  matchSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 12,
  },
  matchButtons: { flexDirection: "row", gap: 12, marginTop: 32 },
  matchOpenChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 54,
    paddingHorizontal: 22,
    borderRadius: 27,
    backgroundColor: Colors.primary,
  },
  matchOpenChatText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  matchKeepGoing: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  matchKeepGoingText: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.88)" },

  // Loading state
  loadingCard: {
    width: 280,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingGradient: { alignItems: "center", padding: 36 },
  loadingIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: `${Colors.primaryLight}18`,
    borderWidth: 1,
    borderColor: `${Colors.primaryLight}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 18,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  // Empty state
  emptyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  overlayIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCard: { width: "100%", borderRadius: 32, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  emptyCardGradient: { alignItems: "center", padding: 36 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primaryLight}18`,
    borderWidth: 1.5,
    borderColor: `${Colors.primaryLight}44`,
    borderStyle: "dashed",
    marginBottom: 4,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: Colors.primary,
  },
  emptyButtonText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Colors.overlay,
  },
  filterSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  requestSheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 16,
    marginTop: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  sheetSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },

  // Filter sections
  filterSection: { marginBottom: 20 },
  filterSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 1.6,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    height: 38,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  filterChipTextSelected: { color: "#fff" },

  // Toggles card
  togglesCard: {
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    marginBottom: 20,
    overflow: "hidden",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  switchRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgCard,
  },
  switchRowLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },

  // Filter actions
  filterActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  resetBtn: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  resetBtnText: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  applyBtn: {
    flex: 2,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: Colors.primary,
  },
  applyBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
