import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  MoreVertical,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  StopCircle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useTestRuns } from "../hooks/useTestRuns";
import { useTestSuites } from "../hooks/useTestSuites";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { signalRService } from "../services/signalrService";

export default function TestRunsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageSize = 20;

  const {
    testRuns,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch,
    startTestRun,
    cancelTestRun,
    retryFailedTests,
    exportResults,
  } = useTestRuns(projectId || "", currentPage, pageSize, statusFilter);

  const { testSuites } = useTestSuites(projectId || "", 1, 100);

  // Connect to SignalR for real-time updates
  useEffect(() => {
    signalRService.connect().catch(console.error);

    const handleTestRunUpdate = () => {
      refetch();
    };

    signalRService.on("TestRunStatusChanged", handleTestRunUpdate);
    signalRService.on("TestCaseCompleted", handleTestRunUpdate);

    return () => {
      signalRService.off("TestRunStatusChanged", handleTestRunUpdate);
      signalRService.off("TestCaseCompleted", handleTestRunUpdate);
    };
  }, [refetch]);

  const handleStartTestRun = async () => {
    if (!selectedTestSuiteId) {
      showErrorToast("Please select a test suite");
      return;
    }

    try {
      setIsSubmitting(true);
      await startTestRun({ testSuiteId: selectedTestSuiteId });
      showSuccessToast("Test run started successfully");
      setIsStartModalOpen(false);
      setSelectedTestSuiteId("");
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (testRunId: string) => {
    try {
      await cancelTestRun(testRunId);
      showSuccessToast("Test run cancelled");
    } catch (err) {
      showErrorToast(handleError(err));
    }
  };

  const handleRetry = async (testRunId: string) => {
    try {
      await retryFailedTests(testRunId);
      showSuccessToast("Retrying failed tests");
    } catch (err) {
      showErrorToast(handleError(err));
    }
  };

  const handleExport = async (
    testRunId: string,
    format: "json" | "csv" | "html",
  ) => {
    try {
      const blob = await exportResults(testRunId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-run-${testRunId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccessToast("Export downloaded");
    } catch (err) {
      showErrorToast(handleError(err));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "passed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400";
      case "failed":
        return "bg-error-container dark:bg-rose-900/30 text-on-error-container dark:text-rose-400";
      case "running":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      case "cancelled":
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "passed":
        return "bg-emerald-500";
      case "failed":
        return "bg-error";
      case "running":
        return "bg-blue-500 animate-pulse";
      case "pending":
        return "bg-amber-500";
      case "cancelled":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate stats
  const stats = {
    total: totalCount,
    passed: testRuns.filter(
      (r) => r.status === "completed" && r.failedTests === 0,
    ).length,
    failed: testRuns.filter((r) => r.failedTests > 0).length,
    avgDuration:
      testRuns.length > 0
        ? formatDuration(
            testRuns.reduce((sum, r) => sum + (r.duration || 0), 0) /
              testRuns.length,
          )
        : "N/A",
  };

  if (error) {
    return (
      <MainLayout title={t("testRuns.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testRuns.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testRuns.title")}
            </h1>
            <p className="text-on-surface-variant">{t("testRuns.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-5 h-5" />
              {t("testRuns.runNew")}
            </button>
          </div>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-primary dark:text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Total Runs
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Passed
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.passed}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-error dark:text-rose-400">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Failed
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.failed}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Avg Duration
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.avgDuration}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
              placeholder="Search test runs..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
              Status
            </span>
            {["All", "Running", "Completed", "Failed"].map((s) => (
              <button
                key={s}
                onClick={() =>
                  setStatusFilter(s === "All" ? "" : s.toLowerCase())
                }
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  (s === "All" && !statusFilter) ||
                    s.toLowerCase() === statusFilter
                    ? "bg-primary dark:bg-indigo-600 text-on-primary"
                    : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Runs Table */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 dark:bg-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Run ID
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Test Suite
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Tests
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Duration
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : testRuns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-12 text-center text-on-surface-variant"
                    >
                      No test runs found
                    </td>
                  </tr>
                ) : (
                  testRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">
                            {run.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            {formatDate(run.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">
                            Test Suite #{run.testSuiteId.substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            By {run.triggeredBy}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold",
                            getStatusColor(run.status),
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              getStatusIcon(run.status),
                            )}
                          ></span>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-mono font-bold text-on-surface">
                          {run.passedTests + run.failedTests + run.skippedTests}
                          /{run.totalTests}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-medium text-on-surface-variant">
                          {formatDuration(run.duration)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {run.status === "running" && (
                            <button
                              onClick={() => handleCancel(run.id)}
                              className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors text-error"
                              title="Cancel"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                          )}
                          {run.status === "completed" &&
                            run.failedTests > 0 && (
                              <button
                                onClick={() => handleRetry(run.id)}
                                className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors text-amber-500"
                                title="Retry Failed"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          <button
                            onClick={() => navigate(`/test-runs/${run.id}`)}
                            className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary dark:hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            View
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/30 dark:bg-slate-800/30">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Showing{" "}
                {testRuns.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-on-surface" />
                </button>
                <span className="text-sm font-medium text-on-surface px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start Test Run Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => {
          setIsStartModalOpen(false);
          setSelectedTestSuiteId("");
        }}
        title="Start New Test Run"
        footer={
          <>
            <button
              onClick={() => {
                setIsStartModalOpen(false);
                setSelectedTestSuiteId("");
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartTestRun}
              disabled={isSubmitting || !selectedTestSuiteId}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Run
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Select Test Suite
            </label>
            <select
              value={selectedTestSuiteId}
              onChange={(e) => setSelectedTestSuiteId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
            >
              <option value="">Choose a test suite...</option>
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.totalTestCases || 0} test cases)
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-on-surface-variant">
            The test run will execute all test cases in the selected suite.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
