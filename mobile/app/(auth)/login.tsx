import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/lib/theme';
import { User } from '@/types';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: User }>('/api/auth/login', {
        email,
        password,
      });
      await login(response.token, response.user);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err instanceof Error ? err.message : 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Average Joe's</Text>
          <Text style={styles.appSubtitle}>Workout Tracker</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            testID="email-input"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            testID="password-input"
          />
          <Button
            onPress={handleLogin}
            loading={isLoading}
            size="lg"
            style={styles.submitBtn}
            testID="login-button"
          >
            Sign In
          </Button>
        </View>

        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() =>
            Alert.alert(
              'Forgot Password',
              'Sign in with your email and update your password from Profile → Change Password.\n\nIf you cannot sign in, contact support.',
              [{ text: 'OK' }]
            )
          }
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" style={styles.link}>
            Sign up
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: -1,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  forgotRow: { alignItems: 'center', marginTop: -4 },
  forgotText: { color: colors.accent, fontSize: typography.sm, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  link: {
    color: colors.accent,
    fontSize: typography.sm,
    fontWeight: '600',
  },
});
