import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  PieChart,
  Activity,
  ShieldCheck,
  Zap,
  ChevronDown,
  ArrowUpRight,
  FileText,
  Trash2,
  Plus,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useReports } from "../hooks/useReports";
import { useProjects } from "../hooks/useProjects";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";

export default function ReportsPage() {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dateRange, setDateRange] = useState<number>(30);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Use first project by default
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const {
    reports,
    coverageReport,
    trendReport,
    performanceReport,
    loading,
    generating,
    generateReport,
    deleteReport,
    exportReport,
    refetchTrend,
  } = useReports(selectedProjectId);

  const [formData, setFormData] = useState({
    name: "",
    type: "test_run",
    description: "",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const handleGenerate = async () => {
    if (!formData.name) {
      toast.error(t("reports.errors.missingName"));
      return;
    }

    const success = await generateReport({
      projectId: selectedProjectId,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      dateRange: {
        startDate: formData.startDate,
        endDate: formData.endDate,
      },
    });

    if (success) {
      toast.success(t("reports.success.generated"));
      setShowGenerateModal(false);
      setFormData({
        name: "",
        type: "test_run",
        description: "",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      });
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm(t("reports.confirm.delete"))) return;

    const success = await deleteReport(reportId);
    if (success) {
      toast.success(t("reports.success.deleted"));
    }
  };

  const handleExport = async (
    reportId: string,
    format: "pdf" | "excel" | "json",
  ) => {
    setExportingId(reportId);
    const success = await exportReport(reportId, format);
    setExportingId(null);

    if (success) {
      toast.success(t("reports.success.exported"));
    }
  };

  const handleDateRangeChange = (days: number) => {
    setDateRange(days);
    refetchTrend(days);
  };

  // Calculate metrics from trend report
  const metrics = React.useMemo(() => {
    if (!trendReport || !trendReport.dataPoints.length) {
      return {
        passRate: 0,
        avgResponseTime: 0,
        coverage: 0,
        totalExecutions: 0,
        passRateTrend: 0,
        responseTrend: 0,
        coverageTrend: 0,
        executionsTrend: 0,
      };
    }

    const recent = trendReport.dataPoints.slice(-7);
    const previous = trendReport.dataPoints.slice(-14, -7);

    const recentAvgPassRate =
      recent.reduce((sum, d) => sum + d.passRate, 0) / recent.length;
    const previousAvgPassRate =
      previous.length > 0
        ? previous.reduce((sum, d) => sum + d.passRate, 0) / previous.length
        : recentAvgPassRate;

    const recentAvgDuration =
      recent.reduce((sum, d) => sum + d.avgDuration, 0) / recent.length;
    const previousAvgDuration =
      previous.length > 0
        ? previous.reduce((sum, d) => sum + d.avgDuration, 0) / previous.length
        : recentAvgDuration;

    const totalTests = recent.reduce((sum, d) => sum + d.totalTests, 0);
    const previousTotalTests =
      previous.length > 0
        ? previous.reduce((sum, d) => sum + d.totalTests, 0)
        : totalTests;

    return {
      passRate: recentAvgPassRate,
      avgResponseTime: Math.round(recentAvgDuration),
      coverage: coverageReport?.coveragePercentage || 0,
      totalExecutions: totalTests,
      passRateTrend: (
        ((recentAvgPassRate - previousAvgPassRate) / previousAvgPassRate) *
        100
      ).toFixed(1),
      responseTrend: Math.round(recentAvgDuration - previousAvgDuration),
      coverageTrend: 0,
      executionsTrend: totalTests - previousTotalTests,
    };
  }, [trendReport, coverageReport]);

  if (loading) {
    return (
      <MainLayout title={t("reports.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("reports.title")}>
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("reports.title")}
            </h1>
            <p className="text-on-surface-variant">{t("reports.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(Number(e.target.value))}
              className="px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/10 cursor-pointer hover:bg-surface-container-low transition-colors text-on-surface font-bold text-sm"
            >
              <option value={7}>{t("reports.dateRange.last7Days")}</option>
              <option value={30}>{t("reports.dateRange.last30Days")}</option>
              <option value={90}>{t("reports.dateRange.last90Days")}</option>
            </select>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              {t("reports.generate")}
            </button>
          </div>
        </header>

        {/* High Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: t("reports.metrics.passRate"),
              value: `${metrics.passRate.toFixed(1)}%`,
              trend: `${metrics.passRateTrend > 0 ? "+" : ""}${metrics.passRateTrend}%`,
              up: Number(metrics.passRateTrend) >= 0,
              icon: ShieldCheck,
              color: "text-emerald-500",
            },
            {
              label: t("reports.metrics.responseTime"),
              value: `${metrics.avgResponseTime}ms`,
              trend: `${metrics.responseTrend > 0 ? "+" : ""}${metrics.responseTrend}ms`,
              up: metrics.responseTrend <= 0,
              icon: Zap,
              color: "text-amber-500",
            },
            {
              label: t("reports.metrics.testCoverage"),
              value: `${metrics.coverage.toFixed(1)}%`,
              trend: `${metrics.coverageTrend > 0 ? "+" : ""}${metrics.coverageTrend}%`,
              up: metrics.coverageTrend >= 0,
              icon: Activity,
              color: "text-primary",
            },
            {
              label: t("reports.metrics.totalExecutions"),
              value: metrics.totalExecutions.toLocaleString(),
              trend: `${metrics.executionsTrend > 0 ? "+" : ""}${metrics.executionsTrend}`,
              up: metrics.executionsTrend >= 0,
              icon: BarChart3,
              color: "text-indigo-500",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={cn(
                    "p-3 rounded-2xl bg-surface-container-low",
                    stat.color,
                  )}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                    stat.up
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600",
                  )}
                >
                  {stat.up ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.trend}
                </div>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                {stat.label}
              </p>
              <h3 className="text-3xl font-black text-on-surface">
                {stat.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Reliability Chart */}
          <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-bold text-on-surface tracking-tight">
                  {t("reports.reliability.title")}
                </h3>
                <p className="text-sm text-on-surface-variant">
                  {t("reports.reliability.subtitle")}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    {t("reports.reliability.passRate")}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-80 flex items-end justify-between gap-2">
              {trendReport?.dataPoints.slice(-15).map((point, i) => {
                const height = point.passRate;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-3 group"
                  >
                    <div
                      className="w-full bg-primary/10 rounded-t-lg relative overflow-hidden"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-0 w-full bg-primary transition-all duration-500 group-hover:opacity-80 h-full"></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                      {new Date(point.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage Distribution */}
          <div className="lg:col-span-4 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-on-surface tracking-tight mb-2">
              {t("reports.coverage.title")}
            </h3>
            <p className="text-sm text-on-surface-variant mb-10">
              {t("reports.coverage.subtitle")}
            </p>

            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-48 h-48 rounded-full border-[24px] border-primary relative">
                <div
                  className="absolute inset-[-24px] rounded-full border-[24px] border-surface-container-low"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0, ${50 + 50 * Math.cos(((coverageReport?.coveragePercentage || 0) * 3.6 * Math.PI) / 180)}% ${50 - 50 * Math.sin(((coverageReport?.coveragePercentage || 0) * 3.6 * Math.PI) / 180)}%, 100% 100%, 0 100%, 0 0)`,
                  }}
                ></div>
              </div>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-on-surface">
                  {coverageReport?.coveragePercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("reports.coverage.covered")}
                </span>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-sm font-semibold text-on-surface">
                    {t("reports.coverage.tested")}
                  </span>
                </div>
                <span className="text-sm font-bold text-on-surface-variant">
                  {coverageReport?.testedEndpoints || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-surface-container-low"></div>
                  <span className="text-sm font-semibold text-on-surface">
                    {t("reports.coverage.untested")}
                  </span>
                </div>
                <span className="text-sm font-bold text-on-surface-variant">
                  {(coverageReport?.totalEndpoints || 0) -
                    (coverageReport?.testedEndpoints || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Reports List */}
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
                        {report.name}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {report.type} •{" "}
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExport(report.id, "pdf")}
                      disabled={exportingId === report.id}
                      className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {exportingId === report.id ? (
                        <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {t("reports.export")}
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {t("reports.generate")}
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("reports.form.name")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("reports.form.type")}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                >
                  <option value="test_run">{t("reports.types.testRun")}</option>
                  <option value="coverage">
                    {t("reports.types.coverage")}
                  </option>
                  <option value="performance">
                    {t("reports.types.performance")}
                  </option>
                  <option value="trend">{t("reports.types.trend")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("reports.form.description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("reports.form.startDate")}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("reports.form.endDate")}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {generating ? t("common.generating") : t("common.generate")}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all"
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
