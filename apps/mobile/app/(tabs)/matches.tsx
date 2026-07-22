import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  AccessibilityInfo,
  Easing,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors, getThemeColors, type ThemeColors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import { RangeSlider } from "@/components/common/RangeSlider";
import { DraggableBottomSheet } from "@/components/common/DraggableBottomSheet";
import {
  useMatchRecommendationsQuery,
  useIncomingMatchRequestsQuery,
  useCancelPendingMatchRequestMutation,
  useDismissRecommendationMutation,
  useRespondMatchRequestMutation,
  useRestoreRecommendationMutation,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type {
  MatchRecommendation,
  MatchRecommendationFilters,
  MatchRequest,
} from "@/types/match.types";
import { showToast } from "@/utils/toast";

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

const DUMMY_PROFILES: MatchRecommendation[] = [
  {
    id: "dummy-sophia",
    name: "Sophia",
    lastName: "Martinez",
    age: 24,
    city: "San Francisco, CA",
    distance: "3.2 km",
    occupation: "UX Designer",
    online: true,
    verified: true,
    quote: "Life is short, make every moment count ✨",
    imageUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    avatarUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&q=80",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    ],
    interests: ["Travel", "Photography", "Coffee", "Fitness", "Music"],
    matchScore: 87,
    chatRequests: 2,
    alreadyLikedMe: true,
  },
  {
    id: "dummy-james",
    name: "James",
    lastName: "Carter",
    age: 27,
    city: "Los Angeles, CA",
    distance: "5.7 km",
    occupation: "Software Engineer",
    online: false,
    verified: true,
    quote: "Always curious, forever learning. Let's grab coffee! ☕",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80",
    ],
    interests: ["Coding", "Coffee", "Gaming", "Music"],
    matchScore: 92,
    chatRequests: 1,
    alreadyLikedMe: false,
  },
  {
    id: "dummy-olivia",
    name: "Olivia",
    lastName: "Chen",
    age: 25,
    city: "New York, NY",
    distance: "12.4 km",
    occupation: "Product Manager",
    online: true,
    verified: false,
    quote: "Building cool things and exploring hidden food spots 🍜",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    ],
    interests: ["Food", "Travel", "Art", "Books"],
    matchScore: 78,
    chatRequests: 0,
    alreadyLikedMe: true,
  },
];

