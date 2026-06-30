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
  onSettings: () => void;
  followersCount: number;
  followingCount: number;
  requestsCount: number;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  onRequestsPress: () => void;
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
  onSettings,
  followersCount,
  followingCount,
  requestsCount,
  onFollowersPress,
  onFollowingPress,
  onRequestsPress,
}: ProfileHeroProps) => {
  return (
    <View className="px-5 pt-4 pb-2">
      {/* Top Header bar */}
      <View className="flex-row items-center justify-between py-2 mb-4">
        <Text className="text-xl font-extrabold" style={{ color: Colors.textPrimary }}>
          Profile
        </Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            borderColor: Colors.border,
            backgroundColor: Colors.bgCard,
          }}
          onPress={onSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Row with Avatar on the Left, and Stats on the Right */}
      <View className="flex-row items-center justify-between">
        {/* Avatar with circle ring and online status indicator */}
        <View className="relative">
          <View
            className="rounded-full p-[2.5px]"
            style={{ backgroundColor: Colors.primaryLight }}
          >
            <View
              className="rounded-full p-[2px]"
              style={{ backgroundColor: Colors.bg }}
            >
              <View className="h-[86px] w-[86px] overflow-hidden rounded-full bg-bg-elevated">
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
                      size={40}
                      color={Colors.textSecondary}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
          {/* Active Status Ring Badge */}
          <View
            className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-[2.5px] bg-success"
            style={{ borderColor: Colors.bg }}
          />
        </View>

        {/* Stats section (Followers, Following, Requests) */}
        <View className="flex-1 flex-row items-center justify-around ml-6 bg-bg-card py-3.5 px-2 rounded-2xl border border-border/60">
          <TouchableOpacity
            className="items-center flex-1"
            onPress={onFollowersPress}
            activeOpacity={0.8}
          >
            <Text
              className="text-[17px] font-extrabold"
              style={{ color: Colors.textPrimary }}
            >
              {followersCount}
            </Text>
            <Text
              className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5"
            >
              Followers
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="h-6 w-[1px] bg-border" />

          <TouchableOpacity
            className="items-center flex-1"
            onPress={onFollowingPress}
            activeOpacity={0.8}
          >
            <Text
              className="text-[17px] font-extrabold"
              style={{ color: Colors.textPrimary }}
            >
              {followingCount}
            </Text>
            <Text
              className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5"
            >
              Following
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="h-6 w-[1px] bg-border" />

          <TouchableOpacity
            className="items-center flex-1"
            onPress={onRequestsPress}
            activeOpacity={0.8}
          >
            <Text
              className="text-[17px] font-extrabold"
              style={{ color: Colors.textPrimary }}
            >
              {requestsCount}
            </Text>
            <Text
              className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5"
            >
              Requests
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Identity (Display Name, handle) ── */}
      <View className="mt-4">
        {/* Name + verification */}
        <View className="flex-row items-center gap-1.5">
          <Text
            className="flex-shrink text-xl font-bold"
            style={{ color: Colors.textPrimary }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View
            className="h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primaryLight }}
          >
            <Ionicons name="checkmark" size={11} color={Colors.white} />
          </View>
        </View>

        {/* Handle */}
        <Text
          className="text-sm font-medium mt-0.5"
          style={{ color: Colors.textSecondary }}
        >
          @{handle}
        </Text>

        {/* Bio */}
        <Text
          className="mt-3 text-sm leading-5"
          style={{ color: Colors.textPrimary }}
        >
          {bio}
        </Text>

        {/* Meta pills scroll */}
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

        {/* Interests scroll */}
        {interests.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2 pr-4"
          >
            {interests.map((interest, index) => (
              <InterestChip
                key={`${interest}-${index}`}
                label={interest}
                color={interestColors[index % interestColors.length]}
              />
            ))}
          </ScrollView>
        )}

        {/* Full Width Edit Profile Button */}
        <TouchableOpacity
          className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 border"
          style={{
            borderColor: Colors.border,
            backgroundColor: Colors.bgCard,
          }}
          onPress={onEditProfile}
          activeOpacity={0.86}
        >
          <Ionicons name="create-outline" size={18} color={Colors.textPrimary} />
          <Text
            className="text-sm font-bold"
            style={{ color: Colors.textPrimary }}
          >
            Edit Profile
          </Text>
        </TouchableOpacity>
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
    className="mx-5 mt-7 rounded-[28px] border p-4"
    style={{
      backgroundColor: Colors.bgCard,
      borderColor: Colors.border,
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.07,
      shadowRadius: 24,
      elevation: 4,
    }}
  >
    <View className="mb-4 flex-row items-center justify-between">
      <View className="mr-2 flex-1 flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${Colors.primaryLight}18` }}
        >
          <Ionicons name="pulse-outline" size={21} color={Colors.primaryLight} />
        </View>
        <View className="flex-1">
        <Text
          className="text-[10px] font-extrabold uppercase"
          style={{ color: Colors.primaryLight, letterSpacing: 1.5 }}
        >
          Your journey
        </Text>
        <Text
          className="mt-0.5 text-base font-extrabold"
          style={{ color: Colors.textPrimary }}
          numberOfLines={1}
        >
          Activity at a glance
        </Text>
        </View>
      </View>
      <View
        className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5"
        style={{ borderColor: Colors.border, backgroundColor: Colors.bgElevated }}
      >
        {!loading ? <View className="h-1.5 w-1.5 rounded-full bg-success" /> : null}
        <Text className="text-[9px] font-bold" style={{ color: Colors.textSecondary }}>
          {loading ? "Syncing…" : getSyncLabel(updatedAt)}
        </Text>
      </View>
    </View>

    {/* Grid of Stat Items */}
    {loading ? (
      <View
        className="items-center rounded-[22px] border py-10"
        style={{ borderColor: Colors.border, backgroundColor: Colors.bgElevated }}
      >
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text className="mt-3 text-xs font-semibold" style={{ color: Colors.textSecondary }}>
          Updating your activity
        </Text>
      </View>
    ) : (
      <View className="flex-row flex-wrap gap-3">
        {metrics.map((metric) => (
            <View
              key={metric.label}
              className="min-h-[132px] flex-grow overflow-hidden rounded-[22px] border p-4"
              style={{
                flexBasis: "46%",
                borderColor: Colors.border,
                backgroundColor: Colors.bgElevated,
              }}
            >
              <View
                className="absolute left-0 top-0 h-1 w-full"
                style={{ backgroundColor: metric.color }}
              />
              <View className="flex-row items-start justify-between">
                <View
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${metric.color}18` }}
                >
                  <Ionicons name={metric.icon} size={19} color={metric.color} />
                </View>
                <Text className="text-2xl font-black" style={{ color: Colors.textPrimary }}>
                  {metric.value}
                </Text>
              </View>
              <Text
                className="mt-4 text-[11px] font-extrabold uppercase"
                style={{ color: Colors.textPrimary, letterSpacing: 0.7 }}
                numberOfLines={1}
              >
                {metric.label}
              </Text>
              <Text
                className="mt-1 text-[11px] font-medium"
                style={{ color: Colors.textMuted }}
                numberOfLines={1}
              >
                {metric.caption}
              </Text>
            </View>
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
      className="mx-5 mt-5 overflow-hidden rounded-[24px]"
      style={{
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.bgCard,
      }}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View className="p-5 flex-row items-center justify-between">
        {/* Left Content */}
        <View className="flex-1 mr-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles" size={16} color={Colors.primaryLight} />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Profile Setup
            </Text>
          </View>
          <Text className="mt-1 text-[15px] font-bold text-text-primary">
            Complete Your Profile
          </Text>
          <Text className="text-xs text-text-secondary mt-0.5 leading-4">
            Add details to boost compatibility matching by up to 80%.
          </Text>

          {/* Progress bar */}
          <View className="mt-4 flex-row items-center gap-3">
            <View className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: Colors.primaryLight,
                }}
              />
            </View>
            <Text className="text-xs font-bold text-text-primary">
              {pct}%
            </Text>
          </View>
        </View>

        {/* Right Arrow wrapper */}
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated border border-border/20">
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textSecondary}
          />
        </View>
      </View>
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

const TABS: { id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "posts", label: "Posts", icon: "grid-outline", activeIcon: "grid" },
  { id: "stories", label: "Stories", icon: "play-circle-outline", activeIcon: "play-circle" },
  { id: "saved", label: "Saved", icon: "bookmark-outline", activeIcon: "bookmark" },
  { id: "matches", label: "Matches", icon: "heart-outline", activeIcon: "heart" },
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
  <View className="mt-6 border-b border-border bg-bg-card">
    <View className="flex-row px-2">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const count = counts?.[tab.id] ?? 0;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.8}
            className="flex-1 items-center py-3.5 relative flex-row justify-center gap-1.5"
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={17}
              color={active ? Colors.primary : Colors.textSecondary}
            />
            <Text
              className="text-xs font-bold"
              style={{ color: active ? Colors.primary : Colors.textSecondary }}
            >
              {tab.label}
            </Text>
            {count > 0 && (
              <View
                className="min-w-[18px] items-center justify-center rounded-full px-1 py-0.5"
                style={{
                  backgroundColor: active
                    ? Colors.primary
                    : Colors.bgElevated,
                }}
              >
                <Text
                  className="text-[9px] font-bold"
                  style={{
                    color: active ? Colors.white : Colors.textSecondary,
                  }}
                >
                  {count}
                </Text>
              </View>
            )}

            {/* Indicator bottom line */}
            {active && (
              <View
                className="absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full"
                style={{ backgroundColor: Colors.primary }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
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
  <View className="items-center px-8 py-16">
    <View
      className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
      style={{
        backgroundColor: `${Colors.primaryLight}10`,
        borderWidth: 1.5,
        borderColor: `${Colors.primaryLight}30`,
        borderStyle: "dashed",
      }}
    >
      <Ionicons name={icon} size={28} color={Colors.primaryLight} />
    </View>
    <Text
      className="text-base font-bold"
      style={{ color: Colors.textPrimary }}
    >
      {title}
    </Text>
    <Text
      className="mt-1.5 text-center text-xs leading-4"
      style={{ color: Colors.textSecondary }}
    >
      {subtitle}
    </Text>
  </View>
);

// ─── Private sub-components ───────────────────────────────────────────────────

const MetaPill = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View
    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-bg-elevated border border-border/20"
  >
    <Ionicons name={icon} size={13} color={Colors.textSecondary} />
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
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}0D`,
      }}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
};



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
