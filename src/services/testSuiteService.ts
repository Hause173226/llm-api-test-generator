import { apiService } from './apiService';

// Types
// BE returns TestSuiteScopeModel enums as numbers. Map them here.
const GENERATION_TYPE_MAP: Record<number, string> = { 0: 'Auto', 1: 'Manual', 2: 'LLMAssisted' };
const SUITE_STATUS_MAP: Record<number, string> = { 0: 'Draft', 1: 'Ready', 2: 'Archived' };
const APPROVAL_STATUS_MAP: Record<number, string> = { 0: 'NotApplicable', 1: 'PendingReview', 2: 'Approved', 3: 'Rejected', 4: 'ModifiedAndApproved' };

function normalizeEnum(value: any, map: Record<number, string>): string {
  if (typeof value === 'number' && map[value] !== undefined) return map[value];
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeTestSuite<T extends Record<string, any>>(suite: T): T {
  return {
    ...suite,
    generationType: normalizeEnum(suite.generationType, GENERATION_TYPE_MAP),
    status: normalizeEnum(suite.status, SUITE_STATUS_MAP),
    approvalStatus: normalizeEnum(suite.approvalStatus, APPROVAL_STATUS_MAP),
  };
}

export interface TestSuite {
  id: string;
  projectId: string;
  apiSpecId?: string;
  name: string;
  description?: string;
  generationType: 'Auto' | 'Manual' | 'LLMAssisted';
  status: 'Draft' | 'Ready' | 'Archived';
  approvalStatus: 'NotApplicable' | 'PendingReview' | 'Approved' | 'Rejected' | 'ModifiedAndApproved';
  selectedEndpointIds: string[];
  endpointBusinessContexts: Record<string, string>;
  globalBusinessRules?: string;
  selectedEndpointCount: number;
  testCaseCount: number;
  createdById: string;
  createdDateTime: string;
  updatedDateTime?: string;
  rowVersion?: string;
}

export interface CreateTestSuiteRequest {
  name: string;
  description?: string;
  apiSpecId?: string;
  generationType?: 'Auto' | 'Manual' | 'LLMAssisted';
  selectedEndpointIds?: string[];
  endpointBusinessContexts?: Record<string, string>;
  globalBusinessRules?: string;
  rowVersion?: string;
}

export interface GenerateTestSuiteRequest {
  name: string;
  specificationId: string;
  config: {
    includeHappyPath: boolean;
    includeNegative: boolean;
    includeBoundary: boolean;
    includeSecurity: boolean;
  };
}

export interface ExecuteTestSuiteRequest {
  environmentId: string;
}

export interface ExecuteTestSuiteResponse {
  testRunId: string;
  status: 'Running';
}

export interface ProposeOrderRequest {
  specificationId: string;
  selectedEndpointIds?: string[];
  source?: 'Ai' | 'User' | 'System' | 'Imported';
  reasoningNote?: string;
}

export interface OrderProposalResponse {
  proposalId?: string;
  ProposalId?: string;
  rowVersion?: string;
  RowVersion?: string;
  status?: string;
  Status?: string;
}

// Test Suite Service
class TestSuiteService {
  async getTestSuites(projectId: string): Promise<TestSuite[]> {
    const response = await apiService.get<TestSuite[]>(
      `/projects/${projectId}/test-suites`
    );
    // Backend returns array directly, not paginated response
    const items = Array.isArray(response) ? response : [];
    return items.map(normalizeTestSuite);
  }

  async getTestSuiteDetail(projectId: string, suiteId: string): Promise<TestSuite> {
    const response = await apiService.get<TestSuite>(
      `/projects/${projectId}/test-suites/${suiteId}`
    );
    return normalizeTestSuite(response);
  }

  async createTestSuite(
    projectId: string,
    data: CreateTestSuiteRequest
  ): Promise<TestSuite> {
    // Backend uses camelCase (JsonStringEnumConverter)
    const payload = {
      name: data.name,
      description: data.description || '',
      apiSpecId: data.apiSpecId,
      generationType: data.generationType || 'Auto',
      selectedEndpointIds: data.selectedEndpointIds || [],
      endpointBusinessContexts: data.endpointBusinessContexts || {},
      globalBusinessRules: data.globalBusinessRules || '',
    };

    const response = await apiService.post<TestSuite>(
      `/projects/${projectId}/test-suites`,
      payload
    );
    return normalizeTestSuite(response);
  }

  async proposeOrder(
    suiteId: string,
    data: ProposeOrderRequest,
  ): Promise<OrderProposalResponse> {
    const payload: Record<string, any> = {
      specificationId: data.specificationId,
      selectedEndpointIds: data.selectedEndpointIds || [],
      reasoningNote: data.reasoningNote || 'Auto-generated after suite creation',
    };

    if (data.source) {
      payload.source = data.source;
    }

    return await apiService.post<OrderProposalResponse>(
      `/test-suites/${suiteId}/order-proposals`,
      payload,
    );
  }

  async approveOrder(
    suiteId: string,
    proposalId: string,
    rowVersion?: string,
    reviewNotes: string = 'Auto-approved after suite creation',
  ): Promise<OrderProposalResponse> {
    return await apiService.post<OrderProposalResponse>(
      `/test-suites/${suiteId}/order-proposals/${proposalId}/approve`,
      {
        rowVersion: rowVersion,
        reviewNotes: reviewNotes,
      },
    );
  }

  /**
   * Check the order gate status before generation or LLM suggestion preview.
   * Returns whether the gate is passed (approved order exists).
   */
  async getOrderGateStatus(suiteId: string): Promise<{
    isGatePassed: boolean;
    activeProposalStatus?: number | null;
    message?: string;
  }> {
    return await apiService.get(`/test-suites/${suiteId}/order-gate-status`);
  }

  async generateTestSuite(
    projectId: string,
    data: GenerateTestSuiteRequest
  ): Promise<{ jobId: string }> {
    return await apiService.post<{ jobId: string }>(
      `/projects/${projectId}/test-suites/generate`,
      data
    );
  }

  async updateTestSuite(
    projectId: string,
    suiteId: string,
    data: Partial<CreateTestSuiteRequest>
  ): Promise<TestSuite> {
    const payload = {
      name: data.name,
      description: data.description || '',
      apiSpecId: data.apiSpecId,
      generationType: data.generationType || 'Auto',
      selectedEndpointIds: data.selectedEndpointIds || [],
      endpointBusinessContexts: data.endpointBusinessContexts || {},
      globalBusinessRules: data.globalBusinessRules || '',
      rowVersion: data.rowVersion,
    };

    return await apiService.put<TestSuite>(
      `/projects/${projectId}/test-suites/${suiteId}`,
      payload
    );
  }

  async deleteTestSuite(projectId: string, suiteId: string, rowVersion: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}/test-suites/${suiteId}?rowVersion=${encodeURIComponent(rowVersion)}`);
  }

  async executeTestSuite(
    suiteId: string,
    environmentId: string
  ): Promise<ExecuteTestSuiteResponse> {
    return await apiService.post<ExecuteTestSuiteResponse>(
      `/test-suites/${suiteId}/execute`,
      { environmentId }
    );
  }
}

export const testSuiteService = new TestSuiteService();
