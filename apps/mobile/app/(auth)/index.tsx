import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useAuthStore } from "@/store/authStore";

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

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const startAuth = useAuthStore((state) => state.startAuth);
  const googleLogin = useAuthStore((state) => state.googleLogin);

  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [nextBackgroundIndex, setNextBackgroundIndex] = useState(1);
  const [isSlidingBackground, setIsSlidingBackground] = useState(false);
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideProgress = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const resetAnimationFrame = useRef<number | null>(null);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(180)).current;

  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsTranslate = useRef(new Animated.Value(24)).current;

  const normalizedEmail = email.trim().toLowerCase();

  const clearMessages = useCallback(() => {
    setServerError("");
  }, []);

  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );

  const handleStartAuth = useCallback(async () => {
    clearMessages();
    if (!normalizedEmail) {
      setServerError("Enter your email first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await startAuth({ email: normalizedEmail });
      router.push({
        pathname: "/(auth)/otp",
        params: {
          email: normalizedEmail,
          flow: response.flow,
          message: response.devOtp
            ? `Dev OTP: ${response.devOtp}`
            : response.message,
        },
      });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to continue. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [clearMessages, normalizedEmail, router, startAuth]);

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

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

                  <View style={styles.inputWithAction}>
                    <TextInput
                      style={styles.inlineInput}
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        clearMessages();
                      }}
                      placeholder="Email address"
                      placeholderTextColor={Colors.black}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={handleStartAuth}
                      disabled={isSubmitting}
                      activeOpacity={0.86}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={Colors.textInverse} />
                      ) : (
                        <Ionicons
                          name="arrow-forward"
                          size={22}
                          color={Colors.textInverse}
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {serverError ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>{serverError}</Text>
                    </View>
                  ) : null}
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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

  keyboardView: {
    flex: 1,
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

  inputWithAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    minHeight: 52,
    overflow: "hidden",
  },

  inlineInput: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },

  arrowButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    marginRight: 6,
    width: 40,
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
