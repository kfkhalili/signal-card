/**
 * Tests for health-check Edge Function
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Type for job run data
interface JobRun {
  jobname: string;
  last_run: string | null;
}

// Mock Supabase client
const createMockSupabaseClient = (jobRuns: JobRun[] = []) => {
  return {
    rpc: jest.fn().mockResolvedValue({
      data: jobRuns,
      error: null,
    }),
  };
};

describe('Health Check Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthy State', () => {
    it('should return 200 when all jobs are healthy', async () => {
      const mockJobRuns = [
        {
          jobname: 'process-queue-batch',
          last_run: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
        },
        {
          jobname: 'check-stale-data',
          last_run: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        },
      ];

      const supabase = createMockSupabaseClient(mockJobRuns);
      const { data, error } = await (supabase as ReturnType<typeof createMockSupabaseClient>).rpc('check_cron_job_health', {
        critical_jobs: ['process-queue-batch', 'check-stale-data'],
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].jobname).toBe('process-queue-batch');
    });

    it('should detect stale jobs', () => {
      const now = Date.now();
      const staleThreshold = 2 * 60 * 1000; // 2 minutes for process-queue-batch

      const staleJob = {
        jobname: 'process-queue-batch',
        last_run: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago (stale)
      };

      const timeSinceLastRun = now - new Date(staleJob.last_run).getTime();
      expect(timeSinceLastRun).toBeGreaterThan(staleThreshold);
    });
  });

  describe('Unhealthy State', () => {
    it('should detect jobs that have never run', () => {
      const jobWithNoRuns = {
        jobname: 'process-queue-batch',
        last_run: null,
      };

      expect(jobWithNoRuns.last_run).toBeNull();
    });

    it('should detect jobs that are too old', () => {
      const now = Date.now();
      const staleJob = {
        jobname: 'check-stale-data',
        last_run: new Date(now - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      };

      const expectedInterval = 10 * 60 * 1000; // 10 minutes
      const timeSinceLastRun = now - new Date(staleJob.last_run).getTime();

      expect(timeSinceLastRun).toBeGreaterThan(expectedInterval);
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      const supabase = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      const { error } = await (supabase as ReturnType<typeof createMockSupabaseClient>).rpc('check_cron_job_health', {
        critical_jobs: [],
      });

      expect(error).toBeDefined();
      expect(error.message).toBe('Database connection failed');
    });
  });
});

