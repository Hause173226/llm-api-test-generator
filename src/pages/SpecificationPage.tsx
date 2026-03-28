import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Plus,
  Edit3,
  Keyboard,
  FileText,
  FileCode,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useSpecifications } from "../hooks/useSpecifications";
import { projectService } from "../services";
import { useProject } from "../contexts/ProjectContext";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";

export default function SpecificationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  // Get projectId from context first, fallback to URL param
  const projectId = selectedProject?.id || searchParams.get("projectId") || "";

  console.log("SpecificationPage - selectedProject:", selectedProject);
  console.log("SpecificationPage - projectId:", projectId);

  const {
    specifications,
    isLoading,
    error,
    refetch,
    uploadSpecification,
    deleteSpecification,
  } = useSpecifications(projectId);

  const [project, setProject] = useState<any>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      // If we already have project from context, use it
      if (selectedProject && selectedProject.id === projectId) {
        setProject(selectedProject);
        return;
      }

      // Otherwise fetch from API
      try {
        const projectData = await projectService.getProjectDetail(projectId);
        setProject(projectData);
      } catch (err) {
        console.error("Failed to fetch project:", err);
      }
    };
    fetchProject();
  }, [projectId, selectedProject]);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    type: "openapi",
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
      // Auto-fill name from filename if empty
      if (!uploadForm.name) {
        setUploadForm({
          ...uploadForm,
          name: file.name.replace(/\.[^/.]+$/, ""),
          file,
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.file) {
      showErrorToast("Please provide a name and select a file");
      return;
    }

    if (!projectId) {
      showErrorToast("No project selected. Please select a project first.");
      return;
    }

    try {
      setIsSubmitting(true);
      await uploadSpecification(uploadForm);
      showSuccessToast(
        "Specification uploaded successfully. Parsing in progress...",
      );
      setIsUploadModalOpen(false);
      setUploadForm({ name: "", description: "", type: "openapi", file: null });

      // Wait a moment for parse to start, then navigate to endpoints
      setTimeout(() => {
        navigate(`/endpoints?projectId=${projectId}`);
      }, 1500);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSpec) return;

    try {
      setIsSubmitting(true);
      await deleteSpecification(selectedSpec.id);
      showSuccessToast("Specification deleted successfully");
      setIsDeleteModalOpen(false);
      setSelectedSpec(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParseStatusBadge = (status: string) => {
    switch (status) {
      case "Success":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Success
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Parsing...
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Unknown
          </span>
        );
    }
  };

  const getSpecIcon = (type: string) => {
    if (type?.toLowerCase().includes("openapi")) return FileText;
    if (type?.toLowerCase().includes("postman")) return FlaskConical;
    if (type?.toLowerCase().includes("graphql")) return FileCode;
    return FileText;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <MainLayout title={t("specifications.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!projectId) {
    return (
      <MainLayout title={t("specifications.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-on-surface font-bold text-lg mb-2">
              No Project Selected
            </p>
            <p className="text-on-surface-variant mb-6">
              Please select a project from the sidebar or go to Projects page
            </p>
            <Link
              to="/projects"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 inline-block"
            >
              Go to Projects
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("specifications.title")}>
      <div className="space-y-12">
        {/* Breadcrumb */}
        {project && (
          <div className="flex items-center gap-2 text-sm">
            <Link
              to="/projects"
              className="text-primary hover:underline font-medium"
            >
              Projects
            </Link>
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            <Link
              to={`/projects/${projectId}`}
              className="text-primary hover:underline font-medium"
            >
              {project.name}
            </Link>
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            <span className="text-on-surface-variant">Specifications</span>
          </div>
        )}

        <header className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
            {t("specifications.title")}
            {project && (
              <span className="text-on-surface-variant text-2xl ml-3">
                - {project.name}
              </span>
            )}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
            {t("specifications.subtitle")}
          </p>
        </header>

        {/* Asymmetric Grid for Upload and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          {/* Upload Zone */}
          <div className="lg:col-span-8 group">
            <div
              onClick={() => setIsUploadModalOpen(true)}
              className="relative overflow-hidden bg-surface-container-low dark:bg-slate-900 rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-surface-container-high dark:hover:bg-slate-800 min-h-[400px] border-2 border-dashed border-outline-variant/20 dark:border-slate-800 cursor-pointer"
            >
              <div className="relative z-10">
                <div className="mb-8 p-6 bg-surface-container-lowest dark:bg-slate-800 rounded-full shadow-sm inline-block">
                  <UploadCloud className="w-12 h-12 text-primary dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-semibold text-on-surface mb-4">
                  {t("specifications.upload.title")}
                </h2>
                <p className="text-on-surface-variant font-medium mb-8">
                  {t("specifications.upload.formats")}{" "}
                  <span className="text-primary dark:text-indigo-400">
                    OpenAPI
                  </span>
                  ,{" "}
                  <span className="text-primary dark:text-indigo-400">
                    Swagger
                  </span>
                  ,{" "}
                  <span className="text-primary dark:text-indigo-400">
                    Postman
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {t("specifications.upload.button")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Action / Manual Entry */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col h-full justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Edit3 className="w-5 h-5 text-secondary dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("specifications.manual.label")}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-4 leading-snug text-on-surface">
                  {t("specifications.manual.title")}
                </h3>
                <p className="text-on-surface-variant text-sm mb-8">
                  {t("specifications.manual.description")}
                </p>
              </div>
              <button className="w-full py-4 px-6 bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-bold rounded-xl hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors text-center flex items-center justify-center gap-2">
                <Keyboard className="w-5 h-5" />
                {t("specifications.manual.button")}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Specifications Table */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-on-surface">
                {t("specifications.recent.title")}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {t("specifications.recent.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refetch}
                disabled={isLoading}
                className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 text-on-surface",
                    isLoading && "animate-spin",
                  )}
                />
              </button>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
                {specifications?.length || 0} Active
              </span>
            </div>
          </div>

          <div className="overflow-x-auto bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <table className="min-w-full text-left">
              <thead className="bg-surface-container-low/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("specifications.recent.table.name")}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("specifications.recent.table.type")}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                    {t("specifications.recent.table.version")}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("specifications.recent.table.parseStatus")}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">
                    {t("specifications.recent.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : !specifications || specifications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-on-surface-variant"
                    >
                      No specifications uploaded yet
                    </td>
                  </tr>
                ) : (
                  (specifications || []).map((spec, i) => {
                    const SpecIcon = getSpecIcon(spec.type);
                    return (
                      <tr
                        key={spec.id}
                        className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-fixed dark:bg-indigo-900/50 text-on-primary-fixed-variant dark:text-indigo-300">
                              <SpecIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-on-surface text-sm">
                                {spec.name}
                              </div>
                              <div className="text-[10px] text-on-surface-variant">
                                Modified {formatDate(spec.updatedAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="px-3 py-1 bg-surface-container dark:bg-slate-800 text-on-secondary-container dark:text-slate-300 text-[10px] font-bold rounded-full">
                            {spec.type}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className="text-xs font-medium text-on-surface-variant">
                            {spec.version || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          {getParseStatusBadge(spec.parseStatus)}
                        </td>
                        <td className="px-6 py-6 text-right space-x-3">
                          <button
                            onClick={() => {
                              setSelectedSpec(spec);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-error dark:text-rose-400 hover:opacity-80 font-bold text-[10px] uppercase tracking-widest"
                          >
                            {t("specifications.recent.actions.delete")}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadForm({
            name: "",
            description: "",
            type: "openapi",
            file: null,
          });
        }}
        title="Upload Specification"
        footer={
          <>
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadForm({
                  name: "",
                  description: "",
                  type: "openapi",
                  file: null,
                });
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isSubmitting || !uploadForm.file}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Upload
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Name
            </label>
            <input
              type="text"
              value={uploadForm.name}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder="My API Specification"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder="Brief description of this specification"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Type
            </label>
            <select
              value={uploadForm.type}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, type: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
            >
              <option value="openapi">OpenAPI Specification</option>
              <option value="postman">Postman Collection</option>
              <option value="graphql">GraphQL Schema</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              File
            </label>
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileChange}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
            {uploadForm.file && (
              <p className="text-xs text-on-surface-variant">
                Selected: {uploadForm.file.name}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSpec(null);
        }}
        title="Delete Specification"
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedSpec(null);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-8 py-3 bg-error text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-on-surface">
            Are you sure you want to delete{" "}
            <span className="font-bold">{selectedSpec?.name}</span>?
          </p>
          <p className="text-sm text-on-surface-variant">
            This action cannot be undone. All endpoints extracted from this
            specification will also be removed.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
