/**
 * Custom Program Builder — 2-step wizard
 *
 * Step 1: name, total weeks, training days
 * Step 2: per-week workout editor
 *   – horizontal week tab bar
 *   – collapsible per-day cards with compact exercise rows
 *   – "Copy from previous week" / "Copy from Week N" shortcuts
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { Button } from '@/components/ui/Button';
import { ExercisePickerModal, type PickedExercise } from '@/components/workouts/ExercisePickerModal';
import { colors, spacing, typography, radii } from '@/lib/theme';

// ─── constants ───────────────────────────────────────────────────────────────

const DAYS_ORDERED = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── types ────────────────────────────────────────────────────────────────────

interface ExerciseRow {
  id: string;
  name: string;
  sets: string;   // kept as string for TextInput
  reps: string;
  weight: string; // absolute weight OR percentage depending on unit
  unit: 'lbs' | 'kg' | '%';
  percentBasis: 'bench' | 'squat' | 'deadlift' | 'press' | 'custom';
  customOneRepMax: string; // used when percentBasis === 'custom'
  notes: string;
}

interface DayWorkout {
  day: string;
  name: string;
  focus: string;
  exercises: ExerciseRow[];
  expanded: boolean;
}

type WeekData = DayWorkout[];  // one entry per selected day

// ─── helpers ─────────────────────────────────────────────────────────────────

// ─── AI preview types ─────────────────────────────────────────────────────────

interface AiSet {
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  unit: string;
}

interface AiExercise {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: AiSet[];
}

interface AiWorkout {
  weekNumber: number;
  dayOfWeek: string;
  name: string;
  focus?: string;
  exercises: AiExercise[];
}

interface AiPreview {
  programName: string;
  totalWeeks: number;
  workouts: AiWorkout[];
}

function makeExerciseId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function aiPreviewToWeekData(preview: AiPreview): {
  weeks: WeekData[];
  name: string;
  totalWeeks: number;
  days: string[];
} {
  const allDays = [...new Set(preview.workouts.map((w) => w.dayOfWeek))];
  const orderedDays = DAYS_ORDERED.filter((d) => allDays.includes(d));

  const weeks: WeekData[] = Array.from({ length: preview.totalWeeks }, (_, i) => {
    const wkNum = i + 1;
    return orderedDays.map((day) => {
      const pw = preview.workouts.find(
        (w) => w.weekNumber === wkNum && w.dayOfWeek === day
      );
      if (!pw) return emptyDayWorkout(day);
      return {
        day,
        name: pw.name,
        focus: pw.focus ?? '',
        expanded: false,
        exercises: pw.exercises.map((ex) => {
          const s0 = ex.sets[0] ?? {};
          return {
            id: makeExerciseId(),
            name: ex.name,
            sets: String(ex.sets.length),
            reps: s0.targetReps != null ? String(s0.targetReps) : '',
            weight: s0.targetWeight != null ? String(s0.targetWeight) : '',
            unit: (s0.unit as 'lbs' | 'kg' | '%') || 'lbs',
            percentBasis: 'bench' as const,
            customOneRepMax: '',
            notes: ex.notes ?? '',
          };
        }),
      };
    });
  });

  return { weeks, name: preview.programName, totalWeeks: preview.totalWeeks, days: orderedDays };
}

function emptyExercise(): ExerciseRow {
  return {
    id: makeExerciseId(),
    name: '',
    sets: '3',
    reps: '8',
    weight: '',
    unit: 'lbs',
    percentBasis: 'bench',
    customOneRepMax: '',
    notes: '',
  };
}

function emptyDayWorkout(day: string): DayWorkout {
  return { day, name: '', focus: '', exercises: [emptyExercise()], expanded: true };
}

function deepCopyWeek(week: WeekData): WeekData {
  return week.map((dw) => ({
    ...dw,
    exercises: dw.exercises.map((ex) => ({ ...ex })),
    expanded: false, // collapse copies to keep UI tidy
  }));
}

function buildWeeks(totalWeeks: number, days: string[]): WeekData[] {
  return Array.from({ length: totalWeeks }, () =>
    days.map((day) => emptyDayWorkout(day))
  );
}

/** Convert a DayWorkout's exercises to PlannedExercise format for the API */
function toApiExercises(exercises: ExerciseRow[]) {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex, i) => {
      const sets = Math.max(1, parseInt(ex.sets) || 1);
      const reps = parseInt(ex.reps) || null;
      const isPercent = ex.unit === '%';
      const weight = isPercent ? null : parseFloat(ex.weight) || null;
      const pct = isPercent ? parseFloat(ex.weight) || null : null;
      const customOrm = isPercent && ex.percentBasis === 'custom'
        ? parseFloat(ex.customOneRepMax) || null
        : null;
      return {
        name: ex.name.trim(),
        orderIndex: i,
        notes: ex.notes.trim() || undefined,
        sets: Array.from({ length: sets }, (_, s) => ({
          setNumber: s + 1,
          targetReps: reps,
          targetWeight: weight,
          unit: isPercent ? 'lbs' : ex.unit, // logged unit; suggested weight resolved at workout time
          percentOfMax: pct,
          percentBasis: isPercent ? ex.percentBasis : null,
          customOneRepMax: customOrm,
        })),
      };
    });
}

