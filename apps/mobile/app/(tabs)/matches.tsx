import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";

const actionSize = 54;
const likeSize = 72;
const bottomActionHeight = 92;

type MatchProfile = {
  id: string;
  name: string;
  lastName: string;
  age: number;
  city: string;
  distance: string;
  occupation: string;
  online: boolean;
  verified: boolean;
  quote: string;
  imageUrl: string;
  interests: string[];
  matchScore: number;
  chatRequests: number;
  alreadyLikedMe?: boolean;
};

const suggestedProfiles: MatchProfile[] = [
  {
    id: "julia-siti",
    name: "Julia",
    lastName: "Siti",
    age: 24,
    city: "Bali, Indonesia",
    distance: "2.4 km away",
    occupation: "Marketing Manager",
    online: true,
    verified: true,
    quote: "Sunsets, good coffee and deep conversations",
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=92",
    interests: ["Modeling", "Football", "Fashion", "Gym", "Sushi", "Chinese"],
    matchScore: 95,
    chatRequests: 4,
    alreadyLikedMe: true,
  },
  {
    id: "maya-chen",
    name: "Maya",
    lastName: "Chen",
    age: 26,
    city: "Bengaluru, India",
    distance: "5.8 km away",
    occupation: "Product Designer",
    online: true,
    verified: true,
    quote: "Live music, ramen nights and people who make simple plans feel special",
    imageUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=92",
    interests: ["Music", "Travel", "Design", "Coffee", "Ramen", "Art"],
    matchScore: 88,
    chatRequests: 2,
  },
  {
    id: "aarav-mehta",
    name: "Aarav",
    lastName: "Mehta",
    age: 27,
    city: "Hyderabad, India",
    distance: "8.1 km away",
    occupation: "Founder",
    online: false,
    verified: false,
    quote: "Football debates, late dinners and calm rooms in loud cities",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=92",
    interests: ["Startups", "Football", "Food", "Fitness", "Movies"],
    matchScore: 82,
    chatRequests: 1,
  },
];

