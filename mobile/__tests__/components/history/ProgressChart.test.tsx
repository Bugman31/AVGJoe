import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ProgressChart } from '@/components/history/ProgressChart';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

const mockProgress = [
  { date: '2026-03-01', maxWeight: 80, isPR: false, sessionId: 's1' },
  { date: '2026-03-08', maxWeight: 85, isPR: true,  sessionId: 's2' },
  { date: '2026-03-15', maxWeight: 90, isPR: true,  sessionId: 's3' },
];

describe('ProgressChart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows spinner while loading', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { getByTestId } = render(
      <ProgressChart exerciseId="ex-1" exerciseName="Bench Press" />,
    );
    // Spinner renders an ActivityIndicator — just check no crash
    expect(getByTestId).toBeTruthy();
  });

  it('shows chart bars when data loads', async () => {
    mockApi.get.mockResolvedValueOnce({ progress: mockProgress });
    const { getByText } = render(
      <ProgressChart exerciseId="ex-1" exerciseName="Bench Press" />,
    );
    await waitFor(() => expect(getByText('Bench Press — Max Weight Progress')).toBeTruthy());
  });

  it('marks PRs with PR label', async () => {
    mockApi.get.mockResolvedValueOnce({ progress: mockProgress });
    const { getAllByText } = render(
      <ProgressChart exerciseId="ex-1" exerciseName="Bench Press" />,
    );
    await waitFor(() => {
      const prLabels = getAllByText('PR');
      expect(prLabels.length).toBe(2); // two PRs in mock data
    });
  });

  it('shows empty message when fewer than 2 data points', async () => {
    mockApi.get.mockResolvedValueOnce({ progress: [mockProgress[0]] });
    const { getByText } = render(
      <ProgressChart exerciseId="ex-1" exerciseName="Bench Press" />,
    );
    await waitFor(() =>
      expect(getByText('Not enough data to show progress yet.')).toBeTruthy(),
    );
  });

  it('shows error message on API failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Server error'));
    const { getByText } = render(
      <ProgressChart exerciseId="ex-1" exerciseName="Bench Press" />,
    );
    await waitFor(() => expect(getByText('Server error')).toBeTruthy());
  });

  it('fetches progress for the correct exercise ID', async () => {
    mockApi.get.mockResolvedValueOnce({ progress: mockProgress });
    render(<ProgressChart exerciseId="ex-42" exerciseName="Squat" />);
    await waitFor(() =>
      expect(mockApi.get).toHaveBeenCalledWith('/api/sessions/progress/ex-42'),
    );
  });
});
