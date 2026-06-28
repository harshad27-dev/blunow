import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/constants/colors";
import { FALLBACK_PROFILE_IMAGE } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";
import type { DiscoverProfile } from "@/types/match.types";

type CuratedMatchCardProps = {
  profile: DiscoverProfile;
  reasons: string[];
  position: number;
  total: number;
  disabled?: boolean;
  saved?: boolean;
  onPress: () => void;
  onConnect: () => void;
  onPass: () => void;
  onSave: () => void;
};

export const CuratedMatchCard = ({
  profile,
  reasons,
  position,
  total,
  disabled,
  saved,
  onPress,
  onConnect,
  onPass,
  onSave,
}: CuratedMatchCardProps) => {
  const primaryReason = reasons[0] || "Strong profile fit";
  const shownReasons = reasons.slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <View style={styles.imageFrame}>
        <Image
          source={{
            uri: profile.imageUrl || profile.avatarUrl || FALLBACK_PROFILE_IMAGE,
          }}
          style={styles.image}
        />
        <LinearGradient
          colors={[Colors.transparent, Colors.overlayDark, Colors.overlayDarkStrong]}
          locations={[0.26, 0.68, 1]}
          style={styles.imageOverlay}
        />

        <View style={styles.imageTopRow}>
          <View style={styles.pickBadge}>
            <Ionicons name="sparkles" size={12} color={Colors.black} />
            <Text style={styles.pickBadgeText}>
              Pick {position}/{total}
            </Text>
          </View>

          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{profile.matchScore}%</Text>
          </View>
        </View>

        <View style={styles.imageBottom}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}, {profile.age}
            </Text>
            {profile.verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color={Colors.black} />
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.onImageMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {profile.city} - {profile.distance}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.reasonHeader}>
          <View style={styles.reasonIconBox}>
            <Ionicons name="bulb-outline" size={16} color={Colors.textPrimary} />
          </View>
          <View style={styles.reasonTextBlock}>
            <Text style={styles.reasonLabel}>Why this match</Text>
            <Text style={styles.primaryReason} numberOfLines={1}>
              {primaryReason}
            </Text>
          </View>
        </View>

        <View style={styles.reasonList}>
          {shownReasons.map((reason) => (
            <View key={reason} style={styles.reasonPill}>
              <Text style={styles.reasonPillText} numberOfLines={1}>
                {reason}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.bio} numberOfLines={2}>
          {profile.quote || profile.bio || "Ready for a thoughtful conversation."}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.84}
            onPress={(event) => {
              event.stopPropagation();
              onPass();
            }}
          >
            <Ionicons name="close" size={19} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, saved && styles.savedButton]}
            activeOpacity={0.84}
            onPress={(event) => {
              event.stopPropagation();
              onSave();
            }}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.connectButton}
            activeOpacity={0.88}
            disabled={disabled}
            onPress={(event) => {
              event.stopPropagation();
              onConnect();
            }}
          >
            {disabled ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={18} color={Colors.textInverse} />
                <Text style={styles.connectText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 14,
    overflow: "hidden",
    width: 286,
  },
  imageFrame: {
    backgroundColor: Colors.bgElevated,
    height: 246,
    overflow: "hidden",
  },
  image: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  imageTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    position: "absolute",
    right: 12,
    top: 12,
  },
  pickBadge: {
    alignItems: "center",
    backgroundColor: Colors.whiteAlpha80,
    borderRadius: 18,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pickBadgeText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 5,
  },
  scoreBadge: {
    alignItems: "center",
    backgroundColor: Colors.black,
    borderColor: Colors.overlayLightSoft,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scoreText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  imageBottom: {
    bottom: 14,
    left: 14,
    position: "absolute",
    right: 14,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  name: {
    color: Colors.white,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    marginLeft: 8,
    width: 20,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  metaText: {
    color: Colors.onImageMuted,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginLeft: 5,
  },
  content: {
    padding: 14,
  },
  reasonHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  reasonIconBox: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  reasonTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  reasonLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  primaryReason: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  reasonList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  reasonPill: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  reasonPillText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  bio: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 12,
    minHeight: 40,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  savedButton: {
    backgroundColor: Colors.primaryLight,
  },
  connectButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 21,
    flex: 1,
    flexDirection: "row",
    height: 42,
    justifyContent: "center",
  },
  connectText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: 7,
  },
});
