import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Plus,
  RefreshCw,
  Zap,
  ShieldAlert,
  Clock,
  ArrowRight,
  Info,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useSuggestions } from "../hooks/useSuggestions";
import { useProjects } from "../hooks/useProjects";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";

export default function SuggestionsPage() {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showImplementModal, setShowImplementModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null,
  );
  const [testSuiteId, setTestSuiteId] = useState<string>("");

  // Use first project by default
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const {
    suggestions,
    stats,
    loading,
    generating,
    pagination,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    implementSuggestion,
    changePage,
    refetch,
  } = useSuggestions(selectedProjectId, typeFilter, statusFilter);

  const handleGenerate = async () => {
    if (!selectedProjectId) {
      toast.error(t("suggestions.errors.noProject"));
      return;
    }

    const success = await generateSuggestions({
      projectId: selectedProjectId,
      types: typeFilter ? [typeFilter] : undefined,
      maxSuggestions: 10,
    });

    if (success) {
      toast.success(t("suggestions.success.generated"));
    }
  };

  const handleAccept = async (suggestionId: string) => {
    const success = await acceptSuggestion(suggestionId);
    if (success) {
      toast.success(t("suggestions.success.accepted"));
    }
  };

  const handleReject = async (suggestionId: string) => {
    const success = await rejectSuggestion(suggestionId);
    if (success) {
      toast.success(t("suggestions.success.rejected"));
    }
  };

  const handleImplement = async () => {
    if (!selectedSuggestion || !testSuiteId) {
      toast.error(t("suggestions.errors.missingFields"));
      return;
    }

    const success = await implementSuggestion(selectedSuggestion, testSuiteId);
    if (success) {
      toast.success(t("suggestions.success.implemented"));
      setShowImplementModal(false);
      setSelectedSuggestion(null);
      setTestSuiteId("");
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "security":
        return ShieldAlert;
      case "performance":
        return Zap;
      case "edge_case":
        return Target;
      case "optimization":
        return TrendingUp;
      default:
        return CheckCircle2;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "security":
        return { text: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" };
      case "performance":
        return {
          text: "text-amber-500",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        };
      case "edge_case":
        return {
          text: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-900/20",
        };
      case "optimization":
        return { text: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" };
      default:
        return {
          text: "text-emerald-500",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300";
      case "high":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300";
      case "medium":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
      default:
        return "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300";
    }
  };

  if (loading && !suggestions.length) {
    return (
      <MainLayout title={t("suggestions.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("suggestions.title")}>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("suggestions.title")}
            </h1>
            <p className="text-on-surface-variant max-w-2xl">
              {t("suggestions.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-3 rounded-xl bg-surface-container-low dark:bg-surface-container-high text-on-surface font-bold text-sm border-none focus:ring-4 focus:ring-primary-fixed"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedProjectId}
              className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generating ? (
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {t("suggestions.reAnalyze")}
            </button>
          </div>
        </header>

        {/* Intelligence Overview Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-3xl text-white shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-primary-container uppercase tracking-widest mb-2">
                {t("suggestions.metrics.score")}
              </p>
              <h3 className="text-5xl font-black">
                {stats?.coverageScore?.toFixed(1) || "0.0"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                {stats?.trend > 0 ? "+" : ""}
                {stats?.trend || 0}% {t("suggestions.metrics.scoreTrend")}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("suggestions.metrics.gaps")}
              </p>
              <h3 className="text-5xl font-black text-on-surface">
                {stats?.totalGaps || 0}
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">
              {t("suggestions.metrics.gapsDesc")}
            </p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("suggestions.metrics.timeSaved")}
              </p>
              <h3 className="text-5xl font-black text-on-surface">
                {stats?.estimatedTimeSaved || 0}h
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">
              {t("suggestions.metrics.timeSavedDesc")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container-high text-on-surface font-bold text-sm border-none focus:ring-4 focus:ring-primary-fixed"
          >
            <option value="">{t("suggestions.filters.allTypes")}</option>
            <option value="test_case">{t("suggestions.types.testCase")}</option>
            <option value="edge_case">{t("suggestions.types.edgeCase")}</option>
            <option value="security">{t("suggestions.types.security")}</option>
            <option value="performance">
              {t("suggestions.types.performance")}
            </option>
            <option value="optimization">
              {t("suggestions.types.optimization")}
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container-high text-on-surface font-bold text-sm border-none focus:ring-4 focus:ring-primary-fixed"
          >
            <option value="">{t("suggestions.filters.allStatus")}</option>
            <option value="pending">{t("suggestions.status.pending")}</option>
            <option value="accepted">{t("suggestions.status.accepted")}</option>
            <option value="rejected">{t("suggestions.status.rejected")}</option>
            <option value="implemented">
              {t("suggestions.status.implemented")}
            </option>
          </select>
        </div>

        {/* Suggestions List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {t("suggestions.active.title")} ({pagination.totalCount})
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
              <Info className="w-4 h-4" />
              <span>{t("suggestions.active.sortBy")}</span>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-12 rounded-2xl border border-outline-variant/10 text-center">
              <Sparkles className="w-16 h-16 text-on-surface-variant mx-auto mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {t("suggestions.empty.title")}
              </h3>
              <p className="text-on-surface-variant">
                {t("suggestions.empty.desc")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {suggestions.map((suggestion) => {
                const Icon = getSuggestionIcon(suggestion.type);
                const colors = getSuggestionColor(suggestion.type);

                return (
                  <div
                    key={suggestion.id}
                    className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                      <div className="flex items-start gap-6 flex-1">
                        <div className={cn("p-4 rounded-2xl", colors.bg)}>
                          <Icon className={cn("w-8 h-8", colors.text)} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-bold text-on-surface tracking-tight">
                              {suggestion.title}
                            </h3>
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                getPriorityColor(suggestion.priority),
                              )}
                            >
                              {suggestion.priority}{" "}
                              {t("suggestions.item.priority")}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                              {Math.round(suggestion.confidence)}%{" "}
                              {t("suggestions.item.confidence")}
                            </span>
                          </div>
                          <p className="text-on-surface-variant leading-relaxed">
                            {suggestion.description}
                          </p>
                          {suggestion.reasoning && (
                            <p className="text-xs text-on-surface-variant/70 italic">
                              {suggestion.reasoning}
                            </p>
                          )}
                          <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                              <Sparkles className="w-4 h-4" />
                              <span>
                                {t("suggestions.item.type")}: {suggestion.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(
                                  suggestion.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {suggestion.status === "pending" && (
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                          <button
                            onClick={() => handleAccept(suggestion.id)}
                            className="px-6 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {t("suggestions.item.accept")}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSuggestion(suggestion.id);
                              setShowImplementModal(true);
                            }}
                            className="px-6 py-3 bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {t("suggestions.item.implement")}
                          </button>
                          <button
                            onClick={() => handleReject(suggestion.id)}
                            className="px-6 py-3 bg-surface-container-high dark:bg-surface-container-highest text-error font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            {t("suggestions.item.dismiss")}
                          </button>
                        </div>
                      )}

                      {suggestion.status !== "pending" && (
                        <div className="px-6 py-3 bg-surface-container-high dark:bg-surface-container-highest rounded-xl">
                          <span className="text-xs font-bold text-on-surface-variant uppercase">
                            {t(`suggestions.status.${suggestion.status}`)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => changePage(pagination.pageNumber - 1)}
                disabled={pagination.pageNumber === 1}
                className="px-4 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container-high text-on-surface font-bold text-sm disabled:opacity-50"
              >
                {t("common.previous")}
              </button>
              <span className="px-4 py-2 text-sm font-bold text-on-surface">
                {pagination.pageNumber} / {pagination.totalPages}
              </span>
              <button
                onClick={() => changePage(pagination.pageNumber + 1)}
                disabled={pagination.pageNumber === pagination.totalPages}
                className="px-4 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container-high text-on-surface font-bold text-sm disabled:opacity-50"
              >
                {t("common.next")}
              </button>
            </div>
          )}
        </section>

        {/* Auto-Generation Banner */}
        <div className="bg-surface-container-low dark:bg-surface-container-high p-10 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div
            className="absolute top-0 left-0 w-full h-full opacity-5 dark:opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          ></div>
          <div className="relative z-10 space-y-4 max-w-2xl">
            <h3 className="text-3xl font-bold text-on-surface tracking-tight leading-tight">
              {t("suggestions.banner.title")}
            </h3>
            <p className="text-on-surface-variant">
              {t("suggestions.banner.desc")}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="relative z-10 px-8 py-4 bg-on-surface dark:bg-on-surface-variant text-surface dark:text-on-surface rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl group disabled:opacity-50"
          >
            {t("suggestions.banner.launch")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Implement Modal */}
      {showImplementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-on-surface mb-4">
              {t("suggestions.implement.title")}
            </h3>
            <p className="text-on-surface-variant mb-6">
              {t("suggestions.implement.desc")}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("suggestions.implement.testSuite")}
                </label>
                <input
                  type="text"
                  value={testSuiteId}
                  onChange={(e) => setTestSuiteId(e.target.value)}
                  placeholder={t("suggestions.implement.testSuitePlaceholder")}
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-surface-container-high rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleImplement}
                  className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] transition-all"
                >
                  {t("suggestions.implement.confirm")}
                </button>
                <button
                  onClick={() => {
                    setShowImplementModal(false);
                    setSelectedSuggestion(null);
                    setTestSuiteId("");
                  }}
                  className="flex-1 px-6 py-3 bg-surface-container-high dark:bg-surface-container-highest text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all"
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
