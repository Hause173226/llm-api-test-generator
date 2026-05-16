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
  /** HTTP method resolved from suggestedRequest (e.g. "GET", "POST"). Avoids raw UUID display. */
  endpointMethod?: string;
  /** Endpoint path resolved from suggestedRequest (e.g. "/api/auth/register"). */
  endpointPath?: string;
  /** True if the suggestion was generated while an SRS document was linked to its TestSuite. */
  hasSrsContext?: boolean;
  /** Title of the SRS document used at generation time. */
  srsDocumentTitle?: string;
  /** UUIDs of SRS requirements this suggestion covers (as reported by the LLM). */
  coveredRequirementIds?: string[];
  /** Resolved code + title for each covered requirement. */
  coveredRequirements?: Array<{ id: string; code: string; title: string }>;
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
    enableBoundary?: boolean;
    enableNegative?: boolean;
    enableSecurity?: boolean;
    enablePerformance?: boolean;
  };
}

export type GenerationJobStatus =
  | "Queued"
  | "Triggering"
  | "WaitingForCallback"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface GenerateSuggestionPreviewAcceptedResponse {
  jobId: string;
  testSuiteId: string;
  mode: string;
  message: string;
}

export interface GenerationJobStatusModel {
  jobId: string;
  testSuiteId: string;
  status: GenerationJobStatus;
  queuedAt: string;
  triggeredAt?: string | null;
  completedAt?: string | null;
  testCasesGenerated?: number | null;
  errorMessage?: string | null;
  webhookName?: string | null;
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
  ): Promise<GenerateSuggestionPreviewAcceptedResponse> {
    return await apiService.post<GenerateSuggestionPreviewAcceptedResponse>(
      `/test-suites/${suiteId}/llm-suggestions/generate`,
      payload,
    );
  },

  async getGenerationStatus(
    suiteId: string,
    jobId: string,
  ): Promise<GenerationJobStatusModel> {
    return await apiService.get<GenerationJobStatusModel>(
      `/test-suites/${suiteId}/generation-status`,
      { params: { jobId } },
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

  async bulkRestore(
    suiteId: string,
    payload: { suggestionIds: string[] },
  ): Promise<any> {
    return await apiService.post<any>(
      `/test-suites/${suiteId}/llm-suggestions/bulk-restore`,
      payload,
    );
  },
  async bulkApprove(
    suiteId: string,
    payload: { suggestionIds: string[] },
  ): Promise<any> {
    return await apiService.post<any>(
      `/test-suites/${suiteId}/llm-suggestions/bulk-approve`,
      payload,
    );
  },
};

export default testSuiteLlmSuggestionService;
