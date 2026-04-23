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
        serverHasAiKey: boolean;
        aiProvider: 'anthropic' | 'openai';
      };
    }
  }
}
