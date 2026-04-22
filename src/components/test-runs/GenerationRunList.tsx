import React from "react";
import { Clock, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { GenerationRun } from "../../services/generationRunService";

export interface GenerationRunListProps {
  runs: GenerationRun[];
  selectedRun: GenerationRun | null;
  onSelectRun: (run: GenerationRun) => void;
}

export default function GenerationRunList({
  runs,
  selectedRun,
  onSelectRun,
}: GenerationRunListProps) {
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadgeClass = (
    count: number,
    type: "pending" | "approved" | "rejected" | "superseded",
  ) => {
    if (count === 0)
      return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";

    switch (type) {
      case "approved":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25";
      case "rejected":
        return "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25";
      case "superseded":
        return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-400/25";
      case "pending":
      default:
        return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25";
    }
  };

  if (runs.length === 0) {
    return (
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant text-center">
        No generation runs found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const isSelected = selectedRun?.cacheKey === run.cacheKey;

        return (
          <div
            key={run.cacheKey}
            onClick={() => onSelectRun(run)}
            className={cn(
              "bg-surface-container-lowest dark:bg-slate-900/95 p-4 rounded-2xl border cursor-pointer transition-all",
              isSelected
                ? "border-primary shadow-lg ring-2 ring-primary/20"
                : "border-outline-variant/10 dark:border-slate-700 hover:shadow-md hover:border-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-black text-on-surface">
                    Generate #{run.generationNumber}
                  </span>
                  {run.isCurrent && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-wider">
                      LATEST
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimestamp(run.timestamp)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Total
                    </span>
                    <span className="text-lg font-black text-on-surface">
                      {run.totalCount}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Pending
                    </span>
                    <span
                      className={cn(
                        "text-lg font-black px-2 py-0.5 rounded inline-block w-fit",
                        getStatusBadgeClass(run.pendingCount, "pending"),
                      )}
                    >
                      {run.pendingCount}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Approved
                    </span>
                    <span
                      className={cn(
                        "text-lg font-black px-2 py-0.5 rounded inline-block w-fit",
                        getStatusBadgeClass(run.approvedCount, "approved"),
                      )}
                    >
                      {run.approvedCount}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Rejected
                    </span>
                    <span
                      className={cn(
                        "text-lg font-black px-2 py-0.5 rounded inline-block w-fit",
                        getStatusBadgeClass(run.rejectedCount, "rejected"),
                      )}
                    >
                      {run.rejectedCount}
                    </span>
                  </div>
                </div>

                {run.supersededCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-outline-variant/10 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Superseded:
                      </span>
                      <span
                        className={cn(
                          "text-sm font-black px-2 py-0.5 rounded",
                          getStatusBadgeClass(
                            run.supersededCount,
                            "superseded",
                          ),
                        )}
                      >
                        {run.supersededCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <ChevronRight
                className={cn(
                  "w-5 h-5 transition-transform flex-shrink-0",
                  isSelected
                    ? "text-primary rotate-90"
                    : "text-on-surface-variant",
                )}
              />
            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-outline-variant/10 dark:border-slate-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRun(run);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Show all suggestions
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