// ─── Step 1: Setup ───────────────────────────────────────────────────────────

// ─── profile helpers ──────────────────────────────────────────────────────────

type ProfileRecord = Record<string, unknown>;

function fmt(val: unknown): string {
  if (!val) return '';
  return String(val).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function profileSummaryLines(p: ProfileRecord): string[] {
  const lines: string[] = [];
  if (p.primaryGoal)       lines.push(`🎯  Goal: ${fmt(p.primaryGoal)}`);
  if (p.experienceLevel)   lines.push(`📊  Level: ${fmt(p.experienceLevel)}`);
  if (p.daysPerWeek)       lines.push(`📅  ${p.daysPerWeek} days / week`);
  if (p.sessionDurationMins) lines.push(`⏱  ${p.sessionDurationMins} min sessions`);
  if (p.preferredSplit)    lines.push(`🏋  Split: ${fmt(p.preferredSplit)}`);
  if (p.workoutEnvironment) lines.push(`📍  ${fmt(p.workoutEnvironment)}`);
  if (Array.isArray(p.availableEquipment) && p.availableEquipment.length)
    lines.push(`🔧  ${(p.availableEquipment as string[]).join(', ')}`);
  if (Array.isArray(p.injuryFlags) && p.injuryFlags.length)
    lines.push(`⚠️  Injuries: ${(p.injuryFlags as string[]).join(', ')}`);
  return lines;
}

// ─── SetupStep ────────────────────────────────────────────────────────────────

interface SetupStepProps {
  name: string; setName: (v: string) => void;
  totalWeeks: number; setTotalWeeks: (v: number) => void;
  selectedDays: string[]; toggleDay: (d: string) => void;
  onNext: () => void;
  onAiGenerate: (customization: string, totalWeeks: number) => void;
  isGenerating: boolean;
  hasActiveProgram: boolean;
}

function SetupStep({
  name, setName, totalWeeks, setTotalWeeks, selectedDays, toggleDay,
  onNext, onAiGenerate, isGenerating, hasActiveProgram,
}: SetupStepProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customization, setCustomization] = useState('');
  // undefined = not yet fetched, null = fetch failed / no profile
  const [profile, setProfile] = useState<ProfileRecord | null | undefined>(undefined);

  // Fetch profile the first time the AI panel opens
  useEffect(() => {
    if (aiExpanded && profile === undefined) {
      api.get<{ profile: ProfileRecord }>('/api/profile/me')
        .then((res) => setProfile(res.profile ?? null))
        .catch(() => setProfile(null));
    }
  }, [aiExpanded]);

  const hasAiKey = !!(user?.serverHasAiKey || user?.hasAnthropicKey || user?.hasOpenAiKey);
  const profileComplete = profile && profile.onboardingCompleted;
  const summaryLines = profile ? profileSummaryLines(profile) : [];

  function handleGenerate() {
    if (!hasAiKey) {
      Alert.alert(
        'No AI Key',
        'Add an Anthropic or OpenAI key in your Profile settings, or ask your admin to configure a server key.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/(app)/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    if (!profileComplete) {
      Alert.alert(
        'Profile Incomplete',
        'Complete your training profile so the AI can tailor your program.',
        [
          {
            text: 'Set Up Profile',
            onPress: () => router.push({
              pathname: '/(onboarding)/',
              params: { returnTo: '/(app)/workouts/build-program' },
            }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    onAiGenerate(customization, totalWeeks);
  }

  return (
    <ScrollView contentContainerStyle={s1.content} keyboardShouldPersistTaps="handled">
      <Text style={s1.heading}>Program Details</Text>

      {hasActiveProgram && (
        <View style={s1.warning}>
          <Ionicons name="warning-outline" size={14} color={colors.warning} />
          <Text style={s1.warningText}>
            Saving will archive your current active program. Your history is preserved.
          </Text>
        </View>
      )}

      {/* ── AI generate panel ── */}
      <View style={s1.aiCard}>
        <TouchableOpacity
          style={s1.aiHeader}
          onPress={() => setAiExpanded((v) => !v)}
          activeOpacity={0.75}
        >
          <View style={s1.aiHeaderLeft}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
            <Text style={s1.aiTitle}>Generate with AI</Text>
          </View>
          <Ionicons
            name={aiExpanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {aiExpanded && (
          <View style={s1.aiBody}>
            <Text style={s1.aiSubtitle}>
              AI builds a full program from your training profile. You can review and edit every week before saving.
            </Text>

            {/* ── Profile review ── */}
            {profile === undefined ? (
              <View style={s1.profileBox}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : profile === null || !profileComplete ? (
              <View style={s1.profileBox}>
                <Ionicons name="person-outline" size={15} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={s1.profileMissingText}>
                    Training profile not set up yet.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/(onboarding)/',
                      params: { returnTo: '/(app)/workouts/build-program' },
                    })}
                  >
                    <Text style={s1.profileLink}>Set up your profile →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={s1.profileBox}>
                <View style={s1.profileHeader}>
                  <Text style={s1.profileLabel}>Your Training Profile</Text>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/(onboarding)/',
                      params: {
                        edit: '1',
                        returnTo: '/(app)/workouts/build-program',
                      },
                    })}
                  >
                    <Text style={s1.profileLink}>Edit →</Text>
                  </TouchableOpacity>
                </View>
                {summaryLines.map((line, i) => (
                  <Text key={i} style={s1.profileLine}>{line}</Text>
                ))}
              </View>
            )}

            {/* ── No AI key warning ── */}
            {!hasAiKey && (
              <TouchableOpacity
                style={s1.keyWarning}
                onPress={() => router.push('/(app)/profile')}
              >
                <Ionicons name="key-outline" size={14} color={colors.warning} />
                <Text style={s1.keyWarningText}>
                  No AI key detected — tap to add one in Profile, or ask your admin to configure a server key.
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Customization ── */}
            <Text style={s1.inputLabel}>Program Length</Text>
            <View style={s1.aiLengthRow}>
              <View style={s1.aiLengthTextWrap}>
                <Text style={s1.aiLengthValue}>
                  {totalWeeks} week{totalWeeks === 1 ? '' : 's'}
                </Text>
                <Text style={s1.aiLengthHint}>
                  The AI plan will be generated for this many weeks.
                </Text>
              </View>
              <View style={s1.stepper}>
                <TouchableOpacity
                  style={s1.stepBtn}
                  onPress={() => setTotalWeeks(Math.max(1, totalWeeks - 1))}
                  testID="ai-weeks-decrement"
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={s1.aiStepperValue}>{totalWeeks}</Text>
                <TouchableOpacity
                  style={s1.stepBtn}
                  onPress={() => setTotalWeeks(Math.min(16, totalWeeks + 1))}
                  testID="ai-weeks-increment"
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s1.inputLabel}>Customization (optional)</Text>
            <TextInput
              style={s1.aiInput}
              value={customization}
              onChangeText={setCustomization}
              placeholder="e.g. bad shoulder, prefer dumbbells, more cardio…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={[s1.aiBtn, isGenerating && s1.aiBtnDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s1.aiBtnText}>Generating…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={s1.aiBtnText}>Generate & Edit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s1.divider}>
        <View style={s1.dividerLine} />
        <Text style={s1.dividerText}>or build from scratch</Text>
        <View style={s1.dividerLine} />
      </View>

      {/* Name */}
      <View style={s1.field}>
        <Text style={s1.label}>Program Name</Text>
        <TextInput
          style={s1.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. My 8-Week Strength Block"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Total weeks */}
      <View style={s1.field}>
        <Text style={s1.label}>Number of Weeks</Text>
        <View style={s1.stepper}>
          <TouchableOpacity
            style={s1.stepBtn}
            onPress={() => setTotalWeeks(Math.max(1, totalWeeks - 1))}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={s1.stepValue}>{totalWeeks}</Text>
          <TouchableOpacity
            style={s1.stepBtn}
            onPress={() => setTotalWeeks(Math.min(16, totalWeeks + 1))}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Days */}
      <View style={s1.field}>
        <Text style={s1.label}>Training Days</Text>
        <View style={s1.dayRow}>
          {DAYS_ORDERED.map((day, i) => {
            const active = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[s1.dayChip, active && s1.dayChipActive]}
                onPress={() => toggleDay(day)}
                activeOpacity={0.75}
              >
                <Text style={[s1.dayChipText, active && s1.dayChipTextActive]}>
                  {DAY_ABBREV[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedDays.length > 0 && (
          <Text style={s1.daySummary}>
            {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''} · {totalWeeks} week{totalWeeks > 1 ? 's' : ''} · {selectedDays.length * totalWeeks} total sessions
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[s1.nextBtn, (!name.trim() || selectedDays.length === 0) && s1.nextBtnDisabled]}
        onPress={onNext}
        disabled={!name.trim() || selectedDays.length === 0}
      >
        <Text style={s1.nextBtnText}>Build Workouts →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 2: Per-week editor ──────────────────────────────────────────────────

interface WeekEditorProps {
  weeks: WeekData[];
  activeWeekIdx: number;
  setActiveWeekIdx: (i: number) => void;
  updateWorkout: (wk: number, day: number, field: 'name' | 'focus', val: string) => void;
  toggleDayCard: (wk: number, day: number) => void;
  updateExercise: (wk: number, day: number, ex: number, field: keyof ExerciseRow, val: string) => void;
  addExercise: (wk: number, day: number) => void;
  removeExercise: (wk: number, day: number, ex: number) => void;
  reorderExercises: (wk: number, day: number, exercises: ExerciseRow[]) => void;
  copyFromWeek: (fromIdx: number, toIdx: number) => void;
  isSaving: boolean;
  onSave: () => void;
  onBack: () => void;
  onOpenExercisePicker: (weekIdx: number, dayIdx: number, exIdx: number) => void;
}

function WeekEditor({
  weeks, activeWeekIdx, setActiveWeekIdx,
  updateWorkout, toggleDayCard, updateExercise, addExercise, removeExercise, reorderExercises,
  copyFromWeek, isSaving, onSave, onBack, onOpenExercisePicker,
}: WeekEditorProps) {
  const weekTabsRef = useRef<ScrollView>(null);

  return (
    <View style={{ flex: 1 }}>
      {/* Week tab bar */}
      <ScrollView
        ref={weekTabsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s2.tabBar}
        contentContainerStyle={s2.tabBarContent}
      >
        {weeks.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[s2.tab, activeWeekIdx === i && s2.tabActive]}
            onPress={() => setActiveWeekIdx(i)}
          >
            <Text style={[s2.tabText, activeWeekIdx === i && s2.tabTextActive]}>
              W{i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s2.content} keyboardShouldPersistTaps="handled">
          {/* Copy shortcut */}
          {activeWeekIdx > 0 && (
            <View style={s2.copyRow}>
              <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
              <Text style={s2.copyLabel}>Copy from:</Text>
              {weeks.slice(0, activeWeekIdx).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={s2.copyChip}
                  onPress={() => {
                    Alert.alert(
                      `Copy Week ${i + 1}?`,
                      `Replace Week ${activeWeekIdx + 1} with a copy of Week ${i + 1}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Copy',
                          onPress: () => copyFromWeek(i, activeWeekIdx),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={s2.copyChipText}>W{i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Day workout cards */}
          {weeks[activeWeekIdx].map((dw, dayIdx) => (
            <DayCard
              key={dw.day}
              dw={dw}
              weekIdx={activeWeekIdx}
              dayIdx={dayIdx}
              onToggle={() => toggleDayCard(activeWeekIdx, dayIdx)}
              onWorkoutChange={(field, val) => updateWorkout(activeWeekIdx, dayIdx, field, val)}
              onExerciseChange={(exIdx, field, val) =>
                updateExercise(activeWeekIdx, dayIdx, exIdx, field, val)
              }
              onOpenExercisePicker={(exIdx) => onOpenExercisePicker(activeWeekIdx, dayIdx, exIdx)}
              onAddExercise={() => addExercise(activeWeekIdx, dayIdx)}
              onRemoveExercise={(exIdx) => removeExercise(activeWeekIdx, dayIdx, exIdx)}
              onReorderExercises={(exercises) =>
                reorderExercises(activeWeekIdx, dayIdx, exercises)
              }
            />
          ))}

          {/* Navigation */}
          <View style={s2.navRow}>
            {activeWeekIdx > 0 ? (
              <TouchableOpacity
                style={s2.navBtn}
                onPress={() => setActiveWeekIdx(activeWeekIdx - 1)}
              >
                <Ionicons name="chevron-back" size={16} color={colors.accent} />
                <Text style={s2.navBtnText}>W{activeWeekIdx}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s2.navBtn} onPress={onBack}>
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                <Text style={[s2.navBtnText, { color: colors.textSecondary }]}>Setup</Text>
              </TouchableOpacity>
            )}

            {activeWeekIdx < weeks.length - 1 ? (
              <TouchableOpacity
                style={s2.navBtn}
                onPress={() => setActiveWeekIdx(activeWeekIdx + 1)}
              >
                <Text style={s2.navBtnText}>W{activeWeekIdx + 2}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s2.saveBtn, isSaving && s2.saveBtnDisabled]}
                onPress={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s2.saveBtnText}>Save Program</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

const BASIS_OPTIONS = [
  { key: 'bench', label: 'Bench' },
  { key: 'squat', label: 'Squat' },
  { key: 'deadlift', label: 'DL' },
  { key: 'press', label: 'Press' },
  { key: 'custom', label: 'Custom' },
] as const;

interface DayCardProps {
  dw: DayWorkout;
  weekIdx: number;
  dayIdx: number;
  onToggle: () => void;
  onWorkoutChange: (field: 'name' | 'focus', val: string) => void;
  onExerciseChange: (exIdx: number, field: keyof ExerciseRow, val: string) => void;
  onOpenExercisePicker: (exIdx: number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (exIdx: number) => void;
  onReorderExercises: (exercises: ExerciseRow[]) => void;
}

function DayCard({
  dw, onToggle, onWorkoutChange, onExerciseChange, onOpenExercisePicker, onAddExercise,
  onRemoveExercise, onReorderExercises,
}: DayCardProps) {
  const exerciseCount = dw.exercises.filter((e) => e.name.trim()).length;

  function cycleUnit(exIdx: number, current: 'lbs' | 'kg' | '%') {
    const next = current === 'lbs' ? 'kg' : current === 'kg' ? '%' : 'lbs';
    onExerciseChange(exIdx, 'unit', next);
  }

  function renderExerciseRow({
    item: ex,
    getIndex,
    drag,
    isActive,
  }: RenderItemParams<ExerciseRow>) {
    const exIdx = getIndex();
    if (exIdx == null) return null;

    return (
      <ScaleDecorator>
        <View style={[dc.exerciseBlock, isActive && dc.exerciseBlockActive]}>
          <View style={dc.exRow}>
            <TouchableOpacity
              style={dc.dragHandle}
              onLongPress={drag}
              delayLongPress={120}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={`exercise-drag-${dw.day}-${exIdx}`}
            >
              <Ionicons name="reorder-three-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[dc.exPickerBtn, { flex: 3 }]}
              onPress={() => onOpenExercisePicker(exIdx)}
              activeOpacity={0.7}
            >
              <Text
                style={ex.name ? dc.exPickerText : dc.exPickerPlaceholder}
                numberOfLines={1}
              >
                {ex.name || 'Exercise'}
              </Text>
              <Ionicons name="chevron-down" size={10} color={colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[dc.exInput, dc.exCellCenter]}
              value={ex.sets}
              onChangeText={(v) => onExerciseChange(exIdx, 'sets', v)}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[dc.exInput, dc.exCellCenter]}
              value={ex.reps}
              onChangeText={(v) => onExerciseChange(exIdx, 'reps', v)}
              keyboardType="numeric"
              placeholder="8"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[dc.exInput, dc.exCellCenter]}
              value={ex.weight}
              onChangeText={(v) => onExerciseChange(exIdx, 'weight', v)}
              keyboardType="decimal-pad"
              placeholder={ex.unit === '%' ? '75' : '—'}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[dc.unitToggle, ex.unit === '%' && dc.unitTogglePercent]}
              onPress={() => cycleUnit(exIdx, ex.unit)}
            >
              <Text style={[dc.unitText, ex.unit === '%' && dc.unitTextPercent]}>
                {ex.unit}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (dw.exercises.length === 1) return;
                onRemoveExercise(exIdx);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={dw.exercises.length === 1 ? colors.border : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {ex.unit === '%' && (
            <View style={dc.basisRow}>
              <Text style={dc.basisLabel}>% of:</Text>
              {BASIS_OPTIONS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[dc.basisChip, ex.percentBasis === key && dc.basisChipActive]}
                  onPress={() => onExerciseChange(exIdx, 'percentBasis', key)}
                >
                  <Text style={[dc.basisChipText, ex.percentBasis === key && dc.basisChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              {ex.percentBasis === 'custom' && (
                <TextInput
                  style={dc.basisCustomInput}
                  value={ex.customOneRepMax}
                  onChangeText={(v) => onExerciseChange(exIdx, 'customOneRepMax', v)}
                  placeholder="1RM"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
              )}
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <View style={dc.card}>
      {/* Card header */}
      <TouchableOpacity style={dc.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={dc.headerLeft}>
          <Ionicons
            name={dw.expanded ? 'chevron-down' : 'chevron-forward'}
            size={15}
            color={colors.textSecondary}
          />
          <Text style={dc.dayLabel}>{dw.day}</Text>
          {!dw.expanded && dw.name ? (
            <Text style={dc.collapsedName} numberOfLines={1}>{dw.name}</Text>
          ) : null}
        </View>
        {!dw.expanded && (
          <Text style={dc.collapsedMeta}>
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </Text>
        )}
      </TouchableOpacity>

      {dw.expanded && (
        <View style={dc.body}>
          {/* Workout name + focus */}
          <View style={dc.nameRow}>
            <TextInput
              style={[dc.input, { flex: 2 }]}
              value={dw.name}
              onChangeText={(v) => onWorkoutChange('name', v)}
              placeholder="Workout name"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[dc.input, { flex: 1 }]}
              value={dw.focus}
              onChangeText={(v) => onWorkoutChange('focus', v)}
              placeholder="Focus (opt.)"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Exercise table header */}
          <View style={dc.exHeader}>
            <View style={{ width: 20 }} />
            <Text style={[dc.exHeaderCell, { flex: 3, textAlign: 'left' }]}>Exercise</Text>
            <Text style={[dc.exHeaderCell, dc.exCellCenter]}>Sets</Text>
            <Text style={[dc.exHeaderCell, dc.exCellCenter]}>Reps</Text>
            <Text style={[dc.exHeaderCell, dc.exCellCenter]}>Wt/%</Text>
            <Text style={[dc.exHeaderCell, dc.exCellCenter]}>Unit</Text>
            <View style={{ width: 24 }} />
          </View>

          <DraggableFlatList
            data={dw.exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseRow}
            onDragEnd={({ data }) => onReorderExercises(data)}
            scrollEnabled={false}
            nestedScrollEnabled
            containerStyle={dc.exerciseList}
            activationDistance={12}
          />

          {/* Add exercise */}
          <TouchableOpacity style={dc.addExBtn} onPress={onAddExercise}>
            <Ionicons name="add-circle-outline" size={15} color={colors.accent} />
            <Text style={dc.addExText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────

export default function BuildProgramScreen() {
  const router = useRouter();
  const { program: activeProgram } = useActiveProgram();
  const [pickerTarget, setPickerTarget] = useState<{
    weekIdx: number;
    dayIdx: number;
    exIdx: number;
  } | null>(null);

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 2 state
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(
            (a, b) => DAYS_ORDERED.indexOf(a) - DAYS_ORDERED.indexOf(b)
          )
    );
  }

  function goToStep2() {
    if (!name.trim() || selectedDays.length === 0) return;
    setWeeks(buildWeeks(totalWeeks, selectedDays));
    setActiveWeekIdx(0);
    setStep(2);
  }

  async function handleAiGenerate(customization: string, requestedWeeks: number) {
    setIsGenerating(true);
    try {
      const res = await api.post<{ preview: AiPreview }>(
        '/api/ai/preview-program',
        {
          customization: customization.trim() || undefined,
          totalWeeks: requestedWeeks,
        }
      );
      const parsed = aiPreviewToWeekData(res.preview);
      setName(parsed.name);
      setTotalWeeks(parsed.totalWeeks);
      setSelectedDays(parsed.days);
      setWeeks(parsed.weeks);
      setActiveWeekIdx(0);
      setStep(2);
    } catch (err) {
      Alert.alert(
        'Generation failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // ── week/day mutators ────────────────────────────────────────────────────

  const updateWorkout = useCallback(
    (wk: number, day: number, field: 'name' | 'focus', val: string) => {
      setWeeks((prev) => {
        const next = prev.map((w) => w.map((d) => ({ ...d })));
        next[wk][day][field] = val;
        return next;
      });
    },
    []
  );

  const toggleDayCard = useCallback((wk: number, day: number) => {
    setWeeks((prev) => {
      const next = prev.map((w) => w.map((d) => ({ ...d })));
      next[wk][day].expanded = !next[wk][day].expanded;
      return next;
    });
  }, []);

  const updateExercise = useCallback(
    (wk: number, day: number, ex: number, field: keyof ExerciseRow, val: string) => {
      setWeeks((prev) => {
        const next = prev.map((w) =>
          w.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) }))
        );
        (next[wk][day].exercises[ex] as Record<string, string>)[field] = val;
        return next;
      });
    },
    []
  );

  const addExercise = useCallback((wk: number, day: number) => {
    setWeeks((prev) => {
      const next = prev.map((w) =>
        w.map((d) => ({ ...d, exercises: [...d.exercises] }))
      );
      next[wk][day].exercises.push(emptyExercise());
      return next;
    });
  }, []);

  const removeExercise = useCallback((wk: number, day: number, ex: number) => {
    setWeeks((prev) => {
      const next = prev.map((w) =>
        w.map((d) => ({ ...d, exercises: [...d.exercises] }))
      );
      next[wk][day].exercises.splice(ex, 1);
      return next;
    });
  }, []);

  const reorderExercises = useCallback((wk: number, day: number, exercises: ExerciseRow[]) => {
    setWeeks((prev) => {
      const next = prev.map((w) =>
        w.map((d) => ({ ...d, exercises: [...d.exercises] }))
      );
      next[wk][day].exercises = exercises.map((exercise) => ({ ...exercise }));
      return next;
    });
  }, []);

  const copyFromWeek = useCallback((fromIdx: number, toIdx: number) => {
    setWeeks((prev) => {
      const next = [...prev];
      next[toIdx] = deepCopyWeek(prev[fromIdx]);
      return next;
    });
  }, []);

  const openExercisePicker = useCallback((weekIdx: number, dayIdx: number, exIdx: number) => {
    setPickerTarget({ weekIdx, dayIdx, exIdx });
  }, []);

  const handlePickedExercise = useCallback((picked: PickedExercise) => {
    setPickerTarget((target) => {
      if (!target) return target;

      setWeeks((prev) => {
        const next = prev.map((week) =>
          week.map((dayWorkout) => ({
            ...dayWorkout,
            exercises: dayWorkout.exercises.map((exercise) => ({ ...exercise })),
          }))
        );
        next[target.weekIdx][target.dayIdx].exercises[target.exIdx].name = picked.name;
        return next;
      });

      return null;
    });
  }, []);

  // ── save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    // Validate: every week must have at least one day with at least one named exercise
    for (let wk = 0; wk < weeks.length; wk++) {
      for (const dw of weeks[wk]) {
        if (!dw.name.trim()) {
          Toast.show({
            type: 'error',
            text1: `Week ${wk + 1} — ${dw.day}`,
            text2: 'Workout name is required.',
          });
          setActiveWeekIdx(wk);
          setStep(2);
          return;
        }
        if (!dw.exercises.some((e) => e.name.trim())) {
          Toast.show({
            type: 'error',
            text1: `Week ${wk + 1} — ${dw.day}`,
            text2: 'Add at least one exercise.',
          });
          setActiveWeekIdx(wk);
          setStep(2);
          return;
        }
      }
    }

    const doSave = async () => {
      setIsSaving(true);
      try {
        const body = {
          name: name.trim(),
          totalWeeks,
          weeks: weeks.map((weekWorkouts, i) => ({
            weekNumber: i + 1,
            workouts: weekWorkouts.map((dw) => ({
              dayOfWeek: dw.day,
              name: dw.name.trim(),
              focus: dw.focus.trim() || undefined,
              exercises: toApiExercises(dw.exercises),
            })),
          })),
        };
        await api.post('/api/programs/custom', body);
        Toast.show({ type: 'success', text1: 'Program created!', text2: name.trim() });
        router.replace('/(app)/program');
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Failed to save',
          text2: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setIsSaving(false);
      }
    };

    if (activeProgram) {
      Alert.alert(
        'Replace Current Program?',
        `"${activeProgram.name}" will be archived. Your workout history is preserved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace & Save', style: 'destructive', onPress: doSave },
        ]
      );
    } else {
      await doSave();
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ExercisePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePickedExercise}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Build Program</Text>
          <Text style={styles.headerStep}>Step {step} of 2</Text>
        </View>
        {step === 2 ? (
          <Button
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            size="sm"
            testID="build-program-save-btn"
          >
            Save
          </Button>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {step === 1 ? (
        <SetupStep
          name={name} setName={setName}
          totalWeeks={totalWeeks} setTotalWeeks={setTotalWeeks}
          selectedDays={selectedDays} toggleDay={toggleDay}
          onNext={goToStep2}
          onAiGenerate={handleAiGenerate}
          isGenerating={isGenerating}
          hasActiveProgram={!!activeProgram}
        />
      ) : (
        <WeekEditor
          weeks={weeks}
          activeWeekIdx={activeWeekIdx}
          setActiveWeekIdx={setActiveWeekIdx}
          updateWorkout={updateWorkout}
          toggleDayCard={toggleDayCard}
          updateExercise={updateExercise}
          addExercise={addExercise}
          removeExercise={removeExercise}
          reorderExercises={reorderExercises}
          copyFromWeek={copyFromWeek}
          isSaving={isSaving}
          onSave={handleSave}
          onBack={() => setStep(1)}
          onOpenExercisePicker={openExercisePicker}
        />
      )}
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  headerStep: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
});

// Step 1
const s1 = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  heading: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '50',
  },
  warningText: { flex: 1, fontSize: typography.sm, color: colors.warning, lineHeight: 18 },
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.md,
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontSize: typography.xxl, fontWeight: '700', color: colors.text, minWidth: 36, textAlign: 'center' },
  dayRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  dayChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  dayChipTextActive: { color: colors.accent },
  daySummary: { fontSize: typography.sm, color: colors.textSecondary },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: typography.md, fontWeight: '700', color: '#fff' },
  // AI card
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    overflow: 'hidden',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  aiHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  aiBody: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  aiSubtitle: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 18 },
  aiInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
  },
  aiBtnDisabled: { opacity: 0.6 },
  aiBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#fff' },
  aiLengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  aiLengthTextWrap: {
    flex: 1,
    gap: 2,
  },
  aiLengthValue: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  aiLengthHint: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  aiStepperValue: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text,
    minWidth: 28,
    textAlign: 'center',
  },
  // Profile review box
  profileBox: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  profileLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profileLink: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  profileLine: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
  profileMissingText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  // No AI key warning
  keyWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '18',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.warning + '50',
    padding: spacing.sm,
  },
  keyWarningText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.warning,
    lineHeight: 16,
  },
  // Customization label
  inputLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: typography.xs, color: colors.textMuted, fontWeight: '600' },
});

// Step 2 wrapper
const s2 = StyleSheet.create({
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexGrow: 0,
  },
  tabBarContent: { paddingHorizontal: spacing.md, gap: 2 },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.accent },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 48 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  copyLabel: { fontSize: typography.sm, color: colors.textSecondary },
  copyChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  copyChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.accent },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#fff' },
});

// DayCard
const dc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dayLabel: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  collapsedName: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.xs,
  },
  collapsedMeta: { fontSize: typography.xs, color: colors.textMuted },
  body: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
  },
  // Exercise table
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 2 },
  exerciseList: { gap: spacing.xs },
  exerciseBlock: { gap: spacing.xs },
  exerciseBlockActive: {
    opacity: 0.96,
  },
  exHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    width: 44,
  },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dragHandle: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.sm,
    color: colors.text,
    width: 44,
    textAlign: 'center',
  },
  exCellCenter: { textAlign: 'center' },
  // Exercise name picker button
  exPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 34,
  },
  exPickerText: { flex: 1, fontSize: typography.sm, color: colors.text },
  exPickerPlaceholder: { flex: 1, fontSize: typography.sm, color: colors.textMuted },
  // Unit toggle
  unitToggle: {
    width: 44,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  unitTogglePercent: {
    borderColor: colors.accent + '80',
    backgroundColor: colors.accentLight,
  },
  unitText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  unitTextPercent: { color: colors.accent },
  // % basis row
  basisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 2,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  basisLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', minWidth: 36 },
  basisChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  basisChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  basisChipText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  basisChipTextActive: { color: colors.accent },
  basisCustomInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 11,
    color: colors.text,
    width: 52,
    textAlign: 'center',
  },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.xs },
  addExText: { fontSize: typography.sm, fontWeight: '600', color: colors.accent },
});
