import apiService from './apiService';

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

const testCaseService = {
  // Get all test cases for a test suite
  getTestCases: async (
    testSuiteId: string,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Promise<TestCasesResponse> => {
    const response = await apiService.get<any>(`/test-suites/${testSuiteId}/test-cases`, {
      params: { pageNumber, pageSize },
    });

    // Backend shape can be either raw array or paged object.
    if (Array.isArray(response)) {
      return {
        items: response,
        totalCount: response.length,
        pageNumber,
        pageSize,
        totalPages: 1,
      };
    }

    if (response && Array.isArray(response.items)) {
      return {
        items: response.items,
        totalCount: response.totalCount ?? response.items.length,
        pageNumber: response.pageNumber ?? pageNumber,
        pageSize: response.pageSize ?? pageSize,
        totalPages: response.totalPages ?? 1,
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
  getTestCaseById: async (testSuiteId: string, testCaseId: string): Promise<TestCase> => {
    return await apiService.get<TestCase>(`/test-suites/${testSuiteId}/test-cases/${testCaseId}`);
  },

  // Create test case
  createTestCase: async (data: CreateTestCaseRequest): Promise<TestCase> => {
    return await apiService.post<TestCase>(`/test-suites/${data.testSuiteId}/test-cases`, data);
  },

  // Update test case
  updateTestCase: async (
    testSuiteId: string,
    testCaseId: string,
    data: Partial<TestCase>
  ): Promise<TestCase> => {
    return await apiService.put<TestCase>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}`,
      data
    );
  },

  // Delete test case
  deleteTestCase: async (testSuiteId: string, testCaseId: string): Promise<void> => {
    await apiService.delete(`/test-suites/${testSuiteId}/test-cases/${testCaseId}`);
  },

  // Reorder test cases
  reorderTestCases: async (
    testSuiteId: string,
    testCaseIds: string[]
  ): Promise<void> => {
    await apiService.post(`/test-suites/${testSuiteId}/test-cases/reorder`, { testCaseIds });
  },

  // Clone test case
  cloneTestCase: async (testSuiteId: string, testCaseId: string): Promise<TestCase> => {
    return await apiService.post<TestCase>(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}/clone`
    );
  },

  // Run single test case
  runTestCase: async (testSuiteId: string, testCaseId: string): Promise<any> => {
    return await apiService.post(
      `/test-suites/${testSuiteId}/test-cases/${testCaseId}/run`
    );
  },
};

export default testCaseService;
