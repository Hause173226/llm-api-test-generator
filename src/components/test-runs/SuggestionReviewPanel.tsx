import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Pencil, Filter, Loader2, Route, Clock } from "lucide-react";
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
  isBulkApprovingSuggestions = false,
  isHistoricalView = false,
  currentGenerationNumber,
  viewingGenerationNumber,
}: SuggestionReviewPanelProps) {
  const navigate = useNavigate();
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    [],
  );
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(reviewStatusFilter);
  const [draftTestType, setDraftTestType] = useState(testTypeFilter);
  const [draftEndpoint, setDraftEndpoint] = useState(endpointFilter);
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

  const pendingSuggestions = useMemo(
    () =>
      suggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "pending",
      ),
    [suggestions],
  );

  const supersededSuggestions = useMemo(
    () =>
      suggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "superseded",
      ),
    [suggestions],
  );

  const rejectedSuggestions = useMemo(
    () =>
      suggestions.filter(
        (s) => String(s.reviewStatus || "").toLowerCase() === "rejected",
      ),
    [suggestions],
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
    const approved = suggestions.filter((s) => {
      const status = String(s.reviewStatus || "").toLowerCase();
      return status === "approved" || status === "modifiedandapproved";
    }).length;
    const rejected = suggestions.filter(
      (s) => String(s.reviewStatus || "").toLowerCase() === "rejected",
    ).length;
    return { pending, approved, rejected };
  }, [pendingSuggestions, suggestions]);

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

  return (
    <div className="space-y-4">
      {isHistoricalView && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Viewing Historical Generation #{viewingGenerationNumber}
            </span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            You are viewing suggestions from a previous generation. Current
            generation is #{currentGenerationNumber}.
          </p>
        </div>
      )}

      <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
            <span className="text-xs font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-widest">
              AI Review Filters
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
                  ? "Unselect all pending"
                  : "Select all pending"}
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
                  ? "Unselect all superseded"
                  : "Select all superseded"}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <span>Pending: {suggestionStats.pending}</span>
          <span>Approved: {suggestionStats.approved}</span>
          <span>Rejected: {suggestionStats.rejected}</span>
        </div>
      </div>

      {isLoadingSuggestions ? (
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading LLM suggestions...
        </div>
      ) : null}

      {!isLoadingSuggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion) => {
            const endpoint = suggestion.endpointId
              ? endpointById.get(suggestion.endpointId)
              : null;
            const status = String(suggestion.reviewStatus || "").toLowerCase();

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
                        {suggestion.reviewStatus || "Pending"}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 text-[10px] font-black tracking-wider border border-slate-200 dark:border-slate-400/20">
                        {suggestion.testType ||
                          suggestion.suggestionType ||
                          "Unknown"}
                      </span>
                      {draftEdits[suggestion.id] && (
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-black tracking-wider border border-cyan-400/25">
                          Edited
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-on-surface">
                      {suggestion.suggestedName || "Untitled suggestion"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {suggestion.suggestedDescription || "No description"}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-on-surface-variant">
                      <Route className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                      <span className="font-semibold">Endpoint:</span>
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
                            {endpoint.path || "Unknown path"}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          Unknown endpoint
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
                            View details
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (isReviewingSuggestion) return;
          setIsRejectModalOpen(false);
          setBulkRejectNotes("");
        }}
        title="Reject Selected Test Cases"
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
              Cancel
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
              Confirm Reject
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Reject {selectedPendingSuggestions.length} selected pending test
            case{selectedPendingSuggestions.length > 1 ? "s" : ""}.
          </p>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Review Notes (required)
            </label>
            <textarea
              value={bulkRejectNotes}
              onChange={(e) => setBulkRejectNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder="Explain why these suggestions should be rejected"
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
            ? "Reject LLM Suggestion"
            : "Edit LLM Suggestion"
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
              Cancel
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
              {reviewMode === "Reject" ? "Confirm Reject" : "Save Edit"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {reviewMode === "Modify" && (
            <>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Name
                </label>
                <input
                  value={modifyName}
                  onChange={(e) => setModifyName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder="Suggestion name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  value={modifyDescription}
                  onChange={(e) => setModifyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder="Suggestion description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Test Type
                  </label>
                  <select
                    value={modifyTestType}
                    onChange={(e) => setModifyTestType(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  >
                    <option value="">Keep existing</option>
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
                    Priority
                  </label>
                  <select
                    value={modifyPriority}
                    onChange={(e) => setModifyPriority(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  >
                    <option value="">Keep existing</option>
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
                  Tags (comma separated)
                </label>
                <input
                  value={modifyTagsText}
                  onChange={(e) => setModifyTagsText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                  placeholder="boundary, llm-suggested"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Review Notes{" "}
              {reviewMode === "Reject" ? "(required)" : "(optional)"}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={
                reviewMode === "Reject"
                  ? "Explain why this suggestion should be rejected"
                  : "Reason for modifications"
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
