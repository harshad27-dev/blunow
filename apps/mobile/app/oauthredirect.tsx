import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";

export default function OAuthRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(auth)/login");
  }, [router]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center",
  },
});
