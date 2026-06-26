import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/constants/colors";
import { FALLBACK_PROFILE_IMAGE } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";
import type { DiscoverProfile } from "@/types/match.types";

type SuggestedPersonCardProps = {
  profile: DiscoverProfile;
  disabled?: boolean;
  onPress: () => void;
  onConnect: () => void;
};

export const SuggestedPersonCard = ({
  profile,
  disabled,
  onPress,
  onConnect,
}: SuggestedPersonCardProps) => (
  <TouchableOpacity
    style={styles.suggestedCard}
    activeOpacity={0.9}
    onPress={onPress}
  >
    <Image
      source={{
        uri: profile.imageUrl || profile.avatarUrl || FALLBACK_PROFILE_IMAGE,
      }}
      style={styles.suggestedImage}
    />

    <LinearGradient
      colors={[Colors.transparent, Colors.overlayDark, Colors.overlayDarkStrong]}
      locations={[0.2, 0.62, 1]}
      style={styles.suggestedGradient}
    />

    <View style={styles.suggestedTop}>
      <View style={styles.matchBadge}>
        <Ionicons name="sparkles" size={12} color={Colors.black} />
        <Text style={styles.matchBadgeText}>{profile.matchScore}%</Text>
      </View>
    </View>

    <View style={styles.suggestedContent}>
      <View style={styles.suggestedNameRow}>
        <Text style={styles.suggestedName} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>

        {profile.verified ? (
          <View style={styles.smallVerified}>
            <Ionicons name="checkmark" size={11} color={Colors.black} />
          </View>
        ) : null}
      </View>

      <Text style={styles.suggestedMeta} numberOfLines={1}>
        {profile.city} - {profile.distance}
      </Text>

      {profile.interests?.[0] ? (
        <View style={styles.suggestedInterestPill}>
          <Text style={styles.suggestedInterestText} numberOfLines={1}>
            {profile.interests[0]}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.suggestedButton}
        activeOpacity={0.84}
        disabled={disabled}
        onPress={(event) => {
          event.stopPropagation();
          onConnect();
        }}
      >
        {disabled ? (
          <ActivityIndicator color={Colors.black} size="small" />
        ) : (
          <>
            <Ionicons name="heart" size={15} color={Colors.black} />
            <Text style={styles.suggestedButtonText}>Connect</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  suggestedCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 26,
    borderWidth: 1,
    height: 250,
    overflow: "hidden",
    width: 170,
  },
  suggestedImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  suggestedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  suggestedTop: {
    left: 10,
    position: "absolute",
    right: 10,
    top: 10,
  },
  matchBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.whiteAlpha80,
    borderRadius: 16,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  matchBadgeText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 4,
  },
  suggestedContent: {
    bottom: 10,
    left: 10,
    position: "absolute",
    right: 10,
  },
  suggestedNameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  suggestedName: {
    color: Colors.white,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
  },
  smallVerified: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    marginLeft: 6,
    width: 18,
  },
  suggestedMeta: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  suggestedInterestPill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.whiteAlpha80,
    borderRadius: 14,
    marginTop: 8,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  suggestedInterestText: {
    color: Colors.black,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  suggestedButton: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    flexDirection: "row",
    height: 36,
    justifyContent: "center",
    marginTop: 10,
  },
  suggestedButtonText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 6,
  },
});
