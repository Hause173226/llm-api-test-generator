import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useEndpoints } from "../hooks/useEndpoints";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export default function EndpointsPage() {
  const { t } = useTranslation();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  // Get projectId from context first, fallback to query param, then URL param
  const projectId =
    selectedProject?.id || searchParams.get("projectId") || urlProjectId || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [specifications, setSpecifications] = useState<any[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    path: "",
    method: "GET" as HttpMethod,
    description: "",
  });
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(
    new Set(),
  );
  const [isCreateSuiteModalOpen, setIsCreateSuiteModalOpen] = useState(false);
  const [suiteName, setSuiteName] = useState("");
  const [suiteDescription, setSuiteDescription] = useState("");
  const pageSize = 20;

  // Fetch specifications for the project
  React.useEffect(() => {
    const fetchSpecs = async () => {
      if (!projectId) return;

      try {
        const { default: specificationService } =
          await import("../services/specificationService");
        const specs = await specificationService.getSpecifications(projectId);
        const specList = Array.isArray(specs) ? specs : [];
        setSpecifications(specList);

        // Auto-select first spec if available
        if (specList.length > 0 && !selectedSpecId) {
          setSelectedSpecId(specList[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch specifications:", err);
      }
    };

    fetchSpecs();
  }, [projectId]);

  const {
    endpoints: allEndpoints,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch,
    updateEndpoint,
    deleteEndpoint,
  } = useEndpoints(
    projectId || "",
    selectedSpecId,
    currentPage,
    pageSize,
    searchTerm,
    selectedMethod,
  );

  // Client-side filtering
  const endpoints = React.useMemo(() => {
    let filtered = allEndpoints || [];

    // Filter by method
    if (selectedMethod) {
      filtered = filtered.filter((ep) => ep.method === selectedMethod);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ep) =>
          ep.path.toLowerCase().includes(term) ||
          (ep.description && ep.description.toLowerCase().includes(term)),
      );
    }

    return filtered;
  }, [allEndpoints, selectedMethod, searchTerm]);

  const handleMethodFilter = (method: string) => {
    setSelectedMethod(method === "ALL" ? "" : method);
    setCurrentPage(1); // Reset to first page
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page
  };

  const openEditModal = (endpoint: any) => {
    setSelectedEndpoint(endpoint);
    setEditForm({
      path: endpoint.path,
      method: endpoint.method as HttpMethod,
      description: endpoint.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedEndpoint || !selectedSpecId) return;

    try {
      setIsSubmitting(true);
      await updateEndpoint(selectedEndpoint.id, editForm);
      showSuccessToast(t("endpoints.toast.updated"));
      setIsEditModalOpen(false);
      setSelectedEndpoint(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (endpoint: any) => {
    setSelectedEndpoint(endpoint);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEndpoint || !selectedSpecId) return;

    try {
      setIsSubmitting(true);
      await deleteEndpoint(selectedEndpoint.id);
      showSuccessToast(t("endpoints.toast.deleted"));
      setIsDeleteModalOpen(false);
      setSelectedEndpoint(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEndpointSelection = (endpointId: string) => {
    const newSelection = new Set(selectedEndpoints);
    if (newSelection.has(endpointId)) {
      newSelection.delete(endpointId);
    } else {
      newSelection.add(endpointId);
    }
    setSelectedEndpoints(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEndpoints.size === endpoints.length) {
      setSelectedEndpoints(new Set());
    } else {
      setSelectedEndpoints(new Set(endpoints.map((e) => e.id)));
    }
  };

  const handleCreateTestSuite = async () => {
    if (!suiteName || selectedEndpoints.size === 0) {
      showErrorToast(t("endpoints.toast.suiteNameRequired"));
      return;
    }

    if (!selectedSpecId) {
      showErrorToast(t("endpoints.toast.selectSpec"));
      return;
    }

    try {
      setIsSubmitting(true);

      const newSuite = await testSuiteService.createTestSuite(projectId, {
        name: suiteName,
        description: suiteDescription,
        apiSpecId: selectedSpecId,
        generationType: "Auto",
        selectedEndpointIds: Array.from(selectedEndpoints),
        endpointBusinessContexts: {},
        globalBusinessRules: "",
      });

      if (newSuite?.id) {
        try {
          const proposal = await testSuiteService.proposeOrder(newSuite.id, {
            specificationId: selectedSpecId,
            selectedEndpointIds: Array.from(selectedEndpoints),
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

      showSuccessToast(
        t("endpoints.toast.suiteCreated", { name: suiteName, count: selectedEndpoints.size }),
      );
      setIsCreateSuiteModalOpen(false);
      setSuiteName("");
      setSuiteDescription("");
      setSelectedEndpoints(new Set());

      // Navigate to test suite detail page
      if (newSuite && newSuite.id) {
        navigate(`/test-suites/${newSuite.id}`);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodColor = (method: string) => {
    if (!method)
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";

    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "POST":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "PUT":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "DELETE":
        return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
      case "PATCH":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-error" />;
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? t("endpoints.status.active") : t("endpoints.status.inactive");
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-error dark:text-rose-400";
  };

  if (error) {
    return (
      <MainLayout title={t("endpoints.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer"
            >
              {t("endpoints.tryAgain")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!projectId) {
    return (
      <MainLayout title={t("endpoints.title")}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("endpoints.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("endpoints.title")}
            </h1>
            <p className="text-on-surface-variant">{t("endpoints.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            {selectedEndpoints.size > 0 && (
              <button
                onClick={() => setIsCreateSuiteModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all shadow-lg cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                {t("endpoints.createSuiteButton", { count: selectedEndpoints.size })}
              </button>
            )}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              {t("endpoints.syncButton")}
            </button>
          </div>
        </header>

        {/* Specification Selector */}
        {specifications.length > 0 && (
          <div className="bg-surface-container-low dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800">
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
              {t("endpoints.specificationLabel")}
            </label>
            <select
              value={selectedSpecId}
              onChange={(e) => setSelectedSpecId(e.target.value)}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all"
            >
              {specifications.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name} ({spec.type}) - {spec.parseStatus}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
              placeholder={t("endpoints.searchPlaceholder")}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
              {t("endpoints.methodLabel")}
            </span>
            {["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
              <button
                key={m}
                onClick={() => handleMethodFilter(m)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                  (m === "ALL" && !selectedMethod) || m === selectedMethod
                    ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                    : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedEndpoints.size === endpoints.length &&
                  endpoints.length > 0
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm font-medium text-on-surface">
                {t("endpoints.selectAll")}
              </span>
            </label>
            <p className="text-sm text-on-surface-variant">
              {t("projects.showing")}{" "}
              {endpoints.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}{" "}
              {t("projects.to")}{" "}
              {Math.min(currentPage * pageSize, totalCount)}{" "}
              {t("projects.of")} {totalCount}{" "}
              {t("endpoints.endpointsCount")}
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full">
            {t("endpoints.activeCount", { count: endpoints.filter((e) => e.isActive).length })}
          </span>
        </div>

        {/* Endpoints List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : endpoints.length === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-12 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-center">
              <p className="text-on-surface-variant">No endpoints found</p>
            </div>
          ) : (
            endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedEndpoints.has(endpoint.id)}
                      onChange={() => toggleEndpointSelection(endpoint.id)}
                      className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter min-w-[60px] text-center",
                        getMethodColor(endpoint.method),
                      )}
                    >
                      {endpoint.method}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-on-surface tracking-tight">
                          {endpoint.path}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                      </div>
                      {endpoint.description && (
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {endpoint.description}
                        </p>
                      )}
                      {endpoint.tags &&
                        Array.isArray(endpoint.tags) &&
                        endpoint.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {endpoint.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t("endpoints.table.status")}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(endpoint.isActive)}
                        <span
                          className={cn(
                            "text-xs font-bold",
                            getStatusColor(endpoint.isActive),
                          )}
                        >
                          {getStatusText(endpoint.isActive)}
                        </span>
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t("endpoints.createdLabel")}
                      </p>
                      <p className="text-xs font-medium text-on-surface">
                        {new Date(endpoint.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(endpoint)}
                        className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title={t("endpoints.editTitle")}
                      >
                        <Edit3 className="w-4 h-4 text-on-surface-variant" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(endpoint)}
                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer"
                        title={t("endpoints.deleteTitle")}
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-surface-container-low dark:border-slate-800">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-6 py-2 bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold rounded-lg hover:bg-primary-fixed dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("endpoints.previous")}
            </button>

            <span className="text-sm font-medium text-on-surface">
              {t("projects.page")} {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {t("endpoints.next")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEndpoint(null);
        }}
        title={t("endpoints.modal.editTitle")}
        footer={
          <>
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedEndpoint(null);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("endpoints.modal.cancel")}
            </button>
            <button
              onClick={handleEdit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("endpoints.modal.saveChanges")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("endpoints.modal.pathLabel")}
            </label>
            <input
              type="text"
              value={editForm.path}
              onChange={(e) =>
                setEditForm({ ...editForm, path: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder="/api/endpoint"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("endpoints.modal.methodLabel")}
            </label>
            <select
              value={editForm.method}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  method: e.target.value as HttpMethod,
                })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("endpoints.modal.descriptionLabel")}
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("endpoints.modal.descriptionPlaceholder")}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEndpoint(null);
        }}
        title={t("endpoints.modal.deleteTitle")}
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedEndpoint(null);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("endpoints.modal.cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-8 py-3 bg-red-600 dark:bg-red-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("endpoints.modal.deleteButton")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-on-surface">
            {t("endpoints.modal.deleteConfirm")}{" "}
            <span className="font-bold">{selectedEndpoint?.path}</span>?
          </p>
          <p className="text-sm text-on-surface-variant">
            {t("endpoints.modal.deleteWarning")}
          </p>
        </div>
      </Modal>

      {/* Create Test Suite Modal */}
      <Modal
        isOpen={isCreateSuiteModalOpen}
        onClose={() => {
          setIsCreateSuiteModalOpen(false);
          setSuiteName("");
          setSuiteDescription("");
        }}
        title={t("endpoints.modal.createSuiteTitle")}
        footer={
          <>
            <button
              onClick={() => {
                setIsCreateSuiteModalOpen(false);
                setSuiteName("");
                setSuiteDescription("");
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("endpoints.modal.cancel")}
            </button>
            <button
              onClick={handleCreateTestSuite}
              disabled={isSubmitting || !suiteName}
              className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("endpoints.modal.createSuiteButton")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="bg-primary-fixed/10 dark:bg-indigo-900/20 p-4 rounded-xl">
            <p className="text-sm text-on-surface">
              <span className="font-bold">{selectedEndpoints.size}</span>{" "}
              {t("endpoints.modal.endpointsSelected")}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("endpoints.modal.suiteNameLabel")}
            </label>
            <input
              type="text"
              value={suiteName}
              onChange={(e) => setSuiteName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("endpoints.modal.suiteNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("endpoints.modal.suiteDescLabel")}
            </label>
            <textarea
              rows={3}
              value={suiteDescription}
              onChange={(e) => setSuiteDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("endpoints.modal.suiteDescPlaceholder")}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              {t("endpoints.modal.llmHint")}
            </p>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
