import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import {
  startLiveWorkoutMetrics,
  type LiveWorkoutMetricsSnapshot,
} from '@/lib/healthkit';
import { theme } from '@/lib/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionContext {
  name: string;
  startedAt: string;
  sets?: Array<unknown>;
}

const DEFAULT_LIVE_METRICS: LiveWorkoutMetricsSnapshot = {
  status: 'unsupported',
  heartRate: null,
  activeEnergyBurned: null,
  heartRateTrend: 'unknown',
  lastHeartRateSampleAt: null,
  lastEnergySampleAt: null,
  lastUpdatedAt: null,
  errorMessage: null,
};

const SUGGESTED_PROMPTS = [
  'Should I increase weight?',
  'Why did my reps drop?',
  'Give me a sub for this exercise.',
  'How am I doing today?',
  'Should I stop or keep going?',
];

export default function CoachChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextStrip, setContextStrip] = useState<{ name: string; setCount: number } | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveWorkoutMetricsSnapshot>(DEFAULT_LIVE_METRICS);

  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!sessionId) return;

    api.get<{ session: SessionContext }>(`/api/sessions/${sessionId}`)
      .then((res) => {
        setContextStrip({
          name: res.session.name,
          setCount: res.session.sets?.length ?? 0,
        });
        setSessionStartedAt(res.session.startedAt);
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!sessionStartedAt) return;

    return startLiveWorkoutMetrics(
      { startDate: new Date(sessionStartedAt) },
      setLiveMetrics,
    );
  }, [sessionStartedAt]);

  function buildLiveMetricsPayload() {
    if (liveMetrics.status === 'unsupported') return undefined;
    return {
      status: liveMetrics.status,
      heartRate: liveMetrics.heartRate,
      activeEnergyBurned: liveMetrics.activeEnergyBurned,
      heartRateTrend: liveMetrics.heartRateTrend,
      lastHeartRateSampleAt: liveMetrics.lastHeartRateSampleAt,
      lastEnergySampleAt: liveMetrics.lastEnergySampleAt,
      lastUpdatedAt: liveMetrics.lastUpdatedAt,
      errorMessage: liveMetrics.errorMessage ?? null,
    };
  }

  function buildContextMetricsText() {
    if (liveMetrics.status === 'live' && liveMetrics.heartRate != null) {
      const hr = `${liveMetrics.heartRate} bpm`;
      const kcal = liveMetrics.activeEnergyBurned != null ? ` · ${liveMetrics.activeEnergyBurned} kcal` : '';
      return ` · HR ${hr}${kcal}`;
    }
    if (liveMetrics.status === 'stale') return ' · live HR delayed';
    if (liveMetrics.status === 'waiting') return ' · waiting for live HR';
    if (liveMetrics.status === 'error') return ' · live HR unavailable';
    return '';
  }

  function getCoachErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.includes('Too many chat requests')) {
      return 'You have hit the coach chat limit for now. Try again in a bit.';
    }
    return "Sorry, I couldn't reach the coach right now. Try again.";
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/api/ai/coach-chat', {
        sessionId,
        message: userMsg.content,
        conversationHistory: messages.slice(-6),
        liveMetrics: buildLiveMetricsPayload(),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: getCoachErrorMessage(error) },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSendPress() {
    send(input);
  }

  function handlePromptTap(prompt: string) {
    send(prompt);
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isLoading]);

  const showSuggestions = messages.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Context strip */}
      {contextStrip && (
        <View style={styles.contextStrip}>
          <Ionicons name="barbell-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.contextText}>
            {contextStrip.name}{'  ·  '}{contextStrip.setCount} set{contextStrip.setCount !== 1 ? 's' : ''} logged{buildContextMetricsText()}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Suggested prompts */}
        {showSuggestions && (
          <View style={styles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.suggestionChip}
                  onPress={() => handlePromptTap(prompt)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={[styles.bubbleText, item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSendPress}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSendPress}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  contextText: { fontSize: 12, color: theme.colors.textMuted },

  suggestionsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionChipText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },

  messageList: { padding: 16, gap: 10, paddingBottom: 8 },

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 6,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: '#9B5CFF',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: theme.colors.text },
  loadingBubble: { paddingVertical: 12, paddingHorizontal: 16 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
