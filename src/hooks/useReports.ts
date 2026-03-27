import { useState, useEffect } from 'react';
import reportService, { Report, GenerateReportRequest, CoverageReport, TrendReport } from '../services/reportService';
import { handleError } from '../utils/errorHandler';

export const useReports = (projectId: string, type?: string) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [coverageReport, setCoverageReport] = useState<CoverageReport | null>(null);
  const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchReports = async (page: number = 1) => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await reportService.getReports(projectId, page, pagination.pageSize, type);
      setReports(response.items);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
      });
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoverageReport = async () => {
    if (!projectId) return;
    try {
      const data = await reportService.getCoverageReport(projectId);
      setCoverageReport(data);
    } catch (err) {
      handleError(err);
    }
  };

  const fetchTrendReport = async (days: number = 30) => {
    if (!projectId) return;
    try {
      const data = await reportService.getTrendReport(projectId, days);
      setTrendReport(data);
    } catch (err) {
      handleError(err);
    }
  };

  const fetchPerformanceReport = async (testRunId?: string) => {
    if (!projectId) return;
    try {
      const data = await reportService.getPerformanceReport(projectId, testRunId);
      setPerformanceReport(data);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchReports();
      fetchCoverageReport();
      fetchTrendReport();
      fetchPerformanceReport();
    }
  }, [projectId, type]);

  const generateReport = async (data: GenerateReportRequest): Promise<boolean> => {
    try {
      setGenerating(true);
      const newReport = await reportService.generateReport(data);
      setReports(prev => [newReport, ...prev]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
      await reportService.deleteReport(projectId, reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const exportReport = async (reportId: string, format: 'pdf' | 'excel' | 'json'): Promise<boolean> => {
    try {
      const blob = await reportService.exportReport(projectId, reportId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const changePage = (page: number) => {
    fetchReports(page);
  };

  return {
    reports,
    coverageReport,
    trendReport,
    performanceReport,
    loading,
    generating,
    error,
    pagination,
    generateReport,
    deleteReport,
    exportReport,
    changePage,
    refetch: fetchReports,
    refetchCoverage: fetchCoverageReport,
    refetchTrend: fetchTrendReport,
    refetchPerformance: fetchPerformanceReport,
  };
};
