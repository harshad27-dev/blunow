import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
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
  const [serverError, setServerError] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const backgroundFadeAnim = useRef(new Animated.Value(0)).current;

  const clearError = useCallback(() => setServerError(""), []);
  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );

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
  subheading: {
    color: Colors.onImageMuted,
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
