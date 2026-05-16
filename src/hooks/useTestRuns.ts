import { useState, useEffect, useCallback } from "react";
import {
  testRunService,
  TestRun,
  TestRunsResponse,
  StartTestRunRequest,
} from "../services";
import { handleError } from "../utils/errorHandler";

export function useTestRuns(
  testSuiteId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  status?: string,
) {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestRuns = useCallback(async () => {
    if (!testSuiteId) {
      setTestRuns([]);
      setTotalCount(0);
      setTotalPages(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response: TestRunsResponse =
        await testRunService.getTestRunsByTestSuite(
          testSuiteId,
          pageNumber,
          pageSize,
          status,
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
  }, [testSuiteId, pageNumber, pageSize, status]);

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

  /** @deprecated Backend route does not exist. Use FE-10 report download instead. */
  const exportResults = async (
    testRunId: string,
    format: "json" | "csv" | "html",
  ) => {
    console.warn(
      "[useTestRuns] exportResults is deprecated — backend route does not exist. Use report download (FE-10) instead.",
    );
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
    exportResults,
  };
}

// Hook for single test run details
export function useTestRun(testSuiteId: string, testRunId: string) {
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestRun = useCallback(async () => {
    if (!testSuiteId || !testRunId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await testRunService.getTestRunById(testSuiteId, testRunId);
      setTestRun(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [testSuiteId, testRunId]);

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