type PendingAction = "pass" | "chat" | "like" | "boost" | null;
type UndoDeckAction = {
  action: "pass" | "like";
  profile: MatchRecommendation;
  remoteAction?: "dismiss" | "pending-like";
};

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === "dark" ? "light" : "dark";
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompactScreen = screenWidth < 380 || screenHeight < 720;
  const isTabletScreen = screenWidth >= 768;
  const responsive = useMemo(() => {
    const actionBarHeight = isCompactScreen ? 78 : isTabletScreen ? 96 : 90;
    const actionCircleSize = isCompactScreen ? 44 : isTabletScreen ? 54 : 50;
    const heartSize = isCompactScreen ? 62 : isTabletScreen ? 80 : 72;
    const actionHorizontalPadding = isTabletScreen
      ? Math.max((screenWidth - 460) / 2, 24)
      : isCompactScreen
        ? 12
        : 18;
    const bottomContentPadding = Math.max(
      insets.bottom + actionBarHeight + (isCompactScreen ? 20 : 28),
      isCompactScreen ? 108 : 128,
    );

    return {
      actionBarHeight,
      actionCircleSize,
      actionHorizontalPadding,
      actionIconSize: isCompactScreen ? 20 : 22,
      bottomContentPadding,
      heartIconSize: isCompactScreen ? 32 : isTabletScreen ? 40 : 36,
      heartSize,
      nameFontSize: isCompactScreen ? 48 : isTabletScreen ? 70 : 62,
      nameLineHeight: isCompactScreen ? 54 : isTabletScreen ? 78 : 70,
      profileHorizontalPadding: isTabletScreen
        ? Math.max((screenWidth - 560) / 2, 24)
        : 20,
      viewProfileHeight: isCompactScreen ? 44 : 48,
    };
  }, [insets.bottom, isCompactScreen, isTabletScreen, screenWidth]);
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
  const [displayedProfileImage, setDisplayedProfileImage] = useState<
    string | undefined
  >();
  const [isProfileImageLoading, setIsProfileImageLoading] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoDeckAction | null>(null);
  const [pendingRequestAction, setPendingRequestAction] = useState<{
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const photoFade = useRef(new Animated.Value(1)).current;
  const undoToastProgress = useRef(new Animated.Value(0)).current;
  const pan = useMemo(() => new Animated.ValueXY(), []);
  const viewedProfileIds = useRef(new Set<string>()).current;
  const committedInteractionProfileIds = useRef(new Set<string>()).current;
  const discoveredProfilesByFilter = useRef(
    new Map<string, MatchRecommendation[]>(),
  ).current;
  const swipeEnabledRef = useRef(true);
  const pendingDismissRequests = useRef(
    new Map<string, Promise<unknown>>(),
  ).current;
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotionRef = useRef(reduceMotion);
  const displayedProfileImageRef = useRef<string | undefined>(undefined);
  const swipeThresholdHapticRef = useRef<"like" | "pass" | null>(null);
  reduceMotionRef.current = reduceMotion;

  // Derived interpolations for swipe tilt + overlays based on horizontal swipe (pan.x)
  const cardRotation = pan.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });
  // Right swipe is LIKE (positive x)
  const likeOpacity = pan.x.interpolate({
    inputRange: [10, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  // Left swipe is PASS (negative x)
  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -10],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const nextCardOpacity = pan.x.interpolate({
    inputRange: [-36, 0, 36],
    outputRange: [1, 0, 1],
    extrapolate: "clamp",
  });
  const undoToastTranslateY = undoToastProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
    extrapolate: "clamp",
  });
  const undoToastScale = undoToastProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        swipeEnabledRef.current &&
        Math.abs(dx) > 8 &&
        Math.abs(dx) > Math.abs(dy),
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        swipeEnabledRef.current &&
        Math.abs(dx) > 8 &&
        Math.abs(dx) > Math.abs(dy),
      onPanResponderGrant: () => {
        swipeThresholdHapticRef.current = null;
      },
      onPanResponderMove: (_, { dx, dy }) => {
        pan.setValue({ x: dx, y: dy });
        const direction =
          dx > SWIPE_THRESHOLD ? "like" : dx < -SWIPE_THRESHOLD ? "pass" : null;

        if (!direction) {
          swipeThresholdHapticRef.current = null;
          return;
        }

        if (
          swipeThresholdHapticRef.current !== direction &&
          !reduceMotionRef.current
        ) {
          swipeThresholdHapticRef.current = direction;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => undefined,
          );
        }
      },
      onPanResponderRelease: (_, { dx }) => {
        swipeThresholdHapticRef.current = null;
        if (dx > SWIPE_THRESHOLD) {
          // Right is LIKE (X goes positive)
          Animated.timing(pan, {
            toValue: { x: screenWidth * 1.5, y: 0 },
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            handleLikeRef.current();
          });
        } else if (dx < -SWIPE_THRESHOLD) {
          // Left is PASS (X goes negative)
          Animated.timing(pan, {
            toValue: { x: -screenWidth * 1.5, y: 0 },
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
  const handleLikeRef = useRef(() => {});
  const handleSkipRef = useRef(() => {});

  const {
    data: fetchedProfiles,
    isLoading,
    isError: isRecommendationsError,
    refetch: refetchRecommendations,
    isRefetching,
  } = useMatchRecommendationsQuery(filters);
  const { data: incomingRequests = [] } = useIncomingMatchRequestsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();
  const dismissRecommendation = useDismissRecommendationMutation();
  const restoreRecommendation = useRestoreRecommendationMutation();
  const cancelPendingMatchRequest = useCancelPendingMatchRequestMutation();
  const respondMatchRequest = useRespondMatchRequestMutation();

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [deck, setDeck] = useState<{
    filterKey: string;
    profiles: MatchRecommendation[];
  }>(() => ({ filterKey, profiles: [] }));
  const [completedSingleDeckKey, setCompletedSingleDeckKey] = useState<
    string | null
  >(null);
  const profiles =
    deck.filterKey === filterKey ? deck.profiles : EMPTY_RECOMMENDATIONS;
  const isSingleProfileComplete = completedSingleDeckKey === filterKey;

  React.useEffect(() => {
    let recommendations = fetchedProfiles ?? EMPTY_RECOMMENDATIONS;
    if (recommendations.length === 0) {
      recommendations = DUMMY_PROFILES;
    }

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
          const index = merged.findIndex(
            (item) => item.id === recommendation.id,
          );
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
        Animated.timing(heartScale, {
          toValue: 1.18,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 0.92,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.0,
          duration: 280,
          useNativeDriver: true,
        }),
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

  const restoreProfileToDeck = (profileToRestore: MatchRecommendation) => {
    viewedProfileIds.delete(profileToRestore.id);
    committedInteractionProfileIds.delete(profileToRestore.id);
    setCompletedSingleDeckKey(null);
    setActiveIndex(0);
    setActivePhotoIndex(0);
    pan.setValue({ x: 0, y: 0 });
    fade.setValue(1);
    setDeck((current) => {
      const existingProfiles =
        current.filterKey === filterKey ? current.profiles : [];
      const withoutProfile = existingProfiles.filter(
        (item) => item.id !== profileToRestore.id,
      );
      return { filterKey, profiles: [profileToRestore, ...withoutProfile] };
    });
  };

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const hideUndoAction = (action?: UndoDeckAction) => {
    Animated.timing(undoToastProgress, {
      toValue: 0,
      duration: reduceMotionRef.current ? 0 : 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      setUndoAction((current) => {
        if (!action) return null;

        return current?.profile.id === action.profile.id &&
          current.action === action.action
          ? null
          : current;
      });
    });
  };

  useEffect(() => {
    return () => {
      clearUndoTimer();
      undoToastProgress.stopAnimation();
    };
  }, [undoToastProgress]);

  const showUndoAction = (action: UndoDeckAction) => {
    clearUndoTimer();
    undoToastProgress.stopAnimation();
    undoToastProgress.setValue(0);
    setUndoAction(action);

    Animated.timing(undoToastProgress, {
      toValue: 1,
      duration: reduceMotionRef.current ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      hideUndoAction(action);
    }, 5000);
  };

  const handleUndoDeckAction = () => {
    if (!undoAction) return;

    const actionToUndo = undoAction;
    clearUndoTimer();
    setUndoAction(null);
    restoreProfileToDeck(actionToUndo.profile);

    if (actionToUndo.remoteAction === "dismiss") {
      const pendingDismiss = pendingDismissRequests.get(
        actionToUndo.profile.id,
      );
      const restoreDismissal = () => {
        restoreRecommendation.mutate(actionToUndo.profile.id, {
          onError: () =>
            showToast(
              "Profile restored here, but it may disappear after refresh.",
              "Undo partially saved",
            ),
        });
      };

      if (pendingDismiss) {
        pendingDismiss.finally(restoreDismissal);
      } else {
        restoreDismissal();
      }
    }

    if (actionToUndo.remoteAction === "pending-like") {
      cancelPendingMatchRequest.mutate(actionToUndo.profile.id, {
        onError: () =>
          showToast(
            "Profile restored here, but the request may still be pending.",
            "Undo partially saved",
          ),
      });
    }
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

  // Swipe hint nudge: subtle left/right nudge on first load
  React.useEffect(() => {
    if (!profile || reduceMotion) return;
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(pan.x, {
          toValue: -30,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(pan.x, {
          toValue: 30,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }),
      ]).start();
    }, 1200);
    return () => clearTimeout(timer);
  }, [profile, reduceMotion, pan]);

  const handleLike = () => {
    if (!profile || isDeckActionPending) return;
    setPendingAction("like");

    if (profile.id.startsWith("dummy-")) {
      committedInteractionProfileIds.add(profile.id);
      if (!profile.alreadyLikedMe) {
        showUndoAction({ action: "like", profile });
      }
      if (profile.alreadyLikedMe) {
        setMatchBanner({
          name: `${profile.name} ${profile.lastName}`,
          chatId: `dummy-chat-${profile.id}`,
          profile,
        });
      } else {
        moveToNextCard(profile.id);
      }
      setPendingAction(null);
      return;
    }

    if (profile.alreadyLikedMe) {
      sendMatchRequest.mutate(
        { receiverId: profile.id },
        {
          onSuccess: (response: any) => {
            const chatId = response?.data?.chat?.id;
            if (!chatId) {
              committedInteractionProfileIds.add(profile.id);
              showToast(
                "Match created, but chat is not ready yet.",
                "Chat not ready",
              );
              moveToNextCard(profile.id);
              return;
            }
            committedInteractionProfileIds.add(profile.id);
            setMatchBanner({
              name: `${profile.name} ${profile.lastName}`,
              chatId,
              profile,
            });
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
          showUndoAction({
            action: "like",
            profile,
            remoteAction: "pending-like",
          });
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

    if (profile.id.startsWith("dummy-")) {
      committedInteractionProfileIds.add(profile.id);
      removeProfileFromDeck(profile.id);
      openChat(profile, `dummy-chat-${profile.id}`);
      setPendingAction(null);
      return;
    }

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
          showToast(
            "They need to accept your request before chat opens.",
            "Request sent",
          );
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

    if (profile.id.startsWith("dummy-")) {
      committedInteractionProfileIds.add(profile.id);
      moveToNextCard(profile.id);
      setPendingAction(null);
      return;
    }

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
    const skippedProfile = profile;
    setPendingAction("pass");
    showUndoAction({
      action: "pass",
      profile: skippedProfile,
      remoteAction: skippedProfile.id.startsWith("dummy-")
        ? undefined
        : "dismiss",
    });
    if (!skippedProfile.id.startsWith("dummy-")) {
      const dismissRequest = dismissRecommendation
        .mutateAsync(skippedProfile.id)
        .catch(() => {
          showToast("Unable to save this pass right now.", "Pass not saved");
        })
        .finally(() => {
          pendingDismissRequests.delete(skippedProfile.id);
        });
      pendingDismissRequests.set(skippedProfile.id, dismissRequest);
    }
    moveToNextCard(skippedProfile.id);
    setTimeout(() => setPendingAction(null), reduceMotion ? 0 : 420);
  };

  // Keep stable refs in sync so panResponder closure always calls latest handlers
  handleLikeRef.current = handleLike;
  handleSkipRef.current = handleSkip;

  const openProfileDetail = () => {
    if (!profile) return;
    router.push({
      pathname: "/match-detail/[profileId]",
      params: {
        profileId: profile.id,
        initialPhotoIndex: String(activePhotoIndex),
      },
    });
  };

  const showNextProfilePhoto = () => {
    if (profileImages.length <= 1) return;
    setActivePhotoIndex((index) => (index + 1) % profileImages.length);
  };

  const showPreviousProfilePhoto = () => {
    if (profileImages.length <= 1) return;
    setActivePhotoIndex((index) =>
      index === 0 ? profileImages.length - 1 : index - 1,
    );
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

  const respondToIncomingRequest = (
    request: MatchRequest,
    status: "ACCEPTED" | "REJECTED",
  ) => {
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
                name:
                  sender?.profile?.username ||
                  sender?.username ||
                  sender?.email ||
                  "Match",
                avatarUrl: sender?.profile?.avatarUrl || "",
              },
            });
          }
        },
        onError: (error: any) => {
          showToast(
            error?.response?.data?.message || "Unable to update request.",
            "Request failed",
          );
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
      (recommendation) =>
        !committedInteractionProfileIds.has(recommendation.id),
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
        (recommendation) =>
          !committedInteractionProfileIds.has(recommendation.id),
      );
      discoveredProfilesByFilter.set(filterKey, refreshedProfiles);
      setDeck({
        filterKey,
        profiles: refreshedProfiles,
      });
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  const profileImages = profile ? getProfileImages(profile) : [];
  const profileImage = profileImages[activePhotoIndex] || profileImages[0];
  const profileInterests = (profile?.interests ?? []).slice(0, 5);
  const profileInitial = profile?.name?.charAt(0)?.toUpperCase() ?? "?";
  const nextProfile = profiles[activeIndex + 1] as
    | MatchRecommendation
    | undefined;
  const nextProfileImages = nextProfile ? getProfileImages(nextProfile) : [];
  const nextProfileImage = nextProfileImages[0];
  const nextProfileInitial = nextProfile?.name?.charAt(0)?.toUpperCase() ?? "?";
  const preloadPhotoKey = [...profileImages, ...nextProfileImages].join("|");

  React.useEffect(() => {
    if (!profileImage) {
      displayedProfileImageRef.current = undefined;
      setDisplayedProfileImage(undefined);
      setIsProfileImageLoading(false);
      photoFade.setValue(1);
      return;
    }

    if (displayedProfileImageRef.current === profileImage) return;

    let cancelled = false;
    const isFirstImage = !displayedProfileImageRef.current;

    if (isFirstImage) {
      displayedProfileImageRef.current = profileImage;
      setDisplayedProfileImage(profileImage);
      photoFade.setValue(1);
    } else {
      setIsProfileImageLoading(true);
    }

    Image.prefetch(profileImage)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;

        displayedProfileImageRef.current = profileImage;
        setDisplayedProfileImage(profileImage);
        photoFade.setValue(isFirstImage ? 1 : 0);
        Animated.timing(photoFade, {
          toValue: 1,
          duration: reduceMotion ? 0 : 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          if (!cancelled) setIsProfileImageLoading(false);
        });
      });

    return () => {
      cancelled = true;
    };
  }, [profileImage, photoFade, reduceMotion]);

  React.useEffect(() => {
    if (!preloadPhotoKey) return;
    preloadPhotoKey
      .split("|")
      .filter(Boolean)
      .forEach((uri) => {
        Image.prefetch(uri).catch(() => undefined);
      });
  }, [preloadPhotoKey]);

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <View style={styles.loadingCard}>
          <LinearGradient
            colors={[Colors.bgCard, Colors.bgElevated]}
            style={styles.loadingGradient}
          >
            <View style={styles.loadingIconWrap}>
              <Ionicons
                name="heart-circle-outline"
                size={52}
                color={Colors.primaryLight}
              />
            </View>
            <ActivityIndicator
              color={Colors.primary}
              size="large"
              style={{ marginTop: 20 }}
            />
            <Text style={styles.loadingTitle}>Finding your people</Text>
            <Text style={styles.loadingSubtitle}>
              Matching you with real profiles nearby...
            </Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (isRecommendationsError) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={Colors.primaryLight}
        />
        <Text style={styles.emptyTitle}>Could not load matches</Text>
        <Text style={styles.emptySubtitle}>
          Check your connection and try again.
        </Text>
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
        <SafeAreaView
          style={[styles.screen, { flex: 1 }]}
          edges={["top", "left", "right"]}
        >
          {/* Header */}
          <View style={styles.emptyHeader}>
            <TouchableOpacity
              style={styles.overlayIconButton}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overlayIconButton}
              onPress={openFilters}
              activeOpacity={0.82}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={Colors.textPrimary}
              />
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
                <View
                  style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarOne]}
                >
                  <Ionicons
                    name="person"
                    size={22}
                    color={Colors.textSecondary}
                  />
                </View>

                <View
                  style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarTwo]}
                >
                  <Ionicons
                    name="heart"
                    size={20}
                    color={Colors.primaryLight}
                  />
                </View>

                <View
                  style={[styles.emptyMiniAvatar, styles.emptyMiniAvatarThree]}
                >
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
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color={Colors.primaryLight}
                  />
                  <Text style={styles.emptyHintText}>
                    Tip: Start broad first, then narrow it after you get enough
                    matches.
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
                    <Text style={styles.emptySecondaryButtonText}>
                      Edit filters
                    </Text>
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
  return (
    <View style={styles.screen} {...panResponder.panHandlers}>
      <StatusBar
        style={statusBarStyle}
        translucent
        backgroundColor="transparent"
      />

      {nextProfile ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.nextCardPreview, { opacity: nextCardOpacity }]}
        >
          {nextProfileImage ? (
            <Image
              source={{ uri: nextProfileImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <ProfileImageFallback initial={nextProfileInitial} />
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0.08)", "transparent"]}
            locations={[0, 0.28, 0.56]}
            style={styles.topGradient}
          />
          <LinearGradient
            colors={[
              "transparent",
              "rgba(18,14,10,0.42)",
              "rgba(18,14,10,0.82)",
              "rgba(18,14,10,0.97)",
            ]}
            locations={[0.1, 0.46, 0.74, 1]}
            style={styles.bottomGradient}
          />

          <SafeAreaView
            style={styles.nextCardContentLayer}
            edges={["top", "left", "right"]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.bottomContent,
                {
                  paddingBottom: responsive.bottomContentPadding,
                  paddingHorizontal: responsive.profileHorizontalPadding,
                },
              ]}
            >
              <View style={styles.pillRow}>
                <StatusPill
                  online={nextProfile.online}
                  lastActiveAt={nextProfile.lastActiveAt}
                />
                <ScorePill score={nextProfile.matchScore} />
              </View>

              <View style={styles.nameRow}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.nameText,
                    {
                      fontFamily: FontFamily.darleston,
                      fontSize: responsive.nameFontSize,
                      lineHeight: responsive.nameLineHeight,
                    },
                  ]}
                >
                  {nextProfile.name}
                </Text>
                <View style={styles.agePill}>
                  <Text style={styles.agePillText}>{nextProfile.age}</Text>
                  {nextProfile.verified ? (
                    <View style={styles.verifiedDot}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={13}
                  color="rgba(255,255,255,0.65)"
                />
                <Text style={styles.locationText} numberOfLines={1}>
                  {nextProfile.city}
                </Text>
                {nextProfile.distance ? (
                  <>
                    <View style={styles.locationDot} />
                    <Ionicons
                      name="navigate"
                      size={13}
                      color="rgba(255,255,255,0.65)"
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {nextProfile.distance}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      ) : null}

      {/* Full-screen photo or gradient fallback */}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFillObject, { opacity: fade }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 24,
              overflow: "hidden",
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate: cardRotation },
              ],
            },
          ]}
        >
          {displayedProfileImage || profileImage ? (
            <Animated.Image
              source={{ uri: displayedProfileImage || profileImage }}
              style={[
                StyleSheet.absoluteFillObject,
                { borderRadius: 24, opacity: photoFade },
              ]}
              resizeMode="cover"
            />
          ) : (
            <ProfileImageFallback initial={profileInitial} />
          )}
          {isProfileImageLoading ? <PhotoImageSkeleton /> : null}

          {/* Indicator dots */}
          {profileImages.length > 1 && (
            <View
              pointerEvents="none"
              style={[
                styles.indicatorContainer,
                { top: Math.max(insets.top + 12, 16) },
              ]}
            >
              {profileImages.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    styles.indicatorDot,
                    {
                      width: idx === activePhotoIndex ? 14 : 6,
                      backgroundColor:
                        idx === activePhotoIndex
                          ? "#fff"
                          : "rgba(255,255,255,0.4)",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Transparent tap zones over photo */}
          <View style={styles.photoTapZoneContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.photoTapZoneEdge}
              activeOpacity={1}
              onPress={showPreviousProfilePhoto}
              accessibilityRole="button"
              accessibilityLabel="Previous profile photo"
            />
            <TouchableOpacity
              style={styles.photoTapZoneCenter}
              activeOpacity={1}
              onPress={showNextProfilePhoto}
              accessibilityRole="button"
              accessibilityLabel="Next profile photo"
            />
            <TouchableOpacity
              style={styles.photoTapZoneEdge}
              activeOpacity={1}
              onPress={showNextProfilePhoto}
              accessibilityRole="button"
              accessibilityLabel="Next profile photo"
            />
          </View>

          {/* LIKE indicator */}
          <Animated.View
            style={[
              styles.swipeOverlay,
              styles.swipeOverlayLike,
              { opacity: likeOpacity },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.swipeEmoji}>❤️</Text>
          </Animated.View>

          {/* PASS indicator */}
          <Animated.View
            style={[
              styles.swipeOverlay,
              styles.swipeOverlayPass,
              { opacity: passOpacity },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.swipeEmoji}>👎</Text>
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

          <SafeAreaView
            style={styles.controlsLayer}
            edges={["top", "left", "right"]}
            pointerEvents="box-none"
          >
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
                  <Ionicons
                    name="people"
                    size={14}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.countPillText}>{profiles.length}</Text>
                </View>

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
                    <Ionicons
                      name="mail-unread-outline"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.requestPanelTitle}>
                      Waiting for you
                    </Text>
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
                    onAccept={() =>
                      respondToIncomingRequest(request, "ACCEPTED")
                    }
                    onReject={() =>
                      respondToIncomingRequest(request, "REJECTED")
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* ── Bottom content area ── */}
            <View
              pointerEvents="box-none"
              style={[
                styles.bottomContent,
                {
                  paddingBottom: responsive.bottomContentPadding,
                  paddingHorizontal: responsive.profileHorizontalPadding,
                },
              ]}
            >
              <Animated.View
                pointerEvents="box-none"
                style={{ opacity: fade, width: "100%" }}
              >
                {/* Status + score */}
                <View style={styles.pillRow}>
                  <StatusPill
                    online={profile.online}
                    lastActiveAt={profile.lastActiveAt}
                  />
                  <ScorePill score={profile.matchScore} />
                </View>

                {/* Name row */}
                <View style={styles.nameRow}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.nameText,
                      {
                        fontFamily: FontFamily.darleston,
                        fontSize: responsive.nameFontSize,
                        lineHeight: responsive.nameLineHeight,
                      },
                    ]}
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
                  <Ionicons
                    name="location"
                    size={13}
                    color="rgba(255,255,255,0.65)"
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {profile.city}
                  </Text>
                  {profile.distance ? (
                    <>
                      <View style={styles.locationDot} />
                      <Ionicons
                        name="navigate"
                        size={13}
                        color="rgba(255,255,255,0.65)"
                      />
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
                      <View
                        key={`${interest}-${idx}`}
                        style={styles.interestChip}
                      >
                        <Text style={styles.interestChipText}>{interest}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* View profile CTA */}
                <TouchableOpacity
                  style={[
                    styles.viewProfileBtn,
                    {
                      backgroundColor: theme.primary,
                      height: responsive.viewProfileHeight,
                    },
                  ]}
                  onPress={openProfileDetail}
                  activeOpacity={0.84}
                >
                  <Text
                    style={[
                      styles.viewProfileText,
                      { color: theme.textInverse },
                    ]}
                  >
                    Full Profile
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={theme.textInverse}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>

      <SafeAreaView
        edges={["bottom"]}
        pointerEvents="box-none"
        style={[
          styles.fixedActionSafeArea,
          { paddingHorizontal: responsive.actionHorizontalPadding },
        ]}
      >
        {undoAction ? (
          <Animated.View
            style={[
              styles.undoBar,
              {
                opacity: undoToastProgress,
                transform: [
                  { translateY: undoToastTranslateY },
                  { scale: undoToastScale },
                ],
              },
            ]}
            pointerEvents="auto"
          >
            <View
              style={[
                styles.undoIconWrap,
                undoAction.action === "like"
                  ? styles.undoIconLike
                  : styles.undoIconPass,
              ]}
            >
              <Ionicons
                name={undoAction.action === "like" ? "heart" : "close"}
                size={16}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.undoMessageWrap}>
              <Text style={styles.undoText} numberOfLines={1}>
                {undoAction.action === "like" ? "Like sent" : "Profile passed"}
              </Text>
              <Text style={styles.undoSubtext} numberOfLines={1}>
                Bring this profile back to your deck
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleUndoDeckAction}
              activeOpacity={0.84}
              style={styles.undoButton}
              accessibilityRole="button"
              accessibilityLabel="Undo last match action"
            >
              <Ionicons name="refresh" size={13} color="#241C18" />
              <Text style={styles.undoButtonText}>Undo</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        <View
          style={[
            styles.actionBar,
            {
              height: responsive.actionBarHeight,
              borderRadius: responsive.actionBarHeight / 3,
            },
          ]}
        >
          {/* Pass */}
          <ActionButton
            accessibilityLabel="Pass on this profile"
            icon="close"
            iconColor="#FF7F93"
            bgStyle={styles.actionCirclePass}
            onPress={handleSkip}
            disabled={isDeckActionPending}
            loading={pendingAction === "pass"}
            size={responsive.actionCircleSize}
            iconSize={responsive.actionIconSize}
          />

          {/* Chat */}
          <ActionButton
            accessibilityLabel="Send chat request"
            icon="chatbubble-ellipses"
            iconColor="#70D6FF"
            bgStyle={styles.actionCircleChat}
            badge={profile.chatRequests}
            onPress={handleChatRequest}
            disabled={isDeckActionPending}
            loading={pendingAction === "chat"}
            size={responsive.actionCircleSize}
            iconSize={responsive.actionIconSize}
          />

          {/* Like - large heart */}
          <HeartAction
            onPress={handleLike}
            disabled={isDeckActionPending}
            loading={pendingAction === "like"}
            size={responsive.heartSize}
            iconSize={responsive.heartIconSize}
          />

          {/* Boost */}
          <ActionButton
            accessibilityLabel="Send priority match request"
            icon="flash"
            iconColor="#FFD166"
            bgStyle={styles.actionCircleBoost}
            onPress={handleMatchRequest}
            disabled={isDeckActionPending}
            loading={pendingAction === "boost"}
            size={responsive.actionCircleSize}
            iconSize={responsive.actionIconSize}
          />

          {/* Profile detail shortcut */}
          <ActionButton
            accessibilityLabel="Open full profile"
            icon="person"
            iconColor="#D8C8BA"
            bgStyle={styles.actionCircleProfile}
            onPress={openProfileDetail}
            disabled={false}
            loading={false}
            size={responsive.actionCircleSize}
            iconSize={responsive.actionIconSize}
          />
        </View>
      </SafeAreaView>

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
            <Animated.View
              style={[
                styles.matchHeartWrap,
                { transform: [{ scale: heartScale }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.bgCard, Colors.bgElevated]}
                style={styles.matchHeartGradient}
              >
                <Ionicons name="heart" size={52} color={Colors.primary} />
              </LinearGradient>
            </Animated.View>

            <Text
              style={[styles.matchTitle, { fontFamily: FontFamily.darleston }]}
            >
              {"It's a Match!"}
            </Text>
            <Text style={styles.matchSubtitle}>
              {matchBanner.name} already liked you.{"\n"}Your chat is ready to
              open.
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

const StatusPill = ({
  online,
  lastActiveAt,
}: {
  online: boolean;
  lastActiveAt?: string | null;
}) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const isDark = colorScheme === "dark";
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: isDark
            ? "rgba(0,0,0,0.38)"
            : "rgba(255,255,255,0.7)",
          borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: online
              ? theme.success
              : isDark
                ? "rgba(255,255,255,0.4)"
                : "rgba(0,0,0,0.3)",
          },
        ]}
      />
      <Text
        style={[styles.statusPillText, { color: theme.textPrimary }]}
        numberOfLines={1}
      >
        {formatActivityLabel(online, lastActiveAt)}
      </Text>
    </View>
  );
};
const ScorePill = ({ score }: { score: number }) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  return (
    <View style={[styles.scorePill, { backgroundColor: theme.primary }]}>
      <Ionicons name="sparkles" size={13} color={theme.textInverse} />
      <Text style={[styles.scorePillText, { color: theme.textInverse }]}>
        {score}% match
      </Text>
    </View>
  );
};

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
  size = 52,
  iconSize = 22,
}: {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgStyle: object;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
  iconSize?: number;
}) => (
  <TouchableOpacity
    style={[
      styles.actionBtnWrap,
      { minWidth: size, minHeight: size },
      disabled && styles.disabledAction,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
  >
    <View
      style={[
        styles.actionCircle,
        bgStyle,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <Ionicons name={icon} size={iconSize} color={iconColor} />
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
  size = 80,
  iconSize = 38,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
  iconSize?: number;
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
      colors={["#FF4D6D", "#E11D48", "#9F1239"]}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 0.9, y: 0.9 }}
      style={[
        styles.heartCircle,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color="#FFFFFF"
          size={size < 70 ? "small" : "large"}
        />
      ) : (
        <Ionicons name="heart" size={iconSize} color="#FFFFFF" />
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
          <Text style={styles.requestAvatarInitial}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>
          {name}
        </Text>
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

// Requests modal

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
}) => {
  const insets = useSafeAreaInsets();

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={[
        styles.requestSheet,
        { paddingBottom: Math.max(insets.bottom + 16, 32) },
      ]}
    >
      {/* Handle */}
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.sheetTitle}>Incoming requests</Text>
          <Text style={styles.sheetSubtitle}>
            {requests.length} people want to connect
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sheetCloseBtn}
          onPress={onClose}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        >
          <Ionicons name="close" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: "72%" }}
      >
        {requests.map((request) => (
          <IncomingRequestRow
            key={request.id}
            request={request}
            disabled={Boolean(pendingAction)}
            pendingStatus={
              pendingAction?.requestId === request.id
                ? pendingAction.status
                : null
            }
            onAccept={() => onAccept(request)}
            onReject={() => onReject(request)}
          />
        ))}
      </ScrollView>
    </DraggableBottomSheet>
  );
};

