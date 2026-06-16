import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { Config } from "@/constants/config";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_REDIRECT_URI = makeRedirectUri({
  path: "oauthredirect",
  scheme: "com.datebl.mobile",
});

type GoogleAuthButtonProps = {
  label?: string;
  onError: (message: string) => void;
  onStart?: () => void;
  onToken: (idToken: string) => Promise<void>;
};

type NativeGoogleSignInModule = {
  GoogleSignin: {
    configure: (options: {
      iosClientId?: string;
      offlineAccess?: boolean;
      webClientId?: string;
    }) => void;
    hasPlayServices: (options: {
      showPlayServicesUpdateDialog: boolean;
    }) => Promise<boolean>;
    signIn: () => Promise<any>;
  };
  isErrorWithCode: (error: unknown) => error is { code: string };
  isSuccessResponse: (response: unknown) => response is {
    data: { idToken?: string };
  };
  statusCodes: {
    PLAY_SERVICES_NOT_AVAILABLE: string;
    SIGN_IN_CANCELLED: string;
  };
};

let nativeGoogleSignInModule: NativeGoogleSignInModule | null | undefined;
let nativeGoogleSignInModulePromise:
  | Promise<NativeGoogleSignInModule | null>
  | undefined;

const hasGoogleClientForPlatform = () => {
  if (Platform.OS === "android") return Boolean(Config.GOOGLE_ANDROID_CLIENT_ID);
  if (Platform.OS === "ios") {
    return Boolean(Config.GOOGLE_IOS_CLIENT_ID && Config.GOOGLE_WEB_CLIENT_ID);
  }
  if (Platform.OS === "web") return Boolean(Config.GOOGLE_WEB_CLIENT_ID);
  return Boolean(Config.GOOGLE_EXPO_CLIENT_ID || Config.GOOGLE_WEB_CLIENT_ID);
};

const getNativeGoogleSignInModule = async () => {
  if (nativeGoogleSignInModule !== undefined) return nativeGoogleSignInModule;
  if (nativeGoogleSignInModulePromise) return nativeGoogleSignInModulePromise;

  nativeGoogleSignInModulePromise = import("@react-native-google-signin/google-signin")
    .then((module) => {
      nativeGoogleSignInModule = module as unknown as NativeGoogleSignInModule;
      return nativeGoogleSignInModule;
    })
    .catch(() => {
      nativeGoogleSignInModule = null;
      return nativeGoogleSignInModule;
    });

  return nativeGoogleSignInModulePromise;
};

const canUseNativeGoogleSignIn = () => {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
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

  if (!canUseNativeGoogleSignIn()) {
    return <GoogleAuthButtonAuthSession {...props} />;
  }

  return <GoogleAuthButtonNative {...props} />;
}

function GoogleAuthButtonNative({
  label = "Continue with Google",
  onError,
  onStart,
  onToken,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const configureGoogleSignIn = async () => {
      const nativeGoogleSignIn = await getNativeGoogleSignInModule();
      nativeGoogleSignIn?.GoogleSignin.configure({
        iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
        offlineAccess: false,
        webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      });
    };

    configureGoogleSignIn();
  }, []);

  const handlePress = async () => {
    setIsLoading(true);
    onStart?.();

    try {
      const nativeGoogleSignIn = await getNativeGoogleSignInModule();
      if (!nativeGoogleSignIn) {
        onError("Google sign-in requires a new development build.");
        return;
      }

      if (Platform.OS === "android") {
        await nativeGoogleSignIn.GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const response = await nativeGoogleSignIn.GoogleSignin.signIn();
      if (!nativeGoogleSignIn.isSuccessResponse(response)) return;

      const idToken = response.data.idToken;
      if (!idToken) {
        onError("Google did not return an identity token.");
        return;
      }

      await onToken(idToken);
    } catch (err: any) {
      const nativeGoogleSignIn = await getNativeGoogleSignInModule();
      if (nativeGoogleSignIn?.isErrorWithCode(err)) {
        if (err.code === nativeGoogleSignIn.statusCodes.SIGN_IN_CANCELLED) return;
        if (err.code === nativeGoogleSignIn.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError("Google Play Services is not available or needs an update.");
          return;
        }
      }

      onError(
        err?.response?.data?.message ||
          err?.message ||
          "Google sign-in failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={isLoading}
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

function GoogleAuthButtonAuthSession({
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
    redirectUri: GOOGLE_REDIRECT_URI,
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
