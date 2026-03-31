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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import type { Gender } from '@/types/auth.types';

// ── Validation ─────────────────────────────────────────────────────
const schema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(24, 'Username is too long')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
      .refine((d) => {
        const age = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 18;
      }, 'You must be at least 18 years old'),
    gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Man', value: 'MALE' },
  { label: 'Woman', value: 'FEMALE' },
  { label: 'Non-binary', value: 'NON_BINARY' },
  { label: 'Other', value: 'OTHER' },
];

// ── Component ──────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'MALE' },
  });

  const onSubmit = async (values: FormData) => {
    setServerError('');
    try {
      await register({
        email: values.email,
        password: values.password,
        username: values.username,
        birthDate: values.birthDate,
        gender: values.gender,
      });
      // AuthGuard in _layout.tsx handles redirect
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Registration failed. Please try again.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
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
        {/* ── Background orb ── */}
        <View style={styles.orbContainer} pointerEvents="none">
          <LinearGradient
            colors={['#EC489955', '#7C3AED00']}
            style={styles.orb}
          />
        </View>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.brand}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoLetter}>B</Text>
            </LinearGradient>
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
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </FieldWrapper>

          {/* Confirm password */}
          <FieldWrapper label="Confirm Password" error={errors.confirmPassword?.message}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
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
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          {/* Login CTA */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
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
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

  orbContainer: { position: 'absolute', top: -60, right: -80, zIndex: 0 },
  orb: { width: 280, height: 280, borderRadius: 140 },

  header: { marginTop: 56, marginBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.medium,
    color: Colors.primaryLight,
  },
  brand: { alignItems: 'center', marginBottom: Spacing.md },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontSize: 28, fontFamily: FontFamily.bold, color: Colors.white },
  heading: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error },
  fieldError: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
    marginTop: 4,
  },

  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  genderChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
  },
  genderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}33`,
  },
  genderChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  genderChipTextActive: { color: Colors.primaryLight },

  errorBanner: {
    backgroundColor: '#EF444420',
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

  submitBtn: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md },
  submitGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  terms: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  termsLink: { color: Colors.primaryLight, fontFamily: FontFamily.medium },

  loginBtn: { alignItems: 'center' },
  loginText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  loginLink: { fontFamily: FontFamily.semiBold, color: Colors.primaryLight },
});
