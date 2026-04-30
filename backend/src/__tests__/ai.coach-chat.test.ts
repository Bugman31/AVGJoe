process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const mockAnthropicCreate = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../services/session.service', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

import { prisma } from '../__mocks__/prisma';
import { generateCoachChat } from '../services/ai.service';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateCoachChat', () => {
  it('includes live Apple Health metrics in the coach prompt when available', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      anthropicApiKey: null,
      openaiApiKey: null,
      aiProvider: 'anthropic',
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      primaryGoal: 'build_muscle',
    });
    (prisma.workoutSession.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Push Day',
        completedAt: new Date('2026-04-28T18:00:00.000Z'),
        preEnergyLevel: 7,
        postEnergyLevel: 5,
        sorenessLevel: 4,
        sets: [
          {
            exerciseName: 'Bench Press',
            actualReps: 8,
            actualWeight: 135,
            rpe: 8,
            unit: 'lbs',
          },
        ],
      },
    ]);
    (prisma.plannedWorkout.findUnique as jest.Mock).mockResolvedValue({
      exercises: JSON.stringify([
        {
          name: 'Bench Press',
          sets: [
            { setNumber: 1, targetReps: 8 },
            { setNumber: 2, targetReps: 8 },
          ],
        },
      ]),
    });
    mockGetSession.mockResolvedValue({
      id: 'sess-1',
      name: 'Push Day',
      startedAt: new Date('2026-04-30T10:00:00.000Z'),
      preEnergyLevel: 7,
      plannedWorkoutId: 'pw-1',
      sets: [
        {
          exerciseName: 'Bench Press',
          setNumber: 1,
          actualReps: 8,
          actualWeight: 135,
          rpe: 8,
          unit: 'lbs',
          completedAt: new Date('2026-04-30T10:05:00.000Z'),
        },
        {
          exerciseName: 'Bench Press',
          setNumber: 2,
          actualReps: 6,
          actualWeight: 135,
          rpe: 9,
          unit: 'lbs',
          completedAt: new Date('2026-04-30T10:08:00.000Z'),
        },
      ],
    });

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Hold the weight and take more rest.' }],
    });

    const reply = await generateCoachChat({
      userId: 'user-1',
      sessionId: 'sess-1',
      message: 'Should I increase weight?',
      liveMetrics: {
        status: 'live',
        heartRate: 156,
        activeEnergyBurned: 83,
        heartRateTrend: 'rising',
        lastHeartRateSampleAt: '2026-04-30T10:08:30.000Z',
        lastEnergySampleAt: '2026-04-30T10:08:20.000Z',
        lastUpdatedAt: '2026-04-30T10:08:30.000Z',
        errorMessage: null,
      },
    });

    expect(reply).toBe('Hold the weight and take more rest.');

    const createArg = mockAnthropicCreate.mock.calls[0][0];
    expect(createArg.system).toContain('Live Apple Health metrics are available: HR 156 bpm, 83 kcal active energy, trend rising');
    expect(createArg.system).toContain('Recovery looks taxed right now.');
    expect(createArg.system).toContain('Bench Press set 2: target 8, got 6');
  });
});
