import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useThemeColors } from "../../hooks/useThemeColors";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { requestPasswordReset, resetPassword } = useAuthStore();
  const [serverError, setServerError] = useState("");
  const [notice, setNotice] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const requestOtp = async () => {
    setServerError("");
    setNotice("");
    const isEmailValid = await trigger("email");
    if (!isEmailValid) return;

    setIsRequestingOtp(true);
    try {
      const response = await requestPasswordReset({ email: getValues("email") });
      setNotice(
        response.devOtp
          ? `${response.message} Dev OTP: ${response.devOtp}`
          : response.message,
      );
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message ??
          "Unable to send reset OTP. Please try again.",
      );
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const submitReset = async (values: FormData) => {
    setServerError("");
    try {
      const response = await resetPassword({
        email: values.email,
        otp: values.otp,
        password: values.password,
      });
      setNotice(response.message);
      setIsResetComplete(true);
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message ??
          "Unable to reset password. Please try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-grow px-5 pb-8 pt-16"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          className="mb-8 h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-input"
          onPress={() => router.back()}
          activeOpacity={0.84}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-3xl font-extrabold tracking-wide text-primary">
            Reset password
          </Text>
          <Text className="mt-2 text-base leading-6 text-text-secondary">
            Send a reset OTP to your email, then choose a new password.
          </Text>
        </View>

        <View className="rounded-[24px] border border-border bg-bg-card p-5">
          <Field
            control={control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            error={errors.email?.message}
          />

          <TouchableOpacity
            className="mb-4 h-12 items-center justify-center rounded-full border border-border bg-bg-input"
            onPress={requestOtp}
            disabled={isRequestingOtp || isResetComplete}
            activeOpacity={0.84}
          >
            {isRequestingOtp ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text className="text-sm font-extrabold text-primary">
                Send reset OTP
              </Text>
            )}
          </TouchableOpacity>

          <Field
            control={control}
            name="otp"
            label="OTP"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.otp?.message}
            onChangeSanitize={(value) => value.replace(/\D/g, "").slice(0, 6)}
          />

          <Field
            control={control}
            name="password"
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            error={errors.password?.message}
          />

          <Field
            control={control}
            name="confirmPassword"
            label="Confirm password"
            placeholder="Repeat new password"
            secureTextEntry
            error={errors.confirmPassword?.message}
          />

          {serverError ? (
            <View className="mb-4 rounded-2xl border border-error bg-error/10 p-3">
              <Text className="text-sm font-semibold text-error">
                {serverError}
              </Text>
            </View>
          ) : null}

          {notice ? (
            <View className="mb-4 rounded-2xl border border-border bg-bg-elevated p-3">
              <Text className="text-sm font-semibold text-text-secondary">
                {notice}
              </Text>
            </View>
          ) : null}

          {isResetComplete ? (
            <TouchableOpacity
              className="h-13 items-center justify-center rounded-full bg-primary py-4"
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.88}
            >
              <Text className="font-extrabold text-inverse">
                Back to sign in
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="h-13 items-center justify-center rounded-full bg-primary py-4"
              onPress={handleSubmit(submitReset)}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text className="font-extrabold text-inverse">
                  Reset password
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  control: ReturnType<typeof useForm<FormData>>["control"];
  name: keyof FormData;
  label: string;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  maxLength?: number;
  secureTextEntry?: boolean;
  onChangeSanitize?: (value: string) => string;
};

function Field({
  control,
  name,
  label,
  placeholder,
  error,
  keyboardType = "default",
  maxLength,
  secureTextEntry,
  onChangeSanitize,
}: FieldProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-bold text-text-secondary">
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            className={`rounded-2xl border bg-bg-input px-4 py-3.5 text-base text-primary ${
              error ? "border-error" : "border-border"
            }`}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType={keyboardType}
            maxLength={maxLength}
            secureTextEntry={secureTextEntry}
            onBlur={onBlur}
            onChangeText={(text) => onChange(onChangeSanitize?.(text) ?? text)}
            value={value}
          />
        )}
      />
      {error ? <Text className="mt-1 text-xs font-semibold text-error">{error}</Text> : null}
    </View>
  );
}
