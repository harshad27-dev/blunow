import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

export type ProfileTab = "posts" | "stories" | "saved" | "matches";

export type JourneyMetric = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
  caption: string;
};

type ProfileHeroProps = {
  coverUrl: string;
  avatarUrl?: string | null;
  displayName: string;
  handle: string;
  bio: string;
  ageLabel: string;
  city: string;
  gender: string;
  sexuality: string;
  interests: string[];
  onEditProfile: () => void;
  onEditCover: () => void;
  onSettings: () => void;
};

const interestIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: "barbell-outline",
  travel: "airplane-outline",
  music: "musical-notes-outline",
  coffee: "cafe-outline",
  coding: "code-slash-outline",
  gaming: "game-controller-outline",
  art: "color-palette-outline",
  photography: "camera-outline",
  food: "restaurant-outline",
  reading: "book-outline",
  yoga: "body-outline",
  hiking: "trail-sign-outline",
};

const interestColors = [
  Colors.primaryLight,
  Colors.secondary,
  "#7C6E5E",
  Colors.warning,
  Colors.success,
  "#9A7B6A",
];

// ─── Profile Hero ────────────────────────────────────────────────────────────

export const ProfileHero = ({
  coverUrl,
  avatarUrl,
  displayName,
  handle,
  bio,
  ageLabel,
  city,
  gender,
  sexuality,
  interests,
  onEditProfile,
  onEditCover,
  onSettings,
}: ProfileHeroProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="pb-2">
      {/* ── Cover ── */}
      <View className="h-[340px] overflow-hidden bg-bg-elevated">
        <Image
          source={{ uri: coverUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
        {/* Top vignette */}
        <LinearGradient
          colors={["rgba(0,0,0,0.28)", "transparent"]}
          locations={[0, 0.38]}
          className="absolute inset-x-0 top-0 h-36"
        />
        {/* Bottom fade to bg */}
        <LinearGradient
          colors={["transparent", "rgba(28,28,28,0.12)", Colors.bg]}
          locations={[0.3, 0.68, 1]}
          className="absolute inset-x-0 bottom-0 h-48"
        />

        {/* Top controls */}
        <View
          className="absolute flex-row items-center gap-2.5"
          style={{ top: Math.max(insets.top + 10, 14), right: 18 }}
        >
          <GlassIconButton icon="settings-outline" onPress={onSettings} />
        </View>

        {/* Cover edit button — bottom-right of cover */}
        <TouchableOpacity
          className="absolute flex-row items-center gap-1.5 rounded-full px-4 py-2"
          style={{
            bottom: 72,
            right: 18,
            backgroundColor: "rgba(28,28,28,0.62)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
          onPress={onEditCover}
          activeOpacity={0.82}
        >
          <Ionicons name="camera-outline" size={16} color="#fff" />
          <Text
            className="text-xs font-semibold"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            Change cover
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content lifted above cover ── */}
      <View className="-mt-[100px] px-5">
        {/* Avatar row */}
        <View className="flex-row items-end justify-between">
          {/* Avatar with ring */}
          <View
            className="rounded-[42px] p-[3px]"
            style={{ backgroundColor: Colors.primaryLight }}
          >
            <View
              className="rounded-[40px] p-[2px]"
              style={{ backgroundColor: Colors.bg }}
            >
              <View className="h-[134px] w-[134px] overflow-hidden rounded-[38px] bg-bg-elevated">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons
                      name="person"
                      size={52}
                      color={Colors.textSecondary}
                    />
                  </View>
                )}
              </View>
            </View>
            {/* Edit badge */}
            <TouchableOpacity
              className="absolute -bottom-1.5 -right-1.5 h-10 w-10 items-center justify-center rounded-[14px] border-[2px]"
              style={{
                backgroundColor: Colors.primary,
                borderColor: Colors.bg,
              }}
              onPress={onEditProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={17} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Edit Profile button */}
          <TouchableOpacity
            className="mb-3 flex-row items-center gap-2 rounded-2xl px-5 py-3.5"
            style={{ backgroundColor: Colors.primary }}
            onPress={onEditProfile}
            activeOpacity={0.86}
          >
            <Ionicons name="create-outline" size={18} color={Colors.white} />
            <Text
              className="text-sm font-bold"
              style={{ color: Colors.white }}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Identity ── */}
        <View className="mt-5">
          {/* Name + verified */}
          <View className="flex-row items-center gap-2.5">
            <Text
              className="flex-shrink text-[34px] font-bold leading-[40px]"
              style={{ color: Colors.textPrimary }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.primaryLight }}
            >
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            </View>
          </View>

          {/* Handle */}
          <View className="mt-1 flex-row items-center gap-2">
            <Text
              className="text-sm font-medium"
              style={{ color: Colors.textSecondary }}
            >
              @{handle}
            </Text>
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: Colors.success }}
            />
            <Text
              className="text-xs font-medium"
              style={{ color: Colors.success }}
            >
              Online
            </Text>
          </View>

          {/* Meta pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2 pr-2"
          >
            <MetaPill icon="calendar-outline" label={ageLabel} />
            <MetaPill icon="location-outline" label={city} />
            <MetaPill icon="male-female-outline" label={gender} />
            <MetaPill icon="heart-outline" label={sexuality} />
          </ScrollView>

          {/* Bio */}
          <Text
            className="mt-4 text-[15px] leading-[24px]"
            style={{ color: Colors.textPrimary }}
            numberOfLines={4}
          >
            {bio}
          </Text>
        </View>

        {/* ── Interests ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5"
          contentContainerClassName="gap-2.5 pr-4"
        >
          {interests.length ? (
            interests.map((interest, index) => (
              <InterestChip
                key={`${interest}-${index}`}
                label={interest}
                color={interestColors[index % interestColors.length]}
              />
            ))
          ) : (
            <TouchableOpacity
              className="flex-row items-center gap-2 rounded-2xl border px-4 py-3"
              style={{
                borderColor: Colors.border,
                backgroundColor: Colors.bgCard,
              }}
              onPress={onEditProfile}
              activeOpacity={0.85}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={Colors.textSecondary}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: Colors.textSecondary }}
              >
                Add interests
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-2xl border"
            style={{
              borderColor: Colors.border,
              backgroundColor: Colors.bgCard,
            }}
            onPress={onEditProfile}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

// ─── Journey Card ─────────────────────────────────────────────────────────────

export const ProfileJourneyCard = ({
  loading,
  metrics,
  updatedAt,
}: {
  loading: boolean;
  metrics: JourneyMetric[];
  updatedAt?: string | null;
}) => (
  <View
    className="mx-5 mt-7 overflow-hidden rounded-[28px]"
    style={{
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.border,
    }}
  >
    {/* Header */}
    <View className="flex-row items-center justify-between px-5 pb-4 pt-5">
      <View>
        <Text
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: Colors.textMuted, letterSpacing: 1.8 }}
        >
          Dating Journey
        </Text>
        <Text
          className="mt-0.5 text-xl font-bold"
          style={{ color: Colors.textPrimary }}
        >
          Your Stats
        </Text>
      </View>
      {/* Pulse indicator */}
      <View className="flex-row items-center gap-2">
        {!loading && (
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: Colors.success }}
          />
        )}
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: Colors.bgElevated }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: Colors.textSecondary }}
          >
            {loading ? "Syncing…" : getSyncLabel(updatedAt)}
          </Text>
        </View>
      </View>
    </View>

    {/* Divider */}
    <View
      className="mx-5"
      style={{ height: 1, backgroundColor: Colors.border }}
    />

    {/* Stats */}
    {loading ? (
      <View className="items-center py-10">
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    ) : (
      <View className="flex-row flex-wrap gap-3 p-4">
        {metrics.map((metric) => (
          <JourneyStat key={metric.label} {...metric} />
        ))}
      </View>
    )}
  </View>
);

