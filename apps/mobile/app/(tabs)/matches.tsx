import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import { suggestedProfiles } from "@/data/matchProfiles";

const bottomActionHeight = 94;
const actionBackdropColor = "rgba(5, 5, 5, 0.92)";
const matchOverlayBackdropColor = "rgba(0, 0, 0, 0.92)";

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const profile = suggestedProfiles[activeIndex];
  const nextProfiles = useMemo(
    () =>
      suggestedProfiles
        .filter((item) => item.id !== profile.id)
        .slice(0, 2),
    [profile.id],
  );

  const moveToNextCard = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveIndex((current) => (current + 1) % suggestedProfiles.length);
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLike = () => {
    // Backend target: POST /match/request, then create Match + Conversation when mutual.
    if (profile.alreadyLikedMe) {
      setMatchBanner(`${profile.name} ${profile.lastName}`);
      return;
    }

    moveToNextCard();
  };

  const handleChatRequest = () => {
    // Backend target: create ChatRequest for the selected profile.
    moveToNextCard();
  };

  const handleMatchRequest = () => {
    // Backend target: create MatchRequest for stronger intent.
    moveToNextCard();
  };

  const handleSkip = () => {
    // Backend target: hideRecommendation(profile.id), then preload the next profile.
    moveToNextCard();
  };

  const openProfileDetail = () => {
    router.push({
      pathname: "/(screens)/match-detail/[profileId]",
      params: { profileId: profile.id },
    });
  };

  return (
    <View className="flex-1 bg-[#050505]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View className="absolute inset-0" style={{ opacity: fade }}>
        <Image
          key={profile.id}
          source={{ uri: profile.imageUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </Animated.View>

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.58)",
          "rgba(0,0,0,0.12)",
          "rgba(0,0,0,0.28)",
          "rgba(0,0,0,0.96)",
        ]}
        locations={[0, 0.28, 0.54, 1]}
        className="absolute inset-0"
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <View className="flex-row items-start justify-between px-[18px] pt-2">
          <View className="flex-row items-start">
            <TouchableOpacity
              className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45"
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* <View>
              <Text className="text-xs font-semibold uppercase text-white/70">
                Daily deck
              </Text>
              <Text className="mt-0.5 text-[30px] font-bold leading-9 text-white">
                Matches
              </Text>
            </View> */}
          </View>

          <View className="flex-row items-center gap-2.5">
            <View className="h-9 flex-row items-center rounded-full bg-white px-3">
              <Ionicons name="people" size={15} color={Colors.black} />
              <Text className="ml-1.5 text-xs font-bold text-black">
                {suggestedProfiles.length} profiles
              </Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45"
              activeOpacity={0.82}
            >
              <Ionicons name="options-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="relative flex-1 justify-end px-[18px]"
          style={{
            paddingBottom: Math.max(insets.bottom + bottomActionHeight + 18, 126),
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.78)", "rgba(0,0,0,0.98)"]}
            locations={[0, 0.42, 1]}
            style={styles.bottomContentShade}
          />

          <View className="mb-3 flex-row items-center justify-between">
            <ProgressDots activeIndex={activeIndex} total={suggestedProfiles.length} />
            <View className="h-[42px] w-[72px] flex-row">
              {nextProfiles.map((item, index) => (
                <Image
                  key={item.id}
                  source={{ uri: item.imageUrl }}
                  className={`absolute h-[42px] w-[42px] rounded-[15px] border-2 border-white/80 ${
                    index === 0 ? "right-[26px] z-10" : "right-0"
                  }`}
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
                className="flex-1 text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontFamily: FontFamily.darleston,
                  fontSize: 58,
                  includeFontPadding: false,
                  lineHeight: 66,
                }}
              >
                {profile.name}
              </Text>
              <View className="ml-3 flex-row items-center rounded-full bg-white/15 px-3 py-2">
                <Text className="text-base font-bold text-white">{profile.age}</Text>
                {profile.verified ? (
                  <View className="ml-1.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
                    <Ionicons name="checkmark" size={11} color={Colors.black} />
                  </View>
                ) : null}
              </View>
            </View>

            <Text className="-mt-1 text-sm font-semibold text-white/75" numberOfLines={1}>
              {profile.name} {profile.lastName}
            </Text>

            <View className="mt-4 gap-2">
              <ProfileInfo icon="location-outline" label="Location" value={profile.city} />
              <ProfileInfo icon="navigate-outline" label="Distance" value={profile.distance} />
            </View>

            <TouchableOpacity
              className="mt-4 h-12 flex-row items-center justify-center rounded-full bg-white"
              onPress={openProfileDetail}
              activeOpacity={0.84}
            >
              <Text className="mr-2 text-sm font-bold text-black">View profile</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.black} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View
          className="absolute left-[18px] right-[18px] h-[94px] flex-row items-center justify-between rounded-[30px] border border-white/10 px-3.5 shadow-2xl"
          style={{
            backgroundColor: actionBackdropColor,
            bottom: Math.max(insets.bottom + 12, 24),
          }}
        >
          <RoundAction icon="close" label="Pass" tone="muted" onPress={handleSkip} />
          <RoundAction
            icon="chatbubble-ellipses"
            label="Chat"
            badge={profile.chatRequests}
            tone="chat"
            onPress={handleChatRequest}
          />
          <HeartAction onPress={handleLike} />
          <RoundAction icon="flash" label="Boost" tone="boost" onPress={handleMatchRequest} />
        </View>
      </SafeAreaView>

      {matchBanner ? (
        <View
          className="absolute inset-0 z-20 items-center justify-center px-7"
          style={{ backgroundColor: matchOverlayBackdropColor }}
        >
          <LinearGradient
            colors={["#FFFFFF", "#A0A0A0"]}
            className="h-24 w-24 items-center justify-center rounded-full"
          >
            <Ionicons name="heart" size={46} color="#050505" />
          </LinearGradient>
          <Text className="mt-6 text-center text-[38px] font-bold text-white">
            {"It's a Match!"}
          </Text>
          <Text className="mt-3 text-center text-base leading-[23px] text-[#BDBDBD]">
            {matchBanner} already liked you. Chat is ready to open.
          </Text>
          <View className="mt-7 flex-row gap-2.5">
            <TouchableOpacity
              className="h-[54px] flex-row items-center rounded-full bg-white px-5"
              onPress={() => {
                setMatchBanner(null);
                moveToNextCard();
              }}
              activeOpacity={0.86}
            >
              <Ionicons name="chatbubble" size={20} color="#050505" />
              <Text className="ml-2 text-base font-bold text-black">Open Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-[54px] items-center justify-center rounded-full border border-[#222] bg-[#111] px-[18px]"
              onPress={() => {
                setMatchBanner(null);
                moveToNextCard();
              }}
              activeOpacity={0.86}
            >
              <Text className="text-base font-bold text-white">Keep Matching</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const ProgressDots = ({ activeIndex, total }: { activeIndex: number; total: number }) => (
  <View className="h-8 flex-row items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3">
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        className={`h-2 rounded-full ${
          index === activeIndex ? "w-[26px] bg-white" : "w-2 bg-white/35"
        }`}
      />
    ))}
  </View>
);

const StatusPill = ({ online }: { online: boolean }) => (
  <View className="flex-row items-center rounded-full border border-white/10 bg-black/45 px-3 py-2">
    <View
      className={`mr-2 h-2 w-2 rounded-full ${online ? "bg-[#6FBF8A]" : "bg-[#888888]"}`}
    />
    <Text className="text-xs font-bold text-white">{online ? "Online now" : "Away"}</Text>
  </View>
);

const ScorePill = ({ score }: { score: number }) => (
  <View className="flex-row items-center rounded-full bg-white px-3 py-2">
    <Ionicons name="sparkles" size={14} color={Colors.black} />
    <Text className="ml-1.5 text-xs font-bold text-black">{score}% match</Text>
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
    <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-black/35">
      <Ionicons name={icon} size={15} color={Colors.textPrimary} />
    </View>
    <View className="flex-1">
      <Text className="text-xs font-bold text-white/55" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-bold text-white" numberOfLines={1}>
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
  const color = tone === "chat" ? "#38BDF8" : tone === "boost" ? "#FBBF24" : "#FFFFFF";

  return (
    <TouchableOpacity
      className="min-w-14 items-center justify-center"
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View className="h-[50px] w-[50px] items-center justify-center rounded-full border border-white/10 bg-white/10">
        <Ionicons name={icon} size={23} color={color} />
        {badge ? (
          <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-white px-1">
            <Text className="text-[10px] font-bold leading-[18px] text-black">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-1 text-[11px] font-bold text-[#BDBDBD]">{label}</Text>
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
      colors={["#FFFFFF", "#C0C0C0"]}
      start={{ x: 0.08, y: 0.08 }}
      end={{ x: 1, y: 1 }}
      className="h-[70px] w-[70px] items-center justify-center rounded-full shadow-white"
    >
      <Ionicons name="heart" size={33} color="#050505" />
    </LinearGradient>
    <Text className="mt-1 text-[11px] font-bold text-white">Like</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  bottomContentShade: {
    bottom: 0,
    height: 420,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
