describe('healthkit workout import', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('normalizes workout samples from react-native-health getSamples', async () => {
    const getSamples = jest.fn((_options, callback) =>
      callback(null, [
        {
          activityId: 37,
          activityName: 'Traditional Strength Training',
          calories: 214,
          sourceName: 'Adam Apple Watch',
          sourceId: 'com.apple.health.123',
          device: 'Watch7,5',
          start: '2026-04-29T14:00:00.000Z',
          end: '2026-04-29T14:45:00.000Z',
        },
      ]),
    );

    jest.doMock('react-native', () => ({
      NativeModules: { AppleHealthKit: {} },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(() => ({ remove: jest.fn() })),
      })),
      Platform: { OS: 'ios' },
    }));

    jest.doMock('react-native-health', () => ({
      __esModule: true,
      default: {
        Constants: {},
        getSamples,
      },
      HealthKitConstants: {},
    }));

    const { getAppleWatchWorkouts } = require('@/lib/healthkit');
    const workouts = await getAppleWatchWorkouts(60);

    expect(getSamples).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Workout',
        ascending: false,
        limit: 100,
      }),
      expect.any(Function),
    );
    expect(workouts).toEqual([
      expect.objectContaining({
        activityName: 'Traditional Strength Training',
        startDate: '2026-04-29T14:00:00.000Z',
        endDate: '2026-04-29T14:45:00.000Z',
        duration: 2700,
        totalEnergyBurned: 214,
        sourceName: 'Adam Apple Watch',
        isFromWatch: true,
      }),
    ]);
  });

  it('flags denied HealthKit authorization so the app can prompt for settings', async () => {
    const getAuthStatus = jest.fn((_options, callback) =>
      callback(null, {
        permissions: {
          read: [2, 2, 2, 2],
          write: [1, 2],
        },
      }),
    );

    jest.doMock('react-native', () => ({
      NativeModules: { AppleHealthKit: {} },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(() => ({ remove: jest.fn() })),
      })),
      Platform: { OS: 'ios' },
    }));

    jest.doMock('react-native-health', () => ({
      __esModule: true,
      default: {
        Constants: {
          Permissions: {
            Workout: 'Workout',
            HeartRate: 'HeartRate',
            ActiveEnergyBurned: 'ActiveEnergyBurned',
            StepCount: 'StepCount',
          },
        },
        getAuthStatus,
      },
      HealthKitConstants: {
        Permissions: {
          Workout: 'Workout',
          HeartRate: 'HeartRate',
          ActiveEnergyBurned: 'ActiveEnergyBurned',
          StepCount: 'StepCount',
        },
      },
    }));

    const { getHealthKitAccessStatus } = require('@/lib/healthkit');
    const status = await getHealthKitAccessStatus();

    expect(getAuthStatus).toHaveBeenCalled();
    expect(status).toEqual(
      expect.objectContaining({
        isAvailable: true,
        canQueryAuthorizationStatus: true,
        workoutWriteStatus: 1,
        activeEnergyWriteStatus: 2,
        shouldPromptSettings: true,
        needsPermissionPrompt: false,
      }),
    );
  });
});
