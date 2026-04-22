import { useState, useEffect } from 'react';
import testCaseService, { TestCase, CreateTestCaseRequest } from '../services/testCaseService';
import { handleError } from '../utils/errorHandler';

export const useTestCase = (
  testSuiteId: string,
  testCaseId?: string,
  suppressErrorToast = false,
) => {
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTestCase = async () => {
    if (!testSuiteId || !testCaseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await testCaseService.getTestCaseById(testSuiteId, testCaseId);
      setTestCase(data);
    } catch (err) {
      const errorMessage = handleError(err, undefined, suppressErrorToast);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testCaseId) {
      fetchTestCase();
    } else {
      setLoading(false);
    }
  }, [testSuiteId, testCaseId]);

  const createTestCase = async (data: CreateTestCaseRequest): Promise<TestCase | null> => {
    try {
      const newTestCase = await testCaseService.createTestCase(data);
      setTestCase(newTestCase);
      return newTestCase;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const updateTestCase = async (data: Partial<TestCase>): Promise<boolean> => {
    if (!testSuiteId || !testCaseId) return false;

    try {
      const updated = await testCaseService.updateTestCase(testSuiteId, testCaseId, data);
      setTestCase(updated);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const runTestCase = async (): Promise<boolean> => {
    if (!testSuiteId || !testCaseId) return false;

    try {
      setRunning(true);
      const result = await testCaseService.runTestCase(testSuiteId, testCaseId);
      setRunResult(result);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setRunning(false);
    }
  };

  const cloneTestCase = async (): Promise<TestCase | null> => {
    if (!testSuiteId || !testCaseId) return null;

    try {
      const cloned = await testCaseService.cloneTestCase(testSuiteId, testCaseId);
      return cloned;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  return {
    testCase,
    loading,
    running,
    runResult,
    error,
    createTestCase,
    updateTestCase,
    runTestCase,
    cloneTestCase,
    refetch: fetchTestCase,
  };
};
