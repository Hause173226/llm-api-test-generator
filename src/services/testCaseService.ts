import apiService from "./apiService";

export interface TestCase {
  id: string;
  testSuiteId: string;
  name: string;
  description?: string;
  endpointId: string;
  method: string;
  path: string;
  requestBody?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  expectedStatus: number;
  expectedResponse?: any;
  assertions?: any[];
  testType?: string;
  priority?: string;
  isEnabled?: boolean;
  tags?: string[];
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
  };
  variables?: Array<{
    variableName?: string;
    extractFrom?: string;
    jsonPath?: string;
    headerName?: string;
    regex?: string;
    defaultValue?: string;
  }>;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestCasesResponse {
  items: TestCase[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface TestCaseRequestInput {
  httpMethod: string;
  url: string;
  headers?: string;
  pathParams?: string;
  queryParams?: string;
  bodyType: string;
  body?: string;
  timeout: number;
}

export interface TestCaseExpectationInput {
  expectedStatus?: string;
  responseSchema?: string;
  headerChecks?: string;
  bodyContains?: string;
  bodyNotContains?: string;
  jsonPathChecks?: string;
  maxResponseTime?: number | null;
}

export interface TestCaseVariableInput {
  variableName: string;
  extractFrom: string;
  jsonPath?: string;
  headerName?: string;
  regex?: string;
  defaultValue?: string;
}

export interface CreateTestCaseRequest {
  testSuiteId: string;
  endpointId?: string | null;
  name: string;
  description?: string;
  testType: string;
  priority: string;
  isEnabled: boolean;
  tags?: string[];
  request: TestCaseRequestInput;
  expectation: TestCaseExpectationInput;
  variables?: TestCaseVariableInput[];
}

const normalizeTestCase = (item: any): TestCase => {
  const request = item?.request || item?.Request || {};
  const expectation = item?.expectation || item?.Expectation || {};

  return {
    id: item?.id || item?.Id || item?.testCaseId || "",
    testSuiteId: item?.testSuiteId || item?.TestSuiteId || "",
    name: item?.name || item?.Name || "Unnamed test case",
    description: item?.description || item?.Description || "",
    endpointId: item?.endpointId || item?.EndpointId || "",
    method:
      item?.method ||
      item?.Method ||
      request?.httpMethod ||
      request?.HttpMethod ||
      "GET",
    path: item?.path || item?.Path || request?.url || request?.Url || "",
    requestBody:
      item?.requestBody ?? item?.RequestBody ?? request?.body ?? request?.Body,
    headers:
      item?.headers ?? item?.Headers ?? request?.headers ?? request?.Headers,
    queryParams:
      item?.queryParams ??
      item?.QueryParams ??
      request?.queryParams ??
      request?.QueryParams,
    expectedStatus:
      item?.expectedStatus ??
      item?.ExpectedStatus ??
      item?.expectedStatusCode ??
      item?.ExpectedStatusCode ??
      200,
    expectedResponse: item?.expectedResponse ?? item?.ExpectedResponse,
    assertions: item?.assertions ?? item?.Assertions ?? [],
    testType: item?.testType || item?.TestType || item?.testCategory || item?.TestCategory || "",
    priority: item?.priority || item?.Priority || "",
    isEnabled: item?.isEnabled ?? item?.IsEnabled ?? true,
    tags: item?.tags || item?.Tags || [],
    request: {
      httpMethod: request?.httpMethod || request?.HttpMethod,
      url: request?.url || request?.Url,
      headers: request?.headers || request?.Headers,
      pathParams: request?.pathParams || request?.PathParams,
      queryParams: request?.queryParams || request?.QueryParams,
      bodyType: request?.bodyType || request?.BodyType,
      body: request?.body || request?.Body,
      timeout: request?.timeout || request?.Timeout,
    },
    expectation: {
      expectedStatus: expectation?.expectedStatus || expectation?.ExpectedStatus,
      responseSchema: expectation?.responseSchema || expectation?.ResponseSchema,
      headerChecks: expectation?.headerChecks || expectation?.HeaderChecks,
      bodyContains: expectation?.bodyContains || expectation?.BodyContains,
      bodyNotContains: expectation?.bodyNotContains || expectation?.BodyNotContains,
      jsonPathChecks: expectation?.jsonPathChecks || expectation?.JsonPathChecks,
      maxResponseTime: expectation?.maxResponseTime ?? expectation?.MaxResponseTime,
    },
    variables: (item?.variables || item?.Variables || []).map((v: any) => ({
      variableName: v?.variableName || v?.VariableName,
      extractFrom: v?.extractFrom || v?.ExtractFrom,
      jsonPath: v?.jsonPath || v?.JsonPath,
      headerName: v?.headerName || v?.HeaderName,
      regex: v?.regex || v?.Regex,
      defaultValue: v?.defaultValue || v?.DefaultValue,
    })),
    isActive: item?.isActive ?? item?.IsActive ?? true,
    order:
      item?.order ?? item?.Order ?? item?.orderIndex ?? item?.OrderIndex ?? 0,
    createdAt:
      item?.createdAt ||
      item?.CreatedAt ||
      item?.createdDateTime ||
      item?.CreatedDateTime ||
      new Date().toISOString(),
    updatedAt:
      item?.updatedAt ||
      item?.UpdatedAt ||
      item?.updatedDateTime ||
      item?.UpdatedDateTime ||
      new Date().toISOString(),
  };
};

// Normalize string enum fields to numeric values expected by the backend
const normalizeEnumsForRequest = (payload: any) => {
  if (!payload || typeof payload !== "object") return payload;

  const clone = JSON.parse(JSON.stringify(payload));

  const mapByKey = (val: any, map: Record<string, number>) => {
    if (val === undefined || val === null) return val;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
      const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
      return map[key] ?? val;
    }
    return val;
  };

  const testTypeMap: Record<string, number> = {
    happypath: 0,
    boundary: 1,
    negative: 2,
    performance: 3,
    security: 4,
  };

  const priorityMap: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const httpMethodMap: Record<string, number> = {
    get: 0,
    post: 1,
    put: 2,
    delete: 3,
    patch: 4,
    head: 5,
    options: 6,
  };

  const bodyTypeMap: Record<string, number> = {
    none: 0,
    json: 1,
    formdata: 2,
    urlencoded: 3,
    raw: 4,
    binary: 5,
  };

  const extractFromMap: Record<string, number> = {
    responsebody: 0,
    responseheader: 1,
    status: 2,
    requestbody: 3,
  };

  if (clone.testType !== undefined) {
    clone.testType = mapByKey(clone.testType, testTypeMap);
  }

  if (clone.priority !== undefined) {
    clone.priority = mapByKey(clone.priority, priorityMap);
  }

  if (clone.request) {
    if (clone.request.httpMethod !== undefined) {
      clone.request.httpMethod = mapByKey(clone.request.httpMethod, httpMethodMap);
    }
    if (clone.request.bodyType !== undefined) {
      clone.request.bodyType = mapByKey(clone.request.bodyType, bodyTypeMap);
    }
  }

  if (Array.isArray(clone.variables)) {
    clone.variables = clone.variables.map((v: any) => {
      if (v && v.extractFrom !== undefined) {
        return { ...v, extractFrom: mapByKey(v.extractFrom, extractFromMap) };
      }
      return v;
    });
  }

  return clone;
};

const testCaseService = {
  // Get all test cases for a test suite
  getTestCases: async (
    testSuiteId: string,
    pageNumber: number = 1,
    pageSize: number = 50,
  ): Promise<TestCasesResponse> => {
    const response = await apiService.get<any>(
      `/test-suites/${testSuiteId}/test-cases`,
      {
        params: { pageNumber, pageSize },
      },
    );

    if (Array.isArray(response)) {
      const items = response.map((item) => normalizeTestCase(item));
      return {
        items,
        totalCount: items.length,
        pageNumber,
        pageSize,
        totalPages: 1,
      };
    }

    if (response && Array.isArray(response.items)) {
      const items = response.items.map((item: any) => normalizeTestCase(item));
      return {
        items,
        totalCount: response.totalCount ?? response.TotalCount ?? items.length,
        pageNumber: response.pageNumber ?? response.PageNumber ?? pageNumber,
        pageSize: response.pageSize ?? response.PageSize ?? pageSize,
        totalPages: response.totalPages ?? response.TotalPages ?? 1,
      };
    }

    if (response && Array.isArray(response.Items)) {
      const items = response.Items.map((item: any) => normalizeTestCase(item));
      return {
        items,
        totalCount: response.totalCount ?? response.TotalCount ?? items.length,
        pageNumber: response.pageNumber ?? response.PageNumber ?? pageNumber,
        pageSize: response.pageSize ?? response.PageSize ?? pageSize,
        totalPages: response.totalPages ?? response.TotalPages ?? 1,
      };
    }

    return {
      items: [],
      totalCount: 0,
      pageNumber,
      pageSize,
      totalPages: 0,
    };
  },

  // Get test case by ID
  getTestCaseById: async (
    testSuiteId: string,
    testCaseId: string,
  ): Promise<TestCase> => {
    const response = await apiService.get<any>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}`,
    );
    return normalizeTestCase(response);
  },

  // Create test case
  createTestCase: async (data: CreateTestCaseRequest): Promise<TestCase> => {
    const { testSuiteId, ...payload } = data;
    const response = await apiService.post<any>(
      `/test-suites/${testSuiteId}/test-cases`,
      payload,
    );
    return normalizeTestCase(response);
  },

  // Update test case
  updateTestCase: async (
    testSuiteId: string,
    testCaseId: string,
    data: Partial<TestCase>,
  ): Promise<TestCase> => {
    const payload = normalizeEnumsForRequest(data as any);
    const response = await apiService.put<any>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}`,
      payload,
    );
    return normalizeTestCase(response);
  },

  // Delete test case
  deleteTestCase: async (
    testSuiteId: string,
    testCaseId: string,
  ): Promise<void> => {
    await apiService.delete(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}`,
    );
  },

  // Reorder test cases
  reorderTestCases: async (
    testSuiteId: string,
    testCaseIds: string[],
  ): Promise<void> => {
    await apiService.patch(`/test-suites/${testSuiteId}/test-cases/reorder`, {
      testCaseIds,
    });
  },

  // Clone test case
  cloneTestCase: async (
    testSuiteId: string,
    testCaseId: string,
  ): Promise<TestCase> => {
    const response = await apiService.post<any>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}/clone`,
    );
    return normalizeTestCase(response);
  },

  // Run single test case
  runTestCase: async (
    testSuiteId: string,
    testCaseId: string,
  ): Promise<any> => {
    return await apiService.post(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}/run`,
    );
  },
};

export default testCaseService;
