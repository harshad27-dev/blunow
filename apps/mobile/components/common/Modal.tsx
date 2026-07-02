import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useColorScheme } from "nativewind";

type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

type CustomDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  accent?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actions?: DialogAction[];
  children?: React.ReactNode;
  dismissOnBackdropPress?: boolean;
  onClose?: () => void;
};

export function CustomDialog({
  visible,
  title,
  message,
  accent = Colors.primary,
  icon,
  actions = [],
  children,
  dismissOnBackdropPress = true,
  onClose,
}: CustomDialogProps) {
  const { colorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === "dark" ? "light" : "dark";

  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) onClose?.();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <StatusBar style={statusBarStyle} backgroundColor={Colors.black} />
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          onPress={handleBackdropPress}
          style={styles.scrim}
        />
        <View style={styles.card}>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={24} color={accent} />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children ? <View style={styles.content}>{children}</View> : null}

          {actions.length ? (
            <View style={styles.actions}>
              {actions.map((action) => {
                const variant = action.variant ?? "secondary";
                const isPrimary = variant === "primary";
                const isDanger = variant === "danger";
                const backgroundColor = isPrimary
                  ? accent
                  : isDanger
                    ? Colors.error
                    : Colors.bgElevated;
                const textColor = isPrimary || isDanger
                  ? Colors.textInverse
                  : Colors.textPrimary;

                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    disabled={action.disabled}
                    key={action.label}
                    onPress={action.onPress}
                    style={[
                      styles.actionButton,
                      { backgroundColor },
                      !isPrimary && !isDanger && styles.secondaryAction,
                      action.disabled && styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, { color: textColor }]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default CustomDialog;

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: Colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    maxWidth: 420,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: "100%",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 52,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 52,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    textAlign: "center",
  },
  message: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  content: {
    alignSelf: "stretch",
    marginTop: Spacing.md,
  },
  actions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  secondaryAction: {
    borderColor: Colors.border,
    borderWidth: 1,
  },
  actionDisabled: { opacity: 0.45 },
  actionText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});