// Filter modal

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
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const isDark = colorScheme === "dark";
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
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={[
        styles.filterSheet,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          paddingBottom: Math.max(insets.bottom + 16, 32),
        },
      ]}
    >
      {/* Handle */}
      <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

      <View style={styles.sheetHeader}>
        <View>
          <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
            Filters
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
            Refine who you see
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.sheetCloseBtn, { backgroundColor: theme.bgElevated }]}
          onPress={onClose}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        >
          <Ionicons name="close" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Age */}
        <FilterSection title="Age range" icon="calendar-outline" theme={theme}>
          <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
            <RangeSlider
              mode={"range"}
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
        <FilterSection
          title="Max distance"
          icon="navigate-outline"
          theme={theme}
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
            <RangeSlider
              mode={"single"}
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
        <FilterSection title="Show me" icon="people-outline" theme={theme}>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.gender === option.value}
                onPress={() => updateFilters({ gender: option.value })}
                theme={theme}
              />
            ))}
          </View>
        </FilterSection>

        {/* Toggles */}
        <View
          style={[
            styles.togglesCard,
            { backgroundColor: theme.bgElevated, borderColor: theme.border },
          ]}
        >
          <SwitchRow
            label="Use my preference"
            icon="heart-outline"
            value={Boolean(filters.useMyPreference)}
            onValueChange={(value) => updateFilters({ useMyPreference: value })}
            last={false}
            theme={theme}
            isDark={isDark}
          />
          <SwitchRow
            label="Verified profiles only"
            icon="shield-checkmark-outline"
            value={Boolean(filters.verifiedOnly)}
            onValueChange={(value) => updateFilters({ verifiedOnly: value })}
            last={false}
            theme={theme}
            isDark={isDark}
          />
          <SwitchRow
            label="Online now only"
            icon="radio-outline"
            value={Boolean(filters.onlineOnly)}
            onValueChange={(value) => updateFilters({ onlineOnly: value })}
            last
            theme={theme}
            isDark={isDark}
          />
        </View>

        {/* Interests */}
        <FilterSection title="Interests" icon="sparkles-outline" theme={theme}>
          <View style={styles.chipRow}>
            {interests.map((interest) => (
              <FilterChip
                key={interest}
                label={interest}
                selected={selectedInterests.includes(interest)}
                onPress={() => toggleInterest(interest)}
                theme={theme}
              />
            ))}
          </View>
        </FilterSection>
      </ScrollView>

      {/* Actions */}
      <View style={styles.filterActions}>
        <TouchableOpacity
          style={[
            styles.resetBtn,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          onPress={onReset}
          activeOpacity={0.84}
        >
          <Text style={[styles.resetBtnText, { color: theme.textPrimary }]}>
            Reset
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: theme.primary }]}
          onPress={onApply}
          activeOpacity={0.84}
        >
          <Text style={[styles.applyBtnText, { color: theme.textInverse }]}>
            Apply filters
          </Text>
        </TouchableOpacity>
      </View>
    </DraggableBottomSheet>
  );
};

