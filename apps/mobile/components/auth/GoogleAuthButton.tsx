import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { Config } from "@/constants/config";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthButtonProps = {
  label?: string;
  onError: (message: string) => void;
  onStart?: () => void;
  onToken: (idToken: string) => Promise<void>;
};

const hasGoogleClientForPlatform = () => {
  if (Platform.OS === "android") return Boolean(Config.GOOGLE_ANDROID_CLIENT_ID);
  if (Platform.OS === "ios") return Boolean(Config.GOOGLE_IOS_CLIENT_ID);
  if (Platform.OS === "web") return Boolean(Config.GOOGLE_WEB_CLIENT_ID);
  return Boolean(Config.GOOGLE_EXPO_CLIENT_ID || Config.GOOGLE_WEB_CLIENT_ID);
};

export function GoogleAuthButton(props: GoogleAuthButtonProps) {
  if (!hasGoogleClientForPlatform()) {
    return (
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.84}
        onPress={() =>
          props.onError("Google sign-in is not configured for this build.")
        }
      >
        <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
        <Text style={styles.text}>{props.label || "Continue with Google"}</Text>
      </TouchableOpacity>
    );
  }

  return <GoogleAuthButtonCore {...props} />;
}

function GoogleAuthButtonCore({
  label = "Continue with Google",
  onError,
  onStart,
  onToken,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: Config.GOOGLE_ANDROID_CLIENT_ID,
    clientId: Config.GOOGLE_EXPO_CLIENT_ID ?? Config.GOOGLE_WEB_CLIENT_ID,
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    const completeGoogleAuth = async () => {
      if (response?.type !== "success") return;

      const idToken = response.params.id_token;
      if (!idToken) {
        onError("Google did not return an identity token.");
        return;
      }

      setIsLoading(true);
      onStart?.();
      try {
        await onToken(idToken);
      } catch (err: any) {
        onError(
          err?.response?.data?.message ||
            "Google sign-in failed. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    completeGoogleAuth();
  }, [onError, onStart, onToken, response]);

  const handlePress = async () => {
    onStart?.();
    await promptAsync();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={!request || isLoading}
      activeOpacity={0.84}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  text: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginLeft: Spacing.sm,
  },
});
