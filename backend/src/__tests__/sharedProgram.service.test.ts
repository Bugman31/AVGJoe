import { prisma } from '../__mocks__/prisma';
import * as sharedProgramService from '../services/sharedProgram.service';

// ─── mock data ──────────────────────────────────────────────────────────────

const CREATOR_ID = 'user-creator-1';
const USER_ID = 'user-enroller-2';
const RATER_ID = 'user-rater-3';

const baseSharedProgram = {
  id: 'sp-1',
  creatorId: CREATOR_ID,
  creatorName: 'Jane Lifter',
  creatorAvatar: 'https://example.com/avatar.jpg',
  name: 'Push Pull Legs Power',
  description: 'A classic 6-day PPL program for intermediate lifters.',
  category: 'strength',
  difficulty: 'intermediate',
  durationWeeks: 12,
  daysPerWeek: 6,
  equipment: ['barbell', 'dumbbell', 'cable'],
  tags: ['ppl', 'strength'],
  workoutPlan: { weeks: [] },
  ratingAverage: 4.7,
  enrollmentCount: 312,
  isPublished: true,
  createdAt: new Date('2025-01-10T12:00:00.000Z'),
};

const secondSharedProgram = {
  id: 'sp-2',
  creatorId: 'user-creator-99',
  creatorName: 'Mark Endure',
  creatorAvatar: null,
  name: 'Beginner Fat Loss Sprint',
  description: 'Eight weeks of cardio and conditioning for fat loss beginners.',
  category: 'fat_loss',
  difficulty: 'beginner',
  durationWeeks: 8,
  daysPerWeek: 4,
  equipment: ['bodyweight'],
  tags: ['fat loss', 'beginner'],
  workoutPlan: { weeks: [] },
  ratingAverage: 4.2,
  enrollmentCount: 98,
  isPublished: true,
  createdAt: new Date('2025-03-15T09:30:00.000Z'),
};

const forkedPrismaProgram = {
  id: 'program-forked-1',
  name: 'Push Pull Legs Power (copy)',
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createSharedProgram ─────────────────────────────────────────────────────

describe('createSharedProgram', () => {
  it('creates a SharedProgram record and returns it', async () => {
    (prisma.sharedProgram.create as jest.Mock).mockResolvedValue(baseSharedProgram);

    const data = {
      name: 'Push Pull Legs Power',
      description: 'A classic 6-day PPL program for intermediate lifters.',
      category: 'strength',
      difficulty: 'intermediate',
      durationWeeks: 12,
      daysPerWeek: 6,
      equipment: ['barbell', 'dumbbell', 'cable'],
      tags: ['ppl', 'strength'],
      workoutPlan: { weeks: [] },
    };

    const result = await sharedProgramService.createSharedProgram(CREATOR_ID, data);

    expect(prisma.sharedProgram.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma.sharedProgram.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data).toMatchObject({ creatorId: CREATOR_ID, name: data.name });

    expect(result).toEqual(baseSharedProgram);
  });

  it('throws 400 if name is missing', async () => {
    const data = {
      description: 'No name provided',
      category: 'strength',
      difficulty: 'beginner',
      durationWeeks: 4,
      daysPerWeek: 3,
      equipment: [],
      tags: [],
      workoutPlan: {},
    };

    await expect(
      sharedProgramService.createSharedProgram(CREATOR_ID, data as any),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.sharedProgram.create).not.toHaveBeenCalled();
  });
});

// ─── listSharedPrograms ───────────────────────────────────────────────────────

describe('listSharedPrograms', () => {
  it('returns all published programs when called with no filters', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([
      baseSharedProgram,
      secondSharedProgram,
    ]);

    const result = await sharedProgramService.listSharedPrograms({});

    expect(prisma.sharedProgram.findMany).toHaveBeenCalledTimes(1);
    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.where).toMatchObject({ isPublished: true });

    expect(result).toHaveLength(2);
  });

  it('filters by category when category option is provided', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([baseSharedProgram]);

    await sharedProgramService.listSharedPrograms({ category: 'strength' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.where).toMatchObject({ isPublished: true, category: 'strength' });
  });

  it('filters by name/description when q option is provided', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([baseSharedProgram]);

    await sharedProgramService.listSharedPrograms({ q: 'push' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.where).toMatchObject({ isPublished: true });
    // The query should search name or description — expect an OR clause
    expect(JSON.stringify(findArg.where)).toMatch(/push/i);
  });

  it('filters by difficulty when difficulty option is provided', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([secondSharedProgram]);

    await sharedProgramService.listSharedPrograms({ difficulty: 'beginner' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.where).toMatchObject({ isPublished: true, difficulty: 'beginner' });
  });

  it('orders by enrollmentCount desc when sort=popular', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([
      baseSharedProgram,
      secondSharedProgram,
    ]);

    await sharedProgramService.listSharedPrograms({ sort: 'popular' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.orderBy).toMatchObject({ enrollmentCount: 'desc' });
  });

  it('orders by ratingAverage desc when sort=top_rated', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([
      baseSharedProgram,
      secondSharedProgram,
    ]);

    await sharedProgramService.listSharedPrograms({ sort: 'top_rated' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.orderBy).toMatchObject({ ratingAverage: 'desc' });
  });

  it('orders by createdAt desc when sort=newest', async () => {
    (prisma.sharedProgram.findMany as jest.Mock).mockResolvedValue([
      secondSharedProgram,
      baseSharedProgram,
    ]);

    await sharedProgramService.listSharedPrograms({ sort: 'newest' });

    const findArg = (prisma.sharedProgram.findMany as jest.Mock).mock.calls[0][0];
    expect(findArg.orderBy).toMatchObject({ createdAt: 'desc' });
  });
});

