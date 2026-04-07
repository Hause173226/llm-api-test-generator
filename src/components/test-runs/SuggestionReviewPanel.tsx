import React, { useMemo, useState } from "react";
import { Check, X, Pencil, Filter, Loader2, Route } from "lucide-react";
import Modal from "../ui/Modal";
import { cn } from "../../lib/utils";
import { SuiteSuggestionModel } from "../../services/testSuiteLlmSuggestionService";

export interface SuggestionReviewPanelProps {
  suggestions: SuiteSuggestionModel[];
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
  onApplyFilters: () => Promise<void> | void;
  onClearFilters: () => Promise<void> | void;
  onLoadDetail: (suggestionId: string) => Promise<void>;
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
}

export default function SuggestionReviewPanel({
  suggestions,
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
}: SuggestionReviewPanelProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
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
      Array.from(new Set(suggestions.map((s) => s.testType).filter(Boolean))),
    [suggestions],
  );

  const suggestionStats = useMemo(() => {
    const pending = suggestions.filter(
      (s) => String(s.reviewStatus || "").toLowerCase() === "pending",
    ).length;
    const approved = suggestions.filter((s) => {
      const status = String(s.reviewStatus || "").toLowerCase();
      return status === "approved" || status === "modifiedandapproved";
    }).length;
    const rejected = suggestions.filter(
      (s) => String(s.reviewStatus || "").toLowerCase() === "rejected",
    ).length;

    return { pending, approved, rejected };
  }, [suggestions]);

  const endpointById = useMemo(() => {
    const map = new Map<string, any>();
    endpoints.forEach((endpoint) => {
      if (endpoint?.id) {
        map.set(endpoint.id, endpoint);
      }
    });
    return map;
  }, [endpoints]);

  const openRejectModal = (suggestion: SuiteSuggestionModel) => {
    setActiveSuggestion(suggestion);
    setReviewMode("Reject");
    setReviewNotes("");
    setIsReviewModalOpen(true);
  };

  const openModifyModal = (suggestion: SuiteSuggestionModel) => {
    setActiveSuggestion(suggestion);
    setReviewMode("Modify");
    const draft = draftEdits[suggestion.id];
    setReviewNotes(draft?.reviewNotes || "");
    setModifyName(
      draft?.modifiedContent?.name ?? suggestion.suggestedName ?? "",
    );
    setModifyDescription(
      draft?.modifiedContent?.description ??
        suggestion.suggestedDescription ??
        "",
    );
    setModifyTestType(
      draft?.modifiedContent?.testType ?? suggestion.testType ?? "",
    );
    setModifyPriority(
      draft?.modifiedContent?.priority ?? suggestion.priority ?? "",
    );
    setModifyTagsText(
      (draft?.modifiedContent?.tags || suggestion.suggestedTags || []).join(
        ", ",
      ),
    );
    setIsReviewModalOpen(true);
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

  const getStatusBadgeClass = (reviewStatus?: string) => {
    const value = String(reviewStatus || "pending").toLowerCase();
    if (value === "approved" || value === "modifiedandapproved") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25";
    }
    if (value === "rejected") {
      return "bg-rose-500/15 text-rose-300 border border-rose-400/25";
    }
    if (value === "superseded") {
      return "bg-slate-500/15 text-slate-300 border border-slate-400/25";
    }
    return "bg-amber-500/15 text-amber-300 border border-amber-400/25";
  };

  const getMethodBadgeClass = (method?: string) => {
    const value = String(method || "").toUpperCase();
    if (value === "GET") return "bg-emerald-500/15 text-emerald-300";
    if (value === "POST") return "bg-blue-500/15 text-blue-300";
    if (value === "PUT") return "bg-amber-500/15 text-amber-300";
    if (value === "PATCH") return "bg-fuchsia-500/15 text-fuchsia-300";
    if (value === "DELETE") return "bg-rose-500/15 text-rose-300";
    return "bg-slate-500/15 text-slate-300";
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-cyan-300" />
          <span className="text-xs font-black text-cyan-200 uppercase tracking-widest">
            AI Review Filters
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={reviewStatusFilter}
            onChange={(e) => onReviewStatusFilterChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending (Current queue)</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="ModifiedAndApproved">ModifiedAndApproved</option>
            <option value="Superseded">Superseded (History)</option>
          </select>

          <select
            value={testTypeFilter}
            onChange={(e) => onTestTypeFilterChange(e.target.value)}
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
            value={endpointFilter}
            onChange={(e) => onEndpointFilterChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
          >
            <option value="">All endpoints</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.method} {endpoint.path}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onApplyFilters()}
              disabled={isLoadingSuggestions}
              className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white text-sm font-bold disabled:opacity-60"
            >
              Apply
            </button>
            <button
              onClick={() => onClearFilters()}
              disabled={isLoadingSuggestions}
              className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface text-sm font-bold disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-cyan-200/80">
          Tip: keep status at Pending to review the latest generation batch. Use
          Superseded only for historical inspection.
        </p>
      </div>

      {isLoadingSuggestions ? (
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading LLM suggestions...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
          No LLM suggestions found for this suite.
        </div>
      ) : (
        <div className="rounded-2xl bg-linear-to-r from-cyan-900/35 via-sky-900/30 to-indigo-900/35 border border-cyan-400/15 p-4 shadow-sm">
          <p className="text-sm font-bold text-cyan-100">
            AI Review Queue: {suggestions.length} items
          </p>
          <p className="text-xs text-cyan-200/80 mt-1">
            Process pending suggestions to unlock automatic transition to Test
            Cases.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25">
              Pending: {suggestionStats.pending}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
              Approved: {suggestionStats.approved}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/25">
              Rejected: {suggestionStats.rejected}
            </span>
          </div>
        </div>
      )}

      {!isLoadingSuggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion) =>
            (() => {
              const endpoint = suggestion.endpointId
                ? endpointById.get(suggestion.endpointId)
                : null;

              return (
                <div
                  key={suggestion.id}
                  className="bg-surface-container-lowest dark:bg-slate-900/95 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider",
                        getStatusBadgeClass(suggestion.reviewStatus),
                      )}
                    >
                      {suggestion.reviewStatus || "Pending"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-300 text-[10px] font-black tracking-wider border border-slate-400/20">
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
                    <Route className="w-3.5 h-3.5 text-cyan-300" />
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
                        <span className="text-cyan-100/90 font-mono break-all">
                          {endpoint.path || "Unknown path"}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Unknown endpoint</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        await onApprove(suggestion, draftEdits[suggestion.id]);
                        setDraftEdits((prev) => {
                          const next = { ...prev };
                          delete next[suggestion.id];
                          return next;
                        });
                      }}
                      disabled={
                        isReviewingSuggestion ||
                        String(suggestion.reviewStatus || "").toLowerCase() !==
                          "pending"
                      }
                      className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(suggestion)}
                      disabled={
                        isReviewingSuggestion ||
                        String(suggestion.reviewStatus || "").toLowerCase() !==
                          "pending"
                      }
                      className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      onClick={() => openModifyModal(suggestion)}
                      disabled={
                        isReviewingSuggestion ||
                        String(suggestion.reviewStatus || "").toLowerCase() !==
                          "pending"
                      }
                      className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              );
            })(),
          )}
        </div>
      )}

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
