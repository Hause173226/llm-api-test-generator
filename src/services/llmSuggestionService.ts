import apiService from './apiService';

export interface LLMSuggestion {
  id: string;
  projectId: string;
  endpointId?: string;
  type: 'test_case' | 'edge_case' | 'security' | 'performance' | 'optimization';
  title: string;
  description: string;
  suggestedTestCase?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  confidence: number; // 0-100
  reasoning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionsResponse {
  items: LLMSuggestion[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface GenerateSuggestionsRequest {
  projectId: string;
  endpointId?: string;
  types?: string[]; // Filter by suggestion types
  maxSuggestions?: number;
}

const llmSuggestionService = {
  // Get all suggestions for a project
  getSuggestions: async (
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    type?: string,
    status?: string
  ): Promise<SuggestionsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (type) params.type = type;
    if (status) params.status = status;

    return await apiService.get<SuggestionsResponse>(`/projects/${projectId}/suggestions`, { params });
  },

  // Get suggestion by ID
  getSuggestionById: async (projectId: string, suggestionId: string): Promise<LLMSuggestion> => {
    return await apiService.get<LLMSuggestion>(`/projects/${projectId}/suggestions/${suggestionId}`);
  },

  // Generate new suggestions using LLM
  generateSuggestions: async (data: GenerateSuggestionsRequest): Promise<LLMSuggestion[]> => {
    return await apiService.post<LLMSuggestion[]>(`/projects/${data.projectId}/suggestions/generate`, data);
  },

  // Accept a suggestion
  acceptSuggestion: async (projectId: string, suggestionId: string): Promise<LLMSuggestion> => {
    return await apiService.post<LLMSuggestion>(
      `/projects/${projectId}/suggestions/${suggestionId}/accept`
    );
  },

  // Reject a suggestion
  rejectSuggestion: async (
    projectId: string,
    suggestionId: string,
    reason?: string
  ): Promise<LLMSuggestion> => {
    return await apiService.post<LLMSuggestion>(
      `/projects/${projectId}/suggestions/${suggestionId}/reject`,
      { reason }
    );
  },

  // Implement a suggestion (create test case from suggestion)
  implementSuggestion: async (
    projectId: string,
    suggestionId: string,
    testSuiteId: string
  ): Promise<any> => {
    return await apiService.post(
      `/projects/${projectId}/suggestions/${suggestionId}/implement`,
      { testSuiteId }
    );
  },

  // Batch accept suggestions
  batchAcceptSuggestions: async (
    projectId: string,
    suggestionIds: string[]
  ): Promise<void> => {
    await apiService.post(`/projects/${projectId}/suggestions/batch-accept`, { suggestionIds });
  },

  // Batch reject suggestions
  batchRejectSuggestions: async (
    projectId: string,
    suggestionIds: string[]
  ): Promise<void> => {
    await apiService.post(`/projects/${projectId}/suggestions/batch-reject`, { suggestionIds });
  },

  // Get suggestion statistics
  getSuggestionStats: async (projectId: string): Promise<any> => {
    return await apiService.get(`/projects/${projectId}/suggestions/stats`);
  },
};

export default llmSuggestionService;
