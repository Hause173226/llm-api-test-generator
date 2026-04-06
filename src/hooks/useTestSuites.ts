import { useState, useEffect, useCallback } from 'react';
import {
  testSuiteService,
  TestSuite,
  CreateTestSuiteRequest,
} from '../services/testSuiteService';
import { handleError } from '../utils/errorHandler';

export function useTestSuites(projectId: string) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestSuites = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await testSuiteService.getTestSuites(projectId);
      // Backend returns array directly, not paginated response
      const suites = Array.isArray(response) ? response : [];
      setTestSuites(suites);
      setTotalCount(suites.length);
      setTotalPages(1);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
      setTestSuites([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTestSuites();
  }, [fetchTestSuites]);

  const createTestSuite = async (data: CreateTestSuiteRequest) => {
    try {
      const newSuite = await testSuiteService.createTestSuite(projectId, data);
      await fetchTestSuites(); // Refresh list
      return newSuite;
    } catch (err) {
      throw err;
    }
  };

  const updateTestSuite = async (
    testSuiteId: string,
    data: Partial<CreateTestSuiteRequest>
  ) => {
    try {
      const updated = await testSuiteService.updateTestSuite(projectId, testSuiteId, data);
      await fetchTestSuites(); // Refresh list
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteTestSuite = async (projectId: string, testSuiteId: string, rowVersion: string) => {
    try {
      await testSuiteService.deleteTestSuite(projectId, testSuiteId, rowVersion);
      await fetchTestSuites(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const cloneTestSuite = async (_testSuiteId: string, _newName: string) => {
    throw new Error('Clone test suite is not supported by current backend API.');
  };

  return {
    testSuites,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchTestSuites,
    createTestSuite,
    updateTestSuite,
    deleteTestSuite,
    cloneTestSuite,
  };
}
