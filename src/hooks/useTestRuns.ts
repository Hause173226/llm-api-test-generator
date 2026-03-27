import { useState, useEffect, useCallback } from 'react';
import { testRunService, TestRun, TestRunsResponse, StartTestRunRequest } from '../services';
import { handleError } from '../utils/errorHandler';

export function useTestRuns(
  projectId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  status?: string
) {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestRuns = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response: TestRunsResponse = await testRunService.getTestRuns(
        projectId,
        pageNumber,
        pageSize,
        status
      );
      setTestRuns(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, pageNumber, pageSize, status]);

  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  const startTestRun = async (data: StartTestRunRequest) => {
    try {
      const newRun = await testRunService.startTestRun(data);
      await fetchTestRuns(); // Refresh list
      return newRun;
    } catch (err) {
      throw err;
    }
  };

  const cancelTestRun = async (testRunId: string) => {
    try {
      await testRunService.cancelTestRun(testRunId);
      await fetchTestRuns(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const retryFailedTests = async (testRunId: string) => {
    try {
      const newRun = await testRunService.retryFailedTests(testRunId);
      await fetchTestRuns(); // Refresh list
      return newRun;
    } catch (err) {
      throw err;
    }
  };

  const exportResults = async (testRunId: string, format: 'json' | 'csv' | 'html') => {
    try {
      return await testRunService.exportTestRunResults(testRunId, format);
    } catch (err) {
      throw err;
    }
  };

  return {
    testRuns,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchTestRuns,
    startTestRun,
    cancelTestRun,
    retryFailedTests,
    exportResults,
  };
}

// Hook for single test run details
export function useTestRun(testRunId: string) {
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestRun = useCallback(async () => {
    if (!testRunId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await testRunService.getTestRunById(testRunId);
      setTestRun(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [testRunId]);

  useEffect(() => {
    fetchTestRun();
  }, [fetchTestRun]);

  return {
    testRun,
    isLoading,
    error,
    refetch: fetchTestRun,
  };
}
