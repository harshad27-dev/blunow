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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, requestLoginOtp } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', otp: '' },
  });

  const handleRequestOtp = async () => {
    setServerError('');
    setOtpNotice('');

    const isEmailValid = await trigger('email');
    if (!isEmailValid) return;

    setIsRequestingOtp(true);
    try {
      const response = await requestLoginOtp({ email: getValues('email') });
      setOtpNotice(
        response.devOtp
          ? `${response.message} Dev OTP: ${response.devOtp}`
          : response.message,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Unable to send OTP. Please try again.';
      setServerError(msg);
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const onSubmit = async (values: FormData) => {
    setServerError('');
    try {
      await login(values);
      // AuthGuard in _layout.tsx handles the redirect.
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'OTP verification failed. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>B</Text>
          </View>
          <Text style={styles.appName}>blunow</Text>
          <Text style={styles.tagline}>Connect. Vibe. Match.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>
            Sign in with the OTP sent to your email.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
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
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.otpRequestBtn}
            onPress={handleRequestOtp}
            disabled={isRequestingOtp}
            activeOpacity={0.8}
          >
            {isRequestingOtp ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.otpRequestText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          {otpNotice ? (
            <Text style={styles.noticeText}>{otpNotice}</Text>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>OTP</Text>
            <Controller
              control={control}
              name="otp"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                    errors.otp && styles.inputError,
                  ]}
                  placeholder="123456"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  returnKeyType="done"
                  onBlur={onBlur}
                  onChangeText={(text) =>
                    onChange(text.replace(/\D/g, '').slice(0, 6))
                  }
                  onSubmitEditing={handleSubmit(onSubmit)}
                  value={value}
                />
              )}
            />
            {errors.otp && (
              <Text style={styles.fieldError}>{errors.otp.message}</Text>
            )}
          </View>

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.submitText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerText}>
              No account yet?{' '}
              <Text style={styles.registerLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  brand: { alignItems: 'center', marginTop: 100, marginBottom: Spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoLetter: {
    fontSize: 38,
    fontFamily: FontFamily.bold,
    color: Colors.black,
  },
  appName: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bold,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heading: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  subheading: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
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
  otpInput: {
    fontFamily: FontFamily.bold,
    letterSpacing: 6,
    textAlign: 'center',
  },
  fieldError: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
    marginTop: 4,
  },
  otpRequestBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  otpRequestText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  noticeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  errorBanner: {
    backgroundColor: '#330000',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  submitText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.black,
    letterSpacing: 0.3,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },

  registerBtn: { alignItems: 'center' },
  registerText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
});
