import "../global.css";
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[1] === 'onboarding';
    const needsOnboarding =
      isAuthenticated && !(user?.profile?.lookingFor?.length);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (needsOnboarding && !onOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && inAuthGroup && !needsOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments, user?.profile?.lookingFor]);

  return null;
}

export default function RootLayout() {
  const { isLoading, rehydrate } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Darleston_400Regular: require('../assets/fonts/Darleston.otf'),
  });

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: Colors.bg,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={Colors.white} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <AuthGuard />
          <StatusBar style="light" backgroundColor={Colors.bg} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'none' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(screens)" />
          </Stack>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
