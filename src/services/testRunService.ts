import apiService from './apiService';

export interface TestRun {
  id: string;
  testSuiteId: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;
  environmentId?: string;
  triggeredBy: string;
  results?: TestRunResult[];
  createdAt: string;
}

export interface TestRunResult {
  testCaseId: string;
  testCaseName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  actualResponse?: any;
  expectedResponse?: any;
  assertions?: AssertionResult[];
}

export interface AssertionResult {
  type: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export interface TestRunsResponse {
  items: TestRun[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface StartTestRunRequest {
  testSuiteId: string;
  environmentId?: string;
  testCaseIds?: string[]; // Optional: run specific test cases only
}

const testRunService = {
  // Get all test runs for a project
  getTestRuns: async (
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<TestRunsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (status) params.status = status;

    return await apiService.get<TestRunsResponse>(`/projects/${projectId}/test-runs`, { params });
  },

  // Get test runs for a specific test suite
  getTestRunsByTestSuite: async (
    testSuiteId: string,
    pageNumber: number = 1,
    pageSize: number = 20
  ): Promise<TestRunsResponse> => {
    return await apiService.get<TestRunsResponse>(`/test-suites/${testSuiteId}/test-runs`, {
      params: { pageNumber, pageSize },
    });
  },

  // Get test run by ID
  getTestRunById: async (testRunId: string): Promise<TestRun> => {
    return await apiService.get<TestRun>(`/test-runs/${testRunId}`);
  },

  // Start a new test run
  startTestRun: async (data: StartTestRunRequest): Promise<TestRun> => {
    return await apiService.post<TestRun>('/test-runs', data);
  },

  // Cancel a running test run
  cancelTestRun: async (testRunId: string): Promise<void> => {
    await apiService.post(`/test-runs/${testRunId}/cancel`);
  },

  // Get test run results
  getTestRunResults: async (testRunId: string): Promise<TestRunResult[]> => {
    return await apiService.get<TestRunResult[]>(`/test-runs/${testRunId}/results`);
  },

  // Get test run statistics
  getTestRunStats: async (projectId: string, days: number = 30): Promise<any> => {
    return await apiService.get(`/projects/${projectId}/test-runs/stats`, {
      params: { days },
    });
  },

  // Retry failed test cases
  retryFailedTests: async (testRunId: string): Promise<TestRun> => {
    return await apiService.post<TestRun>(`/test-runs/${testRunId}/retry-failed`);
  },

  // Export test run results
  exportTestRunResults: async (testRunId: string, format: 'json' | 'csv' | 'html'): Promise<Blob> => {
    return await apiService.downloadFile(`/test-runs/${testRunId}/export?format=${format}`);
  },
};

export default testRunService;
