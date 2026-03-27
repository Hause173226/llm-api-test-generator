import { useState, useEffect, useCallback } from 'react';
import { testSuiteService, TestSuite } from '../services';
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

  const createTestSuite = async (data: { name: string; description?: string; environmentId?: string }) => {
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
    data: { name?: string; description?: string; isActive?: boolean }
  ) => {
    try {
      const updated = await testSuiteService.updateTestSuite(projectId, testSuiteId, data);
      await fetchTestSuites(); // Refresh list
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteTestSuite = async (testSuiteId: string) => {
    try {
      await testSuiteService.deleteTestSuite(projectId, testSuiteId);
      await fetchTestSuites(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const cloneTestSuite = async (testSuiteId: string, newName: string) => {
    try {
      const cloned = await testSuiteService.cloneTestSuite(projectId, testSuiteId, newName);
      await fetchTestSuites(); // Refresh list
      return cloned;
    } catch (err) {
      throw err;
    }
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
