import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

const MESSAGES = [
  'You showed up. That\'s what champions do.',
  'Another session in the books. Progress is progress.',
  'Consistency beats intensity every time. Keep going.',
  'Your future self is thanking you right now.',
  'Hard work compounds. You\'re building something great.',
];

export default function CelebrationScreen() {
  const { sessionId, sessionName, setsLogged, duration } = useLocalSearchParams<{
    sessionId: string;
    sessionName: string;
    setsLogged: string;
    duration: string;
  }>();
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const sets = parseInt(setsLogged ?? '0', 10);
  const minutes = Math.round(parseInt(duration ?? '0', 10) / 60);
  const msgIndex = (sessionId?.charCodeAt(sessionId.length - 1) ?? 0) % MESSAGES.length;
  const message = MESSAGES[msgIndex];

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Ionicons name="trophy" size={80} color="#f59e0b" />
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.sessionName}>{sessionName}</Text>

        <View style={styles.statsRow}>
          <StatBlock value={String(sets)} label="Sets Logged" />
          <StatBlock value={`${minutes}`} label="Minutes" />
        </View>

        <Text style={styles.message}>"{message}"</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push(`/(app)/progress/${sessionId}`)}
        >
          <Ionicons name="bar-chart-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>View Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(app)/home')}
        >
          <Text style={styles.secondaryBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  sessionName: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 8,
  },
  statBlock: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
});
