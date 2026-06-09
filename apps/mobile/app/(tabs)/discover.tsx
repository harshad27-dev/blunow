import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import {
  useDiscoverPeopleQuery,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type { DiscoverProfile } from "@/types/match.types";

const { width } = Dimensions.get("window");
const screenPadding = 20;
const heroWidth = width - screenPadding * 2;
const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

type Category = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = [
  { label: "For you", icon: "sparkles" },
  { label: "Nearby", icon: "location" },
  { label: "Online", icon: "radio-button-on" },
  { label: "Music", icon: "musical-notes" },
  { label: "Art", icon: "color-palette" },
  { label: "Travel", icon: "airplane" },
  { label: "Coding", icon: "code-slash" },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].label);
  const { data: profiles = [], isLoading, refetch, isFetching } =
    useDiscoverPeopleQuery();
  const sendMatchRequest = useSendMatchRequestMutation();

  const featuredProfile = profiles[0];
  const nearbyProfiles = useMemo(() => profiles.slice(1), [profiles]);

  const openProfile = (id: string) => {
    router.push(`/(screens)/user/${id}`);
  };

  const sendRequest = (
    profile: DiscoverProfile,
    message = "I would like to connect with you.",
  ) => {
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
                name: profile.name,
                avatarUrl:
                  profile.avatarUrl || profile.imageUrl || fallbackProfileImage,
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
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.textPrimary} size="large" />
          <Text style={styles.centerStateText}>Finding real profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!featuredProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Discover people</Text>
            <Text style={styles.title}>Find your next real connection</Text>
          </View>
        </View>
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={34} color={Colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No profiles yet</Text>
          <Text style={styles.emptyText}>
            Real users will appear here after they create an account and complete
            their profile.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.84}
          >
            {isFetching ? (
              <ActivityIndicator color={Colors.black} size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color={Colors.black} />
                <Text style={styles.retryText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>
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
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Discover people</Text>
            <Text style={styles.title}>Find your next real connection</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.82}
            onPress={() => refetch()}
          >
            {isFetching ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Ionicons name="refresh" size={22} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/search")}
          activeOpacity={0.86}
        >
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <Text style={styles.searchText}>Search names, interests, places</Text>
          <View style={styles.searchAction}>
            <Ionicons name="arrow-forward" size={16} color={Colors.black} />
          </View>
        </TouchableOpacity>

        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const active = selectedCategory === item.label;

            return (
              <TouchableOpacity
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item.label)}
                activeOpacity={0.84}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={active ? Colors.black : Colors.textSecondary}
                />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Top pick today</Text>
            <Text style={styles.sectionSubtitle}>Based on shared interests and activity</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{profiles.length} new</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.92}
          onPress={() => openProfile(featuredProfile.id)}
        >
          <Image
            source={{ uri: featuredProfile.imageUrl || fallbackProfileImage }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={[
              Colors.overlayDarkSoft,
              Colors.transparent,
              Colors.overlayDark,
              Colors.overlayDarkStrong,
            ]}
            locations={[0, 0.36, 0.7, 1]}
            style={styles.heroGradient}
          />

          <View style={styles.heroTopRow}>
            <View style={styles.livePill}>
              <View
                style={[
                  styles.onlineDot,
                  !featuredProfile.online && styles.offlineDot,
                ]}
              />
              <Text style={styles.liveText}>
                {featuredProfile.online ? "Online now" : "Recently active"}
              </Text>
            </View>
            <View style={styles.matchPill}>
              <Ionicons name="sparkles" size={14} color={Colors.black} />
              <Text style={styles.matchText}>{featuredProfile.matchScore}% match</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {featuredProfile.name}, {featuredProfile.age}
              </Text>
              {featuredProfile.verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={14} color={Colors.black} />
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {featuredProfile.city} - {featuredProfile.distance}
              </Text>
            </View>

            <Text style={styles.introText} numberOfLines={2}>
              {featuredProfile.quote}
            </Text>

            <View style={styles.interestRow}>
              {featuredProfile.interests.map((interest) => (
                <InterestTag key={interest} label={interest} />
              ))}
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                activeOpacity={0.84}
                onPress={(event) => {
                  event.stopPropagation();
                  refetch();
                }}
              >
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryAction}
                activeOpacity={0.86}
                disabled={sendMatchRequest.isPending}
                onPress={(event) => {
                  event.stopPropagation();
                  sendRequest(featuredProfile);
                }}
              >
                <Ionicons name="heart" size={20} color={Colors.black} />
                <Text style={styles.primaryActionText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryAction}
                activeOpacity={0.84}
                disabled={sendMatchRequest.isPending}
                onPress={(event) => {
                  event.stopPropagation();
                  sendRequest(featuredProfile, "Hi, I would like to chat with you.");
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={21} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.insightStrip}>
          <InsightItem icon="people" value={`${profiles.length}`} label="Nearby" />
          <View style={styles.divider} />
          <InsightItem
            icon="radio-button-on"
            value={`${profiles.filter((profile) => profile.online).length}`}
            label="Online"
          />
          <View style={styles.divider} />
          <InsightItem
            icon="heart"
            value={`${profiles.filter((profile) => profile.isConnected).length}`}
            label="Connected"
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fresh nearby</Text>
            <Text style={styles.sectionSubtitle}>People active around your vibe</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => refetch()}>
            <Text style={styles.seeAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileList}>
          {nearbyProfiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              onPress={() => openProfile(profile.id)}
              onConnect={() => sendRequest(profile)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InterestTag = ({ label }: { label: string }) => (
  <View style={styles.interestTag}>
    <Text style={styles.interestText}>{label}</Text>
  </View>
);

const InsightItem = ({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) => (
  <View style={styles.insightItem}>
    <Ionicons name={icon} size={18} color={Colors.textPrimary} />
    <Text style={styles.insightValue}>{value}</Text>
    <Text style={styles.insightLabel}>{label}</Text>
  </View>
);

const ProfileRow = ({
  profile,
  onPress,
  onConnect,
}: {
  profile: DiscoverProfile;
  onPress: () => void;
  onConnect: () => void;
}) => (
  <TouchableOpacity style={styles.profileRow} onPress={onPress} activeOpacity={0.88}>
    <View style={styles.avatarWrap}>
      <Image
        source={{ uri: profile.avatarUrl || profile.imageUrl || fallbackProfileImage }}
        style={styles.avatar}
      />
      {profile.online ? <View style={styles.avatarOnlineDot} /> : null}
    </View>

    <View style={styles.profileBody}>
      <View style={styles.profileNameRow}>
        <Text style={styles.profileName} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>
        <Text style={styles.profileDistance}>{profile.distance}</Text>
      </View>
      <Text style={styles.profilePrompt} numberOfLines={1}>
        {profile.quote}
      </Text>
      <View style={styles.profileTags}>
        {profile.interests.slice(0, 2).map((interest) => (
          <InterestTag key={interest} label={interest} />
        ))}
      </View>
    </View>

    <TouchableOpacity
      style={styles.rowAction}
      activeOpacity={0.82}
      onPress={(event) => {
        event.stopPropagation();
        onConnect();
      }}
    >
      <Ionicons name="heart-outline" size={21} color={Colors.textPrimary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
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
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginTop: 18,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 310,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 22,
    flexDirection: "row",
    height: 44,
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 18,
  },
  retryText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: 8,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: screenPadding,
    paddingTop: 10,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    letterSpacing: 0,
    lineHeight: 36,
    maxWidth: width - 104,
  },
  iconButton: {
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
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    height: 58,
    marginHorizontal: screenPadding,
    marginTop: 22,
    paddingLeft: 16,
    paddingRight: 8,
  },
  searchText: {
    color: Colors.textSecondary,
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    marginLeft: 12,
  },
  searchAction: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoriesList: {
    gap: 10,
    paddingHorizontal: screenPadding,
    paddingTop: 18,
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    height: 42,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginLeft: 8,
  },
  categoryTextActive: {
    color: Colors.black,
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    paddingHorizontal: screenPadding,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  countPill: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  heroCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: Math.min(heroWidth * 1.24, 520),
    marginHorizontal: screenPadding,
    marginTop: 16,
    overflow: "hidden",
    width: heroWidth,
  },
  heroImage: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    top: 16,
  },
  livePill: {
    alignItems: "center",
    backgroundColor: Colors.overlayDark,
    borderColor: Colors.overlayLightSoft,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  onlineDot: {
    backgroundColor: Colors.success,
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  offlineDot: {
    backgroundColor: Colors.textSecondary,
  },
  liveText: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  matchPill: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  matchText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 5,
  },
  heroContent: {
    bottom: 0,
    left: 0,
    padding: 22,
    position: "absolute",
    right: 0,
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  heroName: {
    color: Colors.white,
    flexShrink: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    letterSpacing: 0,
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
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 7,
  },
  metaText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginLeft: 6,
  },
  introText: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginTop: 12,
  },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  interestTag: {
    backgroundColor: Colors.overlayLightSoft,
    borderColor: Colors.overlayLightSoft,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  interestText: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: Colors.overlayLightSoft,
    borderColor: Colors.overlayLightSoft,
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 23,
    flex: 1,
    flexDirection: "row",
    height: 46,
    justifyContent: "center",
  },
  primaryActionText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginLeft: 8,
  },
  insightStrip: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: screenPadding,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  insightItem: {
    alignItems: "center",
    flex: 1,
  },
  insightValue: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginTop: 6,
  },
  insightLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  divider: {
    backgroundColor: Colors.border,
    height: 42,
    width: 1,
  },
  seeAllText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    paddingBottom: 2,
  },
  profileList: {
    gap: 12,
    marginTop: 14,
    paddingHorizontal: screenPadding,
  },
  profileRow: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 104,
    padding: 12,
  },
  avatarWrap: {
    height: 76,
    width: 76,
  },
  avatar: {
    borderRadius: 20,
    height: 76,
    width: 76,
  },
  avatarOnlineDot: {
    backgroundColor: Colors.success,
    borderColor: Colors.bgCard,
    borderRadius: 7,
    borderWidth: 2,
    bottom: 1,
    height: 14,
    position: "absolute",
    right: 1,
    width: 14,
  },
  profileBody: {
    flex: 1,
    marginLeft: 13,
  },
  profileNameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileName: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    marginRight: 8,
  },
  profileDistance: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  profilePrompt: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 5,
  },
  profileTags: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },
  rowAction: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginLeft: 10,
    width: 40,
  },
});
