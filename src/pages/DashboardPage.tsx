import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Plus,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Network,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useDashboard } from "../hooks/useDashboard";
import {
  MetricCardSkeleton,
  ActivityItemSkeleton,
  TableRowSkeleton,
} from "../components/ui/Skeleton";
import { signalRService } from "../services/signalrService";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const { metrics, activity, topEndpoints, isLoading, error, refetch } =
    useDashboard(selectedProject?.id);

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

  if (error) {
    return (
      <MainLayout title={t("dashboard.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              {t("dashboard.tryAgain")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("dashboard.title")}>
      <div className="space-y-8">
        {/* Hero Header */}
        <section className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("dashboard.welcome")}
              {user?.fullName && `, ${user.fullName}`}
            </h1>
            <p className="text-on-surface-variant max-w-lg">
              {t("dashboard.monitoringMsg", {
                count: metrics.activeProjects,
                rate: metrics.passRate.toFixed(1),
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              {t("dashboard.refresh")}
            </button>
            <button
              onClick={() => navigate("/projects")}
              className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary dark:text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              {t("dashboard.newProject")}
            </button>
          </div>
        </section>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {/* Active Projects */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-primary dark:text-indigo-400" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t("dashboard.activeProjects")}
                </p>
                <h3 className="text-3xl font-bold text-on-surface">
                  {metrics.activeProjects}
                </h3>
              </div>

              {/* Total Endpoints */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t("dashboard.totalEndpoints")}
                </p>
                <h3 className="text-3xl font-bold text-on-surface">
                  {metrics.totalEndpoints}
                </h3>
              </div>

              {/* Monthly Test Runs */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t("dashboard.monthlyTestRuns")}
                </p>
                <h3 className="text-3xl font-bold text-on-surface">
                  {metrics.monthlyTestRuns.toLocaleString()}
                </h3>
              </div>

              {/* Pass Rate */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t("dashboard.passRate")}
                </p>
                <h3 className="text-3xl font-bold text-on-surface">
                  {metrics.passRate.toFixed(1)}%
                </h3>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity & Top Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-on-surface tracking-tight">
                {t("dashboard.recentActivity")}
              </h3>
            </div>
            <div className="space-y-6">
              {isLoading ? (
                <>
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                </>
              ) : activity.length > 0 ? (
                activity.slice(0, 4).map((item, i) => (
                  <div key={item.id} className="flex gap-4 relative">
                    {i < 3 && (
                      <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-slate-100 dark:bg-slate-800"></div>
                    )}
                    <div
                      className={cn(
                        "z-10 w-5 h-5 rounded-full ring-4 ring-white dark:ring-slate-900 flex items-center justify-center",
                        item.type === "test_failure"
                          ? "bg-error"
                          : "bg-emerald-500",
                      )}
                    >
                      {item.type === "test_failure" ? (
                        <AlertTriangle className="w-3 h-3 text-white" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-on-surface leading-snug">
                        {item.message}
                      </p>
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <Clock className="w-3 h-3" />{" "}
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant text-center py-4">
                  {t("dashboard.noRecentActivity")}
                </p>
              )}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="lg:col-span-2 bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-6">
              <h3 className="text-xl font-bold text-on-surface">
                {t("dashboard.topApiEndpoints")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-on-surface-variant border-b border-slate-50 dark:border-slate-800">
                    <th className="px-8 py-4 font-bold">{t("common.endpoint")}</th>
                    <th className="px-8 py-4 font-bold">{t("common.method")}</th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50 dark:divide-slate-800/50">
                  {isLoading ? (
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : topEndpoints.length > 0 ? (
                    topEndpoints.slice(0, 5).map((endpoint, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">
                              {endpoint.path}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {endpoint.service}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                            {endpoint.method}
                          </span>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-8 text-center text-on-surface-variant"
                      >
                        {t("dashboard.noEndpointsFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
