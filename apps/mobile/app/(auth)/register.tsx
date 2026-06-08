import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useForm,
  Controller,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/zod/registerSchema";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import type { Gender } from "@/types/auth.types";

const GENDERS: {
  label: string;
  value: Gender;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "Man", value: "MALE", icon: "male" },
  { label: "Woman", value: "FEMALE", icon: "female" },
  { label: "Non-binary", value: "NON_BINARY", icon: "sparkles" },
  { label: "Other", value: "OTHER", icon: "person" },
];

const STEP_FIELDS: Record<number, (keyof RegisterFormData)[]> = {
  2: ["username", "email"],
  3: ["password", "confirmPassword"],
  4: ["birthDate", "gender"],
};

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const totalSteps = 4;

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      gender: "MALE",
    },
    mode: "onTouched",
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Registration failed. Please try again.";
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleNext = async () => {
    setServerError("");
    const fieldsToValidate = STEP_FIELDS[currentStep];

    if (fieldsToValidate) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep((step) => step + 1);
      return;
    }

    await handleSubmit(onSubmit)();
  };

  const useCurrentLocation = async () => {
    setLocationError("");
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationError("Location permission is needed to detect your city.");
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
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6 pt-5 pb-6">
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
              onPress={() => router.back()}
              activeOpacity={0.78}
            >
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>

            <Text className="text-sm font-bold text-white/60">
              {currentStep} of {totalSteps}
            </Text>
          </View>

          <View className="mb-8 flex-row items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index < currentStep ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
          >
            {currentStep === 1 && <WelcomeStep />}
            {currentStep === 2 && (
              <AccountStep control={control} errors={errors} />
            )}
            {currentStep === 3 && (
              <PasswordStep
                control={control}
                errors={errors}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((value) => !value)}
              />
            )}
            {currentStep === 4 && (
              <ProfileStep
                control={control}
                errors={errors}
                currentLocation={currentLocation}
                isLocating={isLocating}
                locationError={locationError}
                onUseCurrentLocation={useCurrentLocation}
              />
            )}

            {serverError ? (
              <View className="mt-4 rounded-2xl border border-red-400/50 bg-red-500/10 p-4">
                <Text className="text-sm font-semibold text-red-200">
                  {serverError}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-6 gap-3">
            <TouchableOpacity
              className="h-14 flex-row items-center justify-center rounded-full bg-white"
              onPress={handleNext}
              disabled={isSubmitting || isLocating}
              activeOpacity={0.84}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <>
                  <Text className="text-base font-bold text-black">
                    {currentStep === 1
                      ? "Start"
                      : currentStep === totalSteps
                        ? "Create Account"
                        : "Next"}
                  </Text>
                  {currentStep < totalSteps && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={Colors.black}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>

            {currentStep > 1 ? (
              <TouchableOpacity
                className="h-14 flex-row items-center justify-center rounded-full border border-white/10 bg-black/30"
                onPress={() => setCurrentStep((step) => step - 1)}
                disabled={isSubmitting}
                activeOpacity={0.84}
              >
                <Text className="text-base font-bold text-white">Back</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text className="text-center text-sm font-semibold text-white/60">
                Already have an account?{" "}
                <Text className="text-white">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomeStep() {
  return (
    <View className="flex-1 justify-center">
      <View className="mb-8 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ionicons name="heart" size={40} color="white" />
      </View>

      <Text
        className="text-[42px] font-bold leading-[52px] text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        Welcome to Blunow
      </Text>

      <Text className="mt-4 text-base leading-6 text-white/70">
        {
          "Let's set up your profile to find meaningful connections based on real values and intent."
        }
      </Text>

      <View className="mt-8 gap-4">
        <OnboardingFeature
          icon="sparkles"
          title="Personality First"
          description="We show who you really are before photos"
        />
        <OnboardingFeature
          icon="shield-checkmark"
          title="Verified & Safe"
          description="Connect with real people in a respectful space"
        />
        <OnboardingFeature
          icon="people"
          title="Intentional Matching"
          description="Find people looking for the same thing"
        />
      </View>
    </View>
  );
}

function OnboardingFeature({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 mt-1 h-6 w-6 items-center justify-center rounded-full bg-white/10">
        <Ionicons name={icon} size={14} color="white" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-white">{title}</Text>
        <Text className="mt-1 text-sm leading-4 text-white/70">
          {description}
        </Text>
      </View>
    </View>
  );
}

function AccountStep({
  control,
  errors,
}: {
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="person-add"
        title="Create your account"
        description="Start with the basics people will use to recognize you."
      />

      <View className="mt-8 gap-4">
        <FieldWrapper
          label="Username"
          icon="at"
          error={errors.username?.message}
        >
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 flex-1 text-base text-white"
                placeholder="johndoe"
                placeholderTextColor="rgba(255,255,255,0.35)"
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

        <FieldWrapper label="Email" icon="mail" error={errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 flex-1 text-base text-white"
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
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
      </View>
    </View>
  );
}

function PasswordStep({
  control,
  errors,
  showPassword,
  onTogglePassword,
}: {
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="lock-closed"
        title="Secure your login"
        description="Use at least 8 characters with an uppercase letter and a number."
      />

      <View className="mt-8 gap-4">
        <FieldWrapper
          label="Password"
          icon="key"
          error={errors.password?.message}
          trailing={
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={onTogglePassword}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="rgba(255,255,255,0.72)"
              />
            </Pressable>
          }
        >
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 flex-1 text-base text-white"
                placeholder="Create password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FieldWrapper>

        <FieldWrapper
          label="Confirm password"
          icon="shield-checkmark"
          error={errors.confirmPassword?.message}
        >
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 flex-1 text-base text-white"
                placeholder="Repeat password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FieldWrapper>
      </View>
    </View>
  );
}

function ProfileStep({
  control,
  errors,
  currentLocation,
  isLocating,
  locationError,
  onUseCurrentLocation,
}: {
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
  currentLocation: {
    label: string;
    latitude: number;
    longitude: number;
  } | null;
  isLocating: boolean;
  locationError: string;
  onUseCurrentLocation: () => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="sparkles"
        title="Tell us about you"
        description="These details help create safer and more relevant matches."
      />

      <View className="mt-8 gap-5">
        <FieldWrapper
          label="Date of birth"
          icon="calendar"
          error={errors.birthDate?.message}
        >
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 flex-1 text-base text-white"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.35)"
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

        <View>
          <Text className="mb-3 text-sm font-semibold text-white/70">
            I identify as
          </Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View className="gap-3">
                {GENDERS.map((gender) => (
                  <TouchableOpacity
                    key={gender.value}
                    className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
                      value === gender.value
                        ? "border-white bg-white/10"
                        : "border-white/10 bg-black/30"
                    }`}
                    onPress={() => onChange(gender.value)}
                    activeOpacity={0.76}
                  >
                    <Ionicons
                      name={gender.icon}
                      size={22}
                      color="white"
                      style={{ marginRight: 12 }}
                    />
                    <Text className="flex-1 text-base font-semibold text-white">
                      {gender.label}
                    </Text>
                    {value === gender.value ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="white"
                      />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.gender?.message ? (
            <Text className="mt-2 text-xs font-semibold text-red-200">
              {errors.gender.message}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
            currentLocation
              ? "border-white bg-white/10"
              : "border-white/10 bg-black/30"
          }`}
          onPress={onUseCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.76}
        >
          <Ionicons
            name="location"
            size={24}
            color="white"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text className="font-semibold text-white">
              {currentLocation ? currentLocation.label : "Use current location"}
            </Text>
            <Text className="mt-1 text-xs leading-4 text-white/70">
              {currentLocation
                ? "Location saved for nearby matches"
                : "Optional, but improves nearby discovery"}
            </Text>
          </View>
          {isLocating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-xs font-bold text-white/70">
              {currentLocation ? "Update" : "Detect"}
            </Text>
          )}
        </TouchableOpacity>

        {locationError ? (
          <Text className="text-xs font-semibold text-red-200">
            {locationError}
          </Text>
        ) : null}

        <Text className="text-center text-xs leading-5 text-white/45">
          By creating an account you agree to our{" "}
          <Text className="font-bold text-white/70">Terms</Text> and{" "}
          <Text className="font-bold text-white/70">Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

function StepHeader({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View>
      <View className="mb-8 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ionicons name={icon} size={38} color="white" />
      </View>
      <Text
        className="text-[42px] font-bold leading-[52px] text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        {title}
      </Text>
      <Text className="mt-4 text-base leading-6 text-white/70">
        {description}
      </Text>
    </View>
  );
}

function FieldWrapper({
  label,
  icon,
  error,
  trailing,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-white/70">{label}</Text>
      <View
        className={`h-14 flex-row items-center rounded-2xl border-2 bg-black/30 px-4 ${
          error ? "border-red-400/70" : "border-white/10"
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color="rgba(255,255,255,0.7)"
          style={{ marginRight: 12 }}
        />
        {children}
        {trailing}
      </View>
      {error ? (
        <Text className="mt-2 text-xs font-semibold text-red-200">{error}</Text>
      ) : null}
    </View>
  );
}

const formatLocationLabel = (place?: Location.LocationGeocodedAddress) =>
  [place?.city || place?.district || place?.region, place?.country]
    .filter(Boolean)
    .join(", ");
