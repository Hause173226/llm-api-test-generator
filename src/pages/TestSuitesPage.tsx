import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Layers,
  Play,
  Settings,
  Copy,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Check,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useTestSuites } from "../hooks/useTestSuites";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import specificationService from "../services/specificationService";
import endpointService from "../services/endpointService";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";

export default function TestSuitesPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("testSuites.title"));
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { selectedProject } = useProject();
  const navigate = useNavigate();

  // Get projectId from context first, fallback to URL param
  const projectId = selectedProject?.id || urlProjectId || "";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specificationsMap, setSpecificationsMap] = useState<
    Record<string, any>
  >({});

  // Create modal state
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [availableEndpoints, setAvailableEndpoints] = useState<any[]>([]);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
  const [specifications, setSpecifications] = useState<any[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);

  // Load specifications when modal opens
  useEffect(() => {
    if (isCreateModalOpen && projectId) {
      loadSpecifications();
    }
  }, [isCreateModalOpen, projectId]);

  // Load endpoints when spec is selected
  useEffect(() => {
    if (selectedSpecId && projectId) {
      loadEndpoints();
    }
  }, [selectedSpecId, projectId]);

  const loadSpecifications = async () => {
    try {
      setIsLoadingSpecs(true);
      const specs = await specificationService.getSpecifications(projectId);
      setSpecifications(Array.isArray(specs) ? specs : []);
    } catch (err) {
      console.error("Failed to load specifications:", err);
      showErrorToast(t("testSuites.toast.loadSpecsFailed"));
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  const loadEndpoints = async () => {
    try {
      setIsLoadingEndpoints(true);
      const response = await endpointService.getEndpoints(
        projectId,
        selectedSpecId,
      );
      setAvailableEndpoints(response.items || []);
    } catch (err) {
      console.error("Failed to load endpoints:", err);
      showErrorToast(t("testSuites.toast.loadEndpointsFailed"));
    } finally {
      setIsLoadingEndpoints(false);
    }
  };

  const toggleEndpointSelection = (endpointId: string) => {
    setSelectedEndpointIds((prev) =>
      prev.includes(endpointId)
        ? prev.filter((id) => id !== endpointId)
        : [...prev, endpointId],
    );
  };

  const toggleAllEndpoints = () => {
    if (selectedEndpointIds.length === availableEndpoints.length) {
      setSelectedEndpointIds([]);
    } else {
      setSelectedEndpointIds(availableEndpoints.map((ep) => ep.id));
    }
  };

  const {
    testSuites,
    isLoading,
    error,
    refetch,
    createTestSuite,
    deleteTestSuite,
    cloneTestSuite,
  } = useTestSuites(projectId || "");

  // Load specifications when test suites are loaded
  useEffect(() => {
    if (testSuites.length > 0 && projectId) {
      loadSpecificationsForSuites();
    }
  }, [testSuites, projectId]);

  const loadSpecificationsForSuites = async () => {
    try {
      const specs = await specificationService.getSpecifications(projectId);
      const specsMap: Record<string, any> = {};
      specs.forEach((spec) => {
        specsMap[spec.id] = spec;
      });
      setSpecificationsMap(specsMap);
    } catch (err) {
      console.error("Failed to load specifications:", err);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    environmentId: "",
  });

  // Filter state
  const [filterSpecId, setFilterSpecId] = useState<string>("");

  const handleCreate = async () => {
    if (!formData.name) {
      showErrorToast(t("testSuites.toast.nameRequired"));
      return;
    }

    if (!selectedSpecId) {
      showErrorToast(t("testSuites.toast.specRequired"));
      return;
    }

    if (selectedEndpointIds.length === 0) {
      showErrorToast(t("testSuites.toast.endpointsRequired"));
      return;
    }

    try {
      setIsSubmitting(true);
      const newSuite = await createTestSuite({
        name: formData.name,
        description: formData.description,
        apiSpecId: selectedSpecId,
        selectedEndpointIds: selectedEndpointIds,
        generationType: "Auto",
      } as any);

      if (newSuite?.id) {
        try {
          const proposal = await testSuiteService.proposeOrder(newSuite.id, {
            specificationId: selectedSpecId,
            selectedEndpointIds,
            source: "System",
            reasoningNote:
              "Auto-proposed from selected endpoints on suite creation",
          });

          const proposalId = proposal?.proposalId || proposal?.ProposalId;
          const proposalRowVersion =
            proposal?.rowVersion || proposal?.RowVersion;

          if (proposalId) {
            await testSuiteService.approveOrder(
              newSuite.id,
              proposalId,
              proposalRowVersion,
              "Auto-approved after suite creation",
            );
          }
        } catch (proposalError) {
          console.warn(
            "Failed to auto-propose API test order after suite creation",
            proposalError,
          );
          showErrorToast(t("endpoints.toast.suiteOrderFailed"));
        }
      }

      showSuccessToast(t("testSuites.toast.created"));
      setIsCreateModalOpen(false);
      setFormData({ name: "", description: "", environmentId: "" });
      setSelectedSpecId("");
      setSelectedEndpointIds([]);
      setAvailableEndpoints([]);

      // Navigate to the new test suite detail page
      if (newSuite && newSuite.id) {
        navigate(`/test-suites/${newSuite.id}`);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSuite || !projectId) return;

    try {
      setIsSubmitting(true);
      await deleteTestSuite(
        projectId,
        selectedSuite.id,
        selectedSuite.rowVersion || "",
      );
      showSuccessToast(t("testSuites.toast.deleted"));
      setIsDeleteModalOpen(false);
      setSelectedSuite(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClone = async (suiteId: string, suiteName: string) => {
    try {
      const newName = `${suiteName} (Copy)`;
      await cloneTestSuite(suiteId, newName);
      showSuccessToast(t("testSuites.toast.cloned"));
    } catch (err) {
      handleError(err);
    }
  };

  const handleRun = (suiteId: string) => {
    // Navigate to test run page or trigger test run
    navigate(`/runs?suiteId=${suiteId}`);
  };

  const handleOpenSuite = (suite: any) => {
    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("tab", "testcases");

    const target = params.toString()
      ? `/test-suites/${suite.id}?${params.toString()}`
      : `/test-suites/${suite.id}`;

    navigate(target);
  };

  const handleViewTestCases = (suite: any) => {
    navigate(`/test-suites/${suite.id}/test-cases`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t("projects.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("projects.hoursAgo", { count: diffHours });
    if (diffDays === 1) return t("specifications.yesterday");
    if (diffDays < 30) return t("projects.daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };

  // Filter test suites by specification
  const filteredTestSuites = testSuites.filter((suite) => {
    if (!filterSpecId) return true;
    return suite.apiSpecId === filterSpecId;
  });

  if (error) {
    return (
      <MainLayout title={t("testSuites.title")} breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer"
            >
              {t("testSuites.tryAgain")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!projectId) {
    return (
      <MainLayout title={t("testSuites.title")} breadcrumbs={breadcrumbs}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testSuites.title")} breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testSuites.title")}
            </h1>
            <p className="text-on-surface-variant">
              {t("testSuites.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              {t("testSuites.refreshButton")}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {t("testSuites.createButton")}
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        {Object.keys(specificationsMap).length > 0 && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-on-surface-variant" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t("testSuites.filterBySpec")}
              </span>
            </div>
            <select
              value={filterSpecId}
              onChange={(e) => setFilterSpecId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-sm text-on-surface font-medium"
            >
              <option value="">
                {t("testSuites.allSpecs", { count: testSuites.length })}
              </option>
              {Object.values(specificationsMap).map((spec) => {
                const count = testSuites.filter(
                  (suite) => suite.apiSpecId === spec.id,
                ).length;
                if (count === 0) return null;
                return (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Suite Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTestSuites.length === 0 ? (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-12 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-center">
            <Layers className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              {filterSpecId ? t("testSuites.noSuitesFiltered") : t("testSuites.noSuites")}
            </h3>
            <p className="text-on-surface-variant mb-6">
              {filterSpecId
                ? t("testSuites.noSuitesFilteredDesc")
                : t("testSuites.noSuitesDesc")}
            </p>
            {!filterSpecId && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all cursor-pointer"
              >
                {t("testSuites.createButton")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTestSuites.map((suite) => (
              <div key={suite.id} className="flex flex-col">
                <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all">
                  <div className="p-6 space-y-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-primary-fixed/30 dark:bg-indigo-900/30 rounded-lg">
                        <Layers className="w-6 h-6 text-primary dark:text-indigo-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {suite.status === "Active" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            suite.status === "Active"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-400",
                          )}
                        >
                          {suite.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-on-surface tracking-tight group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                        {suite.name}
                      </h3>
                      {suite.description && (
                        <p className="text-xs text-on-surface-variant font-medium mt-1">
                          {suite.description}
                        </p>
                      )}
                      {suite.apiSpecId &&
                        specificationsMap[suite.apiSpecId] && (
                          <p className="text-xs text-primary dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {specificationsMap[suite.apiSpecId].name}
                          </p>
                        )}
                      <p className="text-xs text-on-surface-variant font-medium mt-1">
                        {t("testSuites.createdAt")} {formatDate(suite.createdDateTime)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          {t("testSuites.endpoints")}
                        </p>
                        <p className="text-lg font-black text-on-surface">
                          {suite.selectedEndpointCount || 0}
                        </p>
                      </div>
                      <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          {t("testSuites.testCases")}
                        </p>
                        <p className="text-lg font-black text-on-surface">
                          {suite.testCaseCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-surface-container-low/50 dark:bg-slate-800/50 border-t border-outline-variant/10 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenSuite(suite)}
                        className="px-3 py-2 bg-white dark:bg-slate-700 text-on-surface dark:text-slate-300 font-bold text-xs rounded-lg shadow-sm border border-outline-variant/20 dark:border-slate-600 flex items-center gap-2 hover:bg-surface-container dark:hover:bg-slate-600 transition-all cursor-pointer"
                      >
                        <Settings className="w-3 h-3" />
                        {t("testSuites.openButton")}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSuite(suite);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-on-surface-variant hover:text-error dark:hover:text-rose-400 cursor-pointer"
                        title={t("testSuites.deleteButton")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Placeholder */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-surface-container-low/30 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-outline-variant/20 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all min-h-[280px]"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-on-surface-variant" />
              </div>
              <h4 className="font-bold text-on-surface">
                {t("testSuites.addNew.title")}
              </h4>
              <p className="text-xs text-on-surface-variant mt-1">
                {t("testSuites.addNew.subtitle")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Suite Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({ name: "", description: "", environmentId: "" });
          setSelectedSpecId("");
          setSelectedEndpointIds([]);
          setAvailableEndpoints([]);
        }}
        title={t("testSuites.modal.title")}
        footer={
          <>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormData({ name: "", description: "", environmentId: "" });
                setSelectedSpecId("");
                setSelectedEndpointIds([]);
                setAvailableEndpoints([]);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("testSuites.modal.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isSubmitting ||
                !formData.name ||
                !selectedSpecId ||
                selectedEndpointIds.length === 0
              }
              className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("testSuites.modal.confirm")}
            </button>
          </>
        }
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("testSuites.modal.nameLabel")}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("testSuites.modal.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("testSuites.modal.descLabel")}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("testSuites.modal.descPlaceholder")}
            />
          </div>

          {/* API Specification Selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("testSuites.modal.specLabel")}
            </label>
            {isLoadingSpecs ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <select
                value={selectedSpecId}
                onChange={(e) => {
                  setSelectedSpecId(e.target.value);
                  setSelectedEndpointIds([]);
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              >
                <option value="">{t("testSuites.modal.specPlaceholder")}</option>
                {specifications.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Endpoints Selector */}
          {selectedSpecId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  {t("testSuites.modal.selectEndpoints", { count: selectedEndpointIds.length })}
                </label>
                {availableEndpoints.length > 0 && (
                  <button
                    onClick={toggleAllEndpoints}
                    className="text-xs font-bold text-primary dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedEndpointIds.length === availableEndpoints.length
                      ? t("testSuites.modal.deselectAll")
                      : t("testSuites.modal.selectAll")}
                  </button>
                )}
              </div>
              {isLoadingEndpoints ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : availableEndpoints.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  {t("testSuites.modal.noEndpoints")}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  {availableEndpoints.map((endpoint) => (
                    <label
                      key={endpoint.id}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0",
                        selectedEndpointIds.includes(endpoint.id) &&
                        "bg-primary/5 dark:bg-indigo-900/20",
                      )}
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedEndpointIds.includes(endpoint.id)}
                          onChange={() => toggleEndpointSelection(endpoint.id)}
                          className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center",
                          endpoint.method === "GET" &&
                          "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                          endpoint.method === "POST" &&
                          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                          endpoint.method === "PUT" &&
                          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                          endpoint.method === "DELETE" &&
                          "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
                          endpoint.method === "PATCH" &&
                          "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
                        )}
                      >
                        {endpoint.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {endpoint.path}
                        </p>
                        {endpoint.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {endpoint.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSuite(null);
        }}
        title={t("testSuites.modal.deleteTitle")}
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedSuite(null);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("testSuites.modal.cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-8 py-3 bg-red-600 dark:bg-red-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("testSuites.modal.deleteButton")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-on-surface">
            {t("testSuites.modal.deleteConfirm")}{" "}
            <span className="font-bold">{selectedSuite?.name}</span>?
          </p>
          <p className="text-sm text-on-surface-variant">
            {t("testSuites.modal.deleteWarning")}
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
