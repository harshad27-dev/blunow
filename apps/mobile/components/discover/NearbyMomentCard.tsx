import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { FALLBACK_PROFILE_IMAGE } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";
import type { DiscoverProfile } from "@/types/match.types";

type NearbyMomentCardProps = {
  profile: DiscoverProfile;
  disabled?: boolean;
  onPress: () => void;
  onConnect: () => void;
};

export const NearbyMomentCard = ({
  profile,
  disabled,
  onPress,
  onConnect,
}: NearbyMomentCardProps) => (
  <TouchableOpacity style={styles.nearbyCard} activeOpacity={0.88} onPress={onPress}>
    <View style={styles.nearbyAvatarWrap}>
      <Image
        source={{
          uri: profile.avatarUrl || profile.imageUrl || FALLBACK_PROFILE_IMAGE,
        }}
        style={styles.nearbyAvatar}
      />

      {profile.online ? <View style={styles.nearbyOnlineDot} /> : null}
    </View>

    <View style={styles.nearbyBody}>
      <View style={styles.nearbyNameRow}>
        <Text style={styles.nearbyName} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>

        <Text style={styles.nearbyDistance}>{profile.distance}</Text>
      </View>

      <Text style={styles.nearbyPrompt} numberOfLines={1}>
        {profile.quote || "Open to real conversations today."}
      </Text>

      <View style={styles.nearbyTags}>
        {(profile.interests || []).slice(0, 2).map((interest) => (
          <View key={interest} style={styles.interestTag}>
            <Text style={styles.interestText}>{interest}</Text>
          </View>
        ))}
      </View>
    </View>

    <TouchableOpacity
      style={styles.nearbyAction}
      activeOpacity={0.84}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation();
        onConnect();
      }}
    >
      {disabled ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Ionicons name="chatbubble-ellipses" size={20} color={Colors.textPrimary} />
      )}
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  nearbyCard: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 104,
    padding: 12,
  },
  nearbyAvatarWrap: {
    height: 76,
    width: 76,
  },
  nearbyAvatar: {
    borderRadius: 22,
    height: 76,
    width: 76,
  },
  nearbyOnlineDot: {
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
  nearbyBody: {
    flex: 1,
    marginLeft: 13,
  },
  nearbyNameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nearbyName: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    marginRight: 8,
  },
  nearbyDistance: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  nearbyPrompt: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 5,
  },
  nearbyTags: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },
  interestTag: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  interestText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  nearbyAction: {
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