// ─── Completion Card ──────────────────────────────────────────────────────────

export const ProfileCompletionCard = ({
  completion,
  onPress,
}: {
  completion: number;
  onPress: () => void;
}) => {
  const pct = Math.min(100, Math.max(0, completion));

  return (
    <TouchableOpacity
      className="mx-5 mt-4 overflow-hidden rounded-[28px]"
      style={{
        borderWidth: 1,
        borderColor: Colors.border,
      }}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={[Colors.bgCard, Colors.bgElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-5"
      >
        <View className="flex-row items-center">
          {/* Icon */}
          <View
            className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${Colors.primaryLight}22` }}
          >
            <Ionicons name="sparkles" size={28} color={Colors.primaryLight} />
          </View>

          {/* Text + bar */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base font-bold"
                style={{ color: Colors.textPrimary }}
              >
                Increase Your Chances
              </Text>
              <Text
                className="text-base font-bold"
                style={{ color: Colors.primaryLight }}
              >
                {pct}%
              </Text>
            </View>
            <Text
              className="mt-0.5 text-xs leading-4"
              style={{ color: Colors.textSecondary }}
            >
              Complete your profile to get better matches.
            </Text>
            {/* Progress bar */}
            <View
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: Colors.bgElevated }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: Colors.primaryLight,
                }}
              />
            </View>
          </View>

          {/* Arrow */}
          <View className="ml-4">
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textMuted}
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Account Actions ──────────────────────────────────────────────────────────

export const ProfileAccountActions = ({
  onSettings,
  onLogout,
}: {
  onSettings: () => void;
  onLogout: () => void;
}) => (
  <View className="mx-5 mt-4 flex-row gap-3">
    <AccountAction
      icon="settings-outline"
      label="Settings"
      onPress={onSettings}
    />
    <AccountAction
      icon="log-out-outline"
      label="Logout"
      onPress={onLogout}
      danger
    />
  </View>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "stories", label: "Stories" },
  { id: "saved", label: "Saved" },
  { id: "matches", label: "Matches" },
];

export const ProfileTabs = ({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  counts?: Partial<Record<ProfileTab, number>>;
}) => (
  <View className="mt-6">
    {/* Pill segmented control */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-5"
      contentContainerClassName="gap-2 pr-2"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const count = counts?.[tab.id];
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.82}
            className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
            style={{
              backgroundColor: active ? Colors.primary : Colors.bgCard,
              borderWidth: 1,
              borderColor: active ? Colors.primary : Colors.border,
            }}
          >
            <Text
              className="text-sm font-bold"
              style={{ color: active ? Colors.white : Colors.textSecondary }}
            >
              {tab.label}
            </Text>
            {count !== undefined ? (
              <View
                className="min-w-[20px] items-center rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: active
                    ? "rgba(255,255,255,0.22)"
                    : Colors.bgElevated,
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: active ? Colors.white : Colors.textSecondary,
                  }}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>

    {/* Thin separator */}
    <View
      className="mt-4 mx-5"
      style={{ height: 1, backgroundColor: Colors.border }}
    />
  </View>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

export const ProfileEmptyState = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View className="items-center px-6 py-14">
    <View
      className="mb-5 h-20 w-20 items-center justify-center rounded-3xl"
      style={{
        backgroundColor: `${Colors.primaryLight}14`,
        borderWidth: 1.5,
        borderColor: `${Colors.primaryLight}40`,
        borderStyle: "dashed",
      }}
    >
      <Ionicons name={icon} size={36} color={Colors.primaryLight} />
    </View>
    <Text
      className="text-lg font-bold"
      style={{ color: Colors.textPrimary }}
    >
      {title}
    </Text>
    <Text
      className="mt-2 text-center text-sm leading-5"
      style={{ color: Colors.textSecondary }}
    >
      {subtitle}
    </Text>
  </View>
);

// ─── Private sub-components ───────────────────────────────────────────────────

const GlassIconButton = ({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="h-11 w-11 items-center justify-center rounded-2xl"
    style={{
      backgroundColor: "rgba(28,28,28,0.56)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
    }}
    onPress={onPress}
    activeOpacity={0.82}
  >
    <Ionicons name={icon} size={21} color="rgba(255,255,255,0.92)" />
  </TouchableOpacity>
);

const MetaPill = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View
    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
    style={{
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.border,
    }}
  >
    <Ionicons name={icon} size={14} color={Colors.textSecondary} />
    <Text
      className="text-xs font-semibold"
      style={{ color: Colors.textSecondary }}
    >
      {label}
    </Text>
  </View>
);

const InterestChip = ({ label, color }: { label: string; color: string }) => {
  const icon = interestIcons[label.toLowerCase()] ?? "sparkles-outline";
  return (
    <View
      className="flex-row items-center gap-2 rounded-2xl border px-4 py-3"
      style={{
        borderColor: `${color}70`,
        backgroundColor: `${color}16`,
      }}
    >
      <Ionicons name={icon} size={17} color={color} />
      <Text className="text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
};

const JourneyStat = ({ icon, color, label, value, caption }: JourneyMetric) => (
  <View
    className="flex-1 basis-[47%] overflow-hidden rounded-2xl"
    style={{
      backgroundColor: Colors.bgElevated,
      borderWidth: 1,
      borderColor: Colors.border,
      minHeight: 136,
    }}
  >
    {/* Top accent strip */}
    <View style={{ height: 3, backgroundColor: color }} />

    <View className="p-4">
      {/* Icon in circle */}
      <View
        className="mb-3 h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1E` }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: Colors.textMuted, letterSpacing: 1.2 }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 text-[36px] font-bold leading-[42px]"
        style={{ color: Colors.textPrimary }}
      >
        {value}
      </Text>
      <Text
        className="mt-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: Colors.textMuted, letterSpacing: 1 }}
      >
        {caption}
      </Text>
    </View>
  </View>
);

const AccountAction = ({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity
    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3.5"
    style={{
      borderColor: danger ? `${Colors.error}40` : Colors.border,
      backgroundColor: danger ? `${Colors.error}0C` : Colors.bgCard,
      minHeight: 52,
    }}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Ionicons
      name={icon}
      size={20}
      color={danger ? Colors.error : Colors.textPrimary}
    />
    <Text
      className="font-semibold"
      style={{ color: danger ? Colors.error : Colors.textPrimary }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSyncLabel = (updatedAt?: string | null) => {
  if (!updatedAt) return "Synced";
  const updatedTime = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedTime)) return "Synced";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - updatedTime) / 1000));
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
};
