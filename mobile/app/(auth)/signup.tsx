import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/lib/theme';
import { User } from '@/types';

export default function SignupScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Email and password are required' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: User }>('/api/auth/signup', {
        name: name || undefined,
        email,
        password,
      });
      await login(response.token, response.user);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Signup failed',
        text2: err instanceof Error ? err.message : 'Could not create account',
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
          <Text style={styles.logo}>AVGJoe</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking your gains</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Name (optional)"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoComplete="name"
            testID="name-input"
          />
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
            placeholder="Min 8 characters"
            secureTextEntry
            autoComplete="new-password"
            testID="password-input"
          />
          <Button
            onPress={handleSignup}
            loading={isLoading}
            size="lg"
            style={styles.submitBtn}
            testID="signup-button"
          >
            Create Account
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
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
    fontSize: 36,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: -1,
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
