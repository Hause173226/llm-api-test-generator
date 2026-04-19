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

export interface CreateTestCaseRequest {
  testSuiteId: string;
  name: string;
  description?: string;
  endpointId: string;
  requestBody?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  expectedStatus: number;
  expectedResponse?: any;
  assertions?: any[];
}

const normalizeTestCase = (item: any): TestCase => {
  const request = item?.request || item?.Request || {};

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
    const response = await apiService.post<any>(
      `/test-suites/${data.testSuiteId}/test-cases`,
      data,
    );
    return normalizeTestCase(response);
  },

  // Update test case
  updateTestCase: async (
    testSuiteId: string,
    testCaseId: string,
    data: Partial<TestCase>,
  ): Promise<TestCase> => {
    const response = await apiService.put<any>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}`,
      data,
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
