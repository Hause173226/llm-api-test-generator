import React, { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useProject } from "../contexts/ProjectContext";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import { useTestSuites } from "../hooks/useTestSuites";
import { srsService } from "../services/srsService";
import { handleError } from "../utils/errorHandler";
import {
  Loader2,
  ShieldCheck,
  Link2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { cn } from "../lib/utils";

const REQ_TYPE_LABELS = [
  "Functional",
  "Non-Functional",
  "Security",
  "Performance",
  "Constraint",
];

const REQ_TYPE_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-slate-100 text-slate-700",
];

type CoverageFilter = "all" | "covered" | "uncovered";

const VALIDATION_STATUS_LABELS: Record<number, string> = {
  0: "Uncovered",
  1: "Unverified",
  2: "Validated",
  3: "Violated",
  4: "Partial",
  5: "Skipped Only",
  6: "Inconclusive",
};

const VALIDATION_STATUS_COLORS: Record<number, string> = {
  0: "bg-rose-100 text-rose-700",
  1: "bg-slate-100 text-slate-600",
  2: "bg-emerald-100 text-emerald-700",
  3: "bg-red-100 text-red-700",
  4: "bg-amber-100 text-amber-700",
  5: "bg-slate-100 text-slate-500",
  6: "bg-violet-100 text-violet-700",
};

const LAST_RUN_STATUS_COLORS: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Skipped: "bg-amber-100 text-amber-700",
};

