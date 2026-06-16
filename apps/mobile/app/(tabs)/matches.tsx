import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  StatusBar,
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
  useRespondMatchRequestMutation,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type { MatchRecommendation, MatchRequest } from "@/types/match.types";

const bottomActionHeight = 94;
const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<{
    name: string;
    chatId: string;
    profile: MatchRecommendation;
  } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const { data: profiles = [], isLoading } = useMatchRecommendationsQuery();
  const { data: incomingRequests = [] } = useIncomingMatchRequestsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();
  const respondMatchRequest = useRespondMatchRequestMutation();
  const profile = profiles[activeIndex] as MatchRecommendation | undefined;
  const nextProfiles = useMemo(
    () =>
      profiles
        .filter((item: MatchRecommendation) => item.id !== profile?.id)
        .slice(0, 2),
    [profile?.id, profiles],
  );

  React.useEffect(() => {
    if (profiles.length > 0 && activeIndex >= profiles.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, profiles.length]);

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
    if (!profile) return;

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
        },
      );
      return;
    }

    sendMatchRequest.mutate(
      { receiverId: profile.id },
      {
        onSuccess: moveToNextCard,
        onError: moveToNextCard,
      },
    );
  };

  const handleChatRequest = () => {
    if (!profile) return;

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
      },
    );
  };

  const handleMatchRequest = () => {
    if (!profile) return;

    sendMatchRequest.mutate(
      { receiverId: profile.id, message: "I would like to connect with you." },
      {
        onSuccess: moveToNextCard,
        onError: moveToNextCard,
      },
    );
  };

  const handleSkip = () => {
    moveToNextCard();
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
    respondMatchRequest.mutate(
      { requestId: request.id, status },
      {
        onSuccess: (response: any) => {
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
      },
    );
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
            Real users will appear here after they create an account and
            complete their profile.
          </Text>
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
        </View>
      </SafeAreaView>
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
              activeOpacity={0.82}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={Colors.textInverse}
              />
            </TouchableOpacity>
          </View>
        </View>

        {incomingRequests.length ? (
          <View className="mx-[18px] mt-4 rounded-[24px] border p-3" style={styles.requestPanel}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-extrabold" style={styles.photoText}>
                Requests
              </Text>
              <Text className="text-xs font-bold" style={styles.photoMutedText}>
                {incomingRequests.length} waiting
              </Text>
            </View>
            {incomingRequests.slice(0, 2).map((request) => (
              <IncomingRequestRow
                key={request.id}
                request={request}
                disabled={respondMatchRequest.isPending}
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
          />
          <RoundAction
            icon="chatbubble-ellipses"
            label="Chat"
            badge={profile.chatRequests}
            tone="chat"
            onPress={handleChatRequest}
          />
          <HeartAction onPress={handleLike} />
          <RoundAction
            icon="flash"
            label="Boost"
            tone="boost"
            onPress={handleMatchRequest}
          />
        </View>
      </SafeAreaView>

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
}) => (
  <View
    className="h-8 flex-row items-center gap-1.5 rounded-full border px-3"
    style={styles.floatingButton}
  >
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        className={`h-2 rounded-full ${index === activeIndex ? "w-[26px]" : "w-2"}`}
        style={index === activeIndex ? styles.activeDot : styles.inactiveDot}
      />
    ))}
  </View>
);

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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  tone: "muted" | "chat" | "boost";
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
      activeOpacity={0.82}
    >
      <View
        className="h-[50px] w-[50px] items-center justify-center rounded-full border"
        style={styles.actionIconCircle}
      >
        <Ionicons name={icon} size={23} color={color} />
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

const HeartAction = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    className="min-w-[74px] items-center justify-center"
    activeOpacity={0.84}
    onPress={onPress}
  >
    <LinearGradient
      colors={Colors.gradientCard}
      start={{ x: 0.08, y: 0.08 }}
      end={{ x: 1, y: 1 }}
      className="h-[70px] w-[70px] items-center justify-center rounded-full"
    >
      <Ionicons name="heart" size={33} color={Colors.primary} />
    </LinearGradient>
    <Text className="mt-1 text-[11px] font-bold" style={styles.photoText}>Like</Text>
  </TouchableOpacity>
);

const IncomingRequestRow = ({
  request,
  disabled,
  onAccept,
  onReject,
}: {
  request: MatchRequest;
  disabled: boolean;
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
        <Ionicons name="checkmark" size={18} color={Colors.textInverse} />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-full"
        style={styles.actionIconCircle}
        disabled={disabled}
        onPress={onReject}
        activeOpacity={0.84}
      >
        <Ionicons name="close" size={18} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
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
  bottomContentShade: {
    bottom: 0,
    height: 420,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
