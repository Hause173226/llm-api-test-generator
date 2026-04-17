import { useState, useEffect, useCallback } from "react";
import reportService, {
  Report,
  GenerateReportRequest,
} from "../services/reportService";
import { handleError } from "../utils/errorHandler";

/**
 * Hook aligned with FE-10: reports are scoped to a specific test run
 * inside a test suite – NOT project-level.
 */
export const useReports = (suiteId: string, runId: string) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchReports = useCallback(
    async (page: number = 1) => {
      if (!suiteId || !runId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await reportService.getReports(
          suiteId,
          runId,
          page,
          pagination.pageSize,
        );
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
    },
    [suiteId, runId, pagination.pageSize],
  );

  useEffect(() => {
    if (suiteId && runId) {
      fetchReports();
    }
  }, [suiteId, runId]);

  const generateReport = async (
    data: GenerateReportRequest,
  ): Promise<boolean> => {
    try {
      setGenerating(true);
      const newReport = await reportService.generateReport(data);
      setReports((prev) => [newReport, ...prev]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string): Promise<boolean> => {
    if (!suiteId || !runId) return false;
    try {
      const blob = await reportService.downloadReport(suiteId, runId, reportId);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}`;
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
    loading,
    generating,
    error,
    pagination,
    generateReport,
    downloadReport,
    changePage,
    refetch: fetchReports,
  };
};
