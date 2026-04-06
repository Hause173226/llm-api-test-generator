import { apiService } from './apiService';

// Types
export interface TestSuite {
  id: string;
  projectId: string;
  apiSpecId?: string;
  name: string;
  description?: string;
  generationType: 'Auto' | 'Manual';
  status: 'Draft' | 'Active' | 'Archived';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
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
  apiSpecId: string;
  generationType?: 'Auto' | 'Manual';
  selectedEndpointIds: string[];
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
    return Array.isArray(response) ? response : [];
  }

  async getTestSuiteDetail(projectId: string, suiteId: string): Promise<TestSuite> {
    const response = await apiService.get<TestSuite>(
      `/projects/${projectId}/test-suites/${suiteId}`
    );
    return response;
  }

  async createTestSuite(
    projectId: string,
    data: CreateTestSuiteRequest
  ): Promise<TestSuite> {
    // Backend expects PascalCase
    const payload = {
      Name: data.name,
      Description: data.description || '',
      ApiSpecId: data.apiSpecId,
      GenerationType: data.generationType || 'Auto',
      SelectedEndpointIds: data.selectedEndpointIds,
      EndpointBusinessContexts: data.endpointBusinessContexts || {},
      GlobalBusinessRules: data.globalBusinessRules || '',
    };
    
    return await apiService.post<TestSuite>(
      `/projects/${projectId}/test-suites`,
      payload
    );
  }

  async proposeOrder(
    suiteId: string,
    data: ProposeOrderRequest,
  ): Promise<OrderProposalResponse> {
    return await apiService.post<OrderProposalResponse>(
      `/test-suites/${suiteId}/order-proposals`,
      {
        SpecificationId: data.specificationId,
        SelectedEndpointIds: data.selectedEndpointIds || [],
        Source: data.source || 'System',
        ReasoningNote: data.reasoningNote || 'Auto-generated after suite creation',
      },
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
        RowVersion: rowVersion,
        ReviewNotes: reviewNotes,
      },
    );
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
    // Backend expects PascalCase
    const payload = {
      Name: data.name,
      Description: data.description || '',
      ApiSpecId: data.apiSpecId,
      GenerationType: data.generationType || 'Auto',
      SelectedEndpointIds: data.selectedEndpointIds || [],
      EndpointBusinessContexts: data.endpointBusinessContexts || {},
      GlobalBusinessRules: data.globalBusinessRules || '',
      RowVersion: data.rowVersion,
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
