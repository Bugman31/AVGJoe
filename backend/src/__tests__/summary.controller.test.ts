import type { NextFunction, Request, Response } from 'express';
import * as summaryController from '../controllers/summary.controller';
import * as summaryService from '../services/summary.service';

jest.mock('../services/summary.service');

const mockSummaryService = summaryService as jest.Mocked<typeof summaryService>;

function createResponse(): Response {
  return {
    json: jest.fn(),
  } as unknown as Response;
}

describe('summary.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses req.user.id for dashboard summary', async () => {
    const req = {
      user: { id: 'user-123' },
    } as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    mockSummaryService.getDashboardSummary.mockResolvedValue({
      activeProgram: null,
      streak: 0,
      readiness: { label: 'Ready', daysSinceLast: 0 },
      recentSessions: [],
      inProgressSession: null,
    });

    await summaryController.dashboardSummary(req, res, next);

    expect(mockSummaryService.getDashboardSummary).toHaveBeenCalledWith('user-123');
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('uses req.user.id for progress summary and defaults range to 1m', async () => {
    const req = {
      user: { id: 'user-456' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    mockSummaryService.getProgressSummary.mockResolvedValue({
      range: '1m',
      totalWorkouts: 0,
      totalVolume: 0,
      avgWorkoutScore: null,
      consistencyScore: 0,
      topLifts: [],
    });

    await summaryController.progressSummary(req, res, next);

    expect(mockSummaryService.getProgressSummary).toHaveBeenCalledWith('user-456', '1m');
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
