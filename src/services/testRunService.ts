import apiService from "./apiService";

export const DEFAULT_VALIDATION_SCORE_THRESHOLD = 0.5;

export interface TestRun {
  id: string;
  testSuiteId: string;
  projectId: string;
  testSuiteName?: string;
  environmentName?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
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
  status: "passed" | "failed" | "skipped";
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
  description?: string;
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
  warnings?: ValidationWarningModel[];
  hasWarnings?: boolean;
  checksPerformed?: number;
  checksSkipped?: number;
  failureReasons: ValidationFailureModel[];
  extractedVariables: Record<string, string>;
  dependencyIds: string[];
  skippedBecauseDependencyIds: string[];
  skippedCause?: string | null;
  executionAttempt?: number;
  totalAttempts?: number;
  statusCodeMatched?: boolean;
  schemaMatched?: boolean;
  headerChecksPassed?: boolean;
  bodyContainsPassed?: boolean;
  bodyNotContainsPassed?: boolean;
  jsonPathChecksPassed?: boolean;
  responseTimePassed?: boolean;
  validationScore?: number;
  validationScoreThreshold?: number;
  hardChecksPassed?: boolean;
  // Expectation snapshots — for FE Evidence panel
  expectedResponse?: any;
  expectedBodyContains?: string;
  expectedBodyNotContains?: string;
  expectedHeaderChecks?: string;
  expectedJsonPathChecks?: string;
  expectedMaxResponseTime?: number;
  expectationSource?: string;
  requirementCode?: string;
  primaryRequirementId?: string;
  expectedProvenance?: string;
}

export interface TestCaseRunOverrideRequest {
  testCaseId: string;
  name?: string;
  description?: string;
  testType?: string;
  request?: {
    httpMethod?: string;
    url?: string;
    headers?: string;
    pathParams?: string;
    queryParams?: string;
    bodyType?: string;
    body?: string;
    timeout?: number;
  };
  expectation?: {
    expectedStatus?: string;
    responseSchema?: string;
    headerChecks?: string;
    bodyContains?: string;
    bodyNotContains?: string;
    jsonPathChecks?: string;
    maxResponseTime?: number | null;
    expectedProvenance?: string;
  };
}

export interface TestRunDetailResponse {
  run?: TestRun;
  resultsSource?: string;
  executedAt?: string;
  resolvedEnvironmentName?: string;
  cases: TestCaseRunDetail[];
  attempts?: TestCaseExecutionAttemptModel[];
  attemptChildrenMap?: Record<string, string[]>;
}

