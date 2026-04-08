import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOUND_PREF_KEY } from '@/hooks/useSetCompleteSound';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/lib/theme';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isHealthKitAvailable, requestPermissions } from '@/lib/healthkit';

type AiProvider = 'anthropic' | 'openai';

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? '');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>(user?.aiProvider ?? 'anthropic');
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const healthKitAvailable = isHealthKitAvailable();

  useEffect(() => {
    AsyncStorage.getItem(SOUND_PREF_KEY).then((val) => {
      setSoundEnabled(val !== 'false');
    });
  }, []);

  function toggleSound(val: boolean) {
    setSoundEnabled(val);
    AsyncStorage.setItem(SOUND_PREF_KEY, String(val));
  }

  async function handleHealthKitPress() {
    if (!healthKitAvailable) {
      Alert.alert(
        'Apple Health',
        'HealthKit requires a native build of the app.\n\nTo enable it, run:\n\nnpx expo prebuild\nnpx expo run:ios\n\nThen the Connect and Import options will become active.',
        [{ text: 'Got it' }]
      );
      return;
    }
    const granted = await requestPermissions();
    if (granted) {
      Toast.show({ type: 'success', text1: 'Apple Health connected' });
    } else {
      Alert.alert(
        'Permission Denied',
        "Open Settings → Privacy & Security → Health → Average Joe's and enable read/write access."
      );
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await api.put('/api/auth/me', {
        name: name.trim() || undefined,
        anthropicApiKey: anthropicKey.trim() || undefined,
        openaiApiKey: openaiKey.trim() || undefined,
        aiProvider,
      });
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile updated' });
      setAnthropicKey('');
      setOpenaiKey('');
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
              {(user?.hasAnthropicKey || user?.hasOpenAiKey) ? (
                <Badge variant="accent">
                  {user?.aiProvider === 'openai' ? 'ChatGPT Active' : 'Claude Active'}
                </Badge>
              ) : (
                <Badge variant="default">No AI Provider</Badge>
              )}
            </View>
          </Card>

          {/* Training profile */}
          <TouchableOpacity
            style={profileEditStyles.trainingRow}
            onPress={() => router.push('/(onboarding)/')}
          >
            <Ionicons name="barbell-outline" size={20} color={colors.accent} />
            <Text style={profileEditStyles.trainingText}>Edit Training Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Apple Health */}
          <View style={profileEditStyles.section}>
            <Text style={profileEditStyles.sectionTitle}>Apple Health</Text>
            <TouchableOpacity
              style={profileEditStyles.trainingRow}
              onPress={handleHealthKitPress}
            >
              <Ionicons name="heart-outline" size={20} color="#ff375f" />
              <View style={{ flex: 1 }}>
                <Text style={profileEditStyles.trainingText}>Connect Apple Health</Text>
                {!healthKitAvailable && (
                  <Text style={profileEditStyles.trainingSubtext}>Requires native build</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={profileEditStyles.trainingRow}
              onPress={healthKitAvailable ? () => router.push('/(app)/progress/import') : handleHealthKitPress}
            >
              <Ionicons name="watch-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={profileEditStyles.trainingText}>Import from Apple Watch</Text>
                {!healthKitAvailable && (
                  <Text style={profileEditStyles.trainingSubtext}>Requires native build</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Workout settings */}
          <View style={profileEditStyles.section}>
            <Text style={profileEditStyles.sectionTitle}>Workout Settings</Text>
            <View style={profileEditStyles.trainingRow}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={profileEditStyles.trainingText}>Set Completion Sound</Text>
                <Text style={profileEditStyles.trainingSubtext}>Plays a chime when a set is logged</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={toggleSound}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#fff"
                testID="sound-toggle"
              />
            </View>
          </View>

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

          {/* AI Provider */}
          <Card>
            <Text style={styles.sectionTitle}>AI Provider</Text>
            <Text style={styles.hint}>
              Choose which AI powers your workout and program generation.
            </Text>
            {/* Provider toggle */}
            <View style={styles.providerToggle}>
              <TouchableOpacity
                style={[styles.providerBtn, aiProvider === 'anthropic' && styles.providerBtnActive]}
                onPress={() => setAiProvider('anthropic')}
              >
                <Text style={[styles.providerBtnText, aiProvider === 'anthropic' && styles.providerBtnTextActive]}>
                  Claude (Anthropic)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.providerBtn, aiProvider === 'openai' && styles.providerBtnActive]}
                onPress={() => setAiProvider('openai')}
              >
                <Text style={[styles.providerBtnText, aiProvider === 'openai' && styles.providerBtnTextActive]}>
                  ChatGPT (OpenAI)
                </Text>
              </TouchableOpacity>
            </View>

            {aiProvider === 'anthropic' ? (
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
            ) : (
              <Input
                label="OpenAI API Key"
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder={user?.hasOpenAiKey ? '••••••• (saved)' : 'sk-...'}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="openai-key-input"
              />
            )}
            <Text style={styles.hint}>
              Your key is stored encrypted on our server and never shared.
            </Text>
            <Button
              onPress={handleSave}
              loading={isSaving}
              size="md"
              style={styles.saveBtn}
            >
              Save AI Settings
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
  providerToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  providerBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center',
  },
  providerBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  providerBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  providerBtnTextActive: { color: colors.accent },
});

const profileEditStyles = StyleSheet.create({
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trainingText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 },
  trainingSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
