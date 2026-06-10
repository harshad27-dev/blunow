import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
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

export default function RegisterScreen() {
  const router = useRouter();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const requestRegisterOtp = useAuthStore((state) => state.requestRegisterOtp);
  const registerWithOtp = useAuthStore((state) => state.registerWithOtp);
  const [serverError, setServerError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] =
    useState<"MALE" | "FEMALE" | "NON_BINARY" | "OTHER">("OTHER");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const clearError = useCallback(() => {
    setServerError("");
    setEmailMessage("");
  }, []);
  const handleGoogleToken = useCallback(
    (idToken: string) => googleLogin({ idToken }),
    [googleLogin],
  );
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  const validateRegisterFields = useCallback(() => {
    if (!normalizedEmail) return "Enter your email first.";
    if (!/^[a-z0-9]+([._]?[a-z0-9]+)*$/.test(normalizedUsername)) {
      return "Username can use lowercase letters, numbers, dots, and underscores.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      return "Enter birth date as YYYY-MM-DD.";
    }
    return "";
  }, [birthDate, normalizedEmail, normalizedUsername]);

  const handleSendOtp = useCallback(async () => {
    clearError();
    const validationError = validateRegisterFields();
    if (validationError) {
      setServerError(validationError);
      return;
    }

    setEmailLoading(true);
    try {
      const response = await requestRegisterOtp({ email: normalizedEmail });
      setOtpSent(true);
      setEmailMessage(response.devOtp ? `Dev OTP: ${response.devOtp}` : response.message);
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to send OTP. Please try again.",
      );
    } finally {
      setEmailLoading(false);
    }
  }, [clearError, normalizedEmail, requestRegisterOtp, validateRegisterFields]);

  const handleVerifyOtp = useCallback(async () => {
    clearError();
    const validationError = validateRegisterFields();
    if (validationError) {
      setServerError(validationError);
      return;
    }
    if (otp.trim().length !== 6) {
      setServerError("Enter the 6-digit OTP.");
      return;
    }

    setEmailLoading(true);
    try {
      await registerWithOtp({
        email: normalizedEmail,
        username: normalizedUsername,
        birthDate: birthDate.trim(),
        gender,
        otp: otp.trim(),
      });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || "Unable to create account. Please try again.",
      );
    } finally {
      setEmailLoading(false);
    }
  }, [
    birthDate,
    clearError,
    gender,
    normalizedEmail,
    normalizedUsername,
    otp,
    registerWithOtp,
    validateRegisterFields,
  ]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="sparkles" size={34} color={Colors.textInverse} />
        </View>

        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>
          Use Google to create your Blunow account. We will check whether your
          Google account already exists first.
        </Text>

        <GoogleAuthButton
          label="Create account with Google"
          onStart={clearError}
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
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!emailLoading}
        />
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!emailLoading}
        />
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="Birth date YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numbers-and-punctuation"
          editable={!emailLoading}
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
              disabled={emailLoading}
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

        {otpSent ? (
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit OTP"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            editable={!emailLoading}
          />
        ) : null}

        <TouchableOpacity
          style={styles.emailButton}
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          disabled={emailLoading}
          activeOpacity={0.84}
        >
          {emailLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.emailButtonText}>
              {otpSent ? "Verify & Create Account" : "Send Email OTP"}
            </Text>
          )}
        </TouchableOpacity>

        {otpSent ? (
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleSendOtp}
            disabled={emailLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.resendText}>Resend code</Text>
          </TouchableOpacity>
        ) : null}

        {serverError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        ) : null}

        {emailMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{emailMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.8}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
] as const;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: Spacing.md,
  },
  dividerLine: {
    backgroundColor: Colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.sm,
  },
  emailButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 52,
    marginTop: Spacing.sm,
  },
  emailButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
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
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  genderPill: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  genderPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  genderText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  genderTextActive: {
    color: Colors.textInverse,
  },
  heading: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize["2xl"],
    marginBottom: Spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    marginBottom: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 72,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: 72,
  },
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  resendButton: {
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  resendText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  subheading: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
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
  switchButton: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  switchLink: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
  },
  switchText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
});
