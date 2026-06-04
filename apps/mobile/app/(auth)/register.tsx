import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { registerSchema, type RegisterFormData } from "@/zod/registerSchema";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import type { Gender } from "@/types/auth.types";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "Man", value: "MALE" },
  { label: "Woman", value: "FEMALE" },
  { label: "Non-binary", value: "NON_BINARY" },
  { label: "Other", value: "OTHER" },
];

// ── Component ──────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { gender: "MALE" },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setServerError("");
    try {
      await register({
        email: values.email,
        password: values.password,
        username: values.username,
        birthDate: values.birthDate,
        gender: values.gender,
        location: currentLocation?.label,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      });
      // AuthGuard in _layout.tsx handles redirect
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Registration failed. Please try again.";
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const useCurrentLocation = async () => {
    setLocationError("");
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationError(
          "Location permission is required to use your current location.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const [place] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      setCurrentLocation({
        latitude,
        longitude,
        label: formatLocationLabel(place) || "Current location",
      });
    } catch {
      setLocationError("Unable to detect your location. Please try again.");
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>B</Text>
            </View>
          </View>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>Join the blunow community</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          {/* Username */}
          <FieldWrapper label="Username" error={errors.username?.message}>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  placeholder="johndoe"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </FieldWrapper>

          {/* Email */}
          <FieldWrapper label="Email" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </FieldWrapper>

          {/* Password */}
          <FieldWrapper label="Password" error={errors.password?.message}>
            <View style={styles.passwordRow}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      errors.password && styles.inputError,
                    ]}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
          </FieldWrapper>

          {/* Confirm password */}
          <FieldWrapper
            label="Confirm Password"
            error={errors.confirmPassword?.message}
          >
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </FieldWrapper>

          {/* Birth date */}
          <FieldWrapper label="Date of Birth" error={errors.birthDate?.message}>
            <Controller
              control={control}
              name="birthDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.birthDate && styles.inputError]}
                  placeholder="YYYY-MM-DD  (e.g. 1999-07-15)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                  maxLength={10}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </FieldWrapper>

          {/* Gender picker */}
          <FieldWrapper label="I identify as" error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <View style={styles.genderRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[
                        styles.genderChip,
                        value === g.value && styles.genderChipActive,
                      ]}
                      onPress={() => onChange(g.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          value === g.value && styles.genderChipTextActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Current location" error={locationError}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={useCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.84}
            >
              <View style={styles.locationIconBox}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={Colors.white}
                />
              </View>
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationTitle}>
                  {currentLocation
                    ? currentLocation.label
                    : "Use my current location"}
                </Text>
                <Text style={styles.locationSubtitle}>
                  {currentLocation
                    ? "Location saved for nearby matches"
                    : "Helps show people and rooms around you"}
                </Text>
              </View>
              {isLocating ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.locationAction}>
                  {currentLocation ? "Update" : "Detect"}
                </Text>
              )}
            </TouchableOpacity>
          </FieldWrapper>

          {/* Server error */}
          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {serverError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.submitText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          {/* Login CTA */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Field wrapper helper ────────────────────────────────────────────
function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const formatLocationLabel = (place?: Location.LocationGeocodedAddress) =>
  [place?.city || place?.district || place?.region, place?.country]
    .filter(Boolean)
    .join(", ");

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },

  header: { marginTop: 56, marginBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  brand: { alignItems: "center", marginBottom: Spacing.md },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    color: Colors.black,
  },
  heading: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: Colors.white,
    marginBottom: 4,
    textAlign: "center",
  },
  subheading: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.white,
  },
  inputError: { borderColor: Colors.error },
  fieldError: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
    marginTop: 4,
  },

  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeText: { fontSize: 18 },

  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  genderChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
  },
  genderChipActive: {
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  genderChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  genderChipTextActive: { color: Colors.black },

  locationButton: {
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  locationIconBox: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  locationTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  locationTitle: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  locationSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  locationAction: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },

  errorBanner: {
    backgroundColor: "#330000",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.error,
  },

  submitBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  submitText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.black,
    letterSpacing: 0.3,
  },

  terms: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  termsLink: { color: Colors.white, fontFamily: FontFamily.bold },

  loginBtn: { alignItems: "center" },
  loginText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  loginLink: { fontFamily: FontFamily.bold, color: Colors.white },
});
