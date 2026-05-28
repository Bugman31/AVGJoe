import { requireNativeModule } from 'expo-modules-core';

interface AppleAINativeModule {
  isAvailable(): Promise<boolean>;
  availabilityReason(): Promise<'available' | 'model_not_ready' | 'os_not_supported'>;
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
  chat(systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string>;
}

let AppleAI: AppleAINativeModule | null = null;
try {
  AppleAI = requireNativeModule<AppleAINativeModule>('AppleAI');
} catch {
  // Native module unavailable (Expo Go or simulator without custom build)
}

export async function isAppleAIAvailable(): Promise<boolean> {
  if (!AppleAI) return false;
  try {
    return await AppleAI.isAvailable();
  } catch {
    return false;
  }
}

export async function getAppleAIUnavailableReason(): Promise<string> {
  if (!AppleAI) return 'os_not_supported';
  try {
    const reason = await AppleAI.availabilityReason();
    if (reason === 'model_not_ready') {
      return 'The on-device language model is still downloading. Check Settings → Apple Intelligence & Siri for progress.';
    }
    return 'Requires iPhone 15 Pro or later with iOS 26+.';
  } catch {
    return 'Requires iPhone 15 Pro or later with iOS 26+.';
  }
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!AppleAI) throw new Error('Apple Intelligence is not available on this device.');
  return AppleAI.generateText(systemPrompt, userPrompt);
}

export async function chat(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (!AppleAI) throw new Error('Apple Intelligence is not available on this device.');
  return AppleAI.chat(systemPrompt, messages);
}