// ─── getSharedProgram ─────────────────────────────────────────────────────────

describe('getSharedProgram', () => {
  it('returns the matching shared program by id', async () => {
    (prisma.sharedProgram.findUnique as jest.Mock).mockResolvedValue(baseSharedProgram);

    const result = await sharedProgramService.getSharedProgram('sp-1');

    expect(prisma.sharedProgram.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sp-1' } }),
    );
    expect(result).toEqual(baseSharedProgram);
  });

  it('throws 404 when the program does not exist', async () => {
    (prisma.sharedProgram.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(sharedProgramService.getSharedProgram('sp-nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── enrollInProgram ──────────────────────────────────────────────────────────

describe('enrollInProgram', () => {
  it('creates an enrollment record and returns the forked program id', async () => {
    (prisma.programEnrollment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.program.create as jest.Mock).mockResolvedValue(forkedPrismaProgram);
    (prisma.programEnrollment.create as jest.Mock).mockResolvedValue({
      id: 'enroll-1',
      userId: USER_ID,
      sharedProgramId: 'sp-1',
      programId: forkedPrismaProgram.id,
      enrolledAt: new Date(),
    });
    (prisma.sharedProgram.update as jest.Mock).mockResolvedValue({
      ...baseSharedProgram,
      enrollmentCount: 313,
    });

    const result = await sharedProgramService.enrollInProgram(
      USER_ID,
      'sp-1',
      baseSharedProgram as any,
    );

    expect(prisma.programEnrollment.create).toHaveBeenCalledTimes(1);
    const enrollArg = (prisma.programEnrollment.create as jest.Mock).mock.calls[0][0];
    expect(enrollArg.data).toMatchObject({ userId: USER_ID, sharedProgramId: 'sp-1' });

    expect(result).toMatchObject({ forkedProgramId: forkedPrismaProgram.id });
  });

  it('throws 400 if the user is already enrolled in the program', async () => {
    (prisma.programEnrollment.findFirst as jest.Mock).mockResolvedValue({
      id: 'enroll-existing',
      userId: USER_ID,
      sharedProgramId: 'sp-1',
      programId: 'program-already-forked',
      enrolledAt: new Date(),
    });

    await expect(
      sharedProgramService.enrollInProgram(USER_ID, 'sp-1', baseSharedProgram as any),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.programEnrollment.create).not.toHaveBeenCalled();
    expect(prisma.program.create).not.toHaveBeenCalled();
  });
});

// ─── rateProgram ──────────────────────────────────────────────────────────────

describe('rateProgram', () => {
  it('creates a rating record and returns it', async () => {
    (prisma.programRating.findFirst as jest.Mock).mockResolvedValue(null);

    const newRating = {
      id: 'rating-1',
      userId: RATER_ID,
      sharedProgramId: 'sp-1',
      rating: 5,
      review: 'Excellent program, highly recommend!',
      createdAt: new Date(),
    };
    (prisma.programRating.create as jest.Mock).mockResolvedValue(newRating);
    (prisma.sharedProgram.update as jest.Mock).mockResolvedValue({
      ...baseSharedProgram,
      ratingAverage: 4.8,
    });

    const result = await sharedProgramService.rateProgram(
      RATER_ID,
      'sp-1',
      5,
      'Excellent program, highly recommend!',
    );

    expect(prisma.programRating.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma.programRating.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data).toMatchObject({
      userId: RATER_ID,
      sharedProgramId: 'sp-1',
      rating: 5,
      review: 'Excellent program, highly recommend!',
    });

    expect(result).toEqual(newRating);
  });

  it('creates a rating record without a review (review is optional)', async () => {
    (prisma.programRating.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.programRating.create as jest.Mock).mockResolvedValue({
      id: 'rating-2',
      userId: RATER_ID,
      sharedProgramId: 'sp-1',
      rating: 3,
      review: null,
      createdAt: new Date(),
    });
    (prisma.sharedProgram.update as jest.Mock).mockResolvedValue(baseSharedProgram);

    await expect(
      sharedProgramService.rateProgram(RATER_ID, 'sp-1', 3, undefined),
    ).resolves.not.toThrow();
  });

  it('throws 400 if rating is below 1', async () => {
    await expect(
      sharedProgramService.rateProgram(RATER_ID, 'sp-1', 0, 'Too low'),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.programRating.create).not.toHaveBeenCalled();
  });

  it('throws 400 if rating is above 5', async () => {
    await expect(
      sharedProgramService.rateProgram(RATER_ID, 'sp-1', 6, 'Too high'),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.programRating.create).not.toHaveBeenCalled();
  });

  it('throws 400 if rating is not an integer (e.g. 3.7)', async () => {
    await expect(
      sharedProgramService.rateProgram(RATER_ID, 'sp-1', 3.7, undefined),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.programRating.create).not.toHaveBeenCalled();
  });

  it('throws 409 if the user has already rated this program', async () => {
    (prisma.programRating.findFirst as jest.Mock).mockResolvedValue({
      id: 'rating-existing',
      userId: RATER_ID,
      sharedProgramId: 'sp-1',
      rating: 4,
      review: 'Already rated',
      createdAt: new Date(),
    });

    await expect(
      sharedProgramService.rateProgram(RATER_ID, 'sp-1', 5, 'Trying to rate again'),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(prisma.programRating.create).not.toHaveBeenCalled();
  });
});
