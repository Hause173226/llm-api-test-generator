import apiService from "./apiService";

export type SrsSourceType = 0 | 1 | 2;
export type SrsAnalysisStatus = 0 | 1 | 2 | 3;
export type SrsAnalysisJobStatus = 0 | 1 | 2 | 3 | 4;
export type SrsAnalysisJobType = 0 | 1;
export type SrsRequirementType = 0 | 1 | 2 | 3 | 4;

export interface SrsDocument {
  id: string;
  projectId: string;
  testSuiteId?: string | null;
  title: string;
  sourceType: SrsSourceType;
  rawContent?: string | null;
  storageFileId?: string | null;
  analysisStatus: SrsAnalysisStatus;
  analyzedAt?: string | null;
  createdById?: string;
  createdDateTime: string;
  updatedDateTime?: string | null;
  requirements?: SrsRequirement[];
  /** ID of the most recent analysis job — populated by BE to allow FE to resume polling after page refresh */
  latestJobId?: string | null;
}

export interface SrsAnalysisJob {
  id: string;
  srsDocumentId: string;
  status: SrsAnalysisJobStatus;
  jobType: SrsAnalysisJobType;
  triggeredById?: string;
  queuedAt: string;
  triggeredAt?: string | null;
  completedAt?: string | null;
  requirementsExtracted?: number | null;
  errorMessage?: string | null;
}

export interface SrsRequirement {
  id: string;
  srsDocumentId: string;
  requirementCode?: string;
  title: string;
  description?: string;
  requirementType: SrsRequirementType;
  testableConstraints?: string | null;
  assumptions?: string | null;
  ambiguities?: string | null;
  confidenceScore?: number | null;
  endpointId?: string | null;
  mappedEndpointPath?: string | null;
  displayOrder?: number;
  isReviewed?: boolean;
  refinedConstraints?: string | null;
  refinedConfidenceScore?: number | null;
  refinementRound?: number;
}

export interface SrsClarification {
  id: string;
  srsRequirementId: string;
  ambiguitySource: string;
  question: string;
  suggestedOptions?: string | null;
  userAnswer?: string | null;
  isAnswered: boolean;
  isCritical: boolean;
  displayOrder: number;
  answeredAt?: string | null;
  answeredById?: string | null;
}

const normalizeArray = <T>(value: any): T[] => (Array.isArray(value) ? value : []);

const normalizeDocument = (doc: any): SrsDocument => ({
  ...doc,
  requirements: normalizeArray<SrsRequirement>(doc?.requirements),
  latestJobId: doc?.latestJobId ?? null,
});

class SrsService {
  async createDocument(projectId: string, data: {
    title: string;
    sourceType: SrsSourceType;
    rawContent?: string | null;
    storageFileId?: string | null;
    testSuiteId?: string | null;
  }): Promise<SrsDocument> {
    return await apiService.post<SrsDocument>(`/projects/${projectId}/srs-documents`, {
      title: data.title,
      sourceType: data.sourceType,
      rawContent: data.rawContent ?? null,
      storageFileId: data.storageFileId ?? null,
      testSuiteId: data.testSuiteId ?? null,
    });
  }

  async listDocuments(projectId: string): Promise<SrsDocument[]> {
    const response = await apiService.get<any>(`/projects/${projectId}/srs-documents`);
    return normalizeArray<SrsDocument>(response).map(normalizeDocument);
  }

  async getDocument(projectId: string, srsDocumentId: string): Promise<SrsDocument> {
    const response = await apiService.get<any>(`/projects/${projectId}/srs-documents/${srsDocumentId}`);
    return normalizeDocument(response);
  }

  async deleteDocument(projectId: string, srsDocumentId: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}/srs-documents/${srsDocumentId}`);
  }

  async analyzeDocument(projectId: string, srsDocumentId: string): Promise<{ jobId: string; message?: string }> {
    return await apiService.post(`/projects/${projectId}/srs-documents/${srsDocumentId}/analyze`);
  }

  async refineRequirement(projectId: string, srsDocumentId: string, requirementId: string): Promise<{ jobId: string; message?: string }> {
    return await apiService.post(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements/${requirementId}/refine`);
  }

  async getAnalysisJob(projectId: string, srsDocumentId: string, jobId: string): Promise<SrsAnalysisJob> {
    return await apiService.get<SrsAnalysisJob>(`/projects/${projectId}/srs-documents/${srsDocumentId}/analysis-jobs/${jobId}`);
  }

  async listRequirements(projectId: string, srsDocumentId: string, query?: {
    requirementType?: number | null;
    isReviewed?: boolean | null;
    endpointId?: string | null;
  }): Promise<SrsRequirement[]> {
    return await apiService.get<SrsRequirement[]>(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements`, {
      params: query as any,
    });
  }

  async linkTestSuite(projectId: string, srsDocumentId: string, testSuiteId: string | null): Promise<SrsDocument> {
    return await apiService.patch<SrsDocument>(`/projects/${projectId}/srs-documents/${srsDocumentId}`, {
      testSuiteId: testSuiteId ?? null,
      clearTestSuiteId: testSuiteId === null,
    });
  }

  async addRequirement(projectId: string, srsDocumentId: string, data: {
    title: string;
    description?: string | null;
    requirementType?: number;
    testableConstraints?: string | null;
    endpointId?: string | null;
  }): Promise<SrsRequirement> {
    return await apiService.post<SrsRequirement>(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements`, data);
  }

  async deleteRequirement(projectId: string, srsDocumentId: string, requirementId: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements/${requirementId}`);
  }

  async updateRequirement(projectId: string, srsDocumentId: string, requirementId: string, data: Partial<Pick<SrsRequirement, "title" | "testableConstraints" | "endpointId" | "isReviewed">> & { clearEndpointId?: boolean }): Promise<SrsRequirement> {
    return await apiService.patch<SrsRequirement>(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements/${requirementId}`, data);
  }

  async createTraceabilityLink(projectId: string, suiteId: string, data: { testCaseId: string; srsRequirementId: string }): Promise<{ id: string; testCaseId: string; testCaseName: string; srsRequirementId: string; requirementCode: string; traceabilityScore: number | null; mappingRationale: string }> {
    return await apiService.post(`/projects/${projectId}/test-suites/${suiteId}/traceability/links`, data);
  }

  async deleteTraceabilityLink(projectId: string, suiteId: string, linkId: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}/test-suites/${suiteId}/traceability/links/${linkId}`);
  }

  async listClarifications(projectId: string, srsDocumentId: string, requirementId: string): Promise<SrsClarification[]> {
    return await apiService.get<SrsClarification[]>(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements/${requirementId}/clarifications`);
  }

  async answerClarification(projectId: string, srsDocumentId: string, requirementId: string, clarificationId: string, userAnswer: string): Promise<SrsClarification> {
    return await apiService.patch<SrsClarification>(`/projects/${projectId}/srs-documents/${srsDocumentId}/requirements/${requirementId}/clarifications/${clarificationId}`, { userAnswer });
  }

  async getTraceability(projectId: string, suiteId: string, testRunId?: string | null): Promise<any> {
    return await apiService.get<any>(`/projects/${projectId}/test-suites/${suiteId}/traceability`, {
      params: testRunId ? { testRunId } : undefined,
    });
  }
}

export const srsService = new SrsService();
export default srsService;
