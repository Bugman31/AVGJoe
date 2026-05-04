import { prisma } from '../__mocks__/prisma';
import { ensurePlannedWorkoutsForProgram } from '../services/program.service';

describe('program.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('repairs legacy programs that have weeklyStructure but no planned workouts', async () => {
    const repaired = await ensurePlannedWorkoutsForProgram({
      id: 'program-1',
      userId: 'user-1',
      weeklyStructure: JSON.stringify({
        week1: {
          Monday: {
            name: 'Full Body A',
            focus: 'Strength',
            estimatedDuration: 45,
            warmup: ['5 min bike'],
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '10', weight: 25, unit: 'lbs' },
            ],
          },
        },
      }),
      plannedWorkouts: [],
    });

    expect(repaired).toBe(true);
    expect(prisma.plannedWorkout.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            programId: 'program-1',
            userId: 'user-1',
            weekNumber: 1,
            dayOfWeek: 'Monday',
            name: 'Full Body A',
          }),
        ],
      })
    );
  });

  it('does nothing when planned workouts already exist', async () => {
    const repaired = await ensurePlannedWorkoutsForProgram({
      id: 'program-1',
      userId: 'user-1',
      weeklyStructure: JSON.stringify({}),
      plannedWorkouts: [{ id: 'pw-1' }],
    });

    expect(repaired).toBe(false);
    expect(prisma.plannedWorkout.createMany).not.toHaveBeenCalled();
  });
});
