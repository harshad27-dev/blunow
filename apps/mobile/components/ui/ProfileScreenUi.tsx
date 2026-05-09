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
};

const interestColors = ["#FF4F7B", "#A855F7", "#0EA5E9", "#F59E0B", "#22C55E"];

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
      <View className="h-[300px] overflow-hidden bg-[#111827]">
        <Image
          source={{ uri: coverUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(5,7,11,0.08)", "rgba(5,7,11,0.38)", "#05070B"]}
          locations={[0, 0.48, 1]}
          className="absolute inset-0"
        />

        <View
          className="absolute flex-row gap-3"
          style={{ top: Math.max(insets.top + 12, 16), right: 20 }}
        >
          <IconButton icon="settings-outline" onPress={onSettings} />
        </View>

        <TouchableOpacity
          className="absolute bottom-16 right-5 flex-row items-center gap-2 rounded-full bg-black/65 px-4 py-2.5"
          onPress={onEditCover}
          activeOpacity={0.85}
        >
          <Ionicons
            name="camera-outline"
            size={19}
            color={Colors.textPrimary}
          />
          <Text className="text-sm font-semibold text-[#F5F5F5]">Cover</Text>
        </TouchableOpacity>
      </View>

      <View className="-mt-24 px-5">
        <View className="flex-row items-end justify-between">
          <View className="h-[132px] w-[132px] rounded-[38px] border border-white/20 bg-[#05070B] p-1">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-full w-full rounded-[34px] bg-[#111111]"
              />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-[34px] bg-[#15151D]">
                <Ionicons
                  name="person"
                  size={52}
                  color={Colors.textSecondary}
                />
              </View>
            )}
            <TouchableOpacity
              className="absolute -bottom-2 -right-2 h-11 w-11 items-center justify-center rounded-2xl border border-[#303746] bg-[#0B0E14]"
              onPress={onEditProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mb-2 flex-row items-center gap-2 rounded-2xl bg-[#F5F5F5] px-5 py-3"
            onPress={onEditProfile}
            activeOpacity={0.86}
          >
            <Ionicons name="create-outline" size={19} color="#05070B" />
            <Text className="font-bold text-[#05070B]">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5">
          <View className="flex-row items-center gap-2">
            <Text className="max-w-[82%] text-[32px] font-bold text-[#F5F5F5]">
              {displayName}
            </Text>
            <View className="h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]">
              <Ionicons name="checkmark" size={17} color={Colors.white} />
            </View>
          </View>
          <Text className="mt-1 text-base text-[#9CA3AF]">@{handle}</Text>

          <View className="mt-5 flex-row flex-wrap items-center gap-x-5 gap-y-3">
            <ProfileMeta icon="calendar-outline" label={ageLabel} />
            <ProfileMeta icon="location-outline" label={city} />
            <ProfileMeta icon="male-female-outline" label={gender} />
            <ProfileMeta icon="heart-outline" label={sexuality} />
          </View>

          <Text
            className="mt-5 text-lg leading-7 text-[#E5E7EB]"
            numberOfLines={3}
          >
            {bio}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5"
          contentContainerClassName="gap-3 pr-4"
        >
          {interests.map((interest, index) => (
            <InterestChip
              key={`${interest}-${index}`}
              label={interest}
              color={interestColors[index % interestColors.length]}
            />
          ))}
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-2xl border border-[#2D3340] bg-[#10131A]"
            onPress={onEditProfile}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

export const ProfileJourneyCard = ({
  loading,
  metrics,
}: {
  loading: boolean;
  metrics: JourneyMetric[];
}) => (
  <View className="mx-5 mt-6 rounded-[28px] border border-[#252A35] bg-[#0B0E14] p-5">
    <View className="mb-5 flex-row items-center justify-between">
      <Text className="text-xl font-bold text-[#F5F5F5]">Dating Journey</Text>
      <View className="rounded-full bg-[#172033] px-3 py-1">
        <Text className="text-xs font-semibold text-[#A6ACB8]">Live</Text>
      </View>
    </View>
    {loading ? (
      <View className="items-center py-8">
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    ) : (
      <View className="flex-row flex-wrap gap-3">
        {metrics.map((metric) => (
          <JourneyStat key={metric.label} {...metric} />
        ))}
      </View>
    )}
  </View>
);

export const ProfileCompletionCard = ({
  completion,
  onPress,
}: {
  completion: number;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="mx-5 mt-4 flex-row items-center rounded-[28px] border border-[#252A35] bg-[#10131A] p-5"
    onPress={onPress}
    activeOpacity={0.88}
  >
    <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#25111D]">
      <Ionicons name="heart" size={31} color="#FF4F7B" />
    </View>
    <View className="flex-1 pr-3">
      <Text className="text-lg font-bold text-[#F5F5F5]">
        Increase Your Chances
      </Text>
      <Text className="mt-1 text-sm leading-5 text-[#A6ACB8]">
        Complete your profile to get better matches.
      </Text>
    </View>
    <View className="items-center rounded-2xl bg-[#A855F7] px-4 py-3">
      <Text className="font-bold text-white">{completion}%</Text>
      <Text className="text-[10px] font-semibold uppercase text-white/75">
        Done
      </Text>
    </View>
  </TouchableOpacity>
);

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

export const ProfileTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) => (
  <View className="mx-5 mt-7 flex-row border-b border-[#232938]">
    <ProfileTabButton
      icon="grid-outline"
      label="Posts"
      active={activeTab === "posts"}
      onPress={() => onTabChange("posts")}
    />
    <ProfileTabButton
      icon="radio-button-on-outline"
      label="Stories"
      active={activeTab === "stories"}
      onPress={() => onTabChange("stories")}
    />
    <ProfileTabButton
      icon="bookmark-outline"
      label="Saved"
      active={activeTab === "saved"}
      onPress={() => onTabChange("saved")}
    />
    <ProfileTabButton
      icon="heart-outline"
      label="Matches"
      active={activeTab === "matches"}
      onPress={() => onTabChange("matches")}
    />
  </View>
);

export const ProfileEmptyState = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View className="items-center px-6 py-12">
    <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-3xl border border-[#222936] bg-[#0F131B]">
      <Ionicons name={icon} size={34} color={Colors.textSecondary} />
    </View>
    <Text className="text-lg font-bold text-[#F5F5F5]">{title}</Text>
    <Text className="mt-2 text-center text-sm text-[#888888]">{subtitle}</Text>
  </View>
);

const IconButton = ({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/50"
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Ionicons name={icon} size={22} color={Colors.textPrimary} />
  </TouchableOpacity>
);

const ProfileMeta = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View className="flex-row items-center gap-2">
    <Ionicons name={icon} size={19} color="#A6ACB8" />
    <Text className="text-sm font-medium text-[#A6ACB8]">{label}</Text>
  </View>
);

const InterestChip = ({ label, color }: { label: string; color: string }) => {
  const icon = interestIcons[label.toLowerCase()] || "sparkles-outline";

  return (
    <View
      className="flex-row items-center gap-2 rounded-2xl border px-4 py-3"
      style={{ borderColor: `${color}90`, backgroundColor: `${color}14` }}
    >
      <Ionicons name={icon} size={19} color={color} />
      <Text className="text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
};

const JourneyStat = ({ icon, color, label, value, caption }: JourneyMetric) => (
  <View className="min-h-[132px] flex-1 basis-[47%] rounded-2xl border border-[#232938] bg-[#080B11] p-4">
    <View
      className="mb-3 h-11 w-11 items-center justify-center rounded-2xl"
      style={{ backgroundColor: `${color}22` }}
    >
      <Ionicons name={icon} size={23} color={color} />
    </View>
    <Text className="text-sm text-[#A6ACB8]">{label}</Text>
    <Text className="mt-1 text-3xl font-bold text-[#F5F5F5]">{value}</Text>
    <Text className="mt-1 text-xs text-[#7D8594]">{caption}</Text>
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
    className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#252A35] bg-[#0B0E14]"
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Ionicons
      name={icon}
      size={20}
      color={danger ? Colors.error : Colors.textPrimary}
    />
    <Text
      className={`font-semibold ${danger ? "text-[#CF6679]" : "text-[#F5F5F5]"}`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const ProfileTabButton = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="min-h-[54px] flex-1 items-center justify-center"
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View className="flex-row items-center gap-1.5">
      <Ionicons
        name={icon}
        size={18}
        color={active ? Colors.textPrimary : "#8B909C"}
      />
      <Text
        className={`text-xs ${
          active ? "font-bold text-[#F5F5F5]" : "font-semibold text-[#8B909C]"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
    {active ? (
      <View className="absolute bottom-0 h-[3px] w-10 rounded-full bg-[#F5F5F5]" />
    ) : null}
  </TouchableOpacity>
);
