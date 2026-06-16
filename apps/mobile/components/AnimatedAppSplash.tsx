import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

export function AnimatedAppSplash() {
  const logoEntranceScale = useRef(new Animated.Value(0.78)).current;
  const logoPulseScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoLift = useRef(new Animated.Value(18)).current;
  const ringProgress = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslate = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslate = useRef(new Animated.Value(14)).current;
  const shimmerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    logoEntranceScale.setValue(0.78);
    logoPulseScale.setValue(1);
    logoOpacity.setValue(0);
    logoLift.setValue(18);
    ringProgress.setValue(0);
    wordmarkOpacity.setValue(0);
    wordmarkTranslate.setValue(18);
    taglineOpacity.setValue(0);
    taglineTranslate.setValue(14);
    shimmerProgress.setValue(0);

    const intro = Animated.sequence([
      Animated.delay(90),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(logoEntranceScale, {
          damping: 11,
          mass: 0.8,
          stiffness: 135,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(logoLift, {
          duration: 540,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkOpacity, {
          delay: 210,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslate, {
          delay: 210,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          delay: 330,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslate, {
          delay: 330,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]);

    const logoPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulseScale, {
          duration: 1150,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1.045,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulseScale, {
          duration: 1150,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    const ringPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringProgress, {
          duration: 1900,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(ringProgress, {
          duration: 1,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(shimmerProgress, {
          duration: 1350,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerProgress, {
          duration: 1,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    intro.start();
    logoPulse.start();
    ringPulse.start();
    shimmer.start();

    return () => {
      intro.stop();
      logoPulse.stop();
      ringPulse.stop();
      shimmer.stop();
      logoEntranceScale.stopAnimation();
      logoPulseScale.stopAnimation();
      logoOpacity.stopAnimation();
      logoLift.stopAnimation();
      ringProgress.stopAnimation();
      wordmarkOpacity.stopAnimation();
      wordmarkTranslate.stopAnimation();
      taglineOpacity.stopAnimation();
      taglineTranslate.stopAnimation();
      shimmerProgress.stopAnimation();
    };
  }, [
    logoEntranceScale,
    logoLift,
    logoOpacity,
    logoPulseScale,
    ringProgress,
    shimmerProgress,
    taglineOpacity,
    taglineTranslate,
    wordmarkOpacity,
    wordmarkTranslate,
  ]);

  const firstRingScale = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.34],
  });
  const secondRingScale = ringProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.72, 0.96, 1.42],
  });
  const firstRingOpacity = ringProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.28, 0.12, 0],
  });
  const secondRingOpacity = ringProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.2, 0],
  });
  const shimmerTranslate = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-56, 56],
  });
  const shimmerOpacity = shimmerProgress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.65, 0.65, 0],
  });

  return (
    <LinearGradient
      colors={['#000000', '#050505', '#101010']}
      start={{ x: 0.12, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.splashScreen}
    >
      <View style={styles.logoStage}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.logoRing,
            {
              opacity: firstRingOpacity,
              transform: [{ scale: firstRingScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.logoRing,
            styles.logoRingSoft,
            {
              opacity: secondRingOpacity,
              transform: [{ scale: secondRingScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.splashLogoWrap,
            {
              opacity: logoOpacity,
              transform: [
                { translateY: logoLift },
                { scale: logoEntranceScale },
                { scale: logoPulseScale },
              ],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          styles.splashWordmark,
          {
            opacity: wordmarkOpacity,
            transform: [{ translateY: wordmarkTranslate }],
          },
        ]}
      >
        Datebl
      </Animated.Text>
      <Animated.Text
        style={[
          styles.splashTagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslate }],
          },
        ]}
      >
        Meet real people. Feel the spark.
      </Animated.Text>
      <View style={styles.shimmerTrack}>
        <Animated.View
          style={[
            styles.shimmer,
            {
              opacity: shimmerOpacity,
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  logoRing: {
    borderColor: Colors.whiteAlpha80,
    borderRadius: 106,
    borderWidth: 1,
    height: 176,
    position: 'absolute',
    width: 176,
  },
  logoRingSoft: {
    borderColor: Colors.primaryLight,
    height: 204,
    width: 204,
  },
  logoStage: {
    alignItems: 'center',
    height: 214,
    justifyContent: 'center',
    width: 214,
  },
  shimmer: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
    height: 3,
    width: 42,
  },
  shimmerTrack: {
    height: 3,
    marginTop: 22,
    overflow: 'hidden',
    width: 112,
  },
  splashLogo: {
    height: 124,
    width: 152,
  },
  splashLogoWrap: {
    alignItems: 'center',
    // backgroundColor: Colors.whiteAlpha80,
    // borderColor: Colors.overlayLightSoft,
    borderRadius: 86,
    borderWidth: 1,
    height: 172,
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    width: 172,
  },
  splashScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashTagline: {
    color: Colors.onImageMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    marginTop: 8,
  },
  splashWordmark: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    marginTop: 12,
  },
});
