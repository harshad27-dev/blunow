import React, { useMemo, useState } from "react";
import {
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

const { width } = Dimensions.get("window");
const screenPadding = 20;
const heroWidth = width - screenPadding * 2;

type Category = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type DiscoveryProfile = {
  id: string;
  name: string;
  username: string;
  age: number;
  city: string;
  distance: string;
  imageUrl: string;
  online: boolean;
  verified: boolean;
  match: number;
  intro: string;
  prompt: string;
  interests: string[];
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

const DISCOVERY_PROFILES: DiscoveryProfile[] = [
  {
    id: "1",
    name: "Alexa",
    username: "alexa_design",
    age: 24,
    city: "Bengaluru",
    distance: "2.5 km",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=90",
    online: true,
    verified: true,
    match: 94,
    intro: "Product designer who saves good cafes and overthinks tiny details.",
    prompt: "Ask me about minimalist spaces.",
    interests: ["Design", "UI/UX", "Travel"],
  },
  {
    id: "2",
    name: "Marcus",
    username: "marcus_dev",
    age: 27,
    city: "Hyderabad",
    distance: "5.1 km",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=90",
    online: false,
    verified: true,
    match: 88,
    intro: "Fullstack developer by day, city explorer after dark.",
    prompt: "Currently hunting for the best cold brew.",
    interests: ["Coding", "Gaming", "Coffee"],
  },
  {
    id: "3",
    name: "Sarah",
    username: "sarah_art",
    age: 22,
    city: "Mumbai",
    distance: "1.2 km",
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=1200&q=90",
    online: true,
    verified: false,
    match: 83,
    intro: "Digital artist into surreal posters, galleries, and long walks.",
    prompt: "Invite me to an opening night.",
    interests: ["Art", "Museums", "Painting"],
  },
  {
    id: "4",
    name: "Maya",
    username: "maya.wav",
    age: 25,
    city: "Pune",
    distance: "3.8 km",
    imageUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=90",
    online: true,
    verified: true,
    match: 91,
    intro: "Playlist maker, ramen loyalist, and weekend train-trip planner.",
    prompt: "Send your best live music spot.",
    interests: ["Music", "Food", "Travel"],
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].label);

  const featuredProfile = DISCOVERY_PROFILES[0];
  const nearbyProfiles = useMemo(() => DISCOVERY_PROFILES.slice(1), []);

  const openProfile = (id: string) => {
    router.push(`/(screens)/user/${id}`);
  };

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

          <TouchableOpacity style={styles.iconButton} activeOpacity={0.82}>
            <Ionicons name="options-outline" size={22} color={Colors.textPrimary} />
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
            <Text style={styles.countText}>{DISCOVERY_PROFILES.length} new</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.92}
          onPress={() => openProfile(featuredProfile.id)}
        >
          <Image source={{ uri: featuredProfile.imageUrl }} style={styles.heroImage} />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.18)",
              "rgba(0,0,0,0.08)",
              "rgba(0,0,0,0.72)",
              "rgba(0,0,0,0.96)",
            ]}
            locations={[0, 0.36, 0.7, 1]}
            style={styles.heroGradient}
          />

          <View style={styles.heroTopRow}>
            <View style={styles.livePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.liveText}>Online now</Text>
            </View>
            <View style={styles.matchPill}>
              <Ionicons name="sparkles" size={14} color={Colors.black} />
              <Text style={styles.matchText}>{featuredProfile.match}% match</Text>
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
                {featuredProfile.city} · {featuredProfile.distance} away
              </Text>
            </View>

            <Text style={styles.introText} numberOfLines={2}>
              {featuredProfile.intro}
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
                onPress={(event) => event.stopPropagation()}
              >
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryAction}
                activeOpacity={0.86}
                onPress={(event) => event.stopPropagation()}
              >
                <Ionicons name="heart" size={20} color={Colors.black} />
                <Text style={styles.primaryActionText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryAction}
                activeOpacity={0.84}
                onPress={(event) => event.stopPropagation()}
              >
                <Ionicons name="chatbubble-ellipses" size={21} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.insightStrip}>
          <InsightItem icon="people" value="18" label="Nearby" />
          <View style={styles.divider} />
          <InsightItem icon="radio-button-on" value="7" label="Online" />
          <View style={styles.divider} />
          <InsightItem icon="heart" value="4" label="Liked you" />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fresh nearby</Text>
            <Text style={styles.sectionSubtitle}>People active around your vibe</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileList}>
          {nearbyProfiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              onPress={() => openProfile(profile.id)}
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
}: {
  profile: DiscoveryProfile;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.profileRow} onPress={onPress} activeOpacity={0.88}>
    <View style={styles.avatarWrap}>
      <Image source={{ uri: profile.imageUrl }} style={styles.avatar} />
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
        {profile.prompt}
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
      onPress={(event) => event.stopPropagation()}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    borderColor: "rgba(255,255,255,0.12)",
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
    color: "rgba(255,255,255,0.84)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.12)",
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
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.12)",
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