export interface AssertionResult {
  type: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export interface ValidationFailureModel {
  code?: string;
  message: string;
  target?: string;
  expected?: string;
  actual?: string;
}

export interface ValidationWarningModel {
  code?: string;
  message: string;
  target?: string;
}

export interface TestRunRetryPolicyModel {
  maxRetryAttempts: number;
  retryFailedDependencies: boolean;
  rerunSkippedCases: boolean;
}

export interface TestCaseExecutionAttemptModel {
  executionAttemptId: string;
  parentAttemptId: string | null;
  testRunId: string;
  testCaseId: string;
  attemptNumber: number;
  status: string;
  retryReason: string | null;
  skippedCause: string | null;
  dependencyRootCause: string | null;
  dependencyRootCauseIds: string[];
  replayedSkippedCaseIds: string[];
  isReplay: boolean;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  failureReasons: ValidationFailureModel[];
  retryPolicy: TestRunRetryPolicyModel;
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
  testSuiteName?: string;
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
  environmentName?: string;
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
  warnings?: Array<{ code?: string; message?: string; target?: string }>;
  hasWarnings?: boolean;
  checksPerformed?: number;
  checksSkipped?: number;
  failureReasons?: Array<{ code?: string; message?: string; target?: string; expected?: string; actual?: string }>;
  extractedVariables?: Record<string, string>;
  dependencyIds?: string[];
  skippedBecauseDependencyIds?: string[];
  skippedCause?: string | null;
  executionAttempt?: number;
  totalAttempts?: number;
  statusCodeMatched?: boolean;
  schemaMatched?: boolean;
  headerChecksPassed?: boolean;
  bodyContainsPassed?: boolean;
  bodyNotContainsPassed?: boolean;
  jsonPathChecksPassed?: boolean;
  responseTimePassed?: boolean;
  validationScore?: number;
  validationScoreThreshold?: number;
  hardChecksPassed?: boolean;
  expectationSource?: string;
  requirementCode?: string;
  primaryRequirementId?: string;
  expectedProvenance?: string;
}

interface BackendTestRunDetail {
  run?: BackendTestRun;
  resultsSource?: string;
  executedAt?: string;
  resolvedEnvironmentName?: string;
  cases?: BackendTestCaseRunDetail[];
  attempts?: any[];
  attemptChildrenMap?: Record<string, string[]>;
}

const normalizeStatus = (status?: string): TestRun["status"] => {
  const value = (status || "").toLowerCase();
  if (
    value === "completed" ||
    value === "running" ||
    value === "pending" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  // BE TestRunResultModel returns 'Passed'/'Failed'/'Running' (PascalCase)
  if (value === "passed") return "completed";
  return "failed";
};

const mapBackendRun = (item: BackendTestRun): TestRun => ({
  id: item.id,
  testSuiteId: item.testSuiteId,
  testSuiteName: (item as any).testSuiteName ?? (item as any).TestSuiteName,
  projectId: item.projectId || "",
  status: normalizeStatus(item.status),
  startedAt: item.startedAt,
  completedAt: item.completedAt,
  totalTests: item.totalTests ?? 0,
  passedTests: item.passedCount ?? 0,
  failedTests: item.failedCount ?? 0,
  skippedTests: item.skippedCount ?? 0,
  duration: item.durationMs,
  environmentId: item.environmentId,
  environmentName: (item as any).environmentName ?? (item as any).EnvironmentName,
  triggeredBy: item.triggeredBy || "system",
  createdAt:
    item.createdDateTime ||
    item.createdAt ||
    item.startedAt ||
    new Date().toISOString(),
  updatedAt: item.updatedDateTime,
  runNumber: item.runNumber,
  resultsExpireAt: item.resultsExpireAt,
  hasDetailedResults: item.hasDetailedResults,
  results: undefined,
});

const mapBackendTestCaseRunDetail = (
  detail: BackendTestCaseRunDetail,
): TestCaseRunDetail => ({
  testCaseId: (detail as any).testCaseId || (detail as any).TestCaseId || "",
  endpointId: (detail as any).endpointId || (detail as any).EndpointId,
  name: (detail as any).name || (detail as any).Name || "Unnamed test case",
  description: (detail as any).description || (detail as any).Description || undefined,
  testType: (detail as any).testType || (detail as any).TestType,
  orderIndex: (detail as any).orderIndex ?? (detail as any).OrderIndex ?? 0,
  status: (detail as any).status || (detail as any).Status || "Unknown",
  httpStatusCode:
    (detail as any).httpStatusCode ?? (detail as any).HttpStatusCode,
  durationMs: (detail as any).durationMs ?? (detail as any).DurationMs ?? 0,
  resolvedUrl: (detail as any).resolvedUrl || (detail as any).ResolvedUrl,
  httpMethod: (detail as any).httpMethod || (detail as any).HttpMethod,
  bodyType: (detail as any).bodyType || (detail as any).BodyType,
  requestBody: (detail as any).requestBody || (detail as any).RequestBody,
  queryParams: (detail as any).queryParams || (detail as any).QueryParams || {},
  timeoutMs: (detail as any).timeoutMs ?? (detail as any).TimeoutMs,
  expectedStatus:
    (detail as any).expectedStatus || (detail as any).ExpectedStatus,
  requestHeaders:
    (detail as any).requestHeaders || (detail as any).RequestHeaders || {},
  responseHeaders:
    (detail as any).responseHeaders || (detail as any).ResponseHeaders || {},
  responseBodyPreview:
    (detail as any).responseBodyPreview || (detail as any).ResponseBodyPreview,
  warnings: (detail as any).warnings || (detail as any).Warnings,
  hasWarnings:
    (detail as any).hasWarnings ??
    (detail as any).HasWarnings ??
    ((detail as any).warnings?.length > 0 || (detail as any).Warnings?.length > 0),
  checksPerformed: (detail as any).checksPerformed ?? (detail as any).ChecksPerformed,
  checksSkipped: (detail as any).checksSkipped ?? (detail as any).ChecksSkipped,
  failureReasons:
    (detail as any).failureReasons || (detail as any).FailureReasons || [],
  extractedVariables:
    (detail as any).extractedVariables ||
    (detail as any).ExtractedVariables ||
    {},
  dependencyIds:
    (detail as any).dependencyIds || (detail as any).DependencyIds || [],
  skippedBecauseDependencyIds:
    (detail as any).skippedBecauseDependencyIds ||
    (detail as any).SkippedBecauseDependencyIds ||
    [],
  skippedCause:
    (detail as any).skippedCause ?? (detail as any).SkippedCause ?? null,
  executionAttempt:
    (detail as any).executionAttempt ?? (detail as any).ExecutionAttempt,
  totalAttempts:
    (detail as any).totalAttempts ?? (detail as any).TotalAttempts,
  statusCodeMatched:
    (detail as any).statusCodeMatched ?? (detail as any).StatusCodeMatched,
  schemaMatched: (detail as any).schemaMatched ?? (detail as any).SchemaMatched,
  headerChecksPassed:
    (detail as any).headerChecksPassed ?? (detail as any).HeaderChecksPassed,
  bodyContainsPassed:
    (detail as any).bodyContainsPassed ?? (detail as any).BodyContainsPassed,
  bodyNotContainsPassed:
    (detail as any).bodyNotContainsPassed ??
    (detail as any).BodyNotContainsPassed,
  jsonPathChecksPassed:
    (detail as any).jsonPathChecksPassed ??
    (detail as any).JsonPathChecksPassed,
  responseTimePassed:
    (detail as any).responseTimePassed ?? (detail as any).ResponseTimePassed,
  validationScore:
    (detail as any).validationScore ?? (detail as any).ValidationScore,
  validationScoreThreshold:
    (detail as any).validationScoreThreshold ??
    (detail as any).ValidationScoreThreshold,
  hardChecksPassed:
    (detail as any).hardChecksPassed ?? (detail as any).HardChecksPassed,
  // Expectation snapshots (map backend names if present)
  expectedBodyContains:
    (detail as any).expectedBodyContains ?? (detail as any).ExpectedBodyContains,
  expectedBodyNotContains:
    (detail as any).expectedBodyNotContains ?? (detail as any).ExpectedBodyNotContains,
  expectedHeaderChecks:
    (detail as any).expectedHeaderChecks ?? (detail as any).ExpectedHeaderChecks,
  expectedJsonPathChecks:
    (detail as any).expectedJsonPathChecks ?? (detail as any).ExpectedJsonPathChecks,
  expectedMaxResponseTime:
    (detail as any).expectedMaxResponseTime ?? (detail as any).ExpectedMaxResponseTime,
  expectedResponse:
    (detail as any).expectedResponse ?? (detail as any).ExpectedResponse,
  expectationSource:
    (detail as any).expectationSource ?? (detail as any).ExpectationSource,
  requirementCode:
    (detail as any).requirementCode ?? (detail as any).RequirementCode,
  primaryRequirementId:
    (detail as any).primaryRequirementId ?? (detail as any).PrimaryRequirementId,
  expectedProvenance:
    (detail as any).expectedProvenance ?? (detail as any).ExpectedProvenance,
});

const mapBackendRunDetail = (
  response: BackendTestRunDetail,
): TestRunDetailResponse => ({
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
  attempts: (response as any)?.attempts ?? (response as any)?.Attempts ?? [],
  attemptChildrenMap:
    (response as any)?.attemptChildrenMap ??
    (response as any)?.AttemptChildrenMap ??
    {},
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

export interface RetryPolicyRequest {
  maxRetryAttempts?: number;
  retryFailedDependencies?: boolean;
  rerunSkippedCases?: boolean;
}

export interface StartTestRunRequest {
  testSuiteId: string;
  environmentId?: string;
  selectedTestCaseIds?: string[];
  strictValidation?: boolean;
  validationProfile?: "Default" | "DemoAdaptive" | "SrsStrict";
  retryPolicy?: RetryPolicyRequest;
  recordRun?: boolean;
  testCaseOverrides?: TestCaseRunOverrideRequest[];
}

const testRunService = {
  // ===== STABLE CONTRACT (FE-07/08 suite-level) =====

  // Get test runs for a specific test suite (primary API)
  getTestRunsByTestSuite: async (
    testSuiteId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    status?: string,
  ): Promise<TestRunsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (status) params.status = status;

    const response = await apiService.get<BackendPagedRuns | BackendTestRun[]>(
      `/test-suites/${testSuiteId}/test-runs`,
      {
        params,
      },
    );
    return mapBackendPagedRuns(response, pageNumber, pageSize);
  },

  // Start a new test run (suite-level)
  // BE returns TestRunResultModel (HTTP 201) which maps to TestRunDetailResponse.
  startTestRun: async (data: StartTestRunRequest): Promise<TestRunDetailResponse> => {
    const response = await apiService.post<BackendTestRunDetail>(
      `/test-suites/${data.testSuiteId}/test-runs`,
      {
        environmentId: data.environmentId,
        selectedTestCaseIds: data.selectedTestCaseIds,
        strictValidation: data.strictValidation,
        validationProfile: data.validationProfile,
        retryPolicy: data.retryPolicy ?? null,
        recordRun: data.recordRun ?? true,
        testCaseOverrides: data.testCaseOverrides ?? undefined,
      },
    );
    return mapBackendRunDetail(response || {});
  },

  // Get test run results (suite-level)
  getTestRunResults: async (
    testSuiteId: string,
    testRunId: string,
  ): Promise<TestRunDetailResponse> => {
    const response = await apiService.get<BackendTestRunDetail>(
      `/test-suites/${testSuiteId}/test-runs/${testRunId}/results`,
    );
    return mapBackendRunDetail(response || {});
  },

  // Get single test run detail (suite-level)
  getTestRunById: async (
    testSuiteId: string,
    testRunId: string,
  ): Promise<TestRun> => {
    const response = await apiService.get<BackendTestRun>(
      `/test-suites/${testSuiteId}/test-runs/${testRunId}`,
    );
    return mapBackendRun(response);
  },

  // ===== LEGACY / FALLBACK (kept until backend confirms removal) =====

  /** @deprecated Use getTestRunsByTestSuite instead. Legacy project-level route. */
  getTestRuns: async (
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    status?: string,
  ): Promise<TestRunsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (status) params.status = status;

    const response = await apiService.get<BackendPagedRuns | BackendTestRun[]>(
      `/projects/${projectId}/test-runs`,
      { params },
    );
    return mapBackendPagedRuns(response, pageNumber, pageSize);
  },

  /** @deprecated Legacy stats route, may not exist in handoff. */
  getTestRunStats: async (
    projectId: string,
    days: number = 30,
  ): Promise<any> => {
    return await apiService.get(`/projects/${projectId}/test-runs/stats`, {
      params: { days },
    });
  },

  /** @deprecated Legacy export route. */
  exportTestRunResults: async (
    testRunId: string,
    format: "json" | "csv" | "html",
  ): Promise<Blob> => {
    return await apiService.downloadFile(
      `/test-runs/${testRunId}/export?format=${format}`,
    );
  },
};

export default testRunService;