const interestMeta: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  art: { icon: "color-palette", color: "#F97316" },
  chinese: { icon: "language", color: "#8B5CF6" },
  coffee: { icon: "cafe", color: "#C8A86B" },
  design: { icon: "sparkles", color: "#A855F7" },
  fashion: { icon: "shirt", color: "#EC4899" },
  fitness: { icon: "barbell", color: "#2DD4BF" },
  football: { icon: "football", color: "#6FBF8A" },
  food: { icon: "restaurant", color: "#F97316" },
  gym: { icon: "barbell", color: "#2DD4BF" },
  modeling: { icon: "sparkles", color: "#FBBF24" },
  movies: { icon: "videocam", color: "#38BDF8" },
  music: { icon: "musical-notes", color: "#EC4899" },
  ramen: { icon: "restaurant", color: "#F97316" },
  startups: { icon: "rocket", color: "#A855F7" },
  sushi: { icon: "fast-food", color: "#CF6679" },
  travel: { icon: "airplane", color: "#38BDF8" },
};

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const profile = suggestedProfiles[activeIndex];

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
          "rgba(0,0,0,0.5)",
          "rgba(0,0,0,0.04)",
          "rgba(0,0,0,0.18)",
          "rgba(0,0,0,0.94)",
        ]}
        locations={[0, 0.24, 0.56, 1]}
        className="absolute inset-0"
      />

      <SafeAreaView className="absolute inset-0" edges={["top", "left", "right"]}>
        <View className="flex-1 px-[18px] pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[13px] font-black uppercase tracking-wider text-white/70">
                Daily deck
              </Text>
              <Text className="mt-1 text-[28px] font-black leading-[32px] text-white">
                Matches
              </Text>
            </View>

            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-black/42"
              activeOpacity={0.82}
            >
              <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View
            className="mt-auto w-full"
            style={{
              paddingBottom: Math.max(insets.bottom + bottomActionHeight + 16, 120),
            }}
          >
            <Animated.View
              className="overflow-hidden rounded-[32px]"
              style={{
                opacity: fade,
                backgroundColor: "rgba(9,9,11,0.78)",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.34,
                shadowRadius: 24,
              }}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="absolute inset-0"
              />

              <View className="p-5">
                <View
                  className="flex-row items-center justify-between pb-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
                >
                  <StatusPill online={profile.online} />
                  <ProgressDots activeIndex={activeIndex} total={suggestedProfiles.length} />
                </View>

                <View className="mt-4 flex-row flex-wrap items-center gap-x-2">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      fontFamily: FontFamily.darleston,
                      fontSize: 48,
                      color: "#FFFFFF",
                      includeFontPadding: false,
                    }}
                  >
                    {profile.name}
                  </Text>

                  <View
                    className="flex-row items-center rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text className="text-[15px] font-bold text-white">{profile.age}</Text>
                    {profile.verified ? (
                      <View className="ml-1.5 h-4 w-4 items-center justify-center rounded-full bg-sky-500">
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                </View>

                {profile.quote ? (
                  <Text
                    className="mt-2 text-[15px] font-medium italic leading-6 text-zinc-300"
                    numberOfLines={2}
                  >
                    {profile.quote}
                  </Text>
                ) : null}

                <View className="mt-4 flex-row flex-wrap gap-2">
                  {profile.alreadyLikedMe ? (
                    <ProfileMeta icon="heart" label="Liked you first" active />
                  ) : (
                    <ProfileMeta icon="eye-outline" label="Fresh profile" />
                  )}
                  <ProfileMeta icon="sparkles" label={`${profile.matchScore}% match`} active />
                </View>

                <View
                  className="mt-3 pt-3"
                  style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={15} color="#A1A1AA" />
                    <Text className="ml-2 text-[14px] text-zinc-400" numberOfLines={1}>
                      {profile.city}
                    </Text>
                  </View>
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="briefcase-outline" size={15} color="#A1A1AA" />
                    <Text className="ml-2 text-[14px] text-zinc-400" numberOfLines={1}>
                      {profile.occupation}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-1.5">
                  {profile.interests.slice(0, 4).map((interest) => (
                    <InterestChip key={interest} label={interest} />
                  ))}
                </View>
              </View>
            </Animated.View>
          </View>
        </View>

        <View
          className="absolute left-[18px] right-[18px] flex-row items-center justify-between rounded-[30px] border border-white/10 bg-black/82 px-4"
          style={{
            height: bottomActionHeight,
            bottom: Math.max(insets.bottom + 12, 24),
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.38,
            shadowRadius: 24,
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
        <View className="absolute inset-0 z-20 items-center justify-center bg-black/88 px-8">
          <LinearGradient
            colors={["#FFFFFF", "#A0A0A0"]}
            className="h-24 w-24 items-center justify-center rounded-full"
          >
            <Ionicons name="heart" size={46} color="#050505" />
          </LinearGradient>
          <Text className="mt-7 text-center text-[38px] font-black text-white">
            {"It's a Match!"}
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-[#BDBDBD]">
            {matchBanner} already liked you. Chat is ready to open.
          </Text>
          <View className="mt-8 flex-row gap-3">
            <TouchableOpacity
              className="h-14 flex-row items-center gap-2 rounded-full bg-white px-6"
              onPress={() => {
                setMatchBanner(null);
                moveToNextCard();
              }}
              activeOpacity={0.86}
            >
              <Ionicons name="chatbubble" size={20} color="#050505" />
              <Text className="text-base font-black text-[#050505]">Open Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-14 items-center justify-center rounded-full border border-[#2A2A2A] bg-[#111111] px-6"
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
  <View className="flex-row items-center gap-1.5 rounded-full bg-black/45 px-3 py-2">
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        className={`h-2 rounded-full ${index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/35"}`}
      />
    ))}
  </View>
);

const StatusPill = ({ online }: { online: boolean }) => (
  <View className="flex-row items-center rounded-full bg-black/55 px-3 py-2">
    <View
      className={`h-2.5 w-2.5 rounded-full ${online ? "bg-[#6FBF8A]" : "bg-[#888888]"}`}
    />
    <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
      {online ? "Online now" : "Away"}
    </Text>
  </View>
);

const ProfileMeta = ({
  icon,
  label,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) => (
  <View
    className={`max-w-full flex-row items-center rounded-full px-3 py-2 ${
      active ? "bg-white" : "bg-black/45"
    }`}
  >
    <Ionicons
      name={icon}
      size={14}
      color={active ? Colors.black : Colors.textSecondary}
    />
    <Text
      className={`ml-1.5 max-w-[210px] text-xs font-bold ${
        active ? "text-black" : "text-[#D8D8D8]"
      }`}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const InterestChip = ({ label }: { label: string }) => {
  const meta = interestMeta[label.toLowerCase()] || {
    icon: "sparkles" as const,
    color: Colors.textSecondary,
  };

  return (
    <View className="flex-row items-center rounded-full border border-white/10 bg-black/45 px-3 py-2">
      <Ionicons name={meta.icon} size={14} color={meta.color} />
      <Text className="ml-1.5 text-xs font-bold text-white">{label}</Text>
    </View>
  );
};

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
      className="min-w-[58px] items-center justify-center"
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        className="items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-3"
        style={{ height: actionSize, width: actionSize, borderRadius: actionSize / 2 }}
      >
        <Ionicons name={icon} size={24} color={color} />
        {badge ? (
          <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-white px-1">
            <Text className="text-[10px] font-black text-black">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-1 text-[11px] font-bold text-[#BDBDBD]">{label}</Text>
    </TouchableOpacity>
  );
};

const HeartAction = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    className="min-w-[76px] items-center justify-center"
    activeOpacity={0.84}
    onPress={onPress}
  >
    <LinearGradient
      colors={["#FFFFFF", "#C0C0C0"]}
      start={{ x: 0.08, y: 0.08 }}
      end={{ x: 1, y: 1 }}
      className="items-center justify-center"
      style={{
        height: likeSize,
        width: likeSize,
        borderRadius: likeSize / 2,
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      }}
    >
      <Ionicons name="heart" size={33} color="#050505" />
    </LinearGradient>
    <Text className="mt-1 text-[11px] font-black text-white">Like</Text>
  </TouchableOpacity>
);