// Filter sub-components

const FilterSection = ({
  title,
  icon,
  children,
  theme,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  theme: ThemeColors;
}) => (
  <View style={styles.filterSection}>
    <View style={styles.filterSectionHeader}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text style={[styles.filterSectionTitle, { color: theme.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
    </View>
    {children}
  </View>
);

const FilterChip = ({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ThemeColors;
}) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      {
        backgroundColor: selected ? theme.primary : theme.bgElevated,
        borderColor: selected ? theme.primary : theme.border,
      },
    ]}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
  >
    <Text
      style={[
        styles.filterChipText,
        { color: selected ? theme.textInverse : theme.textPrimary },
      ]}
    >
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
  theme,
  isDark,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last: boolean;
  theme: ThemeColors;
  isDark: boolean;
}) => (
  <View
    style={[
      styles.switchRow,
      !last && styles.switchRowBorder,
      !last && { borderBottomColor: theme.border },
    ]}
  >
    <View style={styles.switchRowLeft}>
      <View style={[styles.switchRowIcon, { backgroundColor: theme.bgCard }]}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
      </View>
      <Text style={[styles.switchRowLabel, { color: theme.textPrimary }]}>
        {label}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: isDark ? "rgba(255,255,255,0.18)" : theme.border,
        true: theme.primaryLight,
      }}
      thumbColor={value ? theme.primary : theme.bgCard}
      ios_backgroundColor={isDark ? "rgba(255,255,255,0.18)" : theme.border}
    />
  </View>
);
// ─── Pure helpers ─────────────────────────────────────────────────────────────

