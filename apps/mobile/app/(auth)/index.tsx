import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";

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

  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [nextBackgroundIndex, setNextBackgroundIndex] = useState(1);
  const [isSlidingBackground, setIsSlidingBackground] = useState(false);

  const slideProgress = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const resetAnimationFrame = useRef<number | null>(null);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(180)).current;

  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsTranslate = useRef(new Animated.Value(24)).current;

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
          const newCurrentIndex =
            (previousIndex + 1) % AUTH_BACKGROUNDS.length;

          setNextBackgroundIndex(
            (newCurrentIndex + 1) % AUTH_BACKGROUNDS.length
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
            "rgba(0,0,0,0.48)",
          ]}
          locations={[0.32, 0.58, 0.82, 1]}
          style={styles.bottomGradient}
        />

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.brand,
              {
                opacity: brandOpacity,
                transform: [{ translateY: brandTranslate }],
              },
            ]}
          >
            <View style={styles.logoWrap}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.tagline}>Meet real people. Feel the spark.</Text>
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
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(auth)/login")}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.86}
            >
              <Text style={styles.secondaryButtonText}>Sign up</Text>
            </TouchableOpacity>
          </Animated.View>
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
    // backgroundColor: "rgba(0,0,0,0.06)",
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
    paddingTop: Spacing["3xl"],
  },

  brand: {
    alignItems: "center",
    minHeight: SCREEN_WIDTH * 0.72,
  },

  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    height: 124,
    width: 152,
  },

  tagline: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    letterSpacing: 0.3,
    marginTop: -Spacing.md,
  },

  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    elevation: 8,
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

  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
  },

  secondaryButtonText: {
    color: Colors.black,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});
