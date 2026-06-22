import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useAuthStore } from "@/store/authStore";
import type { AuthStartFlow } from "@/types/auth.types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AUTH_BACKGROUNDS = [
  require("@/assets/images/authimages/cou1.png"),
  require("@/assets/images/authimages/cou2.png"),
  require("@/assets/images/authimages/cou3.png"),
  require("@/assets/images/authimages/cou4.png"),
  require("@/assets/images/authimages/cou5.png"),
  require("@/assets/images/authimages/cou6.png"),
  require("@/assets/images/authimages/cou7.png"),
];

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
] as const;

export default function AuthWelcomeScreen() {
  const startAuth = useAuthStore((state) => state.startAuth);
  const emailLogin = useAuthStore((state) => state.emailLogin);
  const registerWithOtp = useAuthStore((state) => state.registerWithOtp);
  const googleLogin = useAuthStore((state) => state.googleLogin);

  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [nextBackgroundIndex, setNextBackgroundIndex] = useState(1);
  const [isSlidingBackground, setIsSlidingBackground] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<
    "MALE" | "FEMALE" | "NON_BINARY" | "OTHER"
  >("OTHER");
  const [authFlow, setAuthFlow] = useState<AuthStartFlow | null>(null);
  const [serverError, setServerError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideProgress = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const resetAnimationFrame = useRef<number | null>(null);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(180)).current;

  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsTranslate = useRef(new Animated.Value(24)).current;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const hasStarted = authFlow !== null;
  const isSignup = authFlow === "signup";

  const clearMessages = useCallback(() => {
    setServerError("");
    setEmailMessage("");
  }, []);

  const resetFlow = useCallback(() => {
    setAuthFlow(null);
    setOtp("");
    setUsername("");
    setBirthDate("");
    setGender("OTHER");
    clearMessages();
  }, [clearMessages]);

  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );

  const validateSignupFields = useCallback(() => {
    if (!/^[a-z0-9]+([._]?[a-z0-9]+)*$/.test(normalizedUsername)) {
      return "Username can use lowercase letters, numbers, dots, and underscores.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      return "Enter birth date as YYYY-MM-DD.";
    }
    return "";
  }, [birthDate, normalizedUsername]);

  const handleStartAuth = useCallback(async () => {
    clearMessages();
    if (!normalizedEmail) {
      setServerError("Enter your email first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await startAuth({ email: normalizedEmail });
      setAuthFlow(response.flow);
      setOtp("");
      setEmailMessage(
        response.devOtp ? `Dev OTP: ${response.devOtp}` : response.message,
      );
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to continue. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [clearMessages, normalizedEmail, startAuth]);

  const handleVerifyOtp = useCallback(async () => {
    clearMessages();
    if (!authFlow || !normalizedEmail || otp.trim().length !== 6) {
      setServerError("Enter your email and 6-digit OTP.");
      return;
    }

    if (isSignup) {
      const validationError = validateSignupFields();
      if (validationError) {
        setServerError(validationError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authFlow === "login") {
        await emailLogin({ email: normalizedEmail, otp: otp.trim() });
        return;
      }

      await registerWithOtp({
        email: normalizedEmail,
        otp: otp.trim(),
        username: normalizedUsername,
        birthDate: birthDate.trim(),
        gender,
      });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Invalid OTP. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authFlow,
    birthDate,
    clearMessages,
    emailLogin,
    gender,
    isSignup,
    normalizedEmail,
    normalizedUsername,
    otp,
    registerWithOtp,
    validateSignupFields,
  ]);

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (hasStarted) resetFlow();
    },
    [hasStarted, resetFlow],
  );

  useEffect(() => {
    AUTH_BACKGROUNDS.forEach((image) => {
      const source = Image.resolveAssetSource(image);

      if (source?.uri) {
        Image.prefetch(source.uri);
      }
    });
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(brandOpacity, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(brandTranslate, {
          duration: 980,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(actionsOpacity, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(actionsTranslate, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [actionsOpacity, actionsTranslate, brandOpacity, brandTranslate]);

  useEffect(() => {
    const startParallaxSlide = () => {
      if (isAnimating.current) return;

      isAnimating.current = true;
      setIsSlidingBackground(true);
      slideProgress.setValue(0);

      Animated.timing(slideProgress, {
        duration: 1050,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isAnimating.current = false;
          return;
        }

        setCurrentBackgroundIndex((previousIndex) => {
          const newCurrentIndex = (previousIndex + 1) % AUTH_BACKGROUNDS.length;

          setNextBackgroundIndex(
            (newCurrentIndex + 1) % AUTH_BACKGROUNDS.length,
          );

          return newCurrentIndex;
        });

        resetAnimationFrame.current = requestAnimationFrame(() => {
          slideProgress.setValue(0);
          setIsSlidingBackground(false);
          isAnimating.current = false;
          resetAnimationFrame.current = null;
        });
      });
    };

    const interval = setInterval(startParallaxSlide, 4600);

    return () => {
      clearInterval(interval);
      slideProgress.stopAnimation();
      isAnimating.current = false;

      if (resetAnimationFrame.current !== null) {
        cancelAnimationFrame(resetAnimationFrame.current);
        resetAnimationFrame.current = null;
      }
    };
  }, [slideProgress]);

  const currentFrameTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const currentImageTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.08],
  });

  const nextFrameTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  const nextImageTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 0.08, 0],
  });

  const overlayTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * 0.04, -SCREEN_WIDTH * 0.04],
  });

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <View style={styles.background}>
        <Animated.View
          style={[
            styles.backgroundFrame,
            {
              transform: [{ translateX: currentFrameTranslateX }],
            },
          ]}
        >
          <Animated.Image
            source={AUTH_BACKGROUNDS[currentBackgroundIndex]}
            style={[
              styles.backgroundImage,
              {
                transform: [{ translateX: currentImageTranslateX }],
              },
            ]}
            resizeMode="cover"
          />
        </Animated.View>

        {isSlidingBackground ? (
          <Animated.View
            style={[
              styles.backgroundFrame,
              {
                transform: [{ translateX: nextFrameTranslateX }],
              },
            ]}
          >
            <Animated.Image
              source={AUTH_BACKGROUNDS[nextBackgroundIndex]}
              style={[
                styles.backgroundImage,
                {
                  transform: [{ translateX: nextImageTranslateX }],
                },
              ]}
              resizeMode="cover"
            />
          </Animated.View>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.parallaxShade,
            {
              transform: [{ translateX: overlayTranslateX }],
            },
          ]}
        />

        <View style={styles.imageOverlay} />

        <LinearGradient
          colors={[
            "rgba(0,0,0,0)",
            "rgba(0,0,0,0.08)",
            "rgba(0,0,0,0.26)",
            "rgba(0,0,0,0.58)",
          ]}
          locations={[0.32, 0.58, 0.8, 1]}
          style={styles.bottomGradient}
        />

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.topBrand,
              {
                opacity: brandOpacity,
                transform: [
                  {
                    translateY: brandTranslate.interpolate({
                      inputRange: [0, 180],
                      outputRange: [0, -20],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.bottomContent}>
            <Animated.View
              style={[
                styles.copyBlock,
                {
                  opacity: brandOpacity,
                  transform: [{ translateY: brandTranslate }],
                },
              ]}
            >
              <Text style={styles.eyebrow}>Dating that feels natural</Text>
              <Text style={styles.title}>
                Meet people who match your energy.
              </Text>
              <Text style={styles.caption}>
                Enter your email and we will sign you in or create your account.
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.actions,
                {
                  opacity: actionsOpacity,
                  transform: [{ translateY: actionsTranslate }],
                },
              ]}
            >
              <GoogleAuthButton
                label="Continue with Google"
                onStart={clearMessages}
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
                onChangeText={handleEmailChange}
                placeholder="Email address"
                placeholderTextColor={Colors.onImageMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting}
              />

              {isSignup ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor={Colors.onImageMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TextInput
                    style={styles.input}
                    value={birthDate}
                    onChangeText={setBirthDate}
                    placeholder="Birth date YYYY-MM-DD"
                    placeholderTextColor={Colors.onImageMuted}
                    keyboardType="numbers-and-punctuation"
                    editable={!isSubmitting}
                  />

                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.genderPill,
                          gender === option.value && styles.genderPillActive,
                        ]}
                        onPress={() => setGender(option.value)}
                        disabled={isSubmitting}
                        activeOpacity={0.82}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            gender === option.value && styles.genderTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              {hasStarted ? (
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={(value) =>
                    setOtp(value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit OTP"
                  placeholderTextColor={Colors.onImageMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isSubmitting}
                />
              ) : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={hasStarted ? handleVerifyOtp : handleStartAuth}
                disabled={isSubmitting}
                activeOpacity={0.86}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {hasStarted ? "Verify OTP" : "Continue"}
                  </Text>
                )}
              </TouchableOpacity>

              {hasStarted ? (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleStartAuth}
                  disabled={isSubmitting}
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
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },

  background: {
    flex: 1,
    overflow: "hidden",
  },

  backgroundFrame: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },

  backgroundImage: {
    bottom: 0,
    height: "100%",
    left: -SCREEN_WIDTH * 0.06,
    position: "absolute",
    top: 0,
    width: SCREEN_WIDTH * 1.12,
  },

  parallaxShade: {
    ...StyleSheet.absoluteFillObject,
    width: "115%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing["2xl"],
  },

  topBrand: {
    alignItems: "center",
    alignSelf: "stretch",
  },

  logo: {
    height: 86,
    width: 124,
  },

  bottomContent: {
    alignSelf: "stretch",
    gap: Spacing.md,
  },

  copyBlock: {
    alignItems: "flex-start",
  },

  eyebrow: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },

  title: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["3xl"],
    lineHeight: 42,
    maxWidth: 340,
  },

  caption: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 23,
    marginTop: Spacing.sm,
    maxWidth: 320,
  },

  actions: {
    backgroundColor: "rgba(28,28,28,0.76)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    width: "100%",
  },

  divider: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: Spacing.md,
  },

  dividerLine: {
    backgroundColor: "rgba(255,255,255,0.22)",
    flex: 1,
    height: 1,
  },

  dividerText: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.sm,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    marginBottom: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },

  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  genderPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
  },

  genderPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },

  genderText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },

  genderTextActive: {
    color: Colors.textInverse,
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    elevation: 8,
    justifyContent: "center",
    minHeight: 56,
    shadowColor: Colors.black,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
  },

  primaryButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
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
