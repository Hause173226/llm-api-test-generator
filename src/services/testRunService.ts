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
  updatedAt?: string;
  runNumber?: number;
  resultsExpireAt?: string;
  hasDetailedResults?: boolean;
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

export interface TestCaseRunDetail {
  testCaseId: string;
  endpointId?: string;
  name: string;
  testType?: string;
  orderIndex: number;
  status: string;
  httpStatusCode?: number;
  durationMs: number;
  resolvedUrl?: string;
  httpMethod?: string;
  bodyType?: string;
  requestBody?: string;
  queryParams?: Record<string, string>;
  timeoutMs?: number;
  expectedStatus?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  responseBodyPreview?: string;
  failureReasons: Array<{ code?: string; message?: string }>;
  extractedVariables: Record<string, string>;
  dependencyIds: string[];
  skippedBecauseDependencyIds: string[];
  statusCodeMatched?: boolean;
  schemaMatched?: boolean;
  headerChecksPassed?: boolean;
  bodyContainsPassed?: boolean;
  bodyNotContainsPassed?: boolean;
  jsonPathChecksPassed?: boolean;
  responseTimePassed?: boolean;
}

export interface TestRunDetailResponse {
  run?: TestRun;
  resultsSource?: string;
  executedAt?: string;
  resolvedEnvironmentName?: string;
  cases: TestCaseRunDetail[];
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

interface BackendTestRun {
  id: string;
  testSuiteId: string;
  projectId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalTests?: number;
  passedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  durationMs?: number;
  environmentId?: string;
  triggeredBy?: string;
  createdAt?: string;
  createdDateTime?: string;
  updatedDateTime?: string;
  runNumber?: number;
  hasDetailedResults?: boolean;
  resultsExpireAt?: string;
}

interface BackendPagedRuns {
  items?: BackendTestRun[];
  totalCount?: number;
  totalItems?: number;
  pageNumber?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

interface BackendTestCaseRunDetail {
  testCaseId?: string;
  endpointId?: string;
  name?: string;
  testType?: string;
  orderIndex?: number;
  status?: string;
  httpStatusCode?: number;
  durationMs?: number;
  resolvedUrl?: string;
  httpMethod?: string;
  bodyType?: string;
  requestBody?: string;
  queryParams?: Record<string, string>;
  timeoutMs?: number;
  expectedStatus?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseBodyPreview?: string;
  failureReasons?: Array<{ code?: string; message?: string }>;
  extractedVariables?: Record<string, string>;
  dependencyIds?: string[];
  skippedBecauseDependencyIds?: string[];
  statusCodeMatched?: boolean;
  schemaMatched?: boolean;
  headerChecksPassed?: boolean;
  bodyContainsPassed?: boolean;
  bodyNotContainsPassed?: boolean;
  jsonPathChecksPassed?: boolean;
  responseTimePassed?: boolean;
}

interface BackendTestRunDetail {
  run?: BackendTestRun;
  resultsSource?: string;
  executedAt?: string;
  resolvedEnvironmentName?: string;
  cases?: BackendTestCaseRunDetail[];
}

const normalizeStatus = (status?: string): TestRun['status'] => {
  const value = (status || '').toLowerCase();
  if (value === 'completed' || value === 'running' || value === 'pending' || value === 'failed' || value === 'cancelled') {
    return value;
  }
  return 'failed';
};

const mapBackendRun = (item: BackendTestRun): TestRun => ({
  id: item.id,
  testSuiteId: item.testSuiteId,
  projectId: item.projectId || '',
  status: normalizeStatus(item.status),
  startedAt: item.startedAt,
  completedAt: item.completedAt,
  totalTests: item.totalTests ?? 0,
  passedTests: item.passedCount ?? 0,
  failedTests: item.failedCount ?? 0,
  skippedTests: item.skippedCount ?? 0,
  duration: item.durationMs,
  environmentId: item.environmentId,
  triggeredBy: item.triggeredBy || 'system',
  createdAt: item.createdDateTime || item.createdAt || item.startedAt || new Date().toISOString(),
  updatedAt: item.updatedDateTime,
  runNumber: item.runNumber,
  resultsExpireAt: item.resultsExpireAt,
  hasDetailedResults: item.hasDetailedResults,
  results: undefined,
});

const mapBackendTestCaseRunDetail = (
  detail: BackendTestCaseRunDetail,
): TestCaseRunDetail => ({
  testCaseId: (detail as any).testCaseId || (detail as any).TestCaseId || '',
  endpointId: (detail as any).endpointId || (detail as any).EndpointId,
  name: (detail as any).name || (detail as any).Name || 'Unnamed test case',
  testType: (detail as any).testType || (detail as any).TestType,
  orderIndex: (detail as any).orderIndex ?? (detail as any).OrderIndex ?? 0,
  status: (detail as any).status || (detail as any).Status || 'Unknown',
  httpStatusCode: (detail as any).httpStatusCode ?? (detail as any).HttpStatusCode,
  durationMs: (detail as any).durationMs ?? (detail as any).DurationMs ?? 0,
  resolvedUrl: (detail as any).resolvedUrl || (detail as any).ResolvedUrl,
  httpMethod: (detail as any).httpMethod || (detail as any).HttpMethod,
  bodyType: (detail as any).bodyType || (detail as any).BodyType,
  requestBody: (detail as any).requestBody || (detail as any).RequestBody,
  queryParams: (detail as any).queryParams || (detail as any).QueryParams || {},
  timeoutMs: (detail as any).timeoutMs ?? (detail as any).TimeoutMs,
  expectedStatus: (detail as any).expectedStatus || (detail as any).ExpectedStatus,
  requestHeaders: (detail as any).requestHeaders || (detail as any).RequestHeaders || {},
  responseHeaders: (detail as any).responseHeaders || (detail as any).ResponseHeaders || {},
  responseBodyPreview: (detail as any).responseBodyPreview || (detail as any).ResponseBodyPreview,
  failureReasons: (detail as any).failureReasons || (detail as any).FailureReasons || [],
  extractedVariables: (detail as any).extractedVariables || (detail as any).ExtractedVariables || {},
  dependencyIds: (detail as any).dependencyIds || (detail as any).DependencyIds || [],
  skippedBecauseDependencyIds:
    (detail as any).skippedBecauseDependencyIds ||
    (detail as any).SkippedBecauseDependencyIds ||
    [],
  statusCodeMatched: (detail as any).statusCodeMatched ?? (detail as any).StatusCodeMatched,
  schemaMatched: (detail as any).schemaMatched ?? (detail as any).SchemaMatched,
  headerChecksPassed: (detail as any).headerChecksPassed ?? (detail as any).HeaderChecksPassed,
  bodyContainsPassed: (detail as any).bodyContainsPassed ?? (detail as any).BodyContainsPassed,
  bodyNotContainsPassed:
    (detail as any).bodyNotContainsPassed ?? (detail as any).BodyNotContainsPassed,
  jsonPathChecksPassed:
    (detail as any).jsonPathChecksPassed ?? (detail as any).JsonPathChecksPassed,
  responseTimePassed: (detail as any).responseTimePassed ?? (detail as any).ResponseTimePassed,
});

const mapBackendRunDetail = (response: BackendTestRunDetail): TestRunDetailResponse => ({
  run: (response as any)?.run
    ? mapBackendRun((response as any).run)
    : (response as any)?.Run
      ? mapBackendRun((response as any).Run)
      : undefined,
  resultsSource:
    (response as any)?.resultsSource ?? (response as any)?.ResultsSource,
  executedAt: (response as any)?.executedAt ?? (response as any)?.ExecutedAt,
  resolvedEnvironmentName:
    (response as any)?.resolvedEnvironmentName ??
    (response as any)?.ResolvedEnvironmentName,
  cases: Array.isArray((response as any)?.cases)
    ? (response as any).cases.map(mapBackendTestCaseRunDetail)
    : Array.isArray((response as any)?.Cases)
      ? (response as any).Cases.map(mapBackendTestCaseRunDetail)
      : [],
});

const mapBackendPagedRuns = (
  response: BackendPagedRuns | BackendTestRun[],
  fallbackPageNumber: number,
  fallbackPageSize: number,
): TestRunsResponse => {
  if (Array.isArray(response)) {
    return {
      items: response.map(mapBackendRun),
      totalCount: response.length,
      pageNumber: fallbackPageNumber,
      pageSize: fallbackPageSize,
      totalPages: 1,
    };
  }

  const rawItems = Array.isArray(response?.items) ? response.items : [];
  return {
    items: rawItems.map(mapBackendRun),
    totalCount: response?.totalCount ?? response?.totalItems ?? rawItems.length,
    pageNumber: response?.pageNumber ?? response?.page ?? fallbackPageNumber,
    pageSize: response?.pageSize ?? fallbackPageSize,
    totalPages: response?.totalPages ?? 1,
  };
};

export interface StartTestRunRequest {
  testSuiteId: string;
  environmentId?: string;
  selectedTestCaseIds?: string[]; // Optional: run specific test cases only
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

