import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useColorScheme } from "nativewind";
import { useDialogStore } from "@/store/dialogStore";

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

  React.useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, [visible]);

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
            <View style={[styles.iconOuterRing, { borderColor: `${accent}22`, backgroundColor: `${accent}08` }]}>
              <View style={[styles.iconInnerRing, { backgroundColor: `${accent}18` }]}>
                <Ionicons name={icon} size={22} color={accent} />
              </View>
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children ? <View style={styles.content}>{children}</View> : null}

          {actions.length ? (
            <View
              style={[
                styles.actions,
                actions.length > 2 ? { flexDirection: "column" } : { flexDirection: "row" },
              ]}
            >
              {actions.map((action) => {
                const variant = action.variant ?? "secondary";
                const isPrimary = variant === "primary";
                const isDanger = variant === "danger";

                const backgroundColor = isPrimary
                  ? accent
                  : isDanger
                    ? `${Colors.error}12`
                    : "transparent";
                
                const borderColor = isPrimary
                  ? "transparent"
                  : isDanger
                    ? `${Colors.error}33`
                    : Colors.border;

                const textColor = isPrimary
                  ? Colors.textInverse
                  : isDanger
                    ? Colors.error
                    : Colors.textPrimary;

                const borderWidth = isPrimary ? 0 : 1;

                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    disabled={action.disabled}
                    key={action.label}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      action.onPress();
                    }}
                    style={[
                      styles.actionButton,
                      actions.length <= 2 && { flex: 1 },
                      { backgroundColor, borderColor, borderWidth },
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

// Helper to auto-detect icon & accent based on text content
function getAutoDetectedIconAndAccent(
  title: string,
  message?: string,
  buttons?: any[]
): { icon: keyof typeof Ionicons.glyphMap; accent: string } {
  const text = `${title} ${message || ""}`.toLowerCase();
  
  // Destructive / Danger actions
  const hasDestructiveButton = buttons?.some(b => b.style === 'destructive');
  if (
    hasDestructiveButton || 
    text.includes("delete") || 
    text.includes("remove") || 
    text.includes("clear") || 
    text.includes("discard") || 
    text.includes("block") || 
    text.includes("unblock")
  ) {
    return {
      icon: "trash-outline" as const,
      accent: Colors.error,
    };
  }
  
  // Warning / Attention actions
  if (
    text.includes("warning") || 
    text.includes("caution") || 
    text.includes("permission") || 
    text.includes("limit") || 
    text.includes("required") || 
    text.includes("fail") || 
    text.includes("error")
  ) {
    return {
      icon: "alert-circle-outline" as const,
      accent: Colors.warning,
    };
  }

  // Success / Completion
  if (
    text.includes("success") || 
    text.includes("done") || 
    text.includes("complete") || 
    text.includes("save") || 
    text.includes("verify") || 
    text.includes("verified")
  ) {
    return {
      icon: "checkmark-circle-outline" as const,
      accent: Colors.success,
    };
  }

  // Interactive / Options
  if (
    text.includes("options") || 
    text.includes("actions") || 
    text.includes("choose") || 
    text.includes("select") || 
    text.includes("filter")
  ) {
    return {
      icon: "options-outline" as const,
      accent: Colors.primaryLight,
    };
  }

  // Info / Info queries
  return {
    icon: "information-circle-outline" as const,
    accent: Colors.primary,
  };
}

export function GlobalDialog() {
  const { visible, title, message, buttons, customIcon, customAccent, hide } = useDialogStore();

  if (!visible) return null;

  const detected = getAutoDetectedIconAndAccent(title, message, buttons);
  const icon = customIcon || detected.icon;
  const accent = customAccent || detected.accent;

  const defaultButtons = buttons && buttons.length > 0
    ? buttons
    : [{ text: "OK", style: "default" as const }];

  const actions = defaultButtons.map((btn, index) => {
    let variant: "primary" | "secondary" | "danger" = "secondary";
    
    if (btn.style === "destructive") {
      variant = "danger";
    } else if (btn.style === "cancel") {
      variant = "secondary";
    } else {
      if (defaultButtons.length === 1) {
        variant = "primary";
      } else {
        const isLast = index === defaultButtons.length - 1;
        variant = isLast ? "primary" : "secondary";
      }
    }

    return {
      label: btn.text || "OK",
      variant,
      onPress: () => {
        hide();
        if (btn.onPress) {
          btn.onPress();
        }
      },
    };
  });

  return (
    <CustomDialog
      visible={visible}
      title={title}
      message={message}
      icon={icon}
      accent={accent}
      actions={actions}
      onClose={hide}
    />
  );
}

// Global Monkey Patch for React Native's Alert.alert
Alert.alert = (title: string, message?: string, buttons?: any[], options?: any) => {
  useDialogStore.getState().show({
    title,
    message,
    buttons,
    options,
  });
};

export default CustomDialog;

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 14, 13, 0.45)", // slightly darker and rich overlay
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
    borderRadius: 24, // premium rounded corners
    borderWidth: 1,
    maxWidth: 320, // compact mobile alert look
    padding: 24, // generous spacing
    shadowColor: Colors.black,
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
    width: "100%",
  },
  iconOuterRing: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 56,
  },
  iconInnerRing: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 20,
    textAlign: "center",
    lineHeight: 26,
  },
  message: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  content: {
    alignSelf: "stretch",
    marginTop: Spacing.md,
  },
  actions: {
    alignSelf: "stretch",
    gap: Spacing.sm,
    marginTop: 24,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 14, // sleek button curves
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  actionDisabled: { opacity: 0.45 },
  actionText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});