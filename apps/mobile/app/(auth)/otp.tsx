import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useAuthStore } from "@/store/authStore";
import type { AuthStartFlow } from "@/types/auth.types";

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    flow?: AuthStartFlow;
    message?: string;
  }>();

  const startAuth = useAuthStore((state) => state.startAuth);
  const emailLogin = useAuthStore((state) => state.emailLogin);
  const registerWithOtp = useAuthStore((state) => state.registerWithOtp);

  const email = useMemo(
    () => String(params.email || "").trim().toLowerCase(),
    [params.email],
  );
  const flow: AuthStartFlow = params.flow === "signup" ? "signup" : "login";

  const [otp, setOtp] = useState("");
  const otpInputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState(String(params.message || ""));
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const generatedUsername = useMemo(() => {
    const base = (email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .replace(/^[._]+|[._]+$/g, "")
      .slice(0, 12);
    const safeBase = base.length >= 3 ? base : `user${base}`;
    return `${safeBase}${Date.now().toString().slice(-6)}`.slice(0, 20);
  }, [email]);

  const fallbackBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().slice(0, 10);
  }, []);

  const clearMessages = useCallback(() => {
    setServerError("");
    setMessage("");
  }, []);

  const handleVerifyOtp = useCallback(async () => {
    clearMessages();
    if (!email || otp.trim().length !== 6) {
      setServerError("Enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (flow === "login") {
        await emailLogin({ email, otp: otp.trim() });
        return;
      }

      await registerWithOtp({
        email,
        otp: otp.trim(),
        username: generatedUsername,
        birthDate: fallbackBirthDate,
        gender: "OTHER",
      });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Invalid OTP. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearMessages,
    email,
    emailLogin,
    fallbackBirthDate,
    flow,
    generatedUsername,
    otp,
    registerWithOtp,
  ]);

  const handleResend = useCallback(async () => {
    if (!email) {
      router.replace("/(auth)");
      return;
    }

    setServerError("");
    setIsResending(true);
    try {
      const response = await startAuth({ email });
      setMessage(response.devOtp ? `Dev OTP: ${response.devOtp}` : response.message);
      setOtp("");
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to resend OTP. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  }, [email, router, startAuth]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(auth)")}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {flow === "signup" ? "Create account" : "Welcome back"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.eyebrow}>Verification</Text>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>We sent a 6-digit OTP to</Text>
          <Text style={styles.emailText} numberOfLines={1}>
            {email}
          </Text>

          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>Security code</Text>
                <Text style={styles.cardSubtitle}>Use the latest code from your inbox.</Text>
              </View>
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={21} color={Colors.primaryLight} />
              </View>
            </View>

            <View style={styles.codeBoxes}>

              {Array.from({ length: 6 }).map((_, index) => {
                const digit = otp[index] || "";
                const isActive = otp.length === index;
                const isFilled = Boolean(digit);

                return (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      isActive && styles.codeBoxActive,
                      isFilled && styles.codeBoxFilled,
                    ]}
                  >
                    <Text style={styles.codeDigit}>{digit || "_"}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenOtpInput}
                value={otp}
                onChangeText={(value) =>
                  setOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                editable={!isSubmitting}
                autoFocus
                caretHidden
                showSoftInputOnFocus
              />
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                otp.length !== 6 && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={isSubmitting || otp.length !== 6}
              activeOpacity={0.86}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify code</Text>
              )}
            </TouchableOpacity>

            <View style={styles.cardFooter}>
              <Text style={styles.helperText}>Did not receive it?</Text>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResend}
                disabled={isResending || isSubmitting}
                activeOpacity={0.8}
              >
                {isResending ? (
                  <ActivityIndicator color={Colors.textSecondary} />
                ) : (
                  <Text style={styles.resendText}>Resend code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {message ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{message}</Text>
            </View>
          ) : null}

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F8F4F0",
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 58,
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: 58,
  },
  stepPill: {
    backgroundColor: "rgba(177,159,145,0.18)",
    borderColor: "rgba(177,159,145,0.36)",
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepPillText: {
    color: Colors.secondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  eyebrow: {
    color: Colors.primaryLight,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["3xl"],
    lineHeight: 40,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  emailText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginTop: Spacing.xs,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  cardCopy: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 19,
    marginTop: 4,
  },
  shieldBadge: {
    alignItems: "center",
    backgroundColor: "rgba(177,159,145,0.16)",
    borderRadius: Radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  codeBoxes: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    minHeight: 58,
    paddingVertical: Spacing.sm,
    position: "relative",
  },
  codeBox: {
    alignItems: "center",
    borderBottomColor: "rgba(28,28,28,0.24)",
    borderBottomWidth: 2,
    flex: 1,
    height: 50,
    justifyContent: "center",
  },
  codeBoxActive: {
    borderBottomColor: Colors.primaryLight,
    borderBottomWidth: 3,
  },
  codeBoxFilled: {
    borderBottomColor: Colors.primary,
  },
  codeDigit: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    lineHeight: 36,
  },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    color: Colors.transparent,
    fontSize: 1,
    opacity: 0.01,
    zIndex: 2,
  },
  verifyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: 52,
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: "rgba(28,28,28,0.28)",
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  helperText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  resendButton: {
    alignItems: "center",
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  resendText: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  successBanner: {
    backgroundColor: Colors.success + "18",
    borderColor: Colors.success,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  successBannerText: {
    color: Colors.success,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
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
});
