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
      const allResponse = await testCaseService.getTestCases(
        testSuiteId,
        undefined,
        undefined,
        { includeDisabled: true, includeDeleted: false },
      );
      const allIds = allResponse.items.map((tc) => tc.id);
      const orderedUnique = Array.from(new Set(orderedIds)).filter((id) =>
        allIds.includes(id),
      );
      const remaining = allIds.filter((id) => !orderedUnique.includes(id));
      const fullOrder = [...orderedUnique, ...remaining];

      await testCaseService.reorderTestCases(testSuiteId, fullOrder);
      await fetchTestCases(pagination.pageNumber);
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
