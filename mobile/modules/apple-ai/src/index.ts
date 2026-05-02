import { requireNativeModule } from 'expo-modules-core';

interface AppleAINativeModule {
  isAvailable(): Promise<boolean>;
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
