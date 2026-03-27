import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PlusCircle,
  Search,
  Filter,
  FileText,
  Database,
  Edit2,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Network,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useProjects } from "../hooks/useProjects";
import { useProject } from "../contexts/ProjectContext";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";

export default function ProjectManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSelectedProject: setGlobalSelectedProject } = useProject();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    projects,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects(currentPage, pageSize, searchTerm);

  // Handle selecting a project (set as global selected project)
  const handleSelectProject = (project: any) => {
    console.log("ProjectManagementPage - Selecting project:", project);
    console.log("ProjectManagementPage - Project ID:", project.id);
    setGlobalSelectedProject({
      id: project.id,
      name: project.name,
      description: project.description,
      isActive: project.isActive,
    });
  };

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    specType: "",
    specFile: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!formData.name || !formData.description || !formData.specType) {
      showErrorToast("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const newProject = await createProject(formData);
      showSuccessToast("Project created successfully");
      setIsCreateModalOpen(false);
      setFormData({ name: "", description: "", specType: "", specFile: null });

      // Redirect to Specifications page to upload API spec
      if (newProject && newProject.id) {
        navigate(`/specifications?projectId=${newProject.id}`);
      }
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !formData.name || !formData.description) {
      showErrorToast("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateProject(selectedProject.id, {
        name: formData.name,
        description: formData.description,
      });
      showSuccessToast("Project updated successfully");
      setIsEditModalOpen(false);
      setSelectedProject(null);
      setFormData({ name: "", description: "", specType: "", specFile: null });
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      setIsSubmitting(true);
      await deleteProject(selectedProject.id);
      showSuccessToast("Project deleted successfully");
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (project: any) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      specType: project.specType,
      specFile: null,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (project: any) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const getSpecIcon = (specType: string) => {
    if (specType?.toLowerCase().includes("openapi")) return FileText;
    if (specType?.toLowerCase().includes("graphql")) return Network;
    return Database;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} Minutes Ago`;
    if (diffHours < 24) return `${diffHours} Hours Ago`;
    if (diffDays < 30) return `${diffDays} Days Ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <MainLayout title={t("projects.title")}>
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

  return (
    <MainLayout title={t("projects.title")}>
      <div className="space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
            {t("projects.title")}
          </h1>
          <p className="text-lg text-on-surface-variant font-medium">
            {t("projects.subtitle")}
          </p>
        </header>

        {/* Control Bar */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input
              className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest dark:bg-slate-900 rounded-xl border-none outline outline-2 outline-outline-variant/20 dark:outline-slate-800 focus:outline-primary focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60"
              placeholder={t("projects.searchPlaceholder")}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors active:scale-95">
              <Filter className="w-5 h-5" />
              {t("projects.filterButton")}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              {t("projects.createButton")}
            </button>
          </div>
        </section>

        {/* Table Container */}
        <section className="grow flex flex-col bg-surface-container-low dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 dark:bg-slate-800/50">
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("projects.table.name")}
                  </th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("projects.table.spec")}
                  </th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("projects.table.lastRun")}
                  </th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("projects.table.status")}
                  </th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">
                    {t("projects.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-on-surface-variant"
                    >
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => {
                    const SpecIcon = getSpecIcon(project.activeSpecName || "");
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="px-8 py-8">
                          <Link
                            to={`/project/${project.id}`}
                            onClick={() => handleSelectProject(project)}
                            className="text-base font-semibold text-on-surface block hover:text-primary dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            {project.name}
                          </Link>
                          <span className="text-xs text-on-surface-variant">
                            {project.description}
                          </span>
                        </td>
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-2">
                            <SpecIcon className="w-4 h-4 text-primary dark:text-indigo-400" />
                            <span className="text-on-surface-variant font-medium text-sm">
                              {project.activeSpecName || "No specification"}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <span className="text-on-surface-variant text-sm">
                            {formatDate(project.lastRunAt)}
                          </span>
                        </td>
                        <td className="px-8 py-8">
                          <span
                            className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                              project.isActive
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                            )}
                          >
                            {project.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(project)}
                              className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 hover:bg-primary-fixed/30 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                              title="Edit Project"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                handleSelectProject(project);
                                navigate(`/project/${project.id}`);
                              }}
                              className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 hover:bg-primary-fixed/30 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(project)}
                              className="p-2 text-on-surface-variant hover:text-error dark:hover:text-rose-400 hover:bg-error-container/30 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <footer className="px-8 py-6 border-t border-outline-variant/20 dark:border-slate-800 flex items-center justify-between bg-surface-container-low dark:bg-slate-900">
            <p className="text-sm font-medium text-on-surface-variant">
              Showing{" "}
              {projects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
              projects
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-6 py-2 bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold rounded-lg hover:bg-primary-fixed dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-on-surface">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages || isLoading}
                className="px-6 py-2 bg-primary dark:bg-indigo-600 text-on-primary font-semibold rounded-lg hover:bg-primary-container dark:hover:bg-indigo-500 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({
            name: "",
            description: "",
            specType: "",
            specFile: null,
          });
        }}
        title={t("projects.modal.title")}
        footer={
          <>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormData({
                  name: "",
                  description: "",
                  specType: "",
                  specFile: null,
                });
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("projects.modal.cancel")}
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isSubmitting}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("projects.modal.confirm")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("projects.modal.nameLabel")}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("projects.modal.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("projects.modal.descriptionLabel")}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t("projects.modal.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("projects.modal.sourceLabel")}
            </label>
            <select
              value={formData.specType}
              onChange={(e) =>
                setFormData({ ...formData, specType: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
            >
              <option value="">{t("projects.modal.sourcePlaceholder")}</option>
              <option value="openapi">OpenAPI Specification</option>
              <option value="postman">Postman Collection</option>
              <option value="graphql">GraphQL Schema</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProject(null);
          setFormData({
            name: "",
            description: "",
            specType: "",
            specFile: null,
          });
        }}
        title="Edit Project"
        footer={
          <>
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedProject(null);
                setFormData({
                  name: "",
                  description: "",
                  specType: "",
                  specFile: null,
                });
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProject}
              disabled={isSubmitting}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Update
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Project Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProject(null);
        }}
        title="Delete Project"
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedProject(null);
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProject}
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
            <span className="font-bold">{selectedProject?.name}</span>?
          </p>
          <p className="text-sm text-on-surface-variant">
            This action cannot be undone. All test suites, test cases, and
            results associated with this project will be permanently deleted.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
