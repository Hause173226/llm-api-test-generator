import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Pencil, Filter, Loader2, Route, Clock, BookOpen, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { cn } from "../../lib/utils";
import { SuiteSuggestionModel } from "../../services/testSuiteLlmSuggestionService";

export interface SuggestionReviewPanelProps {
  suggestions: SuiteSuggestionModel[];
  allSuggestions: SuiteSuggestionModel[];
  endpoints: any[];
  isLoadingSuggestions: boolean;
  isReviewingSuggestion: boolean;
  isLoadingSuggestionDetail: boolean;
  reviewStatusFilter: string;
  testTypeFilter: string;
  endpointFilter: string;
  onReviewStatusFilterChange: (value: string) => void;
  onTestTypeFilterChange: (value: string) => void;
  onEndpointFilterChange: (value: string) => void;
  onApplyFilters: (filters: {
    reviewStatus: string;
    testType: string;
    endpointId: string;
  }) => Promise<void> | void;
  onClearFilters: () => Promise<void> | void;
  onLoadDetail: (suggestionId: string) => Promise<any>;
  onApprove: (
    suggestion: SuiteSuggestionModel,
    payload?: {
      reviewNotes?: string;
      modifiedContent: {
        name?: string;
        description?: string;
        testType?: string;
        priority?: string;
        tags?: string[];
      };
    },
  ) => Promise<void>;
  onReject: (
    suggestion: SuiteSuggestionModel,
    reviewNotes: string,
  ) => Promise<boolean>;
  onBulkRestore?: (suggestionIds: string[]) => Promise<void>;
  isBulkRestoringSuggestions?: boolean;
  onBulkApprove?: (suggestionIds: string[]) => Promise<void>;
  onBulkReject?: (suggestionIds: string[], reviewNotes: string) => Promise<void>;
  isBulkApprovingSuggestions?: boolean;
  isHistoricalView?: boolean;
  currentGenerationNumber?: number;
  viewingGenerationNumber?: number;
  srsCoverageSummary?: {
    totalRequirements: number;
    coveredRequirements: number;
    uncoveredRequirements: number;
    coveragePercent: number;
    coveredItems?: Array<{
      requirementId?: string;
      requirementCode?: string;
      title?: string;
    }>;
  } | null;
}