// ─── Profile image fallback ───────────────────────────────────────────────────

const PhotoImageSkeleton = () => (
  <View style={styles.photoSkeleton} pointerEvents="none">
    <LinearGradient
      colors={[
        "rgba(255,255,255,0.06)",
        "rgba(255,255,255,0.18)",
        "rgba(255,255,255,0.06)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <ActivityIndicator color="#FFFFFF" size="small" />
  </View>
);
const ProfileImageFallback = ({
  initial,
  small,
}: {
  initial: string;
  small?: boolean;
}) => (
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

const formatActivityLabel = (online: boolean, lastActiveAt?: string | null) => {
  if (online) return "Online now";
  if (!lastActiveAt) return "Recently active";

  const timestamp = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(timestamp)) return "Recently active";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Active ${days}d ago`;

  return "Active recently";
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

  nextCardPreview: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: "hidden",
  },
  nextCardContentLayer: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 3,
  },

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

  // Photo tap zones
  photoTapZoneContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 2,
  },
  photoTapZoneEdge: {
    flex: 0.34,
    height: "100%",
  },
  photoTapZoneCenter: {
    flex: 0.32,
    height: "100%",
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
    zIndex: 5,
    alignSelf: "center",
  },
  swipeOverlayLike: {
    top: 220,
  },
  swipeOverlayPass: {
    top: 220,
  },
  swipeEmoji: {
    fontSize: 100,
    textShadowColor: "rgba(0, 0, 0, 0.32)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
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
    borderRadius: 20,
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

  // Photo indicator dots
  indicatorContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  indicatorDot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },

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
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  scorePillText: { fontSize: 12, fontWeight: "800" },

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
  interestChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },

  // View profile button
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  viewProfileText: { fontSize: 14, fontWeight: "800" },

  photoSkeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16,12,10,0.24)",
    borderRadius: 24,
    zIndex: 1,
  },
  // Action bar
  fixedActionSafeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  undoBar: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    minHeight: 56,
    marginBottom: 9,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28,23,22,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  undoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  undoIconLike: {
    backgroundColor: "rgba(255,77,109,0.92)",
  },
  undoIconPass: {
    backgroundColor: "rgba(255,127,147,0.72)",
  },
  undoMessageWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  undoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  undoSubtext: {
    marginTop: 2,
    color: "rgba(255,255,255,0.64)",
    fontSize: 11,
    fontWeight: "700",
  },
  undoButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
  },
  undoButtonText: {
    color: "#241C18",
    fontSize: 12,
    fontWeight: "900",
  },
  actionBar: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: 32,
    backgroundColor: "rgba(36,28,24,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  actionBtnWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionCirclePass: {
    backgroundColor: "rgba(255,127,147,0.16)",
    borderColor: "rgba(255,127,147,0.42)",
  },
  actionCircleChat: {
    backgroundColor: "rgba(112,214,255,0.16)",
    borderColor: "rgba(112,214,255,0.42)",
  },
  actionCircleBoost: {
    backgroundColor: "rgba(255,209,102,0.16)",
    borderColor: "rgba(255,209,102,0.42)",
  },
  actionCircleProfile: {
    backgroundColor: "rgba(216,200,186,0.15)",
    borderColor: "rgba(216,200,186,0.34)",
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
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
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
  matchKeepGoingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
  },

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
  emptyCard: {
    width: "100%",
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
    paddingTop: 8,
  },
  requestSheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 20,
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
  sheetTitle: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
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
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
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
  switchRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

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
