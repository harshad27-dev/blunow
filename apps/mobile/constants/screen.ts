import { StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";

export const ScreenSpacing = {
  horizontal: 20,
  bottomTab: 100,
  section: 24,
} as const;

export const ScreenRadius = {
  card: 24,
  control: 16,
  pill: 999,
} as const;

export const ScreenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: ScreenSpacing.horizontal,
  },
  scrollContent: {
    paddingBottom: ScreenSpacing.bottomTab,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: ScreenRadius.card,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});

export const TabBarStyles = {
  style: {
    backgroundColor: Colors.bgCard,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 66,
    paddingBottom: 10,
    paddingTop: 8,
  },
  labelStyle: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
} as const;
