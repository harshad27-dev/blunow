import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const { height } = Dimensions.get("window");

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
  coffee: { icon: "cafe", color: "#F59E0B" },
  design: { icon: "sparkles", color: "#A855F7" },
  fashion: { icon: "shirt", color: "#8B5CF6" },
  fitness: { icon: "barbell", color: "#2DD4BF" },
  football: { icon: "football", color: "#EC4899" },
  food: { icon: "restaurant", color: "#F97316" },
  gym: { icon: "barbell", color: "#2DD4BF" },
  modeling: { icon: "sparkles", color: "#FBBF24" },
  movies: { icon: "videocam", color: "#38BDF8" },
  music: { icon: "musical-notes", color: "#EC4899" },
  ramen: { icon: "restaurant", color: "#F97316" },
  startups: { icon: "rocket", color: "#A855F7" },
  sushi: { icon: "fast-food", color: "#A855F7" },
  travel: { icon: "airplane", color: "#38BDF8" },
};

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const profile = suggestedProfiles[activeIndex];
  const cardHeight = Math.min(height - insets.top - insets.bottom - 160, height * 0.76);

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
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      <View
        className="flex-1 px-[22px]"
        style={{ paddingTop: Math.max(insets.top + 16, 42) }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-7"
          contentContainerClassName="items-center gap-4 pr-2"
        >
          <FilterPill label="Nearby" icon="location" active />
          <FilterPill label="Online" icon="ellipse" dot />
          <FilterPill label="New" icon="sparkles" />
          <FilterPill label="Verified" icon="shield-checkmark" />
          <TouchableOpacity
            className="h-[62px] w-[62px] items-center justify-center rounded-[28px] bg-[#111111]"
            activeOpacity={0.86}
          >
            <Ionicons name="options-outline" size={29} color="#F5F5F5" />
          </TouchableOpacity>
        </ScrollView>

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-medium text-[#D5D5D5]">
            Showing people near you
          </Text>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location" size={19} color="#7D7D82" />
            <Text className="text-[17px] font-semibold text-[#BDBDC4]">
              {profile.distance}
            </Text>
          </View>
        </View>

        <Animated.View
          className="overflow-hidden rounded-[34px] border border-white/10 bg-[#0B0B0D]"
          style={{
            height: cardHeight,
            opacity: fade,
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.16,
            shadowRadius: 18,
          }}
        >
          <Image
            key={profile.id}
            source={{ uri: profile.imageUrl }}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.08)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.16)",
              "rgba(0,0,0,0.96)",
            ]}
            locations={[0, 0.34, 0.52, 1]}
            className="absolute inset-0"
          />

          <View className="absolute left-7 right-6 top-6 flex-row items-center justify-between">
            <View className="h-[54px] flex-row items-center gap-2 rounded-full bg-black/45 px-5">
              <View
                className={`h-3 w-3 rounded-full ${
                  profile.online ? "bg-[#18D88E]" : "bg-[#8B909C]"
                }`}
              />
              <Text className="text-xl font-semibold text-white">
                {profile.online ? "Online" : "Away"}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <SmallGlassButton icon="heart" onPress={handleLike} />
              <SmallGlassButton icon="ellipsis-horizontal" onPress={() => {}} />
            </View>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-7 pb-7">
            <View className="flex-row items-end">
              <Text className="text-[48px] font-black leading-[54px] text-white">
                {profile.name}
              </Text>
              <Text
                className="ml-2 text-[48px] font-black leading-[54px] text-[#8B5CF6]"
                style={{ fontStyle: "italic" }}
              >
                {profile.lastName}
              </Text>
              {profile.verified ? (
                <View className="mb-2 ml-3 h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]">
                  <Ionicons name="checkmark" size={17} color={Colors.white} />
                </View>
              ) : null}
              <Text className="mb-1 ml-3 text-2xl font-semibold text-white">
                {profile.age}
              </Text>
            </View>

            <ProfileMeta icon="location" label={profile.city} />
            <ProfileMeta icon="briefcase" label={profile.occupation} accent />

            <View className="mt-4 self-start flex-row items-center gap-2 rounded-full border border-white/10 bg-white/12 px-4 py-2">
              <Ionicons name="sparkles" size={17} color="#FBBF24" />
              <Text className="text-[15px] font-bold text-white">
                {profile.matchScore}% Compatibility
              </Text>
            </View>

            <View className="my-5 h-px bg-white/12" />

            <Text className="mb-3 text-xl font-medium text-[#D6D1D9]">
              Interests
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {profile.interests.map((interest) => (
                <InterestChip key={interest} label={interest} />
              ))}
            </View>

            <View className="mt-7 flex-row">
              <Ionicons name="chatbubble-ellipses" size={32} color="#8B5CF6" />
              <Text className="ml-4 flex-1 text-[24px] font-medium leading-8 text-[#D8D8D8]">
                {profile.quote}
              </Text>
            </View>

            <View className="mt-9 flex-row items-center justify-between px-1">
              <RoundAction icon="close" onPress={handleSkip} />
              <RoundAction
                icon="chatbubble-ellipses"
                badge={profile.chatRequests}
                onPress={handleChatRequest}
              />
              <HeartAction onPress={handleLike} />
              <RoundAction icon="sparkles" onPress={handleMatchRequest} />
            </View>
          </View>
        </Animated.View>
      </View>

      {matchBanner ? (
        <View className="absolute inset-0 z-20 items-center justify-center bg-black/80 px-8">
          <LinearGradient
            colors={["#EC4899", "#FF6A3D"]}
            className="h-28 w-28 items-center justify-center rounded-full"
          >
            <Ionicons name="heart" size={52} color="#FFFFFF" />
          </LinearGradient>
          <Text className="mt-7 text-center text-[42px] font-black text-white">
            {"It's a Match!"}
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-white/72">
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
              className="h-14 items-center justify-center rounded-full border border-white/15 bg-white/10 px-6"
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

const FilterPill = ({
  label,
  icon,
  active,
  dot,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  dot?: boolean;
}) => (
  <TouchableOpacity
    className={`h-[62px] flex-row items-center gap-2 rounded-[28px] px-5 ${
      active ? "bg-[#1D0B64]" : "bg-[#111111]"
    }`}
    activeOpacity={0.86}
  >
    <Ionicons
      name={icon}
      size={dot ? 13 : 23}
      color={dot ? "#18D88E" : active ? "#8B5CF6" : "#8B5CF6"}
    />
    <Text className="text-xl font-bold text-white">{label}</Text>
  </TouchableOpacity>
);

const SmallGlassButton = ({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="h-[68px] w-[68px] items-center justify-center rounded-full bg-black/45"
    onPress={onPress}
    activeOpacity={0.84}
  >
    <Ionicons name={icon} size={30} color="#FFFFFF" />
  </TouchableOpacity>
);

const ProfileMeta = ({
  icon,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent?: boolean;
}) => (
  <View className="mt-3 flex-row items-center gap-3">
    <Ionicons name={icon} size={20} color="#C9C9D1" />
    <Text
      className={`text-xl font-medium ${
        accent ? "text-[#A986FF]" : "text-[#E8E8EC]"
      }`}
    >
      {label}
    </Text>
  </View>
);

const InterestChip = ({ label }: { label: string }) => {
  const meta = interestMeta[label.toLowerCase()] || {
    icon: "sparkles" as const,
    color: "#A855F7",
  };

  return (
    <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/12 px-4 py-2.5">
      <Ionicons name={meta.icon} size={20} color={meta.color} />
      <Text className="text-[17px] font-medium text-white">{label}</Text>
    </View>
  );
};

const RoundAction = ({
  icon,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}) => (
  <TouchableOpacity
    className="h-[86px] w-[86px] items-center justify-center rounded-full bg-[#111113]"
    onPress={onPress}
    activeOpacity={0.82}
  >
    <Ionicons name={icon} size={38} color="#FFFFFF" />
    {badge ? (
      <View className="absolute -right-1 top-0 h-8 min-w-8 items-center justify-center rounded-full bg-[#8B5CF6] px-2">
        <Text className="text-base font-black text-white">{badge}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

const HeartAction = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.84} onPress={onPress}>
    <LinearGradient
      colors={["#EC1AAE", "#FF6A3D"]}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      className="h-[106px] w-[106px] items-center justify-center rounded-full"
      style={{
        shadowColor: "#EC4899",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.72,
        shadowRadius: 18,
      }}
    >
      <Ionicons name="heart" size={52} color="#FFFFFF" />
    </LinearGradient>
  </TouchableOpacity>
);
