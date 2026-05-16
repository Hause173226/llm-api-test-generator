import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Layers,
  Database,
  FileText,
  Network,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useTranslation } from "react-i18next";
import { projectService } from "../services";
import { handleError } from "../utils/errorHandler";
import { cn } from "../lib/utils";
import { useProject } from "../contexts/ProjectContext";

export default function ProjectDetailedViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const selectedProjectId = selectedProject?.id || "";
  const lastProjectIdRef = useRef<string | null>(null);

  const [project, setProject] = useState<any>(null);
  const [testSuites, setTestSuites] = useState<any[]>([]);
  const [hasEndpoints, setHasEndpoints] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      lastProjectIdRef.current = selectedProjectId || null;
      return;
    }

    if (
      lastProjectIdRef.current &&
      lastProjectIdRef.current !== selectedProjectId
    ) {
      navigate("/projects", { replace: true });
    }

    lastProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId, navigate]);

  const getActiveSpecSummary = (projectData: any) =>
    projectData?.activeSpecSummary || projectData?.ActiveSpecSummary || null;

  const getProjectEndpointCount = (projectData: any): number => {
    const summary = getActiveSpecSummary(projectData);
    return (
      projectData?.totalEndpoints ||
      projectData?.TotalEndpoints ||
      summary?.endpointCount ||
      summary?.EndpointCount ||
      0
    );
  };

  const hasSpecifications = (projectData: any): boolean => {
    return (
      (projectData?.totalSpecifications ?? 0) > 0 ||
      !!projectData?.activeSpecName ||
      !!getActiveSpecSummary(projectData)
    );
  };

  const mapParseStatus = (raw: string): string => {
    switch (raw?.toLowerCase()) {
      case "success": return t("projectDetail.dataSource.parseStatusMap.success");
      case "failed": return t("projectDetail.dataSource.parseStatusMap.failed");
      case "processing":
      case "inprogress": return t("projectDetail.dataSource.parseStatusMap.processing");
      case "pending": return t("projectDetail.dataSource.parseStatusMap.pending");
      default: return raw || "—";
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);

        const projectData = await projectService.getProjectDetail(id);
        setProject(projectData);
        setHasEndpoints(getProjectEndpointCount(projectData) > 0);

        try {
          const { testSuiteService } = await import("../services/testSuiteService");
          const suitesData = await testSuiteService.getTestSuites(id);
          setTestSuites(Array.isArray(suitesData) ? suitesData : []);
        } catch (err) {
          console.error("Failed to fetch test suites:", err);
          setTestSuites([]);
        }
      } catch (err) {
        setError(handleError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [id]);

  if (isLoading) {
    return (
      <MainLayout title={t("projectDetail.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout title={t("projectDetail.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">
              {error || "Project not found"}
            </p>
            <button
              onClick={() => navigate("/projects")}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer transition-colors"
            >
              {t("common.projectManagement")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const summary = getActiveSpecSummary(project);
  const specExists = hasSpecifications(project);

  // Data source overview — map từ BE fields
  const totalSpecifications = project.totalSpecifications ?? 0;
  const activeSpecName = project.activeSpecName || "—";
  const activeEndpointCount =
    summary?.endpointCount ?? summary?.EndpointCount ??
    project.totalEndpoints ?? project.TotalEndpoints ?? 0;
  const activeParseStatusRaw =
    summary?.parseStatus ?? summary?.ParseStatus ??
    project.parseStatus ?? "";
  const activeSourceType =
    summary?.sourceType ?? summary?.SourceType ?? project.sourceType ?? "—";
  const activeUpdatedAt =
    summary?.updatedDateTime ?? summary?.UpdatedDateTime ??
    project.updatedDateTime ?? "";

  // Determine spec state for test suites section
  const parseStatusLower = activeParseStatusRaw?.toLowerCase() ?? "";
  const isSpecParsing = specExists && (parseStatusLower === "pending" || parseStatusLower === "processing" || parseStatusLower === "inprogress");
  const isSpecParseFailed = specExists && parseStatusLower === "failed";
  const isSpecParsed = specExists && parseStatusLower === "success";

  const totalEndpoints = activeEndpointCount;
  const totalSuites =
    project.totalTestSuites || project.totalSuites || testSuites.length || 0;
  const lastRunAt = project.lastRunAt || project.lastExecutionDate;

  return (
    <MainLayout
      title={t("projectDetail.title")}
      breadcrumbs={[
        { label: t("common.projectManagement"), href: "/projects" },
        { label: project?.name || t("projectDetail.title") },
      ]}
    >
      <div className="space-y-8">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {project.name}
            </h1>
            <p className="text-lg text-on-surface-variant font-medium">
              {project.description}
            </p>
          </div>
        </header>

        {/* Project Overview Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-primary-fixed/30 rounded-2xl w-fit">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                {t("projectDetail.metrics.totalSuites")}
              </p>
              <p className="text-4xl font-black text-on-surface">
                {totalSuites}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl w-fit">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                {t("projectDetail.metrics.successRate")}
              </p>
              <p className="text-xl font-black text-on-surface">
                {lastRunAt ? new Date(lastRunAt).toLocaleDateString() : t("projects.never")}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl w-fit">
              <Network className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                {t("projectDetail.metrics.endpoints")}
              </p>
              <p className="text-4xl font-black text-on-surface">
                {totalEndpoints}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Source Configuration */}
          <section className="bg-surface-container-low dark:bg-surface-container-high rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 dark:bg-surface-container-highest/30">
              <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                {t("projectDetail.dataSource.title")}
              </h2>
            </div>
            <div className="p-8 flex-1 space-y-6">
              {!specExists ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    {t("projectDetail.dataSource.noSpec")}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    {t("projectDetail.dataSource.noSpecDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {t("projectDetail.dataSource.uploadSpec")}
                  </button>
                  <button
                    onClick={() => navigate(`/srs-documents`)}
                    className="mt-3 px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Open SRS Workflow
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {/* Tổng số Đặc tả */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.totalSpecs")}
                      </span>
                      <span className="text-on-surface font-bold">
                        {totalSpecifications}
                      </span>
                    </div>
                    {/* Đặc tả đang hoạt động */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.activeSpec")}
                      </span>
                      <span className="text-on-surface font-bold truncate max-w-[180px]" title={activeSpecName}>
                        {activeSpecName}
                      </span>
                    </div>
                    {/* Tổng số Điểm cuối */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.totalEndpoints")}
                      </span>
                      <span className="text-on-surface font-bold">
                        {activeEndpointCount}
                      </span>
                    </div>
                    {/* Trạng thái Phân tích */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.parseStatus")}
                      </span>
                      <span className={cn(
                        "text-sm font-bold px-2.5 py-0.5 rounded-full",
                        parseStatusLower === "success"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : parseStatusLower === "failed"
                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      )}>
                        {mapParseStatus(activeParseStatusRaw)}
                      </span>
                    </div>
                    {/* Loại nguồn */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.sourceType")}
                      </span>
                      <span className="text-on-surface font-bold">
                        {activeSourceType}
                      </span>
                    </div>
                    {/* Cập nhật gần nhất */}
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        {t("projectDetail.dataSource.lastUpdated")}
                      </span>
                      <span className="text-on-surface font-bold">
                        {formatDate(activeUpdatedAt)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer button */}
            <div className="px-8 py-5 border-t border-outline-variant/10">
              <button
                onClick={() => navigate(`/specifications?projectId=${id}`)}
                className="w-full px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                {t("projectDetail.dataSource.manageSpecs")}
              </button>
            </div>
          </section>

          {/* Test Suites Section */}
          <section className="bg-surface-container-low dark:bg-surface-container-high rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 dark:bg-surface-container-highest/30 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                <Layers className="w-5 h-5 text-primary" />
                {t("projectDetail.testSuites.title")}
              </h2>
              {/* {hasEndpoints && (
                <button
                  onClick={() => navigate(`/test-suites?projectId=${id}`)}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-lg flex items-center gap-2 text-sm font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("projectDetail.testSuites.createSuite")}
                </button>
              )} */}
            </div>
            <div className="p-8 flex-1">
              {!specExists ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    {t("projectDetail.testSuites.noSpec")}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    {t("projectDetail.testSuites.noSpecDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {t("projectDetail.dataSource.uploadSpec")}
                  </button>
                </div>
              ) : isSpecParsing ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    {t("projectDetail.testSuites.parsing")}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    {t("projectDetail.testSuites.parsingDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {t("projectDetail.dataSource.viewSpecs")}
                  </button>
                  <button
                    onClick={() => navigate(`/srs-documents`)}
                    className="mt-3 px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Open SRS Workflow
                  </button>
                </div>
              ) : isSpecParseFailed ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    {t("projectDetail.testSuites.parseFailed")}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    {t("projectDetail.testSuites.parseFailedDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {t("projectDetail.dataSource.manageSpecs")}
                  </button>
                  <button
                    onClick={() => navigate(`/srs-documents`)}
                    className="mt-3 px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Open SRS Workflow
                  </button>
                </div>
              ) : isSpecParsed && !hasEndpoints ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    {t("projectDetail.testSuites.noEndpoints")}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    {t("projectDetail.testSuites.noEndpointsDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {t("projectDetail.dataSource.viewSpecs")}
                  </button>
                </div>
              ) : testSuites.length > 0 ? (
                <div>
                  {[...testSuites]
                    .sort((a, b) => {
                      const dateA = new Date(a.updatedDateTime || a.createdDateTime || 0).getTime();
                      const dateB = new Date(b.updatedDateTime || b.createdDateTime || 0).getTime();
                      return dateB - dateA;
                    })
                    .slice(0, 2)
                    .map((suite) => (
                      <button
                        key={suite.id}
                        onClick={() => navigate(`/test-suites/${suite.id}`)}
                        className="w-full flex items-center gap-2 px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 overflow-hidden first:border-t first:border-outline-variant/10"
                      >
                        <span className="font-semibold text-sm text-on-surface truncate group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                          {suite.name}
                        </span>
                        <span className="text-on-surface-variant/40 text-sm shrink-0">—</span>
                        <span className="shrink-0 px-2.5 py-1 bg-surface-container dark:bg-slate-700 rounded-full text-[11px] font-medium text-on-surface-variant whitespace-nowrap">
                          {suite.selectedEndpointCount ?? 0} endpoint • {suite.testCaseCount ?? 0} test case
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                  <p className="text-on-surface-variant font-medium mb-4">
                    {t("projectDetail.testSuites.empty")}
                  </p>
                  <p className="text-sm text-on-surface-variant/70 mb-6">
                    {t("projectDetail.testSuites.emptyDesc")}
                  </p>
                  <button
                    onClick={() => navigate(`/test-suites?projectId=${id}`)}
                    className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 mx-auto font-semibold cursor-pointer transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {t("projectDetail.testSuites.createFirst")}
                  </button>
                </div>
              )}
            </div>

            {/* Footer button — cùng hàng với nút Quản lý Đặc tả bên card trái */}
            <div className="px-8 py-5 border-t border-outline-variant/10">
              <button
                onClick={() => navigate(`/test-suites?projectId=${id}`)}
                className="w-full px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer"
              >
                <Layers className="w-5 h-5" />
                {t("projectDetail.testSuites.manage")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
