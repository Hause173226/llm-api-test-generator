import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Layers,
  Activity,
  Database,
  FileText,
  Network,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { projectService } from "../services";
import { handleError } from "../utils/errorHandler";

export default function ProjectDetailedViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [project, setProject] = useState<any>(null);
  const [testSuites, setTestSuites] = useState<any[]>([]);
  const [specifications, setSpecifications] = useState<any[]>([]);
  const [hasSpecifications, setHasSpecifications] = useState(false);
  const [hasEndpoints, setHasEndpoints] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch project details
        const projectData = await projectService.getProjectDetail(id);
        setProject(projectData);

        // Check if project has specifications
        try {
          const { default: specificationService } =
            await import("../services/specificationService");
          const specs = await specificationService.getSpecifications(id);
          setSpecifications(Array.isArray(specs) ? specs : []);
          setHasSpecifications(Array.isArray(specs) && specs.length > 0);
        } catch (err) {
          console.error("Failed to fetch specifications:", err);
          setHasSpecifications(false);
        }

        // Check if project has endpoints
        setHasEndpoints((projectData.totalEndpoints || 0) > 0);

        // TODO: Fetch test suites for this project
        // const suitesData = await testSuiteService.getTestSuites(id);
        // setTestSuites(suitesData);
      } catch (err) {
        const errorMessage = handleError(err);
        setError(errorMessage);
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
            <Link
              to="/projects"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getSpecIcon = (specType: string) => {
    if (specType?.toLowerCase().includes("openapi")) return FileText;
    if (specType?.toLowerCase().includes("graphql")) return Network;
    return Database;
  };

  const SpecIcon = getSpecIcon(project.specType);

  return (
    <MainLayout title={t("projectDetail.title")}>
      <div className="space-y-8">
        <header className="flex flex-col gap-6">
          <Link
            to="/projects"
            className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all group w-fit"
          >
            <ChevronLeft className="w-5 h-5" />
            {t("projectDetail.back")}
          </Link>
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
                {project.totalTestSuites || 0}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl w-fit">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                Last Run
              </p>
              <p className="text-xl font-black text-on-surface">
                {project.lastRunAt
                  ? new Date(project.lastRunAt).toLocaleDateString()
                  : "Never"}
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
                {project.totalEndpoints || 0}
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
              {!hasSpecifications ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    No Specification Uploaded
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    Upload an API specification file (OpenAPI, Swagger, Postman)
                    to get started.
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 mx-auto font-semibold"
                  >
                    <FileText className="w-5 h-5" />
                    Upload Specification
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        Total Specifications
                      </span>
                      <span className="text-on-surface font-bold">
                        {specifications.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        Latest Specification
                      </span>
                      <span className="text-on-surface font-bold">
                        {specifications[0]?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        Type
                      </span>
                      <span className="text-on-surface font-bold">
                        {specifications[0]?.type || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        Total Endpoints
                      </span>
                      <span className="text-on-surface font-bold">
                        {project.totalEndpoints || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">
                        Uploaded At
                      </span>
                      <span className="text-on-surface font-bold">
                        {specifications[0]?.createdAt
                          ? new Date(
                              specifications[0].createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="w-full px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 flex items-center justify-center gap-2 font-semibold transition-colors mt-4"
                  >
                    <FileText className="w-5 h-5" />
                    Manage Specifications
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Test Suites Section */}
          <section className="bg-surface-container-low dark:bg-surface-container-high rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 dark:bg-surface-container-highest/30 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                <Layers className="w-5 h-5 text-primary" />
                Test Suites
              </h2>
              {hasEndpoints && (
                <button
                  onClick={() => navigate(`/test-suites?projectId=${id}`)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Create Suite
                </button>
              )}
            </div>
            <div className="p-8 flex-1">
              {!hasSpecifications ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    No API Specification Yet
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    You need to upload an API specification before creating test
                    suites.
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 mx-auto font-semibold"
                  >
                    <FileText className="w-5 h-5" />
                    Upload Specification
                  </button>
                </div>
              ) : !hasEndpoints ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-on-surface font-bold text-lg mb-2">
                    Specification is Being Parsed
                  </p>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                    Your specification is being parsed automatically. This may
                    take a few moments. Check the Specifications page to see the
                    parse status.
                  </p>
                  <button
                    onClick={() => navigate(`/specifications?projectId=${id}`)}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 mx-auto font-semibold"
                  >
                    <FileText className="w-5 h-5" />
                    View Specifications
                  </button>
                </div>
              ) : testSuites.length > 0 ? (
                <div className="space-y-4">
                  {testSuites.map((suite) => (
                    <div
                      key={suite.id}
                      className="p-4 bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant/10"
                    >
                      <p className="font-bold text-on-surface">{suite.name}</p>
                      <p className="text-sm text-on-surface-variant">
                        {suite.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                  <p className="text-on-surface-variant font-medium mb-4">
                    No test suites yet
                  </p>
                  <p className="text-sm text-on-surface-variant/70 mb-6">
                    Create your first test suite to start testing this project
                  </p>
                  <button
                    onClick={() => navigate(`/test-suites?projectId=${id}`)}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 mx-auto font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Test Suite
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
