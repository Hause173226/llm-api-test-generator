import apiService from "./apiService";

export interface SuiteSuggestionQuery {
  reviewStatus?: string;
  testType?: string;
  endpointId?: string;
  includeDeleted?: boolean;
}

export interface SuiteSuggestionModel {
  id: string;
  testSuiteId: string;
  endpointId?: string;
  cacheKey?: string | null;
  displayOrder?: number;
  suggestionType?: string;
  testType?: string;
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedRequest?: string;
  suggestedExpectation?: string;
  suggestedVariables?: Array<{
    variableName?: string;
    extractFrom?: string;
    jsonPath?: string;
    headerName?: string;
    regex?: string;
    defaultValue?: string;
  }>;
  suggestedTags?: string[];
  priority?: string;
  reviewStatus?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  modifiedContent?: string;
  appliedTestCaseId?: string;
  llmModel?: string;
  tokensUsed?: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedById?: string | null;
  createdDateTime?: string;
  updatedDateTime?: string;
  rowVersion?: string;
  currentUserFeedback?: {
    signal?: string;
    notes?: string;
  } | null;
  feedbackSummary?: {
    helpfulCount?: number;
    notHelpfulCount?: number;
    totalCount?: number;
  } | null;
}

export interface GenerateSuggestionPreviewRequest {
  specificationId: string;
  forceRefresh: boolean;
  algorithmProfile?: {
    useObservationConfirmationPrompting?: boolean;
    useDependencyAwareOrdering?: boolean;
    useSchemaRelationshipAnalysis?: boolean;
    useSemanticTokenMatching?: boolean;
    useFeedbackLoopContext?: boolean;
  };
}

export interface ReviewSuggestionRequest {
  action: "Approve" | "Reject" | "Modify";
  rowVersion: string;
  reviewNotes?: string;
  modifiedContent?: {
    name?: string;
    description?: string;
    testType?: string;
    priority?: string;
    tags?: string[];
  };
}

export interface UpsertFeedbackRequest {
  signal: "Helpful" | "NotHelpful";
  notes?: string;
}

export interface BulkReviewRequest {
  action: "Approve" | "Reject";
  reviewNotes?: string;
  filterBySuggestionType?: string;
  filterByTestType?: string;
  filterByEndpointId?: string;
}

const buildQueryString = (query?: SuiteSuggestionQuery) => {
  const params = new URLSearchParams();

  if (!query) return "";

  if (query.reviewStatus) params.set("reviewStatus", query.reviewStatus);
  if (query.testType) params.set("testType", query.testType);
  if (query.endpointId) params.set("endpointId", query.endpointId);
  if (query.includeDeleted !== undefined) params.set("includeDeleted", String(query.includeDeleted));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

const testSuiteLlmSuggestionService = {
  async list(
    suiteId: string,
    query?: SuiteSuggestionQuery,
  ): Promise<SuiteSuggestionModel[]> {
    return await apiService.get<SuiteSuggestionModel[]>(
      `/test-suites/${suiteId}/llm-suggestions${buildQueryString(query)}`,
    );
  },

  async detail(suiteId: string, suggestionId: string): Promise<SuiteSuggestionModel> {
    return await apiService.get<SuiteSuggestionModel>(
      `/test-suites/${suiteId}/llm-suggestions/${suggestionId}`,
    );
  },

  async generate(
    suiteId: string,
    payload: GenerateSuggestionPreviewRequest,
  ): Promise<{ suggestions?: SuiteSuggestionModel[] }> {
    return await apiService.post<{ suggestions?: SuiteSuggestionModel[] }>(
      `/test-suites/${suiteId}/llm-suggestions/generate`,
      {
        ...payload,
        algorithmProfile: {
          useObservationConfirmationPrompting:
            payload.algorithmProfile?.useObservationConfirmationPrompting ??
            true,
          useDependencyAwareOrdering:
            payload.algorithmProfile?.useDependencyAwareOrdering ?? true,
          useSchemaRelationshipAnalysis:
            payload.algorithmProfile?.useSchemaRelationshipAnalysis ?? true,
          useSemanticTokenMatching:
            payload.algorithmProfile?.useSemanticTokenMatching ?? true,
          useFeedbackLoopContext:
            payload.algorithmProfile?.useFeedbackLoopContext ?? true,
        },
      },
    );
  },

  async review(
    suiteId: string,
    suggestionId: string,
    payload: ReviewSuggestionRequest,
  ): Promise<SuiteSuggestionModel> {
    return await apiService.put<SuiteSuggestionModel>(
      `/test-suites/${suiteId}/llm-suggestions/${suggestionId}/review`,
      payload,
    );
  },

  async upsertFeedback(
    suiteId: string,
    suggestionId: string,
    payload: UpsertFeedbackRequest,
  ): Promise<any> {
    return await apiService.put<any>(
      `/test-suites/${suiteId}/llm-suggestions/${suggestionId}/feedback`,
      payload,
    );
  },

  async bulkReview(
    suiteId: string,
    payload: BulkReviewRequest,
  ): Promise<any> {
    return await apiService.post<any>(
      `/test-suites/${suiteId}/llm-suggestions/bulk-review`,
      payload,
    );
  },
};

export default testSuiteLlmSuggestionService;
