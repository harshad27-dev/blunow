import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/constants/colors";
import {
  DISCOVER_SCREEN_PADDING,
} from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";

const { width } = Dimensions.get("window");
const cardWidth = width - DISCOVER_SCREEN_PADDING * 2;

type DailyPromptBannerProps = {
  peopleCount: number;
  onlineCount: number;
  strongMatchCount: number;
};

export const DailyPromptBanner = ({
  peopleCount,
  onlineCount,
  strongMatchCount,
}: DailyPromptBannerProps) => (
  <View style={styles.promptCard}>
    <LinearGradient
      colors={[Colors.bgElevated, Colors.bgCard, Colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />

    <View style={styles.promptTopRow}>
      <View style={styles.promptBadge}>
        <Ionicons name="sparkles" size={14} color={Colors.black} />
        <Text style={styles.promptBadgeText}>Daily prompt</Text>
      </View>

      <View style={styles.promptLiveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.promptLiveText}>{onlineCount} online</Text>
      </View>
    </View>

    <Text style={styles.promptTitle}>What is your perfect weekend plan?</Text>

    <Text style={styles.promptText}>
      {"Answer today's prompt and discover people who match your vibe."}
    </Text>

    <View style={styles.promptStats}>
      <MiniStat value={`${peopleCount}`} label="New people" />
      <MiniStat value={`${onlineCount}`} label="Online now" />
      <MiniStat value={`${strongMatchCount}`} label="Strong match" />
    </View>

    <TouchableOpacity style={styles.promptButton} activeOpacity={0.86}>
      <Text style={styles.promptButtonText}>Answer & explore</Text>
      <Ionicons name="arrow-forward" size={17} color={Colors.black} />
    </TouchableOpacity>
  </View>
);

const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.miniStat}>
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  promptCard: {
    borderColor: Colors.border,
    borderRadius: 30,
    borderWidth: 1,
    marginHorizontal: DISCOVER_SCREEN_PADDING,
    marginTop: 22,
    overflow: "hidden",
    padding: 18,
  },
  promptTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  promptBadge: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptBadgeText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 6,
  },
  promptLiveBadge: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  liveDot: {
    backgroundColor: Colors.success,
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  promptLiveText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  promptTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    lineHeight: 34,
    marginTop: 20,
  },
  promptText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: cardWidth - 50,
  },
  promptStats: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    padding: 14,
  },
  miniStat: {
    alignItems: "center",
    flex: 1,
  },
  miniStatValue: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  miniStatLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  promptButton: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 22,
    flexDirection: "row",
    height: 46,
    justifyContent: "center",
    marginTop: 16,
  },
  promptButtonText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginRight: 8,
  },
});
