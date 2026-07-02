import "../global.css";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/authStore";
import { getThemeColors } from "@/constants/colors";
import { AnimatedAppSplash } from "@/components/AnimatedAppSplash";
import { StartupLocationPrompt } from "@/components/location/StartupLocationPrompt";
import { useColorScheme } from "nativewind";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthGuard() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding = segments[1] === "onboarding";
    const needsOnboarding =
      isAuthenticated && !(user?.profile?.lookingFor?.length);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/");
    } else if (needsOnboarding && !onOnboarding) {
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup && !needsOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, router, segments, user?.profile?.lookingFor]);

  return null;
}

export default function RootLayout() {
  const { isLoading, rehydrate } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const themeName = colorScheme === "light" ? "light" : "dark";
  const colors = getThemeColors(themeName);
  const [splashDelayDone, setSplashDelayDone] = useState(false);
  const [fontTimeoutDone, setFontTimeoutDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Darleston_400Regular: require("../assets/fonts/Darleston.otf"),
    BirdHouse_400Regular: require("../assets/fonts/Bird House.ttf"),
  });

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimeoutDone;

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setSplashDelayDone(true), 3000);
    const fontTimer = setTimeout(() => setFontTimeoutDone(true), 1800);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(fontTimer);
    };
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  if (isLoading || !splashDelayDone) {
    return (
      <SafeAreaProvider>
        <AnimatedAppSplash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <AuthGuard />
          <StatusBar
            style={themeName === "dark" ? "light" : "dark"}
            backgroundColor={colors.bg}
            translucent={false}
          />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "none",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(screens)" />
          </Stack>
          <StartupLocationPrompt />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
