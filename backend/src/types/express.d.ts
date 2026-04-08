import 'express';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        name: string | null;
        onboardingCompleted: boolean;
        hasAnthropicKey: boolean;
        hasOpenAiKey: boolean;
        aiProvider: 'anthropic' | 'openai';
      };
    }
  }
}
