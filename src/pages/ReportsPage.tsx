import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Plus, Loader2 } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useReports } from "../hooks/useReports";
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";
import Skeleton from "../components/ui/Skeleton";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import { useProject } from "../contexts/ProjectContext";
import apiService from "../services/apiService";
import GlobalSpinner from "../components/ui/GlobalSpinner";

interface SuiteSummary {
  id: string;
  name: string;
}
interface RunSummary {
  id: string;
  runNumber?: number;
  status?: string;
  startedAt?: string;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("reports.title"));
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";

  // --- suite / run picker state ---
  const [suites, setSuites] = useState<SuiteSummary[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [loadingSuites, setLoadingSuites] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Fetch suites for project
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoadingSuites(true);
      try {
        const res = await apiService.get<any>(
          `/projects/${projectId}/test-suites`,
        );
        const items: SuiteSummary[] = Array.isArray(res)
          ? res
          : (res?.items ?? []);
        if (!cancelled) {
          setSuites(items);
          if (items.length > 0 && !selectedSuiteId)
            setSelectedSuiteId(items[0].id);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoadingSuites(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Fetch runs for selected suite
  useEffect(() => {
    if (!selectedSuiteId) {
      setRuns([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRuns(true);
      try {
        const res = await apiService.get<any>(
          `/test-suites/${selectedSuiteId}/test-runs`,
        );
        const items: RunSummary[] = Array.isArray(res)
          ? res
          : (res?.items ?? []);
        if (!cancelled) {
          setRuns(items);
          if (items.length > 0) setSelectedRunId(items[0].id);
          else setSelectedRunId("");
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoadingRuns(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSuiteId]);

  // --- report hook (FE-10 run-level) ---
  const { reports, loading, generating, generateReport, downloadReport } =
    useReports(selectedSuiteId, selectedRunId);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reportType: "Summary",
    format: "PDF",
  });

  const handleGenerate = async () => {
    if (!selectedSuiteId || !selectedRunId) {
      showErrorToast(
        t(
          "reports.errors.selectRunFirst",
          "Please select a test suite and run first",
        ),
      );
      return;
    }

    const success = await generateReport({
      suiteId: selectedSuiteId,
      runId: selectedRunId,
      reportType: formData.reportType,
      format: formData.format,
    });

    if (success) {
      showSuccessToast(t("reports.success.generated"));
      setShowGenerateModal(false);
      setFormData({ reportType: "Summary", format: "PDF" });
    }
  };

  const handleDownload = async (reportId: string) => {
    setDownloadingId(reportId);
    const success = await downloadReport(reportId);
    setDownloadingId(null);
    if (success) showSuccessToast(t("reports.success.exported"));
  };

  if (loading && selectedRunId) {
    return (
      <MainLayout title={t("reports.title")} breadcrumbs={breadcrumbs}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("reports.title")} breadcrumbs={breadcrumbs}>
      {generating && (
        <GlobalSpinner
          label={t("reports.generating", "Generating report...")}
        />
      )}
      <div className="space-y-10">
        {/* Header + selectors */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("reports.title")}
            </h1>
            <p className="text-on-surface-variant">{t("reports.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Suite picker */}
            <select
              value={selectedSuiteId}
              onChange={(e) => {
                setSelectedSuiteId(e.target.value);
                setSelectedRunId("");
              }}
              disabled={loadingSuites}
              className="px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              <option value="">
                {loadingSuites ? "Loading suites..." : "Select test suite"}
              </option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {/* Run picker */}
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              disabled={loadingRuns || !selectedSuiteId}
              className="px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              <option value="">
                {loadingRuns ? "Loading runs..." : "Select test run"}
              </option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  Run #{r.runNumber ?? "?"} – {r.status ?? ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={!selectedRunId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {t("reports.generate")}
            </button>
          </div>
        </header>

        {/* Prompt to select run */}
        {!selectedRunId && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-on-surface-variant mx-auto mb-4" />
            <h4 className="text-lg font-bold text-on-surface mb-2">
              {t(
                "reports.empty.selectRun",
                "Select a test suite and run to view reports",
              )}
            </h4>
          </div>
        )}

        {/* Reports List */}
        {selectedRunId && (
          <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                {t("reports.generated.title")}
              </h3>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-on-surface-variant mx-auto mb-4" />
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  {t("reports.empty.title")}
                </h4>
                <p className="text-on-surface-variant">
                  {t("reports.empty.desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-6 bg-surface-container-low rounded-2xl flex items-center justify-between group hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">
                          {report.name || report.reportType}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {report.format} •{" "}
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(report.id)}
                      disabled={downloadingId === report.id}
                      className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {downloadingId === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {t("reports.export")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Generate Report Modal (FE-10 contract fields) */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {t("reports.generate")}
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Report Type
                </label>
                <select
                  value={formData.reportType}
                  onChange={(e) =>
                    setFormData({ ...formData, reportType: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                >
                  {/* <option value="Summary">Summary</option>
                  <option value="Detailed">Detailed</option> */}
                  <option value="Coverage">Coverage</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) =>
                    setFormData({ ...formData, format: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                >
                  {/* <option value="PDF">PDF</option> */}
                  <option value="JSON">JSON</option>
                  <option value="HTML">HTML</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {generating ? t("common.generating") : t("common.generate")}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
