import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/constants/colors";
import { type TrendingPost } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";

type TrendingPostCardProps = {
  post: TrendingPost;
  height?: number;
};

export const TrendingPostCard = ({ post, height }: TrendingPostCardProps) => (
  <TouchableOpacity
    style={[styles.trendingCard, { height: height || post.height }]}
    activeOpacity={0.88}
  >
    <Image source={{ uri: post.image }} style={styles.trendingImage} />

    <LinearGradient
      colors={[Colors.transparent, Colors.overlayDarkStrong]}
      style={styles.trendingOverlay}
    />

    <View style={styles.trendingContent}>
      <Text style={styles.trendingTitle} numberOfLines={1}>
        {post.title}
      </Text>

      <Text style={styles.trendingSubtitle} numberOfLines={2}>
        {post.subtitle}
      </Text>

      <View style={styles.trendingFooter}>
        <Ionicons name="heart" size={13} color={Colors.white} />
        <Text style={styles.trendingLikes}>{post.likes}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  trendingCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  trendingImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  trendingContent: {
    bottom: 12,
    left: 12,
    position: "absolute",
    right: 12,
  },
  trendingTitle: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  trendingSubtitle: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 17,
    marginTop: 3,
  },
  trendingFooter: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  trendingLikes: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    marginLeft: 5,
  },
});
