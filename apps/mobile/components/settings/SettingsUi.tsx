import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";

export const SettingsScreen = ({
  title,
  children,
  loading,
}: PropsWithChildren<{ title: string; loading?: boolean }>) => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export const SettingsSection = ({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) => (
  <View style={styles.section}>
    {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
    <View style={styles.card}>{children}</View>
  </View>
);

export const SettingsRow = ({
  title,
  subtitle,
  icon,
  onPress,
  destructive,
  right,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.76}
  >
    <View
      style={[
        styles.icon,
        destructive ? styles.destructiveIcon : undefined,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? Colors.error : Colors.textPrimary}
      />
    </View>
    <View style={styles.rowCopy}>
      <Text
        style={[
          styles.rowTitle,
          destructive ? { color: Colors.error } : undefined,
        ]}
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    {right ||
      (onPress ? (
        <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
      ) : null)}
  </TouchableOpacity>
);

export const SettingsToggle = ({
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <View style={styles.toggleRow}>
    <View style={styles.rowCopy}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: Colors.bgElevated, true: Colors.primaryLight }}
      thumbColor={value ? Colors.primary : Colors.white}
    />
  </View>
);

export const InfoParagraph = ({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) => (
  <View style={styles.infoBlock}>
    {title ? <Text style={styles.infoTitle}>{title}</Text> : null}
    <Text style={styles.infoText}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  destructiveIcon: {
    backgroundColor: Colors.error + "12",
  },
  header: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  icon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 40,
  },
  infoBlock: {
    marginBottom: Spacing.lg,
  },
  infoText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 23,
  },
  infoTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  loader: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  row: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowCopy: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
  },
  toggleRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
