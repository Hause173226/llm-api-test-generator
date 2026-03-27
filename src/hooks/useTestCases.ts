import { useState, useEffect } from 'react';
import testCaseService, { TestCase } from '../services/testCaseService';
import { handleError } from '../utils/errorHandler';

export const useTestCases = (testSuiteId: string) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchTestCases = async (page: number = 1) => {
    if (!testSuiteId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await testCaseService.getTestCases(testSuiteId, page, pagination.pageSize);
      setTestCases(response.items);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
      });
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, [testSuiteId]);

  const reorderTestCases = async (orderedIds: string[]): Promise<boolean> => {
    try {
      await testCaseService.reorderTestCases(testSuiteId, orderedIds);
      // Update local state to reflect new order
      const reordered = orderedIds
        .map(id => testCases.find(tc => tc.id === id))
        .filter(Boolean) as TestCase[];
      setTestCases(reordered);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const deleteTestCase = async (testCaseId: string): Promise<boolean> => {
    try {
      await testCaseService.deleteTestCase(testSuiteId, testCaseId);
      setTestCases(prev => prev.filter(tc => tc.id !== testCaseId));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const cloneTestCase = async (testCaseId: string): Promise<boolean> => {
    try {
      const cloned = await testCaseService.cloneTestCase(testSuiteId, testCaseId);
      setTestCases(prev => [...prev, cloned]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const changePage = (page: number) => {
    fetchTestCases(page);
  };

  return {
    testCases,
    loading,
    error,
    pagination,
    reorderTestCases,
    deleteTestCase,
    cloneTestCase,
    changePage,
    refetch: fetchTestCases,
  };
};
