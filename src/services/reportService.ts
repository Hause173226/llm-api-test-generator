import apiService from './apiService';

export interface Report {
  id: string;
  projectId: string;
  name: string;
  type: 'test_run' | 'coverage' | 'performance' | 'trend' | 'custom';
  description?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: any;
  data?: any;
  generatedAt: string;
  generatedBy: string;
}

export interface ReportsResponse {
  items: Report[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface GenerateReportRequest {
  projectId: string;
  name: string;
  type: string;
  description?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: any;
}

export interface CoverageReport {
  projectId: string;
  totalEndpoints: number;
  testedEndpoints: number;
  coveragePercentage: number;
  endpointsByMethod: Record<string, { total: number; tested: number }>;
  endpointsByTag: Record<string, { total: number; tested: number }>;
  untestedEndpoints: Array<{
    id: string;
    path: string;
    method: string;
  }>;
}

export interface TrendReport {
  projectId: string;
  period: string;
  dataPoints: Array<{
    date: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    avgDuration: number;
  }>;
}

const reportService = {
  // Get all reports for a project
  getReports: async (
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    type?: string
  ): Promise<ReportsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (type) params.type = type;

    return await apiService.get<ReportsResponse>(`/projects/${projectId}/reports`, { params });
  },

  // Get report by ID
  getReportById: async (projectId: string, reportId: string): Promise<Report> => {
    return await apiService.get<Report>(`/projects/${projectId}/reports/${reportId}`);
  },

  // Generate new report
  generateReport: async (data: GenerateReportRequest): Promise<Report> => {
    return await apiService.post<Report>(`/projects/${data.projectId}/reports/generate`, data);
  },

  // Delete report
  deleteReport: async (projectId: string, reportId: string): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/reports/${reportId}`);
  },

  // Export report
  exportReport: async (
    projectId: string,
    reportId: string,
    format: 'pdf' | 'excel' | 'json'
  ): Promise<Blob> => {
    return await apiService.downloadFile(`/projects/${projectId}/reports/${reportId}/export?format=${format}`);
  },

  // Get coverage report
  getCoverageReport: async (projectId: string): Promise<CoverageReport> => {
    return await apiService.get<CoverageReport>(`/projects/${projectId}/reports/coverage`);
  },

  // Get trend report
  getTrendReport: async (
    projectId: string,
    days: number = 30
  ): Promise<TrendReport> => {
    return await apiService.get<TrendReport>(`/projects/${projectId}/reports/trend`, {
      params: { days },
    });
  },

  // Get performance report
  getPerformanceReport: async (projectId: string, testRunId?: string): Promise<any> => {
    const params = testRunId ? { testRunId } : {};
    return await apiService.get(`/projects/${projectId}/reports/performance`, { params });
  },

  // Schedule report generation
  scheduleReport: async (
    projectId: string,
    data: {
      name: string;
      type: string;
      schedule: string; // cron expression
      recipients: string[];
      format: string;
    }
  ): Promise<any> => {
    return await apiService.post(`/projects/${projectId}/reports/schedule`, data);
  },
};

export default reportService;
