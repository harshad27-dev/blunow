import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { DISCOVER_SCREEN_PADDING } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";

type EmptyMiniStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

export const EmptyMiniState = ({ icon, title, text }: EmptyMiniStateProps) => (
  <View style={styles.emptyMiniState}>
    <View style={styles.emptyMiniIcon}>
      <Ionicons name={icon} size={24} color={Colors.textSecondary} />
    </View>

    <Text style={styles.emptyMiniTitle}>{title}</Text>
    <Text style={styles.emptyMiniText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  emptyMiniState: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: DISCOVER_SCREEN_PADDING,
    marginTop: 14,
    padding: 22,
  },
  emptyMiniIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emptyMiniTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    marginTop: 12,
  },
  emptyMiniText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
