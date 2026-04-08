import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, radii } from '@/lib/theme';

interface BodyLog {
  id: string;
  weight: number;
  unit: string;
  bodyFat?: number | null;
  notes?: string | null;
  loggedAt: string;
}

export default function BodyScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<BodyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api.get<{ logs: BodyLog[] }>('/api/body');
      setLogs(res.logs);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  async function handleAdd() {
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid weight' });
      return;
    }
    setIsSaving(true);
    try {
      const bf = bodyFat ? parseFloat(bodyFat) : undefined;
      const res = await api.post<{ log: BodyLog }>('/api/body', {
        weight: w,
        unit,
        bodyFat: bf && !isNaN(bf) ? bf : undefined,
        notes: notes.trim() || undefined,
      });
      setLogs((prev) => [res.log, ...prev]);
      setShowAddModal(false);
      setWeight('');
      setBodyFat('');
      setNotes('');
      Toast.show({ type: 'success', text1: 'Weight logged' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Entry', 'Remove this body log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/body/${id}`);
            setLogs((prev) => prev.filter((l) => l.id !== id));
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete' });
          }
        },
      },
    ]);
  }

  const latest = logs[0];
  const previous = logs[1];
  const trend = latest && previous
    ? latest.weight - previous.weight
    : null;

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Body Log</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Latest stats */}
      {latest && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {latest.weight} <Text style={styles.statUnit}>{latest.unit}</Text>
            </Text>
            <Text style={styles.statLabel}>Current Weight</Text>
          </View>
          {trend !== null && (
            <View style={styles.statCard}>
              <View style={styles.trendRow}>
                <Ionicons
                  name={trend > 0 ? 'arrow-up' : trend < 0 ? 'arrow-down' : 'remove'}
                  size={18}
                  color={trend > 0 ? colors.warning : trend < 0 ? colors.success : colors.textSecondary}
                />
                <Text style={[
                  styles.statValue,
                  { color: trend > 0 ? colors.warning : trend < 0 ? colors.success : colors.textSecondary }
                ]}>
                  {Math.abs(trend).toFixed(1)}
                </Text>
              </View>
              <Text style={styles.statLabel}>vs Last Entry</Text>
            </View>
          )}
          {latest.bodyFat != null && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{latest.bodyFat}<Text style={styles.statUnit}>%</Text></Text>
              <Text style={styles.statLabel}>Body Fat</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLogs(); }} tintColor={colors.accent} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logLeft}>
              <Text style={styles.logWeight}>{item.weight} {item.unit}</Text>
              {item.bodyFat != null && (
                <Text style={styles.logBodyFat}>{item.bodyFat}% body fat</Text>
              )}
              <Text style={styles.logDate}>
                {new Date(item.loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              {item.notes && <Text style={styles.logNotes}>{item.notes}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="scale-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>Tap + to log your weight.</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Log Weight</Text>

          <View style={styles.unitToggle}>
            {(['lbs', 'kg'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Weight ({unit})</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder={unit === 'lbs' ? '185' : '84'}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={styles.inputLabel}>Body Fat % (optional)</Text>
          <TextInput
            style={styles.input}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="15.5"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Morning weight, post-workout…"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Button onPress={handleAdd} loading={isSaving} size="lg">
            Save Entry
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  addBtn: { width: 36, alignItems: 'flex-end' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statValue: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  statUnit: { fontSize: typography.sm, fontWeight: '400', color: colors.textSecondary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  logCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  logLeft: { gap: 2 },
  logWeight: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  logBodyFat: { fontSize: typography.xs, color: colors.textSecondary },
  logDate: { fontSize: typography.xs, color: colors.textMuted },
  logNotes: { fontSize: typography.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: typography.xl, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: typography.sm, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, gap: spacing.md, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  unitToggle: { flexDirection: 'row', gap: spacing.sm },
  unitBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  unitBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  unitBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  unitBtnTextActive: { color: colors.accent },
  inputLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: -4 },
  input: {
    backgroundColor: colors.bg, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.text, fontSize: typography.md,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
});
