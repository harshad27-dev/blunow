import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useAuthStore } from "@/store/authStore";

export default function RegisterScreen() {
  const router = useRouter();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const [serverError, setServerError] = useState("");

  const clearError = useCallback(() => setServerError(""), []);
  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="sparkles" size={34} color={Colors.textInverse} />
        </View>

        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>
          Use Google to create your Blunow account. We will check whether your
          Google account already exists first.
        </Text>

        <GoogleAuthButton
          label="Create account with Google"
          onStart={clearError}
          onToken={handleGoogleToken}
          onError={setServerError}
        />

        {serverError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.8}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  errorBanner: {
    backgroundColor: Colors.error + "12",
    borderColor: Colors.error,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  errorBannerText: {
    color: Colors.error,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  heading: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    marginBottom: Spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 72,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: 72,
  },
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  subheading: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  switchButton: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  switchLink: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
  },
  switchText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
});
