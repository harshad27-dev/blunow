import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const requestLoginOtp = useAuthStore((state) => state.requestLoginOtp);
  const emailLogin = useAuthStore((state) => state.emailLogin);
  const [serverError, setServerError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const backgroundFadeAnim = useRef(new Animated.Value(0)).current;

  const clearError = useCallback(() => {
    setServerError("");
    setEmailMessage("");
  }, []);
  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );
  const normalizedEmail = email.trim().toLowerCase();

  const handleSendOtp = useCallback(async () => {
    clearError();
    if (!normalizedEmail) {
      setServerError("Enter your email first.");
      return;
    }

    setEmailLoading(true);
    try {
      const response = await requestLoginOtp({ email: normalizedEmail });
      setOtpSent(true);
      setEmailMessage(response.devOtp ? `Dev OTP: ${response.devOtp}` : response.message);
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to send OTP. Please try again.",
      );
    } finally {
      setEmailLoading(false);
    }
  }, [clearError, normalizedEmail, requestLoginOtp]);

  const handleVerifyOtp = useCallback(async () => {
    clearError();
    if (!normalizedEmail || otp.trim().length !== 6) {
      setServerError("Enter your email and 6-digit OTP.");
      return;
    }

    setEmailLoading(true);
    try {
      await emailLogin({ email: normalizedEmail, otp: otp.trim() });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Invalid OTP. Please try again.",
      );
    } finally {
      setEmailLoading(false);
    }
  }, [clearError, emailLogin, normalizedEmail, otp]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        duration: 620,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        damping: 18,
        mass: 0.9,
        stiffness: 90,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const backgroundLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundFadeAnim, {
          delay: 1800,
          duration: 1600,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundFadeAnim, {
          delay: 2600,
          duration: 1600,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    backgroundLoop.start();

    return () => backgroundLoop.stop();
  }, [backgroundFadeAnim, fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ImageBackground
        source={require("@/assets/images/authimages/cou1.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <Animated.Image
          source={require("@/assets/images/authimages/cou2.png")}
          style={[styles.backgroundImage, { opacity: backgroundFadeAnim }]}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
        <View style={styles.bottomOverlay} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={34} color={Colors.textInverse} />
            </View>
            <Text style={styles.appName}>blunow</Text>
            <Text style={styles.tagline}>Connect. Vibe. Match.</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>
              Continue with Google. If your account exists, we will sign you in.
              If not, we will create it and take you to onboarding.
            </Text>

            <GoogleAuthButton
              label="Login with Google"
              onStart={clearError}
              onToken={handleGoogleToken}
              onError={setServerError}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!emailLoading}
            />

            {otpSent ? (
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                editable={!emailLoading}
              />
            ) : null}

            <TouchableOpacity
              style={styles.emailButton}
              onPress={otpSent ? handleVerifyOtp : handleSendOtp}
              disabled={emailLoading}
              activeOpacity={0.84}
            >
              {emailLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.emailButtonText}>
                  {otpSent ? "Verify OTP" : "Send Email OTP"}
                </Text>
              )}
            </TouchableOpacity>

            {otpSent ? (
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendOtp}
                disabled={emailLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            ) : null}

            {emailMessage ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{emailMessage}</Text>
              </View>
            ) : null}

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.8}
            >
              <Text style={styles.switchText}>
                New here? <Text style={styles.switchLink}>Create account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appName: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["3xl"],
    letterSpacing: 1.5,
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  bottomOverlay: {
    backgroundColor: Colors.overlayDark,
    bottom: 0,
    height: "48%",
    left: 0,
    position: "absolute",
    right: 0,
  },
  brand: {
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
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
  divider: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: Spacing.md,
  },
  dividerLine: {
    backgroundColor: Colors.overlayLightSoft,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.sm,
  },
  emailButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 52,
    marginTop: Spacing.sm,
  },
  emailButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  errorBannerText: {
    color: Colors.error,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  heading: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginBottom: Spacing.xs,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayDarkSoft,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    marginBottom: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: Colors.overlayLightSoft,
    borderColor: Colors.overlayLightSoft,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 72,
  },
  panel: {
    backgroundColor: Colors.overlay,
    borderColor: Colors.overlayLightSoft,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  resendButton: {
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  resendText: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  subheading: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
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
  switchButton: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  switchLink: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  switchText: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
  tagline: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
});