function CoverageBar({ percent }: { percent: number }) {
  return (
    <div className="w-full rounded-full bg-slate-100 h-2.5 overflow-hidden">
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

function RequirementCard({ row }: { row: any }) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel =
    REQ_TYPE_LABELS[row.requirementType] ?? `Type ${row.requirementType}`;
  const typeColor =
    REQ_TYPE_COLORS[row.requirementType] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 tracking-wide">
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
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {row.isReviewed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {row.isReviewed ? "Reviewed" : "Pending review"}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1",
                  row.isCovered
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {row.isCovered ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {row.isCovered ? "Covered" : "Uncovered"}
              </span>
              {row.validationStatus != null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    VALIDATION_STATUS_COLORS[row.validationStatus as number] ??
                      "bg-slate-100 text-slate-600",
                  )}
                >
                  {VALIDATION_STATUS_LABELS[row.validationStatus as number] ??
                    `Status ${row.validationStatus}`}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-on-surface leading-snug">
              {row.title}
            </h2>
            {row.confidenceScore != null && (
              <p className="mt-1 text-xs text-on-surface-variant">
                Confidence: {(row.confidenceScore * 100).toFixed(0)}%
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
                  Hide test cases
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  {(row.testCases || []).length} test case
                  {(row.testCases || []).length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (row.testCases || []).length > 0 && (
        <div className="border-t border-outline-variant/10 bg-surface-container-low/50 px-5 py-4 space-y-3">
          {(row.testCases || []).map((tc: any) => (
            <div
              key={tc.testCaseId}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-3.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {tc.testCaseName}
                  </p>
                  {tc.lastRunStatus && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        LAST_RUN_STATUS_COLORS[tc.lastRunStatus] ??
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {tc.lastRunStatus}
                    </span>
                  )}
                  {tc.hasAdaptiveWarning && (
                    <span className="shrink-0 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-[10px] font-bold">
                      ⚠ warn
                    </span>
                  )}
                </div>
                {tc.mappingRationale && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {tc.mappingRationale}
                  </p>
                )}
                {tc.failureSummary && (
                  <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
                    {tc.failureSummary}
                  </p>
                )}
              </div>
              {tc.traceabilityScore != null && (
                <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {(tc.traceabilityScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TraceabilityPage() {
  const { selectedProject } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const suiteId = searchParams.get("suiteId") || "";
  const projectId = selectedProject?.id || "";
  const breadcrumbs = useProjectBreadcrumbs("Traceability");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");

  const { testSuites, isLoading: suitesLoading } = useTestSuites(projectId);

  const selectedSuite = testSuites.find((s: any) => s.id === suiteId);

  useEffect(() => {
    if (!projectId || !suiteId) return;
    setData(null);
    (async () => {
      try {
        setLoading(true);
        const result = await srsService.getTraceability(projectId, suiteId);
        setData(result);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, suiteId]);

  const hasNoSrsLink = data && data.srsDocumentId == null;
  const hasRequirements = data && (data.requirements || []).length > 0;

  const filteredRequirements = (data?.requirements || []).filter((r: any) => {
    if (coverageFilter === "covered") return r.isCovered;
    if (coverageFilter === "uncovered") return !r.isCovered;
    return true;
  });

  return (
    <MainLayout title="Traceability" breadcrumbs={breadcrumbs}>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <section className="rounded-4xl border border-outline-variant/10 bg-linear-to-br from-emerald-600 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-2xl shadow-emerald-950/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                  Coverage report
                </p>
                <h1 className="text-2xl md:text-3xl font-black">
                  Requirement to Test Case Traceability
                </h1>
              </div>
            </div>

            {/* Suite selector */}
            <div className="shrink-0">
              <select
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 min-w-55"
                value={suiteId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) navigate(`/traceability?suiteId=${val}`);
                  else navigate("/traceability");
                }}
              >
                <option value="" className="text-slate-900">
                  — Chọn test suite —
                </option>
                {testSuites.map((suite: any) => (
                  <option
                    key={suite.id}
                    value={suite.id}
                    className="text-slate-900"
                  >
                    {suite.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* No suite selected */}
        {!suiteId && (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-12 flex flex-col items-center gap-4 text-center">
            {suitesLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            ) : (
              <>
                <ShieldCheck className="w-10 h-10 text-on-surface-variant/40" />
                <p className="text-base font-semibold text-on-surface">
                  Chọn một test suite để xem traceability
                </p>
                <p className="text-sm text-on-surface-variant max-w-sm">
                  Sử dụng dropdown phía trên để chọn test suite cần kiểm tra.
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
              Test suite này chưa liên kết với tài liệu SRS
            </p>
            <p className="text-sm text-amber-700 max-w-md">
              Mở tab <strong>Details</strong> trong trang test suite và chọn một
              SRS document để liên kết. Sau đó generate lại test cases để hệ
              thống tự động tạo traceability links.
            </p>
            {selectedSuite && (
              <Link
                to={`/test-suites/${suiteId}?tab=details`}
                className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Mở Test Suite Details
              </Link>
            )}
          </div>
        )}

        {/* Has SRS linked but no requirements yet */}
        {suiteId && !loading && data && !hasNoSrsLink && !hasRequirements && (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-10 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-on-surface-variant/40" />
            <p className="text-base font-semibold text-on-surface">
              Chưa có requirements trong tài liệu SRS
            </p>
            <p className="text-sm text-on-surface-variant max-w-md">
              Tài liệu SRS đã được liên kết nhưng chưa được phân tích. Hãy vào{" "}
              <strong>SRS Documents</strong> và chạy phân tích để trích xuất
              requirements.
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
                  Total
                </p>
                <p className="mt-2 text-3xl font-black text-on-surface">
                  {data.totalRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Covered
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-600">
                  {data.coveredRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Uncovered
                </p>
                <p className="mt-2 text-3xl font-black text-rose-600">
                  {data.uncoveredRequirements}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Coverage
                </p>
                <p
                  className={cn(
                    "mt-2 text-3xl font-black",
                    data.coveragePercent >= 80
                      ? "text-emerald-600"
                      : data.coveragePercent >= 50
                        ? "text-amber-500"
                        : "text-rose-600",
                  )}
                >
                  {data.coveragePercent}%
                </p>
              </div>
            </div>

            {/* Validation stats — shown only when an evidence run exists */}
            {data.evidenceRunId != null && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-700">
                    Validated
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    {data.validatedRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200/60 bg-rose-50 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-rose-700">
                    Violated
                  </p>
                  <p className="mt-2 text-3xl font-black text-rose-700">
                    {data.violatedRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50 p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-amber-700">
                    Partial
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-700">
                    {data.partialRequirements ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Validation %
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
                            : "text-rose-600",
                    )}
                  >
                    {(data.validationPercent ?? -1) < 0
                      ? "—"
                      : `${data.validationPercent}%`}
                  </p>
                </div>
              </div>
            )}

            {/* Coverage progress bar */}
            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-on-surface">
                  Overall Coverage
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
                Hiển thị
              </span>
              {(
                [
                  { key: "all", label: `Tất cả (${data.totalRequirements})` },
                  {
                    key: "covered",
                    label: `Covered (${data.coveredRequirements})`,
                  },
                  {
                    key: "uncovered",
                    label: `Uncovered (${data.uncoveredRequirements})`,
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
              {filteredRequirements.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
                  Không có requirement nào phù hợp với bộ lọc.
                </div>
              ) : (
                filteredRequirements.map((row: any) => (
                  <RequirementCard key={row.requirementId} row={row} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
