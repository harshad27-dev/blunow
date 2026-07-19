import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, getThemeColors, type ThemeColors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import {
  useMatchRecommendationsQuery,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import { showToast } from "@/utils/toast";

import Reanimated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import type { MatchRecommendation } from "@/types/match.types";

const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

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
    imageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    ],
    interests: ["Food", "Travel", "Art", "Books"],
    matchScore: 78,
    chatRequests: 0,
    alreadyLikedMe: true,
  }
];

export default function MatchDetailScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === "dark" ? "light" : "dark";
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { data: profiles = [], isLoading } = useMatchRecommendationsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();

  let profile = profiles.find((item) => item.id === profileId);
  if (!profile) {
    profile = DUMMY_PROFILES.find((item) => item.id === profileId) || DUMMY_PROFILES[0];
  }

  const sendRequest = (message?: string) => {
    if (!profile) return;

    if (profile.id.startsWith("dummy-")) {
      showToast("They will see your connection request.", "Request sent");
      return;
    }

    sendMatchRequest.mutate(
      { receiverId: profile.id, message },
      {
        onSuccess: (response: any) => {
          const chatId = response?.data?.chat?.id;
          if (chatId) {
            router.push({
              pathname: "/(screens)/chat/[roomId]",
              params: {
                roomId: chatId,
                userId: profile.id,
                name: `${profile.name} ${profile.lastName}`,
                avatarUrl: profile.avatarUrl || profile.imageUrl || "",
              },
            });
            return;
          }

          showToast("They will see your connection request.", "Request sent");
        },
        onError: (error: any) => {
          showToast(
            error?.response?.data?.message || "Unable to send request.",
            "Request failed",
          );
        },
      },
    );
  };

  const isDummyId = profileId?.startsWith("dummy-") || profileId === "1" || profileId === "2" || profileId === "3";

  if (isLoading && !isDummyId) {
    return (
      <SafeAreaView style={[styles.emptyState, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.textPrimary} size="large" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading real profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.emptyState, { backgroundColor: theme.bg }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Profile not found</Text>
        <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.emptyButtonText, { color: theme.textPrimary }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const photos = profile.profilePhotoUrls && profile.profilePhotoUrls.length > 0
    ? profile.profilePhotoUrls
    : [profile.imageUrl || profile.avatarUrl || fallbackProfileImage];

  return (
    <Reanimated.View style={[{ flex: 1, backgroundColor: theme.bg }, styles.root]} entering={FadeIn.duration(400)}>
      <StatusBar style={statusBarStyle} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 }
        ]}
      >
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              if (slide !== activePhotoIndex) {
                setActivePhotoIndex(slide);
              }
            }}
            scrollEventThrottle={16}
            style={StyleSheet.absoluteFillObject}
          >
            {photos.map((photo, index) => {
              const isFirst = index === 0;
              return (
                <Reanimated.Image
                  key={`${photo}-${index}`}
                  {...(isFirst ? ({ sharedTransitionTag: `profile-photo-${profile.id}` } as any) : {})}
                  source={{ uri: photo }}
                  style={{ width: screenWidth, height: 510 }}
                  resizeMode="cover"
                />
              );
            })}
          </ScrollView>

          <LinearGradient
            colors={[
              "rgba(0, 0, 0, 0.45)",
              "transparent",
              "rgba(15, 14, 13, 0.95)",
            ]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Carousel dots */}
          {photos.length > 1 && (
            <View style={styles.heroDots} pointerEvents="none">
              {photos.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    styles.heroDot,
                    {
                      width: idx === activePhotoIndex ? 18 : 6,
                      backgroundColor: idx === activePhotoIndex ? "#fff" : "rgba(255,255,255,0.4)",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          <SafeAreaView style={styles.heroSafe} edges={["top", "left", "right"]} pointerEvents="box-none">
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={[styles.matchPill, { backgroundColor: "rgba(255, 255, 255, 0.22)", borderColor: "rgba(255, 255, 255, 0.3)" }]}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={[styles.matchText, { color: "#fff" }]}>{profile.matchScore}% match</Text>
              </View>
            </View>

            <View style={styles.heroCopy} pointerEvents="none">
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.name}, {profile.age}
                </Text>
                {profile.verified ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.success }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                ) : null}
              </View>
              <Text style={styles.fullName}>{profile.name} {profile.lastName}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {/* Quick stats grid */}
          <Reanimated.View
            entering={FadeInDown.delay(200).duration(450).springify().damping(15)}
            style={styles.quickStats}
          >
            <DetailStat icon="radio-button-on" label={profile.online ? "Online now" : "Away"} theme={theme} />
            <DetailStat icon="location-outline" label={profile.distance} theme={theme} />
            <DetailStat icon="chatbubble-ellipses" label={`${profile.chatRequests} asks`} theme={theme} />
          </Reanimated.View>

          {/* About section */}
          <Reanimated.View
            entering={FadeInDown.delay(350).duration(450).springify().damping(15)}
          >
            <Section title="About" theme={theme}>
              <View style={[styles.quoteContainer, { borderLeftColor: theme.primaryLight }]}>
                <Text style={[styles.quote, { color: theme.textSecondary }]}>"{profile.quote}"</Text>
              </View>
              <InfoRow icon="location-outline" label="Location" value={profile.city} theme={theme} />
              <InfoRow icon="briefcase-outline" label="Work" value={profile.occupation} theme={theme} />
              <InfoRow
                icon={profile.alreadyLikedMe ? "heart" : "eye-outline"}
                label="Signal"
                value={profile.alreadyLikedMe ? "Liked you first" : "Fresh profile"}
                theme={theme}
              />
            </Section>
          </Reanimated.View>

          {/* Interests section */}
          <Reanimated.View
            entering={FadeInDown.delay(500).duration(450).springify().damping(15)}
          >
            <Section title="Interests" theme={theme}>
              <View style={styles.interestRow}>
                {profile.interests.map((interest) => (
                  <InterestChip key={interest} label={interest} theme={theme} />
                ))}
              </View>
            </Section>
          </Reanimated.View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <Reanimated.View
        entering={FadeInUp.delay(650).duration(500).springify()}
        style={[
          styles.actionFloatingBar,
          {
            backgroundColor: theme.bg === "#0F0E0D" ? "rgba(23, 20, 18, 0.95)" : "rgba(255, 255, 255, 0.95)",
            borderColor: theme.border,
            bottom: Math.max(insets.bottom + 12, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionCircle, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
          activeOpacity={0.82}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonLike, { backgroundColor: theme.primary }]}
          activeOpacity={0.86}
          disabled={sendMatchRequest.isPending}
          onPress={() => sendRequest("I would like to connect with you.")}
        >
          {sendMatchRequest.isPending ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <>
              <Ionicons name="heart" size={20} color={theme.textInverse} />
              <Text style={[styles.actionButtonLikeText, { color: theme.textInverse }]}>Like</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCircle, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
          activeOpacity={0.82}
          disabled={sendMatchRequest.isPending}
          onPress={() => sendRequest("Hi, I would like to chat with you.")}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
      </Reanimated.View>
    </Reanimated.View>
  );
}

const DetailStat = ({
  icon,
  label,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: ThemeColors;
}) => (
  <View style={[styles.statItem, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
    <Ionicons name={icon} size={17} color={theme.textPrimary} />
    <Text style={[styles.statText, { color: theme.textPrimary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Section = ({ title, children, theme }: { title: string; children: React.ReactNode; theme: ThemeColors }) => (
  <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: ThemeColors;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: theme.bgElevated }]}>
      <Ionicons name={icon} size={18} color={theme.textPrimary} />
    </View>
    <View style={styles.infoBody}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  </View>
);

const InterestChip = ({ label, theme }: { label: string; theme: ThemeColors }) => {
  const meta = getInterestMeta(label, theme);

  return (
    <View style={[styles.interestChip, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
      <Ionicons name={meta.icon} size={15} color={meta.color} />
      <Text style={[styles.interestText, { color: theme.textPrimary }]}>{label}</Text>
    </View>
  );
};

const getInterestMeta = (label: string, theme: ThemeColors) => {
  const interestMeta: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; color: string }
  > = {
    art: { icon: "color-palette", color: theme.warning },
    coffee: { icon: "cafe", color: theme.primaryLight },
    design: { icon: "sparkles", color: theme.accent },
    fashion: { icon: "shirt", color: theme.secondaryLight },
    fitness: { icon: "barbell", color: theme.success },
    football: { icon: "football", color: theme.success },
    food: { icon: "restaurant", color: theme.warning },
    music: { icon: "musical-notes", color: theme.secondary },
    movies: { icon: "videocam", color: theme.primaryLight },
    startups: { icon: "rocket", color: theme.accent },
    travel: { icon: "airplane", color: theme.primaryLight },
  };

  return interestMeta[label.toLowerCase()] || {
    icon: "sparkles" as const,
    color: theme.textSecondary,
  };
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    height: 510,
    overflow: "hidden",
  },
  heroImage: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  heroSafe: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.38)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  matchPill: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    height: 36,
    paddingHorizontal: 12,
  },
  matchText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 6,
  },
  heroCopy: {
    padding: 22,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  name: {
    color: "#fff",
    flexShrink: 1,
    fontFamily: FontFamily.bold,
    fontSize: 36,
    lineHeight: 42,
  },
  verifiedBadge: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginLeft: 10,
    width: 26,
  },
  fullName: {
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  quickStats: {
    flexDirection: "row",
    gap: 10,
  },
  statItem: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  statText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: 12,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 16,
  },
  quote: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: 23,
    fontStyle: "italic",
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 9,
  },
  infoIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginRight: 12,
    width: 36,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  infoValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginTop: 2,
  },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  interestText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 7,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    marginBottom: 18,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: 14,
  },
  emptyButton: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  heroDots: {
    position: "absolute",
    bottom: 22,
    right: 22,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  heroDot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  actionFloatingBar: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonLike: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonLikeText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
