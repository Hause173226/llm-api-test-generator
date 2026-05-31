import React, { useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useProject } from "../contexts/ProjectContext";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import { useTestSuites } from "../hooks/useTestSuites";
import { srsService } from "../services/srsService";
import testRunService from "../services/testRunService";
import testCaseService from "../services/testCaseService";
import { handleError, showSuccessToast } from "../utils/errorHandler";
import {
  Loader2,
  ShieldCheck,
  Link2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";

const REQ_TYPE_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
];

type CoverageFilter = "all" | "covered" | "uncovered";

const VALIDATION_STATUS_COLORS: Record<number, string> = {
  0: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", // Uncovered — gray
  1: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300", // Unverified — light blue
  2: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", // Validated — green
  3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", // Violated — red
  4: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", // Partial — yellow
  5: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", // SkippedOnly
  6: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", // Inconclusive
};

const LAST_RUN_STATUS_COLORS: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  Skipped: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function CoverageBar({ percent }: { percent: number }) {
  return (
    <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800 h-2.5 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          percent >= 80
            ? "bg-emerald-500"
            : percent >= 50
              ? "bg-amber-400"
              : "bg-rose-500",
        )}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function RequirementCard({
  row,
  onAddLink,
  onDeleteLink,
  getRequirementTypeLabel,
  t,
}: {
  row: any;
  onAddLink?: () => void;
  onDeleteLink?: (linkId: string) => void;
  getRequirementTypeLabel: (type: number) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = getRequirementTypeLabel(row.requirementType);
  const typeColor =
    REQ_TYPE_COLORS[row.requirementType] ??
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const lastRunStatusLabels: Record<string, string> = {
    Passed: t("pages.TraceabilityPage.last_run_passed"),
    Failed: t("pages.TraceabilityPage.last_run_failed"),
    Skipped: t("pages.TraceabilityPage.last_run_skipped"),
  };

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm overflow-hidden",
        row.validationStatus === 3
          ? "border-rose-300 bg-rose-50/60 dark:border-rose-700/50 dark:bg-rose-950/20" // Violated — red highlight
          : "border-outline-variant/10 bg-surface-container-lowest",
      )}
    >
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wide">
                {row.requirementCode}
              </span>
              {row.requirementType != null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    typeColor,
                  )}
                >
                  {typeLabel}
                </span>
              )}
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1",
                  row.isReviewed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                )}
              >
                {row.isReviewed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {row.isReviewed
                  ? t("pages.TraceabilityPage.reviewed")
                  : t("pages.TraceabilityPage.pending_review")}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1",
                  row.isCovered
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                )}
              >
                {row.isCovered ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {row.isCovered
                  ? t("pages.TraceabilityPage.covered")
                  : t("pages.TraceabilityPage.uncovered")}
              </span>
              {row.validationStatus != null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    VALIDATION_STATUS_COLORS[row.validationStatus as number] ??
                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  )}
                >
                  {t(
                    `pages.TraceabilityPage.validation_status_${row.validationStatus}`,
                    {
                      defaultValue: t("pages.TraceabilityPage.status_with_index", {
                        status: row.validationStatus,
                      }),
                    } as any,
                  )}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-on-surface leading-snug">
              {row.title}
            </h2>
            {row.confidenceScore != null && (
              <p className="mt-1 text-xs text-on-surface-variant flex items-center gap-1">
                {row.confidenceScore < 0.6 && (
                  <AlertTriangle
                    className="w-3 h-3 text-amber-500 shrink-0"
                    aria-label={t(
                      "pages.TraceabilityPage.low_confidence_extraction",
                    )}
                  />
                )}
                {t("pages.TraceabilityPage.confidence_percent", {
                  percent: (row.confidenceScore * 100).toFixed(0),
                })}
              </p>
            )}
          </div>

          {(row.testCases || []).length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  {t("pages.TraceabilityPage.hide_test_cases")}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  {t("pages.TraceabilityPage.test_case_count", {
                    count: (row.testCases || []).length,
                  })}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (row.testCases || []).length > 0 && (
        <div className="border-t border-outline-variant/10 bg-surface-container-low/50 px-5 py-4 space-y-3">
          {(row.testCases || []).map((tc: any) => {
            const displayStatus = tc.liveStatus ?? tc.lastRunStatus;
            const displayStatusLower = (displayStatus || "").toLowerCase();
            const retryCount = (tc.liveTotalAttempts ?? 1) - 1;
            return (
              <div
                key={tc.testCaseId}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {tc.testCaseName}
                      </p>
                      {displayStatus && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            LAST_RUN_STATUS_COLORS[displayStatus] ??
                              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {lastRunStatusLabels[displayStatus] ?? displayStatus}
                        </span>
                      )}
                      {retryCount > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          {t("pages.TraceabilityPage.retrycount", {
                            retryCount,
                          })}
                        </span>
                      )}
                      {tc.hasAdaptiveWarning && (
                        <span className="shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 text-[10px] font-bold">
                          {t("pages.TraceabilityPage.warn")}
                        </span>
                      )}
                    </div>
                    {tc.mappingRationale && (
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {tc.mappingRationale}
                      </p>
                    )}
                    {/* live skip cause */}
                    {displayStatusLower === "skipped" &&
                      tc.liveSkippedCause && (
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                          {tc.liveSkippedCause}
                        </p>
                      )}
                    {/* live failure reasons (preferred over failureSummary) */}
                    {tc.liveFailureReasons &&
                    tc.liveFailureReasons.length > 0 ? (
                      <div className="mt-0.5 space-y-0.5">
                        {tc.liveFailureReasons.map((fr: any, i: number) => (
                          <p key={i} className="text-xs text-rose-600 dark:text-rose-400">
                            <span className="font-mono font-semibold">
                              {fr.code}
                            </span>
                            {fr.expected && (
                              <span className="text-on-surface-variant">
                                {t("pages.TraceabilityPage.expected")}
                                <span className="text-on-surface">
                                  {fr.expected}
                                </span>
                                {t("pages.TraceabilityPage.got")}
                                <span className="text-on-surface">
                                  {fr.actual}
                                </span>
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    ) : tc.failureSummary ? (
                      <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
                        {tc.failureSummary}
                      </p>
                    ) : null}
                  </div>
                  {tc.traceabilityScore != null && (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {(tc.traceabilityScore * 100).toFixed(0)}%
                    </span>
                  )}
                  {onDeleteLink && tc.linkId && (
                    <button
                      type="button"
                      onClick={() => onDeleteLink(tc.linkId)}
                      title={t("pages.TraceabilityPage.remove_link")}
                      className="shrink-0 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Add link CTA */}
      {onAddLink && (
        <div className="px-5 pb-4 pt-2 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={onAddLink}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("pages.TraceabilityPage.link_test_case")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TraceabilityPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const suiteId = searchParams.get("suiteId") || "";
  const testRunId = searchParams.get("testRunId") || "";
  const projectId = selectedProject?.id || "";
  const lastProjectIdRef = useRef<string | null>(null);
  const breadcrumbs = useProjectBreadcrumbs(
    t("pages.TraceabilityPage.traceability"),
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testRunDetail, setTestRunDetail] = useState<any>(null);
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      navigate("/traceability", { replace: true });
      setData(null);
      setTestRunDetail(null);
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate]);

  const { testSuites, isLoading: suitesLoading } = useTestSuites(projectId);
  const [suiteTestCases, setSuiteTestCases] = useState<any[]>([]);
  const [addLinkReqId, setAddLinkReqId] = useState<string | null>(null); // requirementId for "add link" modal
  const [addLinkTestCaseId, setAddLinkTestCaseId] = useState<string>("");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const selectedSuite = testSuites.find((s: any) => s.id === suiteId);

  useEffect(() => {
    if (!projectId || suiteId || testSuites.length === 0) return;

    const getSuiteTimestamp = (suite: (typeof testSuites)[number]) => {
      const updated = suite.updatedDateTime
        ? Date.parse(suite.updatedDateTime)
        : Number.NaN;
      if (!Number.isNaN(updated)) return updated;
      const created = suite.createdDateTime
        ? Date.parse(suite.createdDateTime)
        : Number.NaN;
      return Number.isNaN(created) ? 0 : created;
    };

    const latestSuite = testSuites.reduce((latest, suite) =>
      getSuiteTimestamp(suite) > getSuiteTimestamp(latest) ? suite : latest,
    );

    navigate(`/traceability?suiteId=${latestSuite.id}`, { replace: true });
  }, [projectId, suiteId, testSuites, navigate]);

  useEffect(() => {
    if (!projectId || !suiteId) return;
    setData(null);
    setTestRunDetail(null);
    (async () => {
      try {
        setLoading(true);
        const result = await srsService.getTraceability(
          projectId,
          suiteId,
          testRunId || null,
        );
        setData(result);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, suiteId, testRunId]);

  // Fetch test run results for JOIN when testRunId is provided
  useEffect(() => {
    if (!suiteId || !testRunId) {
      setTestRunDetail(null);
      return;
    }
    (async () => {
      try {
        const detail = await testRunService.getTestRunResults(
          suiteId,
          testRunId,
        );
        setTestRunDetail(detail);
      } catch {
        // non-critical — traceability still shows without live JOIN data
      }
    })();
  }, [suiteId, testRunId]);

  // Fetch test cases in suite for "add link" dropdown
  useEffect(() => {
    if (!suiteId) {
      setSuiteTestCases([]);
      return;
    }
    (async () => {
      try {
        const res = await testCaseService.getTestCases(suiteId, 1, 200);
        setSuiteTestCases(res.items ?? []);
      } catch {
        setSuiteTestCases([]);
      }
    })();
  }, [suiteId]);

  const reloadTraceability = async () => {
    if (!projectId || !suiteId) return;
    try {
      const result = await srsService.getTraceability(
        projectId,
        suiteId,
        testRunId || null,
      );
      setData(result);
    } catch (err) {
      handleError(err);
    }
  };

  const handleCreateLink = async () => {
    if (!projectId || !suiteId || !addLinkReqId || !addLinkTestCaseId) return;
    setIsCreatingLink(true);
    try {
      await srsService.createTraceabilityLink(projectId, suiteId, {
        testCaseId: addLinkTestCaseId,
        srsRequirementId: addLinkReqId,
      });
      showSuccessToast(t("pages.TraceabilityPage.link_created"));
      setAddLinkReqId(null);
      setAddLinkTestCaseId("");
      await reloadTraceability();
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!projectId || !suiteId) return;
    try {
      await srsService.deleteTraceabilityLink(projectId, suiteId, linkId);
      showSuccessToast(t("pages.TraceabilityPage.link_removed"));
      await reloadTraceability();
    } catch (err) {
      handleError(err);
    }
  };

  // JOIN: enrich traceability testCases with live run data
  const caseMap = useMemo(() => {
    if (!testRunDetail?.cases) return new Map<string, any>();
    return new Map<string, any>(
      testRunDetail.cases.map((c: any) => [c.testCaseId, c]),
    );
  }, [testRunDetail]);

  const enrichedRequirements = useMemo(() => {
    if (!data?.requirements) return [];
    return data.requirements.map((req: any) => ({
      ...req,
      testCases: (req.testCases || []).map((ref: any) => {
        const live = caseMap.get(ref.testCaseId);
        return {
          ...ref,
          liveStatus: live?.status ?? ref.lastRunStatus,
          liveFailureReasons: live?.failureReasons ?? [],
          liveTotalAttempts: live?.totalAttempts ?? 1,
          liveSkippedCause: live?.skippedCause ?? null,
        };
      }),
    }));
  }, [data, caseMap]);

  const hasNoSrsLink = data && data.srsDocumentId == null;
  const hasRequirements = data && (data.requirements || []).length > 0;

  const requirementTypeLabels = useMemo(
    () => [
      t("pages.TraceabilityPage.functional"),
      t("pages.TraceabilityPage.non_functional"),
      t("pages.TraceabilityPage.security"),
      t("pages.TraceabilityPage.performance"),
      t("pages.TraceabilityPage.constraint"),
    ],
    [t],
  );

  const getRequirementTypeLabel = (type: number) =>
    requirementTypeLabels[type] ?? t("pages.TraceabilityPage.type", { type });

  const filteredRequirements = enrichedRequirements.filter((r: any) => {
    if (coverageFilter === "covered") return r.isCovered;
    if (coverageFilter === "uncovered") return !r.isCovered;
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [coverageFilter, suiteId]);

  const totalFilteredRequirements = filteredRequirements.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalFilteredRequirements / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pagedRequirements = filteredRequirements.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const pageStartDisplay =
    totalFilteredRequirements === 0 ? 0 : pageStartIndex + 1;
  const pageEndDisplay = Math.min(
    pageStartIndex + pageSize,
    totalFilteredRequirements,
  );

  return (
    <MainLayout
      title={t("pages.TraceabilityPage.traceability")}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 pb-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              {t("pages.TraceabilityPage.traceability")}
            </h1>
            <p className="text-on-surface-variant">
              {t(
                "pages.TraceabilityPage.requirement_to_test_case_coverage_and_va",
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reloadTraceability()}
              disabled={!suiteId || loading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {t("pages.TraceabilityPage.refresh")}
            </button>
          </div>
        </header>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-on-surface-variant" />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              {t("pages.TraceabilityPage.test_suite")}
            </span>
          </div>
          <select
            className="flex-1 max-w-md px-4 py-2 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-sm text-on-surface font-medium"
            value={suiteId}
            onChange={(e) => {
              const val = e.target.value;
              if (val) navigate(`/traceability?suiteId=${val}`);
              else navigate("/traceability");
            }}
            disabled={suitesLoading}
          >
            <option value="">
              {t("pages.TraceabilityPage.select_test_suite")}
            </option>
            {testSuites.map((suite: any) => (
              <option key={suite.id} value={suite.id}>
                {suite.name}
              </option>
            ))}
          </select>
        </div>

        {/* No suite selected */}
        {!suiteId && (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-12 flex flex-col items-center gap-4 text-center">
            {suitesLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            ) : (
              <>
                <ShieldCheck className="w-10 h-10 text-on-surface-variant/40" />
                <p className="text-base font-semibold text-on-surface">
                  {t(
                    "pages.TraceabilityPage.ch_n_m_t_test_suite_xem_traceability",
                  )}
                </p>
                <p className="text-sm text-on-surface-variant max-w-sm">
                  {t(
                    "pages.TraceabilityPage.s_d_ng_dropdown_ph_a_tr_n_ch_n_test_suit",
                  )}
                </p>
              </>
            )}
          </div>
        )}

        {/* Loading */}
        {suiteId && loading && (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-12 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          </div>
        )}

        {/* No SRS linked */}
        {suiteId && !loading && hasNoSrsLink && (
          <div className="rounded-3xl border border-amber-200/60 bg-amber-50 p-8 flex flex-col items-center gap-4 text-center">
            <Link2 className="w-10 h-10 text-amber-500" />
            <p className="text-base font-bold text-amber-900">
              {t(
                "pages.TraceabilityPage.test_suite_n_y_ch_a_li_n_k_t_v_i_t_i_li_",
              )}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 max-w-md">
              {t("pages.TraceabilityPage.no_srs_linked_help")}
            </p>
            {selectedSuite && (
              <Link
                to={`/test-suites/${suiteId}?tab=details`}
                className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t("pages.TraceabilityPage.m_test_suite_details")}
              </Link>
            )}
          </div>
        )}

        {/* Has SRS linked but no requirements yet */}
        {suiteId && !loading && data && !hasNoSrsLink && !hasRequirements && (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-10 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-on-surface-variant/40" />
            <p className="text-base font-semibold text-on-surface">
              {t(
                "pages.TraceabilityPage.ch_a_c_requirements_trong_t_i_li_u_srs",
              )}
            </p>
            <p className="text-sm text-on-surface-variant max-w-md">
              {t("pages.TraceabilityPage.srs_linked_but_not_analyzed")}
            </p>
          </div>
        )}

        {/* Main content */}
        {suiteId && !loading && hasRequirements && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  {t("pages.TraceabilityPage.total")}
                </p>
                <p className="mt-2 text-3xl font-black text-on-surface">
                  {data.totalRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  {t("pages.TraceabilityPage.covered")}
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-600">
                  {data.coveredRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  {t("pages.TraceabilityPage.uncovered")}
                </p>
                <p className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">
                  {data.uncoveredRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  {t("pages.TraceabilityPage.coverage")}
                </p>
                <p
                  className={cn(
                    "mt-2 text-3xl font-black",
                    data.coveragePercent >= 80
                      ? "text-emerald-600"
                      : data.coveragePercent >= 50
                        ? "text-amber-500"
                        : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {data.coveragePercent}%
                </p>
              </div>
            </div>

            {/* Validation stats — shown only when an evidence run exists */}
            {data.evidenceRunId != null && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-300">
                    {t("pages.TraceabilityPage.validated")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {data.validatedRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200/60 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/20 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-rose-700 dark:text-rose-300">
                    {t("pages.TraceabilityPage.violated")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-300">
                    {data.violatedRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300">
                    {t("pages.TraceabilityPage.partial")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">
                    {data.partialRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                    {t("pages.TraceabilityPage.validation")}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-3xl font-black",
                      (data.validationPercent ?? -1) < 0
                        ? "text-on-surface-variant"
                        : data.validationPercent >= 80
                          ? "text-emerald-600"
                          : data.validationPercent >= 50
                            ? "text-amber-500"
                            : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {(data.validationPercent ?? -1) < 0
                      ? t("pages.TraceabilityPage.not_available")
                      : `${data.validationPercent}%`}
                  </p>
                </div>
              </div>
            )}

            {/* Coverage progress bar */}
            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-on-surface">
                  {t("pages.TraceabilityPage.overall_coverage")}
                </p>
                <p className="text-sm font-bold text-on-surface-variant">
                  {data.coveredRequirements} / {data.totalRequirements}
                </p>
              </div>
              <CoverageBar percent={data.coveragePercent} />
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mr-1">
                {t("pages.TraceabilityPage.display")}
              </span>
              {(
                [
                  {
                    key: "all",
                    label: `${t("pages.TraceabilityPage.all")} (${data.totalRequirements})`,
                  },
                  {
                    key: "covered",
                    label: `${t("pages.TraceabilityPage.covered")} (${data.coveredRequirements})`,
                  },
                  {
                    key: "uncovered",
                    label: `${t("pages.TraceabilityPage.uncovered")} (${data.uncoveredRequirements})`,
                  },
                ] as { key: CoverageFilter; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCoverageFilter(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                    coverageFilter === key
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Requirement rows */}
            <div className="space-y-3">
              {filteredRequirements.length > 0 && (
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-on-surface-variant">
                    Showing {pageStartDisplay}-{pageEndDisplay} of{" "}
                    {totalFilteredRequirements}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-on-surface-variant">
                      Rows:
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs text-on-surface"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={safeCurrentPage <= 1}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-outline-variant/20 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="min-w-[60px] text-center text-xs font-semibold text-on-surface">
                      {safeCurrentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1),
                        )
                      }
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-outline-variant/20 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {filteredRequirements.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
                  {t(
                    "pages.TraceabilityPage.kh_ng_c_requirement_n_o_ph_h_p_v_i_b_l_c",
                  )}
                </div>
              ) : (
                pagedRequirements.map((row: any) => (
                  <RequirementCard
                    key={row.requirementId}
                    row={row}
                    onAddLink={() => {
                      setAddLinkReqId(row.requirementId);
                      setAddLinkTestCaseId("");
                    }}
                    onDeleteLink={handleDeleteLink}
                    getRequirementTypeLabel={getRequirementTypeLabel}
                    t={t}
                  />
                ))
              )}
              {filteredRequirements.length > 0 && (
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-on-surface-variant">
                    Showing {pageStartDisplay}-{pageEndDisplay} of{" "}
                    {totalFilteredRequirements}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-on-surface-variant">
                      Rows:
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs text-on-surface"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={safeCurrentPage <= 1}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-outline-variant/20 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="min-w-[60px] text-center text-xs font-semibold text-on-surface">
                      {safeCurrentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1),
                        )
                      }
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-outline-variant/20 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add link modal */}
      {addLinkReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-on-surface">
              {t("pages.TraceabilityPage.link_test_case_to_requirement")}
            </h2>
            <select
              value={addLinkTestCaseId}
              onChange={(e) => setAddLinkTestCaseId(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
            >
              <option value="">
                {t("pages.TraceabilityPage.select_a_test_case")}
              </option>
              {suiteTestCases.map((tc: any) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddLinkReqId(null);
                  setAddLinkTestCaseId("");
                }}
                className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold"
              >
                {t("pages.TraceabilityPage.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreateLink}
                disabled={isCreatingLink || !addLinkTestCaseId}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isCreatingLink ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {t("pages.TraceabilityPage.link")}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
