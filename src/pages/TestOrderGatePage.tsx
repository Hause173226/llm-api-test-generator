import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Network,
  ArrowRight,
  Sparkles,
  Play,
  Save,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation, Trans } from "react-i18next";
import { useTestSuites } from "../hooks/useTestSuites";
import { useProject } from "../contexts/ProjectContext";
import { apiService } from "../services/apiService";

type ProposalApiResponse = {
  proposalId?: string;
  ProposalId?: string;
  rowVersion?: string;
  RowVersion?: string;
  status?: string;
  Status?: string;
};
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
import { handleError } from "../utils/errorHandler";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";
import NoProjectSelected from "../components/common/NoProjectSelected";

export default function TestOrderGatePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedSuiteId = searchParams.get("suiteId") || "";
  const queryProjectId = searchParams.get("projectId") || "";
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || queryProjectId;
  const { testSuites, isLoading: isLoadingSuites } = useTestSuites(projectId);
  const suites = Array.isArray(testSuites) ? testSuites : [];
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [suiteDetail, setSuiteDetail] = useState<any>(null);
  const [suiteEndpoints, setSuiteEndpoints] = useState<any[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);

  // Use first test suite by default
  React.useEffect(() => {
    if (
      requestedSuiteId &&
      suites.some((suite) => suite.id === requestedSuiteId)
    ) {
      setSelectedSuiteId(requestedSuiteId);
      return;
    }

    if (suites.length > 0 && !selectedSuiteId) {
      setSelectedSuiteId(suites[0].id);
    }
  }, [suites, requestedSuiteId, selectedSuiteId]);

  const [localOrder, setLocalOrder] = useState<string[]>([]);

  // Load suite endpoints by selected endpoint ids in suite scope.
  React.useEffect(() => {
    const loadSuiteOrderData = async () => {
      if (!projectId || !selectedSuiteId) {
        setSuiteDetail(null);
        setSuiteEndpoints([]);
        setLocalOrder([]);
        return;
      }

      try {
        setIsLoadingEndpoints(true);

        const detail = await testSuiteService.getTestSuiteDetail(
          projectId,
          selectedSuiteId,
        );
        setSuiteDetail(detail);

        if (!detail?.apiSpecId || !Array.isArray(detail.selectedEndpointIds)) {
          setSuiteEndpoints([]);
          setLocalOrder([]);
          return;
        }

        const response = await endpointService.getEndpoints(
          detail.projectId || projectId,
          detail.apiSpecId,
          1,
          1000,
        );

        const allEndpoints = Array.isArray(response?.items)
          ? response.items
          : [];
        const ordered = detail.selectedEndpointIds
          .map((id: string) => allEndpoints.find((ep: any) => ep.id === id))
          .filter(Boolean);

        setSuiteEndpoints(ordered);
        setLocalOrder(ordered.map((ep: any) => ep.id));
      } catch (err) {
        handleError(err);
        setSuiteEndpoints([]);
        setLocalOrder([]);
      } finally {
        setIsLoadingEndpoints(false);
      }
    };

    loadSuiteOrderData();
  }, [projectId, selectedSuiteId]);

  const handleSaveOrder = async () => {
    if (!projectId || !selectedSuiteId || !suiteDetail) {
      return;
    }

    try {
      const latestProposal = await apiService.get<ProposalApiResponse>(
        `/test-suites/${selectedSuiteId}/order-proposals/latest`,
      );

      let proposalId = latestProposal?.proposalId || latestProposal?.ProposalId;
      let proposalRowVersion =
        latestProposal?.rowVersion || latestProposal?.RowVersion;
      const proposalStatus =
        latestProposal?.status || latestProposal?.Status || "";

      if (!proposalId) {
        const createdProposal = await apiService.post<ProposalApiResponse>(
          `/test-suites/${selectedSuiteId}/order-proposals`,
          {
            SpecificationId: suiteDetail.apiSpecId,
            SelectedEndpointIds: localOrder,
            Source: "User",
            ReasoningNote: "Created from Test Order Gate",
          },
        );

        proposalId = createdProposal?.proposalId || createdProposal?.ProposalId;
        proposalRowVersion =
          createdProposal?.rowVersion || createdProposal?.RowVersion;
      }

      if (!proposalId) {
        throw new Error("Cannot resolve proposalId for reorder operation.");
      }

      const reordered = await apiService.put<ProposalApiResponse>(
        `/test-suites/${selectedSuiteId}/order-proposals/${proposalId}/reorder`,
        {
          OrderedEndpointIds: localOrder,
          RowVersion: proposalRowVersion,
          ReviewNotes: "Reordered from Test Order Gate",
        },
      );

      const reorderedStatus =
        reordered?.status || reordered?.Status || proposalStatus;
      const reorderedRowVersion =
        reordered?.rowVersion || reordered?.RowVersion;

      if (String(reorderedStatus).toLowerCase() !== "approved") {
        await apiService.post(
          `/test-suites/${selectedSuiteId}/order-proposals/${proposalId}/approve`,
          {
            RowVersion: reorderedRowVersion,
            ReviewNotes: "Approved after reorder from Test Order Gate",
          },
        );
      }

      // Refresh suite detail to keep local state in sync.
      const refreshed = await testSuiteService.getTestSuiteDetail(
        projectId,
        selectedSuiteId,
      );
      setSuiteDetail(refreshed);

      toast.success(t("testOrderGate.success.saved"));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...localOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setLocalOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";
      case "POST":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
      case "PUT":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
      case "DELETE":
        return "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300";
      default:
        return "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300";
    }
  };

  if (!projectId) {
    return (
      <MainLayout title={t("testOrderGate.title")}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  if (isLoadingSuites || isLoadingEndpoints) {
    return (
      <MainLayout title={t("testOrderGate.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <div className="lg:col-span-3">
              <Skeleton className="h-[600px] rounded-3xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const orderedTestCases = localOrder
    .map((id) => suiteEndpoints.find((ep) => ep.id === id))
    .filter(Boolean) as typeof suiteEndpoints;

  return (
    <MainLayout title={t("testOrderGate.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testOrderGate.title")}
            </h1>
            <p className="text-on-surface-variant">
              {t("testOrderGate.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveOrder}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container font-semibold flex items-center gap-2 hover:bg-surface-container-highest transition-all"
            >
              <Save className="w-5 h-5" />
              {t("testOrderGate.save")}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-5 h-5" />
              {t("testOrderGate.execute")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface">
                  {t("testOrderGate.llm.title")}
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                <Trans
                  i18nKey="testOrderGate.llm.desc"
                  count={suiteEndpoints.length}
                >
                  The LLM has analyzed your specification and identified{" "}
                  <span className="text-primary font-bold">
                    {suiteEndpoints.length} test cases
                  </span>
                  .
                </Trans>
              </p>
              <button className="w-full py-3 bg-primary-fixed text-on-primary-fixed-variant font-bold text-xs rounded-xl hover:bg-primary-fixed/80 transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {t("testOrderGate.llm.regenerate")}
              </button>
            </div>

            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-4">
                {t("testOrderGate.stats.title")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.totalSteps")}
                  </span>
                  <span className="text-sm font-bold text-on-surface">
                    {suiteEndpoints.length} Steps
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.activeTests")}
                  </span>
                  <span className="text-sm font-bold text-on-surface">
                    {suiteEndpoints.filter((ep) => ep.isActive).length} Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.complexity")}
                  </span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    {suiteEndpoints.length < 5
                      ? t("testOrderGate.stats.low")
                      : suiteEndpoints.length < 10
                        ? t("testOrderGate.stats.medium")
                        : t("testOrderGate.stats.high")}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {t("testOrderGate.proTip.title")}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("testOrderGate.proTip.desc")}
              </p>
            </div>
          </div>

          {/* Test Cases List with Drag & Drop */}
          <div className="lg:col-span-3 bg-surface-container-low dark:bg-surface-container-high rounded-3xl border border-outline-variant/10 shadow-inner min-h-[600px] p-8">
            {orderedTestCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Network className="w-16 h-16 text-on-surface-variant mb-4" />
                <h3 className="text-xl font-bold text-on-surface mb-2">
                  {t("testOrderGate.empty.title", "No endpoints found")}
                </h3>
                <p className="text-on-surface-variant">
                  {t(
                    "testOrderGate.empty.desc",
                    "Please choose a suite that has selected endpoints.",
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-on-surface">
                    {t("testOrderGate.list.title")}
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.list.dragToReorder")}
                  </span>
                </div>

                {orderedTestCases.map((endpoint, index) => (
                  <div
                    key={endpoint.id}
                    draggable
                    onDragStart={() => handleDragStart(endpoint.id)}
                    onDragOver={(e) => handleDragOver(e, endpoint.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-sm border-2 transition-all cursor-move group",
                      draggedId === endpoint.id
                        ? "border-primary opacity-50"
                        : "border-outline-variant/20 hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={cn(
                              "px-2 py-1 text-[10px] font-black rounded",
                              getMethodColor(endpoint.method),
                            )}
                          >
                            {endpoint.method}
                          </span>
                          <h4 className="font-bold text-on-surface">
                            {endpoint.path}
                          </h4>
                        </div>
                        <p className="text-xs font-mono text-on-surface-variant">
                          {endpoint.description || endpoint.path}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {endpoint.isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-on-surface-variant" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
