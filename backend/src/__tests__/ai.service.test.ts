process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const mockAnthropicCreate = jest.fn();

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

import { prisma } from '../__mocks__/prisma';
import { generateProgram } from '../services/ai.service';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateProgram', () => {
  it('honors a saved push/pull/legs split for a 3-day program', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      anthropicApiKey: null,
      openaiApiKey: null,
      aiProvider: 'anthropic',
    });

    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      onboardingCompleted: true,
      primaryGoal: 'build_muscle',
      secondaryGoals: JSON.stringify([]),
      experienceLevel: 'beginner',
      daysPerWeek: 3,
      sessionDurationMins: 60,
      preferredSplit: 'push_pull_legs',
      availableEquipment: JSON.stringify(['barbell', 'dumbbells']),
      restrictions: JSON.stringify([]),
      injuryFlags: JSON.stringify([]),
      workoutEnvironment: 'commercial_gym',
      priorityAreas: JSON.stringify(['chest']),
      programStyle: 'structured',
      benchmarkSquat: null,
      benchmarkDeadlift: null,
      benchmarkBench: null,
      benchmarkPress: null,
      benchmarkPullups: null,
      benchmarkMileTime: null,
      bodyweight: null,
      bodyFatPercent: null,
      unitSystem: 'lbs',
    });

    (prisma.workoutTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Push Day',
        description: 'Push template',
        exercises: [
          { name: 'Barbell Bench Press', orderIndex: 0, notes: 'Press', sets: [{ setNumber: 1, targetReps: 6, targetWeight: null, unit: 'lbs' }] },
        ],
      },
      {
        name: 'Pull Day',
        description: 'Pull template',
        exercises: [
          { name: 'Pull-ups', orderIndex: 0, notes: 'Pull', sets: [{ setNumber: 1, targetReps: 6, targetWeight: null, unit: 'lbs' }] },
        ],
      },
      {
        name: 'Leg Day',
        description: 'Leg template',
        exercises: [
          { name: 'Barbell Back Squat', orderIndex: 0, notes: 'Legs', sets: [{ setNumber: 1, targetReps: 5, targetWeight: null, unit: 'lbs' }] },
        ],
      },
    ]);

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            programName: 'Lean Mass PPL',
            programDescription: 'A three-day push pull legs plan.',
            goalSummary: 'Build muscle with a simple PPL split.',
            workoutNotes: [
              { templateName: 'Push Day', coachNote: 'Drive pressing strength.' },
              { templateName: 'Pull Day', coachNote: 'Own each pull.' },
              { templateName: 'Leg Day', coachNote: 'Stay crisp on lower-body work.' },
            ],
          }),
        },
      ],
    });

    const program = await generateProgram('user-1');

    expect(program.weeklyStructure).toMatchObject({
      split: 'Push/Pull/Legs',
      days: ['Monday', 'Wednesday', 'Friday'],
    });
    expect(program.workouts.slice(0, 3).map((workout) => workout.name)).toEqual([
      'Push Day',
      'Pull Day',
      'Leg Day',
    ]);

    const prompt = mockAnthropicCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('Preferred Split: Push/Pull/Legs');
    expect(prompt).toContain('Templates being used: Push Day, Pull Day, Leg Day');
  });
});
