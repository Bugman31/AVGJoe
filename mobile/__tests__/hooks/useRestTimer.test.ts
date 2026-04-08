import { renderHook, act } from '@testing-library/react-native';
import { useRestTimer, REST_TIMER_OPTIONS } from '@/hooks/useRestTimer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useRestTimer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts with isActive=false and remaining=0', () => {
    const { result } = renderHook(() => useRestTimer());
    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it('starts the timer and counts down', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => { result.current.start(60); });
    expect(result.current.isActive).toBe(true);
    expect(result.current.remaining).toBe(60);

    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.remaining).toBe(57);
  });

  it('stops automatically when it reaches 0', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => { result.current.start(3); });
    act(() => { jest.advanceTimersByTime(3000); });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it('stop() cancels the timer immediately', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => { result.current.start(60); });
    act(() => { result.current.stop(); });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it('defaults to 90s duration', () => {
    const { result } = renderHook(() => useRestTimer());
    expect(result.current.selectedDuration).toBe(90);
  });

  it('setSelectedDuration persists the preference', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { result } = renderHook(() => useRestTimer());

    act(() => { result.current.setSelectedDuration(120); });

    expect(result.current.selectedDuration).toBe(120);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('rest_timer_duration', '120');
  });

  it('exposes the correct timer options', () => {
    expect(REST_TIMER_OPTIONS).toEqual([60, 90, 120]);
  });
});
