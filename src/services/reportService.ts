import apiService from "./apiService";

// ---------- Types aligned with FE-10 contract ----------

export interface CoverageMetric {
  testRunId?: string;
  totalEndpoints: number;
  testedEndpoints: number;
  coveragePercent: number;
  byMethod: Record<string, number>;
  byTag: Record<string, number>;
  uncoveredPaths: string[];
  calculatedAt?: string;
}

export interface Report {
  id: string;
  testRunId?: string;
  testSuiteId?: string;
  reportType: string;
  format: string;
  status?: string;
  generatedAt: string;
  downloadUrl?: string;
  expiresAt?: string | null;
  coverage?: CoverageMetric | null;
  recentHistoryLimit?: number;
  // Keep backward-compat display fields
  name?: string;
  type?: string;
}

export interface ReportsResponse {
  items: Report[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

/**
 * FE-10 contract: POST body for generating a report under a specific test run.
 * Required: reportType, format
 * Optional: recentHistoryLimit
 */
export interface GenerateReportRequest {
  suiteId: string;
  runId: string;
  reportType: string;
  format: string;
  recentHistoryLimit?: number;
}

// ---------- Service (FE-10 run-level routes) ----------

const reportService = {
  /**
   * List reports for a specific test run.
   * GET /test-suites/{suiteId}/test-runs/{runId}/reports
   */
  getReports: async (
    suiteId: string,
    runId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
  ): Promise<ReportsResponse> => {
    const params: Record<string, any> = { pageNumber, pageSize };
    const response = await apiService.get<any>(
      `/test-suites/${suiteId}/test-runs/${runId}/reports`,
      { params },
    );

    // Normalise – backend may return an array or a paged envelope
    if (Array.isArray(response)) {
      return {
        items: response,
        totalCount: response.length,
        pageNumber: 1,
        pageSize: response.length,
        totalPages: 1,
      };
    }
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      totalCount: response?.totalCount ?? 0,
      pageNumber: response?.pageNumber ?? pageNumber,
      pageSize: response?.pageSize ?? pageSize,
      totalPages: response?.totalPages ?? 1,
    };
  },

  /**
   * Get a single report.
   * GET /test-suites/{suiteId}/test-runs/{runId}/reports/{reportId}
   */
  getReportById: async (
    suiteId: string,
    runId: string,
    reportId: string,
  ): Promise<Report> => {
    return await apiService.get<Report>(
      `/test-suites/${suiteId}/test-runs/${runId}/reports/${reportId}`,
    );
  },

  /**
   * Generate a new report for a test run.
   * POST /test-suites/{suiteId}/test-runs/{runId}/reports
   * Body: { reportType, format, recentHistoryLimit? }
   */
  generateReport: async (data: GenerateReportRequest): Promise<Report> => {
    return await apiService.post<Report>(
      `/test-suites/${data.suiteId}/test-runs/${data.runId}/reports`,
      {
        reportType: data.reportType,
        format: data.format,
        ...(data.recentHistoryLimit != null && {
          recentHistoryLimit: data.recentHistoryLimit,
        }),
      },
    );
  },

  /**
   * Download a report, returning the file blob and server-provided filename.
   * GET /test-suites/{suiteId}/test-runs/{runId}/reports/{reportId}/download
   */
  downloadReport: async (
    suiteId: string,
    runId: string,
    reportId: string,
  ): Promise<{ blob: Blob; filename?: string }> => {
    return await apiService.downloadFileWithMeta(
      `/test-suites/${suiteId}/test-runs/${runId}/reports/${reportId}/download`,
    );
  },
};

export default reportService;
