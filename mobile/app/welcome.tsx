import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { getWelcomeVariant, markWelcomeSeen, type WelcomeVariant } from '@/lib/welcome';
import type { User } from '@/types';

const FIRST_TIME_STEPS = [
  {
    title: 'Dial in your training profile',
    body: 'Set your goal, experience level, equipment, split, and weekly schedule so AVGJoe can build around your real setup.',
    icon: 'clipboard-outline',
  },
  {
    title: 'Build your program',
    body: 'Open Program or Build Program, generate with AI, then review and edit each workout before you save it.',
    icon: 'sparkles-outline',
  },
  {
    title: 'Train and log your sessions',
    body: 'Start the next workout from Home or Program, log each set, then use Progress and Body Log to track how things are moving.',
    icon: 'barbell-outline',
  },
];

const RECENT_CHANGES = [
  {
    title: 'Build Program is now the main creation flow',
    body: 'Your saved training profile feeds the AI builder so you can generate a full program, review every week, and save it in one place.',
    icon: 'construct-outline',
  },
  {
    title: 'Week Analysis is live',
    body: 'After you finish a week, AVGJoe can review adherence, fatigue, and recommendations for what to adjust next.',
    icon: 'analytics-outline',
  },
  {
    title: 'Health and progress tools expanded',
    body: 'You can now use Body Log, connect Apple Health in a native build, and import Apple Watch workouts from the Progress area.',
    icon: 'watch-outline',
  },
];

const REVIEWER_STEPS = [
  {
    title: '1. Review the seeded sample data',
    body: 'This account already includes a current program, completed workouts, body logs, and progress history so the main screens are populated immediately.',
    icon: 'layers-outline',
  },
  {
    title: '2. Start today’s workout and open AI Coach',
    body: 'From Home or Program, launch the scheduled workout, review the suggested weights, log a set, and ask the coach questions like whether to increase load.',
    icon: 'barbell-outline',
  },
  {
    title: '3. Evaluate the build and progress flows',
    body: 'Visit Build Program for AI generation, then check Progress, Insights, Calendar, Body Log, and Apple Health import to review the end-to-end experience.',
    icon: 'analytics-outline',
  },
];

function variantCopy(variant: WelcomeVariant, user: User | null) {
  switch (variant) {
    case 'intro':
      return {
        eyebrow: 'First Workout Starts Here',
        title: "Welcome to Average Joe's Workout Tracker",
        subtitle: "Here's the fastest way to get from setup to your first real training week.",
        cards: FIRST_TIME_STEPS,
        note: 'Tip: if you change your training profile later, head back to Build Program to generate a new plan that matches it.',
      };
    case 'reviewer':
      return {
        eyebrow: 'App Review Guide',
        title: 'Review account ready',
        subtitle: `Signed in as ${user?.email ?? 'the App Review account'}. Sample data is preloaded so you can evaluate the core training flows right away.`,
        cards: REVIEWER_STEPS,
        note: 'Suggested path: review Home and Program first, start the scheduled workout, then inspect Progress and Body Log. Apple Health import requires a native iOS build with HealthKit enabled.',
      };
    case 'updates':
    default:
      return {
        eyebrow: "What's New on April 25, 2026",
        title: "Recent updates in Average Joe's",
        subtitle: 'A few important changes landed since earlier builds, and these are the ones worth knowing before you train.',
        cards: RECENT_CHANGES,
        note: "You can reopen this screen any time from Profile -> Welcome & What's New.",
      };
  }
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isContinuing, setIsContinuing] = useState(false);

  const variant = useMemo(() => getWelcomeVariant(user), [user]);
  const copy = useMemo(() => variantCopy(variant, user), [variant, user]);
  const nextPath = typeof returnTo === 'string' && returnTo.length > 0 ? returnTo : '/(app)/home';

  if (isLoading) return <Spinner fullScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted === false) return <Redirect href="/(onboarding)/" />;

  async function handleContinue() {
    setIsContinuing(true);
    void markWelcomeSeen(user);
    router.replace(nextPath);
    setIsContinuing(false);
  }

  async function handleOpenBuildProgram() {
    setIsContinuing(true);
    void markWelcomeSeen(user);
    router.replace('/(app)/workouts/build-program');
    setIsContinuing(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
            <Text style={styles.heroBadgeText}>{copy.eyebrow}</Text>
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.cardStack}>
          {copy.cards.map((card) => (
            <View key={card.title} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name={card.icon as any} size={18} color={colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardText}>{card.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.noteText}>{copy.note}</Text>
        </View>

        {variant === 'reviewer' && (
          <TouchableOpacity
            style={styles.inlineLink}
            activeOpacity={0.8}
            onPress={handleOpenBuildProgram}
          >
            <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.inlineLinkText}>Open Build Program now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={handleContinue} loading={isContinuing} disabled={isContinuing}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  hero: { gap: spacing.sm, marginTop: spacing.sm },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: { fontSize: typography.xs, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, lineHeight: 36 },
  subtitle: { fontSize: typography.md, color: colors.textSecondary, lineHeight: 22 },
  cardStack: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  cardTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  cardText: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: { flex: 1, fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  inlineLinkText: { fontSize: typography.sm, fontWeight: '700', color: colors.accent },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
});
