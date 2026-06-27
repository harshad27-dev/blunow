import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import {
  useMatchRecommendationsQuery,
  useIncomingMatchRequestsQuery,
  useDismissRecommendationMutation,
  useRespondMatchRequestMutation,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type {
  MatchRecommendation,
  MatchRecommendationFilters,
  MatchRequest,
} from "@/types/match.types";

const bottomActionHeight = 94;
const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";
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
const AGE_OPTIONS = [18, 21, 24, 27, 30, 35, 40, 50];
const DISTANCE_OPTIONS = [10, 25, 50, 100, 250, 500];
const GENDER_OPTIONS: Array<{
  label: string;
  value: NonNullable<MatchRecommendationFilters["gender"]>;
}> = [
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
  const [pendingRequestAction, setPendingRequestAction] = useState<{
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const { data: profiles = [], isLoading } = useMatchRecommendationsQuery(filters);
  const { data: incomingRequests = [] } = useIncomingMatchRequestsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();
  const respondMatchRequest = useRespondMatchRequestMutation();
  const dismissRecommendation = useDismissRecommendationMutation();
  const profile = profiles[activeIndex] as MatchRecommendation | undefined;
  const isDeckActionPending = pendingAction !== null;
  const nextProfiles = useMemo(
    () =>
      profiles
        .filter((item: MatchRecommendation) => item.id !== profile?.id)
        .slice(0, 2),
    [profile?.id, profiles],
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

  const moveToNextCard = () => {
    if (profiles.length === 0) return;

    Animated.timing(fade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveIndex((current) => (current + 1) % profiles.length);
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

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
              Alert.alert(
                "Chat not ready",
                "Match created, but chat is not ready yet.",
              );
              moveToNextCard();
              return;
            }

            setMatchBanner({
              name: `${profile.name} ${profile.lastName}`,
              chatId,
              profile,
            });
          },
          onError: moveToNextCard,
          onSettled: () => setPendingAction(null),
        },
      );
      return;
    }

    sendMatchRequest.mutate(
      { receiverId: profile.id },
      {
        onSuccess: moveToNextCard,
        onError: moveToNextCard,
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
            openChat(profile, chatId);
            return;
          }

          Alert.alert(
            "Request sent",
            "They need to accept your request before chat opens.",
          );
          moveToNextCard();
        },
        onError: moveToNextCard,
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
        onSuccess: moveToNextCard,
        onError: moveToNextCard,
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handleSkip = () => {
    if (!profile || isDeckActionPending) return;

    setPendingAction("pass");
    dismissRecommendation.mutate(profile.id, {
      onSuccess: moveToNextCard,
      onError: (error: any) => {
        Alert.alert(
          "Pass failed",
          error?.response?.data?.message || "Unable to dismiss this profile.",
        );
      },
      onSettled: () => setPendingAction(null),
    });
  };

  const openProfileDetail = () => {
    if (!profile) return;

    router.push({
      pathname: "/(screens)/user/[userId]",
      params: { userId: profile.id },
    });
  };

  const openChat = (selectedProfile: MatchRecommendation, chatId: string) => {
    router.push({
      pathname: "/(screens)/chat/[roomId]",
      params: {
        roomId: chatId,
        userId: selectedProfile.id,
        name: `${selectedProfile.name} ${selectedProfile.lastName}`,
        avatarUrl: selectedProfile.imageUrl || fallbackProfileImage,
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
          Alert.alert(
            "Request failed",
            error?.response?.data?.message || "Unable to update request.",
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
    setFilters({
      ...draftFilters,
      interests: draftFilters.interests ?? [],
    });
    setIsFilterModalVisible(false);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    setIsFilterModalVisible(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={styles.screen}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text className="mt-4 text-sm font-semibold" style={styles.mutedText}>
          Finding real profiles...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1" style={styles.screen}>
        <SafeAreaView
          className="flex-1"
          style={styles.screen}
          edges={["top", "left", "right"]}
        >
          <View className="flex-row items-center justify-between px-[18px] pt-2">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full border"
              style={styles.overlayIconButton}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full border"
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
                <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1" style={styles.badge}>
                  <Text className="text-[10px] font-bold" style={styles.primaryButtonText}>
                    {filterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center justify-center px-7">
            <View
              className="h-20 w-20 items-center justify-center rounded-full border"
              style={styles.emptyIconWrap}
            >
              <Ionicons name="people-outline" size={34} color={Colors.textMuted} />
            </View>
            <Text className="mt-5 text-center text-2xl font-bold" style={styles.titleText}>
              No profiles yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-5" style={styles.mutedText}>
              {filterCount
                ? "Try relaxing your filters to see more real profiles."
                : "Real users will appear here after they create an account and complete their profile."}
            </Text>
            {filterCount ? (
              <TouchableOpacity
                className="mt-6 h-12 flex-row items-center rounded-full px-5"
                style={styles.primaryButton}
                onPress={resetFilters}
                activeOpacity={0.84}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={Colors.textInverse}
                />
                <Text className="ml-2 text-sm font-bold" style={styles.primaryButtonText}>
                  Reset filters
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="mt-6 h-12 flex-row items-center rounded-full px-5"
                style={styles.primaryButton}
                onPress={() => router.push("/(screens)/edit-profile")}
                activeOpacity={0.84}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={Colors.textInverse}
                />
                <Text className="ml-2 text-sm font-bold" style={styles.primaryButtonText}>
                  Complete profile
                </Text>
              </TouchableOpacity>
            )}
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

  const profileImage = profile.imageUrl || fallbackProfileImage;

  return (
    <View className="flex-1" style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Animated.View className="absolute inset-0" style={{ opacity: fade }}>
        <Image
          key={profile.id}
          source={{ uri: profileImage }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </Animated.View>

      <LinearGradient
        colors={[
          Colors.overlayDark,
          Colors.overlayDarkSoft,
          Colors.overlayDarkSoft,
          Colors.overlayDarkStrong,
        ]}
        locations={[0, 0.28, 0.54, 1]}
        className="absolute inset-0"
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <View className="flex-row items-start justify-between px-[18px] pt-2">
          <View className="flex-row items-start">
            <TouchableOpacity
              className="mr-3 h-10 w-10 items-center justify-center rounded-full border"
              style={styles.floatingIconButton}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textInverse} />
            </TouchableOpacity>

          </View>

          <View className="flex-row items-center gap-2.5">
            <View className="h-9 flex-row items-center rounded-full px-3" style={styles.photoPrimaryPill}>
              <Ionicons name="people" size={15} color={Colors.textInverse} />
              <Text className="ml-1.5 text-xs font-bold" style={styles.photoPrimaryText}>
                {profiles.length} profiles
              </Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full border"
              style={styles.floatingIconButton}
              onPress={openFilters}
              activeOpacity={0.82}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={Colors.textInverse}
              />
              {filterCount ? (
                <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1" style={styles.badge}>
                  <Text className="text-[10px] font-bold" style={styles.primaryButtonText}>
                    {filterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        {incomingRequests.length ? (
          <View className="mx-[18px] mt-4 rounded-[24px] border p-3" style={styles.requestPanel}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-extrabold" style={styles.photoText}>
                Requests
              </Text>
              <TouchableOpacity
                onPress={() => setIsRequestsModalVisible(true)}
                activeOpacity={0.84}
              >
                <Text className="text-xs font-bold" style={styles.photoMutedText}>
                  {incomingRequests.length > 2 ? "View all" : `${incomingRequests.length} waiting`}
                </Text>
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

        <View
          className="relative flex-1 justify-end px-[18px]"
          style={{
            paddingBottom: Math.max(
              insets.bottom + bottomActionHeight + 18,
              126,
            ),
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[Colors.transparent, Colors.overlayDark, Colors.overlayDarkStrong]}
            locations={[0, 0.42, 1]}
            style={styles.bottomContentShade}
          />

          <View className="mb-3 flex-row items-center justify-between">
            <ProgressDots activeIndex={activeIndex} total={profiles.length} />
            <View className="h-[42px] w-[72px] flex-row">
              {nextProfiles.map((item: MatchRecommendation, index: number) => (
                <Image
                  key={item.id}
                  source={{ uri: item.imageUrl || fallbackProfileImage }}
                  className={`absolute h-[42px] w-[42px] rounded-[15px] border-2 ${
                    index === 0 ? "right-[26px] z-10" : "right-0"
                  }`}
                  style={styles.nextProfileImage}
                />
              ))}
            </View>
          </View>

          <Animated.View className="w-full" style={{ opacity: fade }}>
            <View className="flex-row items-center justify-between">
              <StatusPill online={profile.online} />
              <ScorePill score={profile.matchScore} />
            </View>

            <View className="mt-4 flex-row items-center">
              <Text
                className="flex-1"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontFamily: FontFamily.darleston,
                  fontSize: 58,
                  includeFontPadding: false,
                  lineHeight: 66,
                  color: Colors.textInverse,
                }}
              >
                {profile.name}
              </Text>
              <View className="ml-3 flex-row items-center rounded-full px-3 py-2" style={styles.photoSoftPill}>
                <Text className="text-base font-bold" style={styles.photoText}>
                  {profile.age}
                </Text>
                {profile.verified ? (
                  <View className="ml-1.5 h-[18px] w-[18px] items-center justify-center rounded-full" style={styles.photoPrimaryPill}>
                    <Ionicons name="checkmark" size={11} color={Colors.textInverse} />
                  </View>
                ) : null}
              </View>
            </View>

            <Text
              className="-mt-1 text-sm font-semibold"
              style={styles.photoSecondaryText}
              numberOfLines={1}
            >
              {profile.name} {profile.lastName}
            </Text>

            <View className="mt-4 gap-2">
              <ProfileInfo
                icon="location-outline"
                label="Location"
                value={profile.city}
              />
              <ProfileInfo
                icon="navigate-outline"
                label="Distance"
                value={profile.distance}
              />
            </View>

            <TouchableOpacity
              className="mt-4 h-12 flex-row items-center justify-center rounded-full"
              style={styles.photoPrimaryPill}
              onPress={openProfileDetail}
              activeOpacity={0.84}
            >
              <Text className="mr-2 text-sm font-bold" style={styles.photoPrimaryText}>
                View profile
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View
          className="absolute left-[18px] right-[18px] h-[94px] flex-row items-center justify-between rounded-[30px] border px-3.5 shadow-2xl"
          style={[
            styles.actionBar,
            { bottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          <RoundAction
            icon="close"
            label="Pass"
            tone="muted"
            onPress={handleSkip}
            disabled={isDeckActionPending}
            loading={pendingAction === "pass"}
          />
          <RoundAction
            icon="chatbubble-ellipses"
            label="Chat"
            badge={profile.chatRequests}
            tone="chat"
            onPress={handleChatRequest}
            disabled={isDeckActionPending}
            loading={pendingAction === "chat"}
          />
          <HeartAction
            onPress={handleLike}
            disabled={isDeckActionPending}
            loading={pendingAction === "like"}
          />
          <RoundAction
            icon="flash"
            label="Boost"
            tone="boost"
            onPress={handleMatchRequest}
            disabled={isDeckActionPending}
            loading={pendingAction === "boost"}
          />
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

      <RequestsModal
        visible={isRequestsModalVisible}
        requests={incomingRequests}
        pendingAction={pendingRequestAction}
        onAccept={(request) => respondToIncomingRequest(request, "ACCEPTED")}
        onReject={(request) => respondToIncomingRequest(request, "REJECTED")}
        onClose={() => setIsRequestsModalVisible(false)}
      />

      {matchBanner ? (
        <View
          className="absolute inset-0 z-20 items-center justify-center px-7"
          style={styles.matchOverlay}
        >
          <LinearGradient
            colors={Colors.gradientCard}
            className="h-24 w-24 items-center justify-center rounded-full"
          >
            <Ionicons name="heart" size={46} color={Colors.primary} />
          </LinearGradient>
          <Text className="mt-6 text-center text-[38px] font-bold" style={styles.photoText}>
            {"It's a Match!"}
          </Text>
          <Text className="mt-3 text-center text-base leading-[23px]" style={styles.photoSecondaryText}>
            {matchBanner.name} already liked you. Chat is ready to open.
          </Text>
          <View className="mt-7 flex-row gap-2.5">
            <TouchableOpacity
              className="h-[54px] flex-row items-center rounded-full px-5"
              style={styles.photoPrimaryPill}
              onPress={() => {
                const matched = matchBanner;
                setMatchBanner(null);
                openChat(matched.profile, matched.chatId);
              }}
              activeOpacity={0.86}
            >
              <Ionicons name="chatbubble" size={20} color={Colors.textInverse} />
              <Text className="ml-2 text-base font-bold" style={styles.photoPrimaryText}>
                Open Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-[54px] items-center justify-center rounded-full border px-[18px]"
              style={styles.floatingButton}
              onPress={() => {
                setMatchBanner(null);
                moveToNextCard();
              }}
              activeOpacity={0.86}
            >
              <Text className="text-base font-bold" style={styles.photoText}>
                Keep Matching
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const ProgressDots = ({
  activeIndex,
  total,
}: {
  activeIndex: number;
  total: number;
}) => {
  const maxVisibleDots = 5;
  const visibleDotCount = Math.min(total, maxVisibleDots);
  const maxStartIndex = Math.max(total - visibleDotCount, 0);
  const startIndex =
    total <= maxVisibleDots
      ? 0
      : Math.min(Math.max(activeIndex - Math.floor(visibleDotCount / 2), 0), maxStartIndex);
  const visibleIndexes = Array.from(
    { length: visibleDotCount },
    (_, index) => startIndex + index,
  );

  return (
    <View
      className="h-8 flex-row items-center gap-1.5 rounded-full border px-3"
      style={[styles.floatingButton, styles.progressDots]}
    >
      {visibleIndexes.map((index) => (
        <View
          key={index}
          className={`h-2 rounded-full ${index === activeIndex ? "w-[26px]" : "w-2"}`}
          style={index === activeIndex ? styles.activeDot : styles.inactiveDot}
        />
      ))}
      {total > maxVisibleDots ? (
        <Text className="ml-1 text-xs font-bold" style={styles.photoText}>
          {activeIndex + 1}/{total}
        </Text>
      ) : null}
    </View>
  );
};

const StatusPill = ({ online }: { online: boolean }) => (
  <View
    className="flex-row items-center rounded-full border px-3 py-2"
    style={styles.floatingButton}
  >
    <View
      className="mr-2 h-2 w-2 rounded-full"
      style={{ backgroundColor: online ? Colors.success : Colors.textMuted }}
    />
    <Text className="text-xs font-bold" style={styles.photoText}>
      {online ? "Online now" : "Away"}
    </Text>
  </View>
);

const ScorePill = ({ score }: { score: number }) => (
  <View
    className="flex-row items-center rounded-full px-3 py-2"
    style={styles.photoPrimaryPill}
  >
    <Ionicons name="sparkles" size={14} color={Colors.textInverse} />
    <Text className="ml-1.5 text-xs font-bold" style={styles.photoPrimaryText}>
      {score}% match
    </Text>
  </View>
);

const ProfileInfo = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View className="flex-row items-center">
    <View
      className="mr-3 h-9 w-9 items-center justify-center rounded-full"
      style={styles.photoIconCircle}
    >
      <Ionicons name={icon} size={15} color={Colors.textInverse} />
    </View>
    <View className="flex-1">
      <Text className="text-xs font-bold" style={styles.photoMutedText} numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-bold" style={styles.photoText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const RoundAction = ({
  icon,
  label,
  onPress,
  badge,
  tone,
  disabled,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  tone: "muted" | "chat" | "boost";
  disabled?: boolean;
  loading?: boolean;
}) => {
  const color =
    tone === "chat"
      ? Colors.primaryLight
      : tone === "boost"
        ? Colors.warning
        : Colors.textInverse;

  return (
    <TouchableOpacity
      className="min-w-14 items-center justify-center"
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      style={disabled ? styles.disabledAction : undefined}
    >
      <View
        className="h-[50px] w-[50px] items-center justify-center rounded-full border"
        style={styles.actionIconCircle}
      >
        {loading ? (
          <ActivityIndicator color={color} size="small" />
        ) : (
          <Ionicons name={icon} size={23} color={color} />
        )}
        {badge ? (
          <View
            className="absolute -right-1 -top-1 min-w-5 items-center rounded-full px-1"
            style={styles.badge}
          >
            <Text className="text-[10px] font-bold leading-[18px]" style={styles.primaryButtonText}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-1 text-[11px] font-bold" style={styles.photoSecondaryText}>{label}</Text>
    </TouchableOpacity>
  );
};

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
    className="min-w-[74px] items-center justify-center"
    activeOpacity={0.84}
    onPress={onPress}
    disabled={disabled}
    style={disabled ? styles.disabledAction : undefined}
  >
    <LinearGradient
      colors={Colors.gradientCard}
      start={{ x: 0.08, y: 0.08 }}
      end={{ x: 1, y: 1 }}
      className="h-[70px] w-[70px] items-center justify-center rounded-full"
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <Ionicons name="heart" size={33} color={Colors.primary} />
      )}
    </LinearGradient>
    <Text className="mt-1 text-[11px] font-bold" style={styles.photoText}>Like</Text>
  </TouchableOpacity>
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
    "Datebl user";
  const avatarUrl = request.sender?.profile?.avatarUrl;

  return (
    <View className="mt-2 flex-row items-center rounded-[18px] p-2" style={styles.incomingRow}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-11 w-11 rounded-[15px]" />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-[15px]" style={styles.avatarFallback}>
          <Text className="text-base font-extrabold" style={styles.photoText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-sm font-extrabold" style={styles.photoText} numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-0.5 text-xs font-semibold" style={styles.photoMutedText} numberOfLines={1}>
          {request.message || "Wants to connect"}
        </Text>
      </View>
      <TouchableOpacity
        className="mr-2 h-9 w-9 items-center justify-center rounded-full"
        style={styles.photoPrimaryPill}
        disabled={disabled}
        onPress={onAccept}
        activeOpacity={0.84}
      >
        {pendingStatus === "ACCEPTED" ? (
          <ActivityIndicator color={Colors.textInverse} size="small" />
        ) : (
          <Ionicons name="checkmark" size={18} color={Colors.textInverse} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-full"
        style={styles.actionIconCircle}
        disabled={disabled}
        onPress={onReject}
        activeOpacity={0.84}
      >
        {pendingStatus === "REJECTED" ? (
          <ActivityIndicator color={Colors.textInverse} size="small" />
        ) : (
          <Ionicons name="close" size={18} color={Colors.textInverse} />
        )}
      </TouchableOpacity>
    </View>
  );
};

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
  pendingAction: {
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
  } | null;
  onAccept: (request: MatchRequest) => void;
  onReject: (request: MatchRequest) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end" style={styles.modalBackdrop}>
      <View className="max-h-[78%] rounded-t-[30px] px-5 pb-8 pt-4" style={styles.requestSheet}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-extrabold" style={styles.photoText}>
            Incoming requests
          </Text>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            style={styles.actionIconCircle}
            onPress={onClose}
            activeOpacity={0.84}
          >
            <Ionicons name="close" size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {requests.map((request) => (
            <IncomingRequestRow
              key={request.id}
              request={request}
              disabled={Boolean(pendingAction)}
              pendingStatus={
                pendingAction?.requestId === request.id ? pendingAction.status : null
              }
              onAccept={() => onAccept(request)}
              onReject={() => onReject(request)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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
      <View className="flex-1 justify-end" style={styles.modalBackdrop}>
        <View className="max-h-[86%] rounded-t-[30px] px-5 pb-8 pt-4" style={styles.sheet}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold" style={styles.titleText}>
              Filters
            </Text>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              style={styles.floatingButtonLight}
              onPress={onClose}
              activeOpacity={0.84}
            >
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <FilterSection title="Age">
              <View className="flex-row flex-wrap gap-2">
                {AGE_OPTIONS.map((age) => (
                  <FilterChip
                    key={`min-${age}`}
                    label={`Min ${age}`}
                    selected={filters.minAge === age}
                    onPress={() => updateFilters({ minAge: age })}
                  />
                ))}
              </View>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {AGE_OPTIONS.map((age) => (
                  <FilterChip
                    key={`max-${age}`}
                    label={`Max ${age}`}
                    selected={filters.maxAge === age}
                    onPress={() => updateFilters({ maxAge: age })}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="Distance">
              <View className="flex-row flex-wrap gap-2">
                {DISTANCE_OPTIONS.map((distance) => (
                  <FilterChip
                    key={distance}
                    label={`${distance} mi`}
                    selected={filters.maxDistance === distance}
                    onPress={() => updateFilters({ maxDistance: distance })}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="Gender">
              <View className="flex-row flex-wrap gap-2">
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

            <SwitchRow
              label="Use my preference"
              value={Boolean(filters.useMyPreference)}
              onValueChange={(value) => updateFilters({ useMyPreference: value })}
            />
            <SwitchRow
              label="Verified only"
              value={Boolean(filters.verifiedOnly)}
              onValueChange={(value) => updateFilters({ verifiedOnly: value })}
            />
            <SwitchRow
              label="Online only"
              value={Boolean(filters.onlineOnly)}
              onValueChange={(value) => updateFilters({ onlineOnly: value })}
            />

            <FilterSection title="Interests">
              <View className="flex-row flex-wrap gap-2">
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

          <View className="mt-5 flex-row gap-3">
            <TouchableOpacity
              className="h-12 flex-1 items-center justify-center rounded-full border"
              style={styles.resetButton}
              onPress={onReset}
              activeOpacity={0.84}
            >
              <Text className="text-sm font-bold" style={styles.titleText}>
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-12 flex-1 items-center justify-center rounded-full"
              style={styles.primaryButton}
              onPress={onApply}
              activeOpacity={0.84}
            >
              <Text className="text-sm font-bold" style={styles.primaryButtonText}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FilterSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="mb-5">
    <Text className="mb-2 text-sm font-extrabold" style={styles.titleText}>
      {title}
    </Text>
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
    className="h-9 items-center justify-center rounded-full border px-3"
    style={selected ? styles.filterChipSelected : styles.filterChip}
    onPress={onPress}
    activeOpacity={0.84}
  >
    <Text
      className="text-xs font-bold"
      style={selected ? styles.primaryButtonText : styles.titleText}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const SwitchRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View className="mb-4 flex-row items-center justify-between">
    <Text className="text-sm font-bold" style={styles.titleText}>
      {label}
    </Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
      thumbColor={value ? Colors.primary : Colors.bgCard}
    />
  </View>
);

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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
  },
  titleText: {
    color: Colors.textPrimary,
  },
  mutedText: {
    color: Colors.textSecondary,
  },
  overlayIconButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  emptyIconWrap: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.textInverse,
  },
  floatingIconButton: {
    backgroundColor: Colors.primary + "A6",
    borderColor: Colors.textInverse + "22",
  },
  floatingButton: {
    backgroundColor: Colors.primary + "B8",
    borderColor: Colors.textInverse + "22",
  },
  progressDots: {
    maxWidth: 168,
  },
  floatingButtonLight: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  requestPanel: {
    backgroundColor: Colors.primary + "D9",
    borderColor: Colors.textInverse + "22",
  },
  actionBar: {
    backgroundColor: Colors.primary + "EB",
    borderColor: Colors.textInverse + "22",
  },
  actionIconCircle: {
    backgroundColor: Colors.textInverse + "18",
    borderColor: Colors.textInverse + "22",
  },
  disabledAction: {
    opacity: 0.58,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
  },
  activeDot: {
    backgroundColor: Colors.textInverse,
  },
  inactiveDot: {
    backgroundColor: Colors.textInverse + "59",
  },
  incomingRow: {
    backgroundColor: Colors.textInverse + "18",
  },
  avatarFallback: {
    backgroundColor: Colors.textInverse + "24",
  },
  photoText: {
    color: Colors.textInverse,
  },
  photoSecondaryText: {
    color: Colors.textInverse + "BF",
  },
  photoMutedText: {
    color: Colors.textInverse + "8C",
  },
  photoPrimaryPill: {
    backgroundColor: Colors.primary,
  },
  photoPrimaryText: {
    color: Colors.textInverse,
  },
  photoSoftPill: {
    backgroundColor: Colors.textInverse + "24",
  },
  photoIconCircle: {
    backgroundColor: Colors.primary + "8F",
  },
  nextProfileImage: {
    borderColor: Colors.textInverse + "CC",
  },
  matchOverlay: {
    backgroundColor: Colors.primary + "EB",
  },
  modalBackdrop: {
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.bgCard,
  },
  requestSheet: {
    backgroundColor: Colors.primary,
  },
  resetButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  filterChip: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bottomContentShade: {
    bottom: 0,
    height: 420,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