export default function SuggestionReviewPanel({
  suggestions,
  allSuggestions,
  endpoints,
  isLoadingSuggestions,
  isReviewingSuggestion,
  isLoadingSuggestionDetail,
  reviewStatusFilter,
  testTypeFilter,
  endpointFilter,
  onReviewStatusFilterChange,
  onTestTypeFilterChange,
  onEndpointFilterChange,
  onApplyFilters,
  onClearFilters,
  onLoadDetail,
  onApprove,
  onReject,
  onBulkRestore,
  isBulkRestoringSuggestions = false,
  onBulkApprove,
  onBulkReject,
  isBulkApprovingSuggestions = false,
  isHistoricalView = false,
  currentGenerationNumber,
  viewingGenerationNumber,
  srsCoverageSummary = null,
}: SuggestionReviewPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    [],
  );
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(reviewStatusFilter);
  const [draftTestType, setDraftTestType] = useState(testTypeFilter);
  const [draftEndpoint, setDraftEndpoint] = useState(endpointFilter);
  const [draftCoverage, setDraftCoverage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reviewMode, setReviewMode] = useState<"Reject" | "Modify" | null>(
    null,
  );
  const [activeSuggestion, setActiveSuggestion] =
    useState<SuiteSuggestionModel | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [modifyName, setModifyName] = useState("");
  const [modifyDescription, setModifyDescription] = useState("");
  const [modifyTestType, setModifyTestType] = useState("");
  const [modifyPriority, setModifyPriority] = useState("");
  const [modifyTagsText, setModifyTagsText] = useState("");
  const [draftEdits, setDraftEdits] = useState<
    Record<
      string,
      {
        reviewNotes?: string;
        modifiedContent: {
          name?: string;
          description?: string;
          testType?: string;
          priority?: string;
          tags?: string[];
        };
      }
    >
  >({});

  const uniqueSuggestionTypes = useMemo(
    () =>
      Array.from(
        new Set(allSuggestions.map((s) => s.testType).filter(Boolean)),
      ),
    [allSuggestions],
  );

  const getCoverageState = (suggestion: SuiteSuggestionModel) => {
    const coveredCount = suggestion.coveredRequirements?.length ?? 0;
    const coveredIdCount = suggestion.coveredRequirementIds?.length ?? 0;
    if (coveredCount > 0 || coveredIdCount > 0) {
      return "FULL";
    }
    if (suggestion.hasSrsContext) {
      return "SRS_ONLY";
    }
    return "NO_SRS";
  };

  const filteredByCoverageSuggestions = useMemo(() => {
    if (!draftCoverage) return suggestions;
    return suggestions.filter((s) => getCoverageState(s) === draftCoverage);
  }, [suggestions, draftCoverage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [draftStatus, draftTestType, draftEndpoint, draftCoverage, suggestions.length]);

  const pendingSuggestions = useMemo(
    () =>
      filteredByCoverageSuggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "pending",
      ),
    [filteredByCoverageSuggestions],
  );

  const supersededSuggestions = useMemo(
    () =>
      filteredByCoverageSuggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "superseded",
      ),
    [filteredByCoverageSuggestions],
  );

  const rejectedSuggestions = useMemo(
    () =>
      filteredByCoverageSuggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "rejected",
      ),
    [filteredByCoverageSuggestions],
  );

  const selectedPendingSuggestions = useMemo(
    () =>
      pendingSuggestions.filter((s) => selectedSuggestionIds.includes(s.id)),
    [pendingSuggestions, selectedSuggestionIds],
  );

  const selectedSupersededSuggestions = useMemo(
    () =>
      supersededSuggestions.filter((s) => selectedSuggestionIds.includes(s.id)),
    [supersededSuggestions, selectedSuggestionIds],
  );

  const selectedRejectedSuggestions = useMemo(
    () =>
      rejectedSuggestions.filter((s) => selectedSuggestionIds.includes(s.id)),
    [rejectedSuggestions, selectedSuggestionIds],
  );

  const allPendingSelected =
    pendingSuggestions.length > 0 &&
    selectedPendingSuggestions.length === pendingSuggestions.length;

  const hasSelectedPendingSuggestions = selectedPendingSuggestions.length > 0;
  const hasSelectedSupersededSuggestions =
    selectedSupersededSuggestions.length > 0;
  const hasSelectedRejectedSuggestions = selectedRejectedSuggestions.length > 0;

  const endpointById = useMemo(() => {
    const map = new Map<string, any>();
    endpoints.forEach((endpoint) => {
      if (endpoint?.id) map.set(endpoint.id, endpoint);
    });
    return map;
  }, [endpoints]);

  const suggestionStats = useMemo(() => {
    const pending = pendingSuggestions.length;
    const approved = filteredByCoverageSuggestions.filter((s) => {
      const status = String(s.reviewStatus || "").toLowerCase();
      return status === "approved" || status === "modifiedandapproved";
    }).length;
    const rejected = filteredByCoverageSuggestions.filter(
      (s) => String(s.reviewStatus || "").toLowerCase() === "rejected",
    ).length;
    return { pending, approved, rejected };
  }, [pendingSuggestions, filteredByCoverageSuggestions]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredByCoverageSuggestions.length / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedSuggestions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredByCoverageSuggestions.slice(start, start + pageSize);
  }, [filteredByCoverageSuggestions, safeCurrentPage, pageSize]);
  const fromIndex =
    filteredByCoverageSuggestions.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;
  const toIndex = Math.min(
    safeCurrentPage * pageSize,
    filteredByCoverageSuggestions.length,
  );

  const toggleSelectAllPending = () => {
    setSelectedSuggestionIds((prev) => {
      if (allPendingSelected) {
        return prev.filter(
          (id) => !pendingSuggestions.some((s) => s.id === id),
        );
      }
      const next = new Set(prev);
      pendingSuggestions.forEach((s) => next.add(s.id));
      return Array.from(next);
    });
  };

  const toggleSelectAllSuperseded = () => {
    setSelectedSuggestionIds((prev) => {
      if (
        selectedSupersededSuggestions.length === supersededSuggestions.length &&
        supersededSuggestions.length > 0
      ) {
        return prev.filter(
          (id) => !supersededSuggestions.some((s) => s.id === id),
        );
      }
      const next = new Set(prev);
      supersededSuggestions.forEach((s) => next.add(s.id));
      return Array.from(next);
    });
  };

  const openRejectModal = (suggestion: SuiteSuggestionModel) => {
    setActiveSuggestion(suggestion);
    setReviewMode("Reject");
    setReviewNotes("");
    setIsReviewModalOpen(true);
  };

  const openDetails = async (suggestion: SuiteSuggestionModel) => {
    const suiteId = suggestion.testSuiteId;
    const testCaseId = suggestion.appliedTestCaseId;

    if (suiteId && testCaseId) {
      navigate(`/test-suites/${suiteId}/test-cases/${testCaseId}`);
      return;
    }

    if (!onLoadDetail) return;

    // Ask parent to load latest detail; if it returns a detail with appliedTestCaseId,
    // navigate to the test-case detail page.
    try {
      const detail = await onLoadDetail(suggestion.id);
      const appliedId =
        detail?.appliedTestCaseId || suggestion.appliedTestCaseId;
      const targetSuiteId = detail?.testSuiteId || suggestion.testSuiteId;

      if (appliedId && targetSuiteId) {
        navigate(`/test-suites/${targetSuiteId}/test-cases/${appliedId}`);
        return;
      }

      // If not applied to a test case, navigate to the detail page using suggestion id
      if (targetSuiteId) {
        navigate(`/test-suites/${targetSuiteId}/test-cases/${suggestion.id}`);
      }
    } catch (err) {
      // ignore - parent will show any errors
    }
  };

  const submitReview = async () => {
    if (!activeSuggestion || !reviewMode) return;

    if (reviewMode === "Reject") {
      if (!reviewNotes.trim()) return;
      const success = await onReject(activeSuggestion, reviewNotes.trim());
      if (success) {
        setIsReviewModalOpen(false);
        setActiveSuggestion(null);
        setReviewMode(null);
      }
      return;
    }

    const tags = modifyTagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setDraftEdits((prev) => ({
      ...prev,
      [activeSuggestion.id]: {
        reviewNotes: reviewNotes.trim() || undefined,
        modifiedContent: {
          name: modifyName.trim() || undefined,
          description: modifyDescription.trim() || undefined,
          testType: modifyTestType || undefined,
          priority: modifyPriority || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      },
    }));

    setIsReviewModalOpen(false);
    setActiveSuggestion(null);
    setReviewMode(null);
  };

  const handleBulkApproveSelected = async () => {
    const ids = selectedPendingSuggestions.map((s) => s.id);
    if (ids.length === 0) return;

    if (onBulkApprove) {
      await onBulkApprove(ids);
    } else {
      for (const suggestion of selectedPendingSuggestions) {
        await onApprove(suggestion, draftEdits[suggestion.id]);
        setDraftEdits((prev) => {
          const next = { ...prev };
          delete next[suggestion.id];
          return next;
        });
      }
    }

    setSelectedSuggestionIds([]);
  };

  const handleBulkRejectSelected = async () => {
    const note = bulkRejectNotes.trim();
    if (!note) return;

    const ids = selectedPendingSuggestions.map((s) => s.id);

    if (onBulkReject) {
      await onBulkReject(ids, note);
    } else {
      for (const suggestion of selectedPendingSuggestions) {
        await onReject(suggestion, note);
      }
    }

    setSelectedSuggestionIds([]);
    setBulkRejectNotes("");
    setIsRejectModalOpen(false);
  };

  const handleBulkRestoreSelected = async () => {
    if (!onBulkRestore) return;
    const idsToRestore = Array.from(
      new Set<string>([
        ...selectedSupersededSuggestions.map((s) => s.id),
        ...selectedRejectedSuggestions.map((s) => s.id),
      ]),
    );
    if (idsToRestore.length === 0) return;
    await onBulkRestore(idsToRestore);
    setSelectedSuggestionIds([]);
  };

  const getStatusBadgeClass = (reviewStatus?: string) => {
    const value = String(reviewStatus || "pending").toLowerCase();
    if (value === "approved" || value === "modifiedandapproved") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25";
    }
    if (value === "rejected") {
      return "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25";
    }
    if (value === "superseded") {
      return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-400/25";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25";
  };

  const getMethodBadgeClass = (method?: string) => {
    const value = String(method || "").toUpperCase();
    if (value === "GET")
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    if (value === "POST")
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300";
    if (value === "PUT")
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
    if (value === "PATCH")
      return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300";
    if (value === "DELETE")
      return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300";
    return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  };

  const srsLinkedCount = useMemo(
    () => suggestions.filter((s) => s.hasSrsContext).length,
    [suggestions],
  );
  const srsDocTitles = useMemo(() => {
    const titles = new Set(
      suggestions
        .filter((s) => s.hasSrsContext && s.srsDocumentTitle)
        .map((s) => s.srsDocumentTitle!),
    );
    return [...titles];
  }, [suggestions]);

  return (
    <div className="space-y-4">
     

      {/* SRS Trust Banner — shown when all/some suggestions have SRS context */}
      {srsLinkedCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-300/60 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/30">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {srsLinkedCount === suggestions.length
                ? t("suggestions.reviewPanel.srs.all")
                : t("suggestions.reviewPanel.srs.partial", {
                    linked: srsLinkedCount,
                    total: suggestions.length,
                  })}
            </p>
            {srsDocTitles.length > 0 && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                {t("suggestions.reviewPanel.srs.basedOn")}{" "}
                {srsDocTitles.map((title, i) => (
                  <span key={title}>
                    {i > 0 && ", "}
                    <span className="font-mono font-semibold">&ldquo;{title}&rdquo;</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/40">
            {t("suggestions.reviewPanel.srs.aligned")}
          </span>
        </div>
      )}

      {isHistoricalView && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {t("suggestions.reviewPanel.history.title", {
                number: viewingGenerationNumber,
              })}
            </span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {t("suggestions.reviewPanel.history.desc", {
              number: currentGenerationNumber,
            })}
          </p>
        </div>
      )}

      <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
            <span className="text-xs font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-widest">
              {t("suggestions.reviewPanel.filters.title")}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {pendingSuggestions.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllPending}
                disabled={pendingSuggestions.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                {allPendingSelected
                  ? t("suggestions.reviewPanel.actions.unselectPending")
                  : t("suggestions.reviewPanel.actions.selectPending")}
              </button>
            )}
            {supersededSuggestions.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllSuperseded}
                disabled={supersededSuggestions.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                {selectedSupersededSuggestions.length ===
                  supersededSuggestions.length &&
                supersededSuggestions.length > 0
                  ? t("suggestions.reviewPanel.actions.unselectSuperseded")
                  : t("suggestions.reviewPanel.actions.selectSuperseded")}
              </button>
            )}
            {(hasSelectedSupersededSuggestions ||
              hasSelectedRejectedSuggestions) &&
              onBulkRestore && (
                <button
                  type="button"
                  onClick={handleBulkRestoreSelected}
                  disabled={isBulkRestoringSuggestions}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Restore selected to pending
                </button>
              )}
            {hasSelectedPendingSuggestions && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={handleBulkApproveSelected}
                  disabled={isBulkApprovingSuggestions}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isBulkApprovingSuggestions ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Approve all
                </button>
              </>
            )}
            {selectedSuggestionIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSuggestionIds([])}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={draftStatus}
            onChange={(e) => {
              const v = e.target.value;
              setDraftStatus(v);
              onReviewStatusFilterChange(v);
              onApplyFilters({
                reviewStatus: v,
                testType: draftTestType,
                endpointId: draftEndpoint,
              });
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending (Current queue)</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Superseded">Superseded</option>
          </select>

          <select
            value={draftTestType}
            onChange={(e) => {
              const v = e.target.value;
              setDraftTestType(v);
              onTestTypeFilterChange(v);
              onApplyFilters({
                reviewStatus: draftStatus,
                testType: v,
                endpointId: draftEndpoint,
              });
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All test types</option>
            {uniqueSuggestionTypes.map((testType) => (
              <option key={testType} value={testType}>
                {testType}
              </option>
            ))}
          </select>

          <select
            value={draftEndpoint}
            onChange={(e) => {
              const v = e.target.value;
              setDraftEndpoint(v);
              onEndpointFilterChange(v);
              onApplyFilters({
                reviewStatus: draftStatus,
                testType: draftTestType,
                endpointId: v,
              });
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All endpoints</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.method} {endpoint.path}
              </option>
            ))}
          </select>

          <select
            value={draftCoverage}
            onChange={(e) => setDraftCoverage(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All SRS coverage</option>
            <option value="FULL">Covered requirements</option>
            <option value="SRS_ONLY">SRS-aligned (no req IDs)</option>
            <option value="NO_SRS">No SRS context</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <span>Total: {filteredByCoverageSuggestions.length}</span>
          <span>Pending: {suggestionStats.pending}</span>
          <span>Approved: {suggestionStats.approved}</span>
          <span>Rejected: {suggestionStats.rejected}</span>
        </div>
      </div>

      {isLoadingSuggestions ? (
        <div className="rounded-lg border-2 bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 p-4 transition-colors">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                Loading LLM suggestions...
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                Suggestions will appear here when complete.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoadingSuggestions && filteredByCoverageSuggestions.length > 0 && (
        <div className="space-y-2">
          {pagedSuggestions.map((suggestion) => {
            const endpoint = suggestion.endpointId
              ? endpointById.get(suggestion.endpointId)
              : null;
            const status = String(suggestion.reviewStatus || "").toLowerCase();
            const coverageState = getCoverageState(suggestion);
            const coveredRequirementCount =
              suggestion.coveredRequirements?.length ??
              suggestion.coveredRequirementIds?.length ??
              0;

            return (
              <div
                key={suggestion.id}
                className="bg-surface-container-lowest dark:bg-slate-900/95 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-stretch justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider",
                          getStatusBadgeClass(suggestion.reviewStatus),
                        )}
                      >
                        {suggestion.reviewStatus ||
                          t("suggestions.reviewPanel.status.pending")}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 text-[10px] font-black tracking-wider border border-slate-200 dark:border-slate-400/20">
                        {suggestion.testType ||
                          suggestion.suggestionType ||
                          t("suggestions.reviewPanel.common.unknown")}
                      </span>
                      {suggestion.hasSrsContext && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25">
                          <BookOpen className="w-2.5 h-2.5" />
                          SRS
                        </span>
                      )}
                      {coverageState === "FULL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-400/25">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {t("suggestions.reviewPanel.coverage.covered", {
                            count: coveredRequirementCount,
                          })}
                        </span>
                      )}
                      {coverageState === "SRS_ONLY" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {t("suggestions.reviewPanel.coverage.srsOnly")}
                        </span>
                      )}
                      {draftEdits[suggestion.id] && (
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-black tracking-wider border border-cyan-400/25">
                          {t("suggestions.reviewPanel.common.edited")}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-on-surface">
                      {suggestion.suggestedName ||
                        t("suggestions.reviewPanel.common.untitled")}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {suggestion.suggestedDescription ||
                        t("suggestions.reviewPanel.common.noDescription")}
                    </p>

                    {/* SRS requirement coverage — shown only when SRS context available */}
                    {suggestion.hasSrsContext && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {suggestion.srsDocumentTitle
                            ? `${suggestion.srsDocumentTitle}:`
                            : t("suggestions.reviewPanel.srs.shortLabel")}
                        </span>
                        {suggestion.coveredRequirements &&
                        suggestion.coveredRequirements.length > 0 ? (
                          suggestion.coveredRequirements.slice(0, 4).map((req) => (
                            <span
                              key={req.id}
                              title={req.title}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40"
                            >
                              {req.code}
                            </span>
                          ))
                        ) : suggestion.coveredRequirementIds &&
                          suggestion.coveredRequirementIds.length > 0 ? (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                            {t("suggestions.reviewPanel.coverage.reqCount", {
                              count: suggestion.coveredRequirementIds.length,
                            })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-500 italic">
                            {t("suggestions.reviewPanel.srs.aligned")}
                          </span>
                        )}
                        {suggestion.coveredRequirements &&
                          suggestion.coveredRequirements.length > 4 && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {t("suggestions.reviewPanel.common.moreCount", {
                                count: suggestion.coveredRequirements.length - 4,
                              })}
                            </span>
                          )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-on-surface-variant">
                      <Route className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                      <span className="font-semibold">
                        {t("suggestions.reviewPanel.common.endpoint")}:
                      </span>
                      {endpoint ? (
                        <>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black tracking-wider",
                              getMethodBadgeClass(endpoint.method),
                            )}
                          >
                            {endpoint.method || "UNKNOWN"}
                          </span>
                          <span className="text-cyan-800 dark:text-cyan-100/90 font-mono break-all">
                            {endpoint.path ||
                              t("suggestions.reviewPanel.common.unknownPath")}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          {t("suggestions.reviewPanel.common.unknownEndpoint")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-30 flex-col items-end justify-end">
                    {(status === "pending" || status === "superseded") && (
                      <div className="pt-1 flex-2 justify-start">
                        <input
                          type="checkbox"
                          checked={selectedSuggestionIds.includes(
                            suggestion.id,
                          )}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedSuggestionIds((prev) => {
                              if (checked) return [...prev, suggestion.id];
                              return prev.filter((id) => id !== suggestion.id);
                            });
                          }}
                          className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    )}

                    <div className="pt-2">
                      {status !== "approved" &&
                        !suggestion.appliedTestCaseId && (
                          <button
                            onClick={() => openDetails(suggestion)}
                            className="px-3 py-1.5 rounded-md bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {t("suggestions.reviewPanel.actions.viewDetails")}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/20 px-3 py-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span>
                {t("suggestions.reviewPanel.pagination.showing", {
                  from: fromIndex,
                  to: toIndex,
                  total: filteredByCoverageSuggestions.length,
                })}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || 10;
                  setPageSize(next);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded bg-surface-container-low dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-600 text-on-surface"
              >
                <option value={10}>
                  {t("suggestions.reviewPanel.pagination.pageSize", {
                    count: 10,
                  })}
                </option>
                <option value={20}>
                  {t("suggestions.reviewPanel.pagination.pageSize", {
                    count: 20,
                  })}
                </option>
                <option value={50}>
                  {t("suggestions.reviewPanel.pagination.pageSize", {
                    count: 50,
                  })}
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-3 py-1 rounded bg-surface-container-high text-on-surface disabled:opacity-50"
              >
                {t("suggestions.reviewPanel.pagination.prev")}
              </button>
              <span>
                {t("suggestions.reviewPanel.pagination.page", {
                  current: safeCurrentPage,
                  total: totalPages,
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safeCurrentPage >= totalPages}
                className="px-3 py-1 rounded bg-surface-container-high text-on-surface disabled:opacity-50"
              >
                {t("suggestions.reviewPanel.pagination.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoadingSuggestions &&
        suggestions.length > 0 &&
        filteredByCoverageSuggestions.length === 0 && (
          <div className="rounded-lg border border-outline-variant/20 p-4 text-sm text-on-surface-variant">
            {t("suggestions.reviewPanel.empty.noMatchCoverage")}
          </div>
        )}

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (isReviewingSuggestion) return;
          setIsRejectModalOpen(false);
          setBulkRejectNotes("");
        }}
        title={t("suggestions.reviewPanel.modal.rejectSelected.title")}
        footer={
          <>
            <button
              onClick={() => {
                setIsRejectModalOpen(false);
                setBulkRejectNotes("");
              }}
              disabled={isReviewingSuggestion}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleBulkRejectSelected}
              disabled={isReviewingSuggestion || !bulkRejectNotes.trim()}
              className="px-8 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReviewingSuggestion ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {t("suggestions.reviewPanel.modal.rejectSelected.confirm")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            {t("suggestions.reviewPanel.modal.rejectSelected.desc", {
              count: selectedPendingSuggestions.length,
            })}
          </p>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("suggestions.reviewPanel.modal.reviewNotesRequired")}
            </label>
            <textarea
              value={bulkRejectNotes}
              onChange={(e) => setBulkRejectNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={t(
                "suggestions.reviewPanel.modal.rejectSelected.placeholder",
              )}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          if (isReviewingSuggestion) return;
          setIsReviewModalOpen(false);
          setActiveSuggestion(null);
          setReviewMode(null);
        }}
        title={
          reviewMode === "Reject"
            ? t("suggestions.reviewPanel.modal.review.titleReject")
            : t("suggestions.reviewPanel.modal.review.titleEdit")
        }
        footer={
          <>
            <button
              onClick={() => {
                setIsReviewModalOpen(false);
                setActiveSuggestion(null);
                setReviewMode(null);
              }}
              disabled={isReviewingSuggestion}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submitReview}
              disabled={isReviewingSuggestion}
              className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReviewingSuggestion ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : reviewMode === "Reject" ? (
                <X className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {reviewMode === "Reject"
                ? t("suggestions.reviewPanel.modal.review.confirmReject")
                : t("suggestions.reviewPanel.modal.review.saveEdit")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {reviewMode === "Modify" && (
            <>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  {t("suggestions.reviewPanel.modal.review.name")}
                </label>
                <input
                  value={modifyName}
                  onChange={(e) => setModifyName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder={t(
                    "suggestions.reviewPanel.modal.review.namePlaceholder",
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  {t("suggestions.reviewPanel.modal.review.description")}
                </label>
                <textarea
                  value={modifyDescription}
                  onChange={(e) => setModifyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder={t(
                    "suggestions.reviewPanel.modal.review.descriptionPlaceholder",
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    {t("suggestions.reviewPanel.modal.review.testType")}
                  </label>
                  <select
                    value={modifyTestType}
                    onChange={(e) => setModifyTestType(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  >
                    <option value="">
                      {t("suggestions.reviewPanel.modal.review.keepExisting")}
                    </option>
                    {[
                      "HappyPath",
                      "Boundary",
                      "Negative",
                      "Security",
                      "Performance",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    {t("suggestions.reviewPanel.modal.review.priority")}
                  </label>
                  <select
                    value={modifyPriority}
                    onChange={(e) => setModifyPriority(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  >
                    <option value="">
                      {t("suggestions.reviewPanel.modal.review.keepExisting")}
                    </option>
                    {["Low", "Medium", "High", "Critical"].map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  {t("suggestions.reviewPanel.modal.review.tags")}
                </label>
                <input
                  value={modifyTagsText}
                  onChange={(e) => setModifyTagsText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder={t(
                    "suggestions.reviewPanel.modal.review.tagsPlaceholder",
                  )}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("suggestions.reviewPanel.modal.review.notes")}{" "}
              {reviewMode === "Reject"
                ? t("suggestions.reviewPanel.modal.review.required")
                : t("suggestions.reviewPanel.modal.review.optional")}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={
                reviewMode === "Reject"
                  ? t("suggestions.reviewPanel.modal.review.rejectPlaceholder")
                  : t("suggestions.reviewPanel.modal.review.modifyPlaceholder")
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