    const response = await apiService.get<BackendPagedRuns | BackendTestRun[]>(`/projects/${projectId}/test-runs`, { params });
    return mapBackendPagedRuns(response, pageNumber, pageSize);
  },

  // Get test runs for a specific test suite
  getTestRunsByTestSuite: async (
    testSuiteId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<TestRunsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (status) params.status = status;

    const response = await apiService.get<BackendPagedRuns | BackendTestRun[]>(`/test-suites/${testSuiteId}/test-runs`, {
      params,
    });
    return mapBackendPagedRuns(response, pageNumber, pageSize);
  },

  // Get test run by ID
  getTestRunById: async (testRunId: string): Promise<TestRun> => {
    return await apiService.get<TestRun>(`/test-runs/${testRunId}`);
  },

  // Start a new test run
  startTestRun: async (data: StartTestRunRequest): Promise<TestRun> => {
    return await apiService.post<TestRun>(`/test-suites/${data.testSuiteId}/test-runs`, {
      environmentId: data.environmentId,
      selectedTestCaseIds: data.selectedTestCaseIds,
    });
  },

  // Cancel a running test run
  cancelTestRun: async (testRunId: string): Promise<void> => {
    await apiService.post(`/test-runs/${testRunId}/cancel`);
  },

  // Get test run results
  getTestRunResults: async (
    testSuiteId: string,
    testRunId: string,
  ): Promise<TestRunDetailResponse> => {
    const response = await apiService.get<BackendTestRunDetail>(
      `/test-suites/${testSuiteId}/test-runs/${testRunId}/results`,
    );
    return mapBackendRunDetail(response || {});
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
