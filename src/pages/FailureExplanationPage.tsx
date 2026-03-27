import React, { useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Code2,
  Terminal,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldAlert,
  Globe,
  MessageSquare,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation, Trans } from "react-i18next";
import { useTestRuns } from "../hooks/useTestRuns";
import { useProjects } from "../hooks/useProjects";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";

export default function FailureExplanationPage() {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Use first project by default
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const { testRuns, loading, refetch } = useTestRuns(
    selectedProjectId,
    "failed",
  );

  // Get the most recent failed test run
  const failedRun = testRuns.length > 0 ? testRuns[0] : null;

  const handleReAnalyze = () => {
    refetch();
    toast.success(t("failureExplanation.success.reAnalyzed"));
  };

  if (loading) {
    return (
      <MainLayout title={t("failureExplanation.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <Skeleton className="h-96 rounded-3xl" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-64 rounded-3xl" />
              <Skeleton className="h-48 rounded-3xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!failedRun) {
    return (
      <MainLayout title={t("failureExplanation.title")}>
        <div className="space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
                {t("failureExplanation.title")}
              </h1>
              <p className="text-on-surface-variant">
                {t("failureExplanation.subtitle")}
              </p>
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </header>
          <div className="bg-surface-container-lowest p-12 rounded-3xl text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              {t("failureExplanation.empty.title")}
            </h3>
            <p className="text-on-surface-variant">
              {t("failureExplanation.empty.desc")}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const failureRate =
    failedRun.totalTests > 0
      ? ((failedRun.failedTests / failedRun.totalTests) * 100).toFixed(1)
      : "0";

  return (
    <MainLayout title={t("failureExplanation.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("failureExplanation.title")}
            </h1>
            <p className="text-on-surface-variant">
              {t("failureExplanation.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleReAnalyze}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {t("failureExplanation.reAnalyze")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Analysis Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Failure Card */}
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border-2 border-error/20 shadow-xl shadow-error/5">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-error-container rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-error" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-on-surface tracking-tight">
                      {failedRun.testSuiteName}
                    </h3>
                    <p className="text-sm font-mono text-on-surface-variant mt-1">
                      Run ID: {failedRun.id.substring(0, 8)} •{" "}
                      {new Date(failedRun.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="px-4 py-1.5 bg-error-container text-on-error-container text-xs font-black rounded-full uppercase tracking-widest">
                  {failedRun.failedTests} Failed
                </span>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t("failureExplanation.analysis.title")}
                  </h4>
                  <p className="text-lg text-on-surface leading-relaxed font-medium">
                    {failedRun.failedTests > 1
                      ? `Multiple test cases failed in this run. The primary issue appears to be related to ${failedRun.testSuiteName} configuration or environment setup.`
                      : `A test case failed during execution. Review the error details and logs to identify the root cause.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                    <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                      {t("failureExplanation.analysis.expected")}
                    </h5>
                    <p className="text-sm text-on-surface leading-relaxed">
                      All {failedRun.totalTests} test cases should pass with
                      valid responses and correct status codes.
                    </p>
                  </div>
                  <div className="p-6 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                    <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                      {t("failureExplanation.analysis.suggested")}
                    </h5>
                    <p className="text-sm text-on-surface leading-relaxed">
                      Review test case assertions, verify environment
                      configuration, and check API endpoint availability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Run Details */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-mono text-slate-400">
                    {t("failureExplanation.analysis.executionDetails")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="p-8 font-mono text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Total Tests:</span>
                  <span className="text-slate-200">{failedRun.totalTests}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Passed:</span>
                  <span className="text-emerald-400">
                    {failedRun.passedTests}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Failed:</span>
                  <span className="text-rose-400">{failedRun.failedTests}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Duration:</span>
                  <span className="text-slate-200">{failedRun.duration}ms</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Environment:</span>
                  <span className="text-slate-200">
                    {failedRun.environmentName || "Default"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-rose-400 uppercase">
                    {failedRun.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t("failureExplanation.impact.title")}
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                      {t("failureExplanation.impact.failureRate")}
                    </p>
                    <p className="text-lg font-black text-rose-600">
                      {failureRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                      {t("failureExplanation.impact.testSuite")}
                    </p>
                    <p className="text-sm font-black text-on-surface truncate">
                      {failedRun.testSuiteName}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-outline-variant/10">
                <button className="w-full py-4 bg-on-surface dark:bg-on-surface-variant text-surface dark:text-on-surface rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all">
                  {t("failureExplanation.impact.viewDetails")}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-4">
                {t("failureExplanation.similar.title")}
              </h3>
              {testRuns.slice(1, 3).length > 0 ? (
                <div className="space-y-4">
                  {testRuns.slice(1, 3).map((run, i) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-surface-container-high rounded-2xl cursor-pointer hover:bg-surface-container-high transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {run.id.substring(0, 8)}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(run.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-error">
                        {run.failedTests} failed
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  {t("failureExplanation.similar.none")}
                </p>
              )}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">
                  {t("failureExplanation.selfHealing.title")}
                </span>
              </div>
              <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                <Trans i18nKey="failureExplanation.selfHealing.tip">
                  Enable <span className="font-bold">Auto-Fix</span> for this
                  suite to allow the LLM to automatically update test cases when
                  API schemas change.
                </Trans>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
