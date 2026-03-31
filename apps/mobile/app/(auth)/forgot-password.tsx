import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleReset = () => {
    Alert.alert('Coming soon', 'Password reset will be available soon.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Reset password</Text>
        <Text style={styles.subheading}>
          Enter your email and we'll send you a reset link.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity style={styles.btn} onPress={handleReset}>
          <Text style={styles.btnText}>Send Reset Link</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: Spacing.lg, paddingTop: 64 },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.primaryLight },
  heading: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.textPrimary, marginBottom: 8 },
  subheading: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary, marginBottom: 6 },
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
    marginBottom: Spacing.lg,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.white },
});
