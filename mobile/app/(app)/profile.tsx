import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await api.put('/api/auth/me', {
        name: name.trim() || undefined,
        anthropicApiKey: anthropicKey.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      setAnthropicKey(''); // Clear key field after save
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* User info summary */}
          <Card style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name ?? user?.email ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name ?? 'Unnamed User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badges}>
              {user?.hasAnthropicKey ? (
                <Badge variant="accent">AI Key Active</Badge>
              ) : (
                <Badge variant="default">No AI Key</Badge>
              )}
            </View>
          </Card>

          {/* Edit form */}
          <Card>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              testID="name-input"
            />
            <Input
              label="Anthropic API Key"
              value={anthropicKey}
              onChangeText={setAnthropicKey}
              placeholder={user?.hasAnthropicKey ? '••••••• (saved)' : 'sk-ant-...'}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              testID="api-key-input"
            />
            <Text style={styles.hint}>
              Your API key is stored encrypted and used for AI workout generation.
            </Text>
            <Button
              onPress={handleSave}
              loading={isSaving}
              size="md"
              style={styles.saveBtn}
              testID="save-btn"
            >
              Save Changes
            </Button>
          </Card>

          <Button
            onPress={confirmLogout}
            variant="danger"
            size="lg"
            testID="logout-btn"
          >
            Sign Out
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  userCard: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.xxl, fontWeight: '700', color: '#fff' },
  userName: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: typography.sm, color: colors.textSecondary },
  badges: { flexDirection: 'row', gap: spacing.sm },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  hint: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.xs },
  saveBtn: { marginTop: spacing.md },
});
