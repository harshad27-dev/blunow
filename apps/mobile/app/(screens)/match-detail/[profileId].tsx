import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import {
  useMatchRecommendationsQuery,
  useSendMatchRequestMutation,
} from "@/hooks/queries";

const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

export default function MatchDetailScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { data: profiles = [], isLoading } = useMatchRecommendationsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();
  const profile = profiles.find((item) => item.id === profileId);

  const sendRequest = (message?: string) => {
    if (!profile) return;

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
      <SafeAreaView style={styles.emptyState}>
        <ActivityIndicator color={Colors.textPrimary} size="large" />
        <Text style={styles.loadingText}>Loading real profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.emptyState}>
        <Text style={styles.emptyText}>Profile not found</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
          <Text style={styles.emptyButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            source={{ uri: profile.imageUrl || profile.avatarUrl || fallbackProfileImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <SafeAreaView style={styles.heroSafe} edges={["top", "left", "right"]}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.matchPill}>
                <Ionicons name="sparkles" size={14} color={Colors.black} />
                <Text style={styles.matchText}>{profile.matchScore}% match</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.name}, {profile.age}
                </Text>
                {profile.verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={14} color={Colors.black} />
                  </View>
                ) : null}
              </View>
              <Text style={styles.fullName}>{profile.name} {profile.lastName}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.quickStats}>
            <DetailStat icon="radio-button-on" label={profile.online ? "Online now" : "Away"} />
            <DetailStat icon="location-outline" label={profile.distance} />
            <DetailStat icon="chatbubble-ellipses" label={`${profile.chatRequests} asks`} />
          </View>

          <Section title="About">
            <Text style={styles.quote}>{profile.quote}</Text>
            <InfoRow icon="location-outline" label="Location" value={profile.city} />
            <InfoRow icon="briefcase-outline" label="Work" value={profile.occupation} />
            <InfoRow
              icon={profile.alreadyLikedMe ? "heart" : "eye-outline"}
              label="Signal"
              value={profile.alreadyLikedMe ? "Liked you first" : "Fresh profile"}
            />
          </Section>

          <Section title="Interests">
            <View style={styles.interestRow}>
              {profile.interests.map((interest) => (
                <InterestChip key={interest} label={interest} />
              ))}
            </View>
          </Section>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryAction}
              activeOpacity={0.84}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.86}
              disabled={sendMatchRequest.isPending}
              onPress={() => sendRequest("I would like to connect with you.")}
            >
              <Ionicons name="heart" size={21} color={Colors.black} />
              <Text style={styles.primaryActionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              activeOpacity={0.84}
              disabled={sendMatchRequest.isPending}
              onPress={() => sendRequest("Hi, I would like to chat with you.")}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const DetailStat = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={17} color={Colors.white} />
    <Text style={styles.statText} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={Colors.textPrimary} />
    </View>
    <View style={styles.infoBody}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const InterestChip = ({ label }: { label: string }) => {
  const meta = getInterestMeta(label);

  return (
    <View style={styles.interestChip}>
      <Ionicons name={meta.icon} size={15} color={meta.color} />
      <Text style={styles.interestText}>{label}</Text>
    </View>
  );
};

const getInterestMeta = (label: string) => {
  const interestMeta: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; color: string }
  > = {
    art: { icon: "color-palette", color: "#F97316" },
    coffee: { icon: "cafe", color: "#C8A86B" },
    design: { icon: "sparkles", color: "#A855F7" },
    fashion: { icon: "shirt", color: "#EC4899" },
    fitness: { icon: "barbell", color: "#2DD4BF" },
    football: { icon: "football", color: "#6FBF8A" },
    food: { icon: "restaurant", color: "#F97316" },
    music: { icon: "musical-notes", color: "#EC4899" },
    movies: { icon: "videocam", color: "#38BDF8" },
    startups: { icon: "rocket", color: "#A855F7" },
    travel: { icon: "airplane", color: "#38BDF8" },
  };

  return interestMeta[label.toLowerCase()] || {
    icon: "sparkles" as const,
    color: Colors.textSecondary,
  };
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.bg,
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
    backgroundColor: "rgba(0,0,0,0.48)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  matchPill: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    flexDirection: "row",
    height: 36,
    paddingHorizontal: 12,
  },
  matchText: {
    color: Colors.black,
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
    color: Colors.white,
    flexShrink: 1,
    fontFamily: FontFamily.bold,
    fontSize: 36,
    lineHeight: 42,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginLeft: 10,
    width: 26,
  },
  fullName: {
    color: "rgba(255,255,255,0.7)",
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
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  statText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: 12,
  },
  quote: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: 23,
    marginBottom: 14,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 9,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
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
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  infoValue: {
    color: Colors.textPrimary,
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
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  interestText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 7,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 24,
    flex: 1,
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
  },
  primaryActionText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    marginBottom: 18,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: 14,
  },
  emptyButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
});
