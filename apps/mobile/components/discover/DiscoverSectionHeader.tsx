import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";
import { DISCOVER_SCREEN_PADDING } from "@/constants/discover";
import { FontFamily, FontSize } from "@/constants/typography";

type DiscoverSectionHeaderProps = {
  title: string;
  subtitle: string;
  action?: string;
};

export const DiscoverSectionHeader = ({
  title,
  subtitle,
  action,
}: DiscoverSectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTextBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>

    {action ? (
      <TouchableOpacity activeOpacity={0.75}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    paddingHorizontal: DISCOVER_SCREEN_PADDING,
  },
  sectionTextBlock: {
    flex: 1,
    paddingRight: 14,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionAction: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    paddingBottom: 2,
  },
});
