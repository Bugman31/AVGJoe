import React, { useState, useEffect, useCallback } from 'react';
import { Linking, Image } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
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
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { colors, spacing, typography, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isHealthKitAvailable, requestPermissions } from '@/lib/healthkit';

type AiProvider = 'anthropic' | 'openai';

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>(user?.aiProvider ?? 'anthropic');
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const healthKitAvailable = isHealthKitAvailable();

  useEffect(() => {
    AsyncStorage.getItem(SOUND_PREF_KEY).then((val) => {
      setSoundEnabled(val !== 'false');
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
    }, [refreshUser])
  );

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

  async function handleAvatarPress() {
    Alert.alert('Profile Photo', 'Update your profile picture', [
      { text: 'Choose from Library', onPress: pickAvatarFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickAvatarFromLibrary() {
    setIsUploadingAvatar(true);
    try {
      // Dynamic import — works with or without expo-image-picker installed
      let ImagePicker: typeof import('expo-image-picker');
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        Alert.alert('Not available', 'expo-image-picker is not installed in this build.');
        return;
      }

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not read image data.');
        return;
      }

      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const avatarUrl = `data:${mimeType};base64,${asset.base64}`;

      await api.put('/api/auth/me', { avatarUrl });
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile photo updated' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (newPassword && !currentPassword) {
      Toast.show({ type: 'error', text1: 'Enter your current password to change it' });
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/api/auth/me', {
        name: name.trim() || undefined,
        anthropicApiKey: anthropicKey.trim() || undefined,
        openaiApiKey: openaiKey.trim() || undefined,
        aiProvider,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile updated' });
      setAnthropicKey('');
      setOpenaiKey('');
      setCurrentPassword('');
      setNewPassword('');
      setShowChangePassword(false);
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

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* User info summary */}
          <Card style={styles.userCard}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handleAvatarPress}
              disabled={isUploadingAvatar}
              activeOpacity={0.8}
            >
              {(user as any)?.avatarUrl ? (
                <Image
                  source={{ uri: (user as any).avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.name ?? user?.email ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
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
          <TouchableOpacity style={rowStyles.row} onPress={() => router.push('/(onboarding)/')}>
            <Ionicons name="barbell-outline" size={20} color={colors.accent} />
            <Text style={rowStyles.rowText}>Edit Training Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Body Log */}
          <TouchableOpacity style={rowStyles.row} onPress={() => router.push('/(app)/body')}>
            <Ionicons name="scale-outline" size={20} color={colors.accent} />
            <Text style={rowStyles.rowText}>Body Log</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Apple Health */}
          <View style={rowStyles.section}>
            <Text style={rowStyles.sectionTitle}>Apple Health</Text>
            <TouchableOpacity style={rowStyles.row} onPress={handleHealthKitPress}>
              <Ionicons name="heart-outline" size={20} color="#ff375f" />
              <View style={{ flex: 1 }}>
                <Text style={rowStyles.rowText}>Connect Apple Health</Text>
                {!healthKitAvailable && <Text style={rowStyles.rowSubtext}>Requires native build</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={rowStyles.row}
              onPress={healthKitAvailable ? () => router.push('/(app)/progress/import') : handleHealthKitPress}
            >
              <Ionicons name="watch-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={rowStyles.rowText}>Import from Apple Watch</Text>
                {!healthKitAvailable && <Text style={rowStyles.rowSubtext}>Requires native build</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Appearance */}
          <View style={rowStyles.section}>
            <Text style={rowStyles.sectionTitle}>Appearance</Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.themeBtn, themeMode === opt.value && styles.themeBtnActive]}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={themeMode === opt.value ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.themeBtnText, themeMode === opt.value && styles.themeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Workout settings */}
          <View style={rowStyles.section}>
            <Text style={rowStyles.sectionTitle}>Workout Settings</Text>
            <View style={rowStyles.row}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={rowStyles.rowText}>Set Completion Sound</Text>
                <Text style={rowStyles.rowSubtext}>Plays a chime when a set is logged</Text>
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

          {/* Edit Profile */}
          <Card>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              testID="name-input"
            />

            {/* Change Password */}
            <TouchableOpacity
              style={styles.changePasswordRow}
              onPress={() => setShowChangePassword((v) => !v)}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.accent} />
              <Text style={styles.changePasswordText}>Change Password</Text>
              <Ionicons
                name={showChangePassword ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {showChangePassword && (
              <View style={styles.passwordFields}>
                <Input
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="current-password"
                />
                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
            )}
          </Card>

          {/* AI Provider */}
          <Card>
            <Text style={styles.sectionTitle}>AI Provider</Text>
            <Text style={styles.hint}>Choose which AI powers your workout and program generation.</Text>
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
              <>
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
                <TouchableOpacity
                  style={styles.getKeyLink}
                  onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
                >
                  <Ionicons name="open-outline" size={13} color={colors.accent} />
                  <Text style={styles.getKeyText}>Get your Anthropic API key →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
                <TouchableOpacity
                  style={styles.getKeyLink}
                  onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
                >
                  <Ionicons name="open-outline" size={13} color={colors.accent} />
                  <Text style={styles.getKeyText}>Get your OpenAI API key →</Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.hint}>Your key is stored encrypted and never shared.</Text>
          </Card>

          {/* Single unified save */}
          <Button
            onPress={handleSave}
            loading={isSaving}
            size="lg"
            testID="save-btn"
          >
            Save All Changes
          </Button>

          <Button onPress={confirmLogout} variant="danger" size="lg" testID="logout-btn">
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  userCard: { alignItems: 'center', gap: spacing.sm },
  avatarWrapper: { position: 'relative', width: 64, height: 64 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.xxl, fontWeight: '700', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accentHover,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  userName: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: typography.sm, color: colors.textSecondary },
  badges: { flexDirection: 'row', gap: spacing.sm },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  hint: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.xs },
  getKeyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  getKeyText: { fontSize: typography.xs, color: colors.accent, fontWeight: '600' },
  providerToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  providerBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center',
  },
  providerBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  providerBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  providerBtnTextActive: { color: colors.accent },
  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  themeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  themeBtnText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  themeBtnTextActive: { color: colors.accent },
  changePasswordRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  changePasswordText: { flex: 1, fontSize: typography.sm, fontWeight: '500', color: colors.text },
  passwordFields: { gap: spacing.sm, marginTop: spacing.sm },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4,
  },
  rowSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
