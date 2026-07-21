import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getThemeColors, type ThemeColors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import {
  useMatchRecommendationsQuery,
  useSendMatchRequestMutation,
} from "@/hooks/queries";
import type { MatchRecommendation } from "@/types/match.types";
import { showToast } from "@/utils/toast";

const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

const HERO_HEIGHT = 500;
const ACTION_BAR_HEIGHT = 70;

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
    quote: "Life is short, make every moment count.",
    imageUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=90",
    avatarUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=90",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=90",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=90",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=90",
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
    quote: "Always curious, forever learning. Let's grab coffee.",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=90",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=90",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=90",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&q=90",
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
    quote: "Building cool things and exploring hidden food spots.",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=90",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=90",
    profilePhotoUrls: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=90",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=90",
    ],
    interests: ["Food", "Travel", "Art", "Books"],
    matchScore: 78,
    chatRequests: 0,
    alreadyLikedMe: true,
  },
];

export default function MatchDetailScreen() {
  const router = useRouter();
  const {
    profileId,
    initialPhotoIndex: initialPhotoIndexParam,
  } = useLocalSearchParams<{
    profileId: string;
    initialPhotoIndex?: string;
  }>();

  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const statusBarStyle = colorScheme === "dark" ? "light" : "dark";
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const compactLayout = useMemo(() => {
    const isShortScreen = screenHeight < 760;
    const heroHeight = Math.min(
      isShortScreen ? 430 : HERO_HEIGHT,
      Math.max(screenHeight * 0.58, 390),
    );
    const actionBarHeight = isShortScreen ? 64 : ACTION_BAR_HEIGHT;

    return {
      actionBarHeight,
      actionCircleSize: isShortScreen ? 48 : 52,
      heroHeight,
      horizontalPadding: screenWidth < 380 ? 14 : 16,
      likeHeight: isShortScreen ? 48 : 52,
      topBarButtonSize: isShortScreen ? 40 : 42,
    };
  }, [screenHeight, screenWidth]);

  const parsedInitialIndex = Number.parseInt(
    initialPhotoIndexParam ?? "0",
    10,
  );

  const [activePhotoIndex, setActivePhotoIndex] = useState(
    Number.isFinite(parsedInitialIndex) && parsedInitialIndex >= 0
      ? parsedInitialIndex
      : 0,
  );
  const photoListRef = useRef<FlatList<string>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data: profiles = [], isLoading } =
    useMatchRecommendationsQuery();
  const sendMatchRequest = useSendMatchRequestMutation();

  const profile = useMemo(() => {
    return (
      profiles.find((item) => item.id === profileId) ??
      DUMMY_PROFILES.find((item) => item.id === profileId) ??
      DUMMY_PROFILES[0]
    );
  }, [profiles, profileId]);

  const isDummyId =
    profileId?.startsWith("dummy-") ||
    profileId === "1" ||
    profileId === "2" ||
    profileId === "3";

  const photos = useMemo(() => {
    if (!profile) return [fallbackProfileImage];

    if (
      profile.profilePhotoUrls &&
      profile.profilePhotoUrls.length > 0
    ) {
      return profile.profilePhotoUrls;
    }

    return [
      profile.imageUrl ||
        profile.avatarUrl ||
        fallbackProfileImage,
    ];
  }, [profile]);

  const visiblePhotoIndex = Math.min(
    activePhotoIndex,
    Math.max(photos.length - 1, 0),
  );
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 120, 220],
    outputRange: [0, 0.65, 1],
    extrapolate: "clamp",
  });

  const sendRequest = (message?: string) => {
    if (!profile) return;

    if (profile.id.startsWith("dummy-")) {
      showToast(
        "They will see your connection request.",
        "Request sent",
      );
      return;
    }

    sendMatchRequest.mutate(
      {
        receiverId: profile.id,
        message,
      },
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
                avatarUrl:
                  profile.avatarUrl ||
                  profile.imageUrl ||
                  "",
              },
            });
            return;
          }

          showToast(
            "They will see your connection request.",
            "Request sent",
          );
        },
        onError: (error: any) => {
          showToast(
            error?.response?.data?.message ||
              "Unable to send request.",
            "Request failed",
          );
        },
      },
    );
  };

  const handlePhotoScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / screenWidth,
    );

    if (index !== activePhotoIndex) {
      setActivePhotoIndex(index);
    }
  };

  const selectPhoto = (index: number) => {
    setActivePhotoIndex(index);
    photoListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  if (isLoading && !isDummyId) {
    return (
      <SafeAreaView
        style={[
          styles.emptyState,
          { backgroundColor: theme.bg },
        ]}
      >
        <ActivityIndicator
          color={theme.primary}
          size="large"
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.textSecondary },
          ]}
        >
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView
        style={[
          styles.emptyState,
          { backgroundColor: theme.bg },
        ]}
      >
        <Ionicons
          name="person-circle-outline"
          size={72}
          color={theme.textSecondary}
        />
        <Text
          style={[
            styles.emptyText,
            { color: theme.textPrimary },
          ]}
        >
          Profile not found
        </Text>

        <TouchableOpacity
          style={[
            styles.emptyButton,
            {
              backgroundColor: theme.primary,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.emptyButtonText,
              { color: theme.textInverse },
            ]}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const lifestyleItems = [
    {
      icon: "wine-outline" as const,
      label: "Drinks",
      value: "Socially",
    },
    {
      icon: "barbell-outline" as const,
      label: "Fitness",
      value: profile.interests.some(
        (item) => item.toLowerCase() === "fitness",
      )
        ? "Active"
        : "Sometimes",
    },
    {
      icon: "paw-outline" as const,
      label: "Pets",
      value: "Likes pets",
    },
    {
      icon: "moon-outline" as const,
      label: "Routine",
      value: "Night owl",
    },
  ];

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.bg },
      ]}
    >
      <StatusBar
        style={statusBarStyle}
        translucent
        backgroundColor="transparent"
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.fixedTopBarBg,
          {
            backgroundColor: theme.bg,
            borderBottomColor: theme.border,
            height: insets.top + 70,
            opacity: headerBgOpacity,
          },
        ]}
      />

      <View style={[styles.fixedTopBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[
            styles.glassButton,
            {
              borderRadius: compactLayout.topBarButtonSize / 2,
              height: compactLayout.topBarButtonSize,
              width: compactLayout.topBarButtonSize,
            },
          ]}
          activeOpacity={0.82}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <View style={styles.glassPill}>
            <Ionicons
              name="images-outline"
              size={15}
              color="#FFFFFF"
            />
            <Text style={styles.glassPillText}>
              {visiblePhotoIndex + 1}/{photos.length}
            </Text>
          </View>

          <View style={styles.glassPill}>
            <Ionicons
              name="sparkles"
              size={15}
              color="#FFFFFF"
            />
            <Text style={styles.glassPillText}>
              {profile.matchScore}%
            </Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + compactLayout.actionBarHeight + 26,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: { y: scrollY },
              },
            },
          ],
          { useNativeDriver: true },
        )}
      >
        <View style={[styles.hero, { height: compactLayout.heroHeight }]}>
          <View style={StyleSheet.absoluteFillObject}>
            <FlatList
              ref={photoListRef}
              data={photos}
              horizontal
              pagingEnabled
              initialScrollIndex={visiblePhotoIndex}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) =>
                `${item}-${index}`
              }
              onMomentumScrollEnd={handlePhotoScrollEnd}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  resizeMode="cover"
                  style={{
                    width: screenWidth,
                    height: compactLayout.heroHeight,
                  }}
                />
              )}
            />
          </View>

          <LinearGradient
            colors={[
              "rgba(0,0,0,0.58)",
              "rgba(0,0,0,0.02)",
              "rgba(0,0,0,0.86)",
            ]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <SafeAreaView
            style={styles.heroSafe}
            edges={["left", "right"]}
            pointerEvents="box-none"
          >
            <View style={styles.heroBottom}>
              <View style={styles.heroStatusRow}>
                <StatusBadge
                  icon="radio-button-on"
                  label={
                    profile.online
                      ? "Online now"
                      : "Recently active"
                  }
                  dotColor={
                    profile.online
                      ? theme.success
                      : "rgba(255,255,255,0.72)"
                  }
                />

                {profile.verified ? (
                  <StatusBadge
                    icon="shield-checkmark"
                    label="Verified"
                    dotColor={theme.success}
                  />
                ) : null}
              </View>

              <View style={styles.heroNameRow}>
                <Text
                  style={styles.heroName}
                  numberOfLines={1}
                >
                  {profile.name}, {profile.age}
                </Text>

                {profile.verified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#70D6FF"
                  />
                ) : null}
              </View>

              <Text
                style={styles.heroOccupation}
                numberOfLines={1}
              >
                {profile.occupation}
              </Text>

              <View style={styles.heroMetaRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color="rgba(255,255,255,0.88)"
                />
                <Text
                  style={styles.heroMetaText}
                  numberOfLines={1}
                >
                  {profile.city}
                </Text>
                <View style={styles.heroMetaDot} />
                <Text style={styles.heroMetaText}>
                  {profile.distance} away
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View
          style={[
            styles.body,
            {
              backgroundColor: theme.bg,
              paddingHorizontal: compactLayout.horizontalPadding,
            },
          ]}
        >
          <View>
            <View
              style={[
                styles.profileSummaryCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.profileSummaryTop}>
                <Image
                  source={{
                    uri:
                      profile.avatarUrl ||
                      profile.imageUrl ||
                      fallbackProfileImage,
                  }}
                  style={[
                    styles.avatar,
                    {
                      borderColor: theme.bgCard,
                    },
                  ]}
                />

                <View style={styles.summaryIdentity}>
                  <Text
                    style={[
                      styles.summaryName,
                      { color: theme.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {profile.name} {profile.lastName}
                  </Text>
                  <Text
                    style={[
                      styles.summaryOccupation,
                      { color: theme.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {profile.occupation}
                  </Text>
                </View>

                <MatchRing
                  score={profile.matchScore}
                  theme={theme}
                />
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={styles.summaryStats}>
                <MiniStat
                  icon="navigate-outline"
                  value={profile.distance}
                  label="Distance"
                  theme={theme}
                />
                <MiniStat
                  icon="chatbubble-ellipses-outline"
                  value={`${profile.chatRequests}`}
                  label="Requests"
                  theme={theme}
                />
                <MiniStat
                  icon={
                    profile.alreadyLikedMe
                      ? "heart"
                      : "eye-outline"
                  }
                  value={
                    profile.alreadyLikedMe
                      ? "Liked you"
                      : "New"
                  }
                  label="Signal"
                  theme={theme}
                />
              </View>
            </View>
          </View>

          {photos.length > 1 ? (
            <View style={styles.thumbnailRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.thumbnailContent
                }
              >
                {photos.map((photo, index) => {
                  const active =
                    index === visiblePhotoIndex;

                  return (
                    <TouchableOpacity
                      key={`${photo}-thumb-${index}`}
                      activeOpacity={0.86}
                      onPress={() => selectPhoto(index)}
                      style={[
                        styles.thumbnailButton,
                        {
                          borderColor: active
                            ? theme.primary
                            : theme.border,
                          opacity: active ? 1 : 0.62,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={styles.thumbnailImage}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View>
            <PremiumSection
              icon="person-outline"
              title="About me"
              theme={theme}
            >
              <View
                style={[
                  styles.quoteCard,
                  {
                    backgroundColor: theme.bgElevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.quoteAccent,
                    { backgroundColor: theme.primaryLight },
                  ]}
                />

                <Text
                  style={[
                    styles.quoteMark,
                    { color: theme.primaryLight },
                  ]}
                >
                  {'"'}
                </Text>

                <View style={styles.quoteBody}>
                  <Text
                    style={[
                      styles.quoteText,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {profile.quote}
                  </Text>

                  <View style={styles.quoteFooter}>
                    <Ionicons
                      name="sparkles"
                      size={15}
                      color={theme.primaryLight}
                    />
                    <Text
                      style={[
                        styles.quoteFooterText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      In their own words
                    </Text>
                  </View>
                </View>
              </View>
            </PremiumSection>
          </View>

          <View>
            <PremiumSection
              icon="heart-outline"
              title="Interests"
              theme={theme}
            >
              <View style={styles.interestWrap}>
                {profile.interests.map((interest) => (
                  <InterestChip
                    key={interest}
                    label={interest}
                    theme={theme}
                  />
                ))}
              </View>
            </PremiumSection>
          </View>

          <View>
            <PremiumSection
              icon="grid-outline"
              title="Lifestyle"
              theme={theme}
            >
              <View style={styles.lifestyleGrid}>
                {lifestyleItems.map((item) => (
                  <LifestyleTile
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    value={item.value}
                    theme={theme}
                  />
                ))}
              </View>
            </PremiumSection>
          </View>

          <View>
            <PremiumSection
              icon="information-circle-outline"
              title="Profile details"
              theme={theme}
            >
              <InfoRow
                icon="location-outline"
                label="Location"
                value={profile.city}
                theme={theme}
              />
              <InfoRow
                icon="briefcase-outline"
                label="Work"
                value={profile.occupation}
                theme={theme}
              />
              <InfoRow
                icon="navigate-outline"
                label="Distance"
                value={profile.distance}
                theme={theme}
              />
              <InfoRow
                icon={
                  profile.alreadyLikedMe
                    ? "heart"
                    : "eye-outline"
                }
                label="Connection signal"
                value={
                  profile.alreadyLikedMe
                    ? "Liked you first"
                    : "Fresh recommendation"
                }
                theme={theme}
                isLast
              />
            </PremiumSection>
          </View>
        </View>
      </Animated.ScrollView>

      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.bottomActionSafeArea,
          {
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.actionBar,
            {
              height: compactLayout.actionBarHeight,
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(24,22,21,0.96)"
                  : "rgba(255,255,255,0.97)",
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionCircle,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
                borderRadius: compactLayout.actionCircleSize / 2,
                height: compactLayout.actionCircleSize,
                width: compactLayout.actionCircleSize,
              },
            ]}
            activeOpacity={0.82}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={25}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCircle,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
                borderRadius: compactLayout.actionCircleSize / 2,
                height: compactLayout.actionCircleSize,
                width: compactLayout.actionCircleSize,
              },
            ]}
            activeOpacity={0.82}
            disabled={sendMatchRequest.isPending}
            onPress={() =>
              sendRequest(
                "Hi, I enjoyed your profile. Would you like to chat?",
              )
            }
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={23}
              color={theme.primaryLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.likeButtonWrapper, { height: compactLayout.likeHeight }]}
            activeOpacity={0.9}
            disabled={sendMatchRequest.isPending}
            onPress={() =>
              sendRequest(
                "I would like to connect with you.",
              )
            }
          >
            <LinearGradient
              colors={[
                theme.primary,
                theme.primaryLight,
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.likeButton}
            >
              {sendMatchRequest.isPending ? (
                <ActivityIndicator
                  color={theme.textInverse}
                />
              ) : (
                <>
                  <Ionicons
                    name="heart"
                    size={20}
                    color={theme.textInverse}
                  />
                  <Text
                    style={[
                      styles.likeButtonText,
                      { color: theme.textInverse },
                    ]}
                  >
                    Connect
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const StatusBadge = ({
  icon,
  label,
  dotColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  dotColor: string;
}) => (
  <View style={styles.statusBadge}>
    <Ionicons
      name={icon}
      size={13}
      color={dotColor}
    />
    <Text style={styles.statusBadgeText}>{label}</Text>
  </View>
);

const MatchRing = ({
  score,
  theme,
}: {
  score: number;
  theme: ThemeColors;
}) => (
  <View
    style={[
      styles.matchRingOuter,
      {
        borderColor: theme.primary,
        backgroundColor: theme.bgElevated,
      },
    ]}
  >
    <Text
      style={[
        styles.matchRingValue,
        { color: theme.textPrimary },
      ]}
    >
      {score}%
    </Text>
    <Text
      style={[
        styles.matchRingLabel,
        { color: theme.textSecondary },
      ]}
    >
      Match
    </Text>
  </View>
);

const MiniStat = ({
  icon,
  value,
  label,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  theme: ThemeColors;
}) => (
  <View style={styles.miniStat}>
    <View
      style={[
        styles.miniStatIcon,
        { backgroundColor: theme.bgElevated },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={theme.primaryLight}
      />
    </View>

    <Text
      style={[
        styles.miniStatValue,
        { color: theme.textPrimary },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text
      style={[
        styles.miniStatLabel,
        { color: theme.textSecondary },
      ]}
    >
      {label}
    </Text>
  </View>
);

const PremiumSection = ({
  icon,
  title,
  children,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
  theme: ThemeColors;
}) => (
  <View
    style={[
      styles.section,
      {
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
      },
    ]}
  >
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          { backgroundColor: theme.bgElevated },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={theme.primaryLight}
        />
      </View>

      <Text
        style={[
          styles.sectionTitle,
          { color: theme.textPrimary },
        ]}
      >
        {title}
      </Text>
    </View>

    {children}
  </View>
);

const LifestyleTile = ({
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
  <View
    style={[
      styles.lifestyleTile,
      {
        backgroundColor: theme.bgElevated,
        borderColor: theme.border,
      },
    ]}
  >
    <View
      style={[
        styles.lifestyleIcon,
        { backgroundColor: theme.bgCard },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={theme.primaryLight}
      />
    </View>

    <Text
      style={[
        styles.lifestyleLabel,
        { color: theme.textSecondary },
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        styles.lifestyleValue,
        { color: theme.textPrimary },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const InfoRow = ({
  icon,
  label,
  value,
  theme,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: ThemeColors;
  isLast?: boolean;
}) => (
  <View
    style={[
      styles.infoRow,
      !isLast && {
        borderBottomColor: theme.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
      },
    ]}
  >
    <View
      style={[
        styles.infoIcon,
        { backgroundColor: theme.bgElevated },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={theme.primaryLight}
      />
    </View>

    <View style={styles.infoBody}>
      <Text
        style={[
          styles.infoLabel,
          { color: theme.textSecondary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          { color: theme.textPrimary },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  </View>
);

const InterestChip = ({
  label,
  theme,
}: {
  label: string;
  theme: ThemeColors;
}) => {
  const meta = getInterestMeta(label, theme);

  return (
    <View
      style={[
        styles.interestChip,
        {
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <Ionicons
        name={meta.icon}
        size={16}
        color={meta.color}
      />
      <Text
        style={[
          styles.interestText,
          { color: theme.textPrimary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const getInterestMeta = (
  label: string,
  theme: ThemeColors,
) => {
  const interestMeta: Record<
    string,
    {
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
    }
  > = {
    art: {
      icon: "color-palette",
      color: theme.warning,
    },
    books: {
      icon: "book",
      color: theme.secondaryLight,
    },
    coding: {
      icon: "code-slash",
      color: theme.primaryLight,
    },
    coffee: {
      icon: "cafe",
      color: theme.warning,
    },
    design: {
      icon: "sparkles",
      color: theme.accent,
    },
    fashion: {
      icon: "shirt",
      color: theme.secondaryLight,
    },
    fitness: {
      icon: "barbell",
      color: theme.success,
    },
    football: {
      icon: "football",
      color: theme.success,
    },
    food: {
      icon: "restaurant",
      color: theme.warning,
    },
    gaming: {
      icon: "game-controller",
      color: theme.secondary,
    },
    music: {
      icon: "musical-notes",
      color: theme.secondary,
    },
    movies: {
      icon: "videocam",
      color: theme.primaryLight,
    },
    photography: {
      icon: "camera",
      color: theme.accent,
    },
    startups: {
      icon: "rocket",
      color: theme.accent,
    },
    travel: {
      icon: "airplane",
      color: theme.primaryLight,
    },
  };

  return (
    interestMeta[label.toLowerCase()] || {
      icon: "sparkles" as const,
      color: theme.textSecondary,
    }
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroSafe: {
    flex: 1,
    justifyContent: "flex-end",
  },
  fixedTopBarBg: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 19,
    elevation: 19,
  },
  fixedTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 14,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
    elevation: 20,
  },
  topBarRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  glassButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.36)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  glassPill: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.36)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 34,
    paddingHorizontal: 10,
  },
  glassPillText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  heroBottom: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  heroStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 9,
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: "rgba(255,255,255,0.94)",
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  heroName: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontFamily: FontFamily.bold,
    fontSize: 34,
    lineHeight: 39,
  },
  heroOccupation: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  heroMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 7,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.84)",
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginLeft: 4,
  },
  heroMetaDot: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderRadius: 2,
    height: 4,
    marginHorizontal: 8,
    width: 4,
  },
  body: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  profileSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  profileSummaryTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    borderRadius: 26,
    borderWidth: 2,
    height: 52,
    width: 52,
  },
  summaryIdentity: {
    flex: 1,
    marginHorizontal: 10,
  },
  summaryName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  summaryOccupation: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  matchRingOuter: {
    alignItems: "center",
    borderRadius: 27,
    borderWidth: 3,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  matchRingValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  matchRingLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 8,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  summaryStats: {
    flexDirection: "row",
  },
  miniStat: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 3,
  },
  miniStatIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 28,
    justifyContent: "center",
    marginBottom: 5,
    width: 28,
  },
  miniStatValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  miniStatLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    marginTop: 1,
  },
  thumbnailRow: {
    marginBottom: 2,
    marginTop: 10,
  },
  thumbnailContent: {
    gap: 8,
    paddingRight: 16,
  },
  thumbnailButton: {
    borderRadius: 12,
    borderWidth: 2,
    height: 58,
    overflow: "hidden",
    width: 48,
  },
  thumbnailImage: {
    height: "100%",
    width: "100%",
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  sectionIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 32,
    justifyContent: "center",
    marginRight: 8,
    width: 32,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  quoteAccent: {
    borderRadius: 3,
    bottom: 13,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    top: 13,
    width: 4,
  },
  quoteMark: {
    fontFamily: FontFamily.bold,
    fontSize: 46,
    lineHeight: 48,
    marginRight: 8,
    marginTop: -8,
    opacity: 0.26,
  },
  quoteBody: {
    flex: 1,
    paddingTop: 2,
  },
  quoteText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    lineHeight: 23,
  },
  quoteFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 9,
  },
  quoteFooterText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  interestWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  interestChip: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  interestText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  lifestyleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lifestyleTile: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 10,
    width: "48.5%",
  },
  lifestyleIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 30,
    justifyContent: "center",
    marginBottom: 7,
    width: 30,
  },
  lifestyleLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  lifestyleValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 9,
  },
  infoIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 34,
    justifyContent: "center",
    marginRight: 10,
    width: 34,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  infoValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  bottomActionSafeArea: {
    borderTopWidth: 0,
    bottom: 0,
    elevation: 20,
    left: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  actionBar: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 12,
    flexDirection: "row",
    gap: 8,
    height: ACTION_BAR_HEIGHT,
    paddingHorizontal: 9,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  actionCircle: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  likeButtonWrapper: {
    flex: 1,
    height: 52,
  },
  likeButton: {
    alignItems: "center",
    borderRadius: 26,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  likeButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: 14,
  },
  emptyText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: 18,
    marginTop: 14,
  },
  emptyButton: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
});
