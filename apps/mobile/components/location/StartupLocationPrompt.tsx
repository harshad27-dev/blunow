import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { queryClient } from "@/lib/queryClient";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/utils/toast";

const buildLocationLabel = (place?: Location.LocationGeocodedAddress) =>
  [place?.city, place?.region, place?.country].filter(Boolean).join(", ");

export function StartupLocationPrompt() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, refreshUser } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const syncCurrentLocation = useCallback(async () => {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;
    const [place] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    const location = buildLocationLabel(place);

    await userService.updateProfile({
      latitude,
      longitude,
      ...(location && { location }),
    });
    await refreshUser();
    queryClient.invalidateQueries({ queryKey: ["match-recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  }, [refreshUser]);

  useEffect(() => {
    let mounted = true;

    const checkPromptState = async () => {
      if (isLoading || !isAuthenticated) {
        if (mounted) {
          setVisible(false);
          setChecking(false);
        }
        return;
      }

      const permission = await Location.getForegroundPermissionsAsync();

      if (!mounted) return;

      if (permission.granted) {
        await syncCurrentLocation();
        setVisible(false);
      } else {
        setVisible(true);
      }

      setChecking(false);
    };

    checkPromptState().catch(() => {
      if (mounted) setChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isLoading, syncCurrentLocation]);

  const dismiss = () => {
    setVisible(false);
  };

  const enableLocation = async () => {
    if (requesting) return;

    try {
      setRequesting(true);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setVisible(false);
        showToast("You can enable location later from settings.", "Location off");
        return;
      }
      await syncCurrentLocation();
      setVisible(false);
      showToast("Nearby matches are now tuned to your area.", "Location enabled");
    } catch {
      showToast("Unable to update location right now.", "Location failed");
    } finally {
      setRequesting(false);
    }
  };

  if (checking || !visible) return null;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip location setup"
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingTop: Math.max(insets.top + Spacing.lg, Spacing.xl),
              paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing.xl),
            },
          ]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F8F4F0"]}
            style={styles.card}
          >
            <View style={styles.visualWrap} accessible accessibilityLabel="Nearby match preview">
              <View style={[styles.avatarBubble, styles.avatarOne]}>
                <Ionicons name="person" size={22} color={Colors.textInverse} />
              </View>
              <View style={[styles.avatarBubble, styles.avatarTwo]}>
                <Ionicons name="heart" size={20} color={Colors.textInverse} />
              </View>
              <View style={[styles.avatarBubble, styles.avatarThree]}>
                <Ionicons name="sparkles" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.mapCircle}>
                <View style={styles.mapRing} />
                <View style={styles.pin}>
                  <Ionicons name="location" size={30} color={Colors.textInverse} />
                </View>
              </View>
            </View>

            <Text style={styles.kicker}>Nearby matches</Text>
            <Text style={styles.title}>Meet people closer to you</Text>
            <Text style={styles.subtitle}>
              Turn on location so Datebl can prioritize compatible profiles and
              rooms around your current area.
            </Text>

            <View style={styles.benefits}>
              <Benefit icon="navigate-outline" text="Sort matches by real distance" />
              <Benefit icon="shield-checkmark-outline" text="Your exact location is never shown" />
              <Benefit icon="options-outline" text="Control distance anytime in filters" />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, requesting && styles.disabled]}
              activeOpacity={0.84}
              onPress={enableLocation}
              disabled={requesting}
              accessibilityRole="button"
              accessibilityLabel="Enable location for nearby matches"
              accessibilityState={{ busy: requesting, disabled: requesting }}
            >
              {requesting ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="location" size={20} color={Colors.textInverse} />
                  <Text style={styles.primaryText}>Enable location</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.78}
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const Benefit = ({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={styles.benefitRow}>
    <View style={styles.benefitIcon}>
      <Ionicons name={icon} size={17} color={Colors.primaryLight} />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  avatarBubble: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 3,
    height: 52,
    justifyContent: "center",
    position: "absolute",
    shadowColor: Colors.black,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 52,
    zIndex: 3,
  },
  avatarOne: { left: 16, top: 34, transform: [{ rotate: "-10deg" }] },
  avatarThree: { bottom: 18, right: 34, transform: [{ rotate: "9deg" }] },
  avatarTwo: { right: 12, top: 18, transform: [{ rotate: "12deg" }] },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.54)",
    flex: 1,
    justifyContent: "center",
  },
  benefitIcon: {
    alignItems: "center",
    backgroundColor: `${Colors.primaryLight}18`,
    borderRadius: Radius.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  benefitText: {
    color: Colors.textSecondary,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  benefits: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  card: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    width: "100%",
  },
  disabled: { opacity: 0.62 },
  kicker: {
    color: Colors.primaryLight,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  mapCircle: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 64,
    borderWidth: 1,
    height: 128,
    justifyContent: "center",
    width: 128,
  },
  mapRing: {
    borderColor: `${Colors.primaryLight}44`,
    borderRadius: 54,
    borderWidth: 2,
    height: 108,
    position: "absolute",
    width: 108,
  },
  pin: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    width: 60,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 54,
    width: "100%",
  },
  primaryText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  secondaryButton: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    marginTop: Spacing.sm,
    width: "100%",
  },
  secondaryText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  sheet: {
    justifyContent: "center",
    maxWidth: 430,
    paddingHorizontal: Spacing.md,
    width: "100%",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 29,
    lineHeight: 34,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  visualWrap: {
    alignItems: "center",
    height: 178,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: "100%",
  },
});
