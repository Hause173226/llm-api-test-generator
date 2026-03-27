import React, { useState } from "react";
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

export default function TestSuitesPage() {
  const { t } = useTranslation();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { selectedProject } = useProject();
  const navigate = useNavigate();

  // Get projectId from context first, fallback to URL param
  const projectId = selectedProject?.id || urlProjectId || "";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    testSuites,
    isLoading,
    error,
    refetch,
    createTestSuite,
    deleteTestSuite,
    cloneTestSuite,
  } = useTestSuites(projectId || "");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    environmentId: "",
  });

  const handleCreate = async () => {
    if (!formData.name) {
      showErrorToast("Please provide a test suite name");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTestSuite(formData);
      showSuccessToast("Test suite created successfully");
      setIsCreateModalOpen(false);
      setFormData({ name: "", description: "", environmentId: "" });
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSuite) return;

    try {
      setIsSubmitting(true);
      await deleteTestSuite(selectedSuite.id);
      showSuccessToast("Test suite deleted successfully");
      setIsDeleteModalOpen(false);
      setSelectedSuite(null);
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClone = async (suiteId: string, suiteName: string) => {
    try {
      const newName = `${suiteName} (Copy)`;
      await cloneTestSuite(suiteId, newName);
      showSuccessToast("Test suite cloned successfully");
    } catch (err) {
      showErrorToast(handleError(err));
    }
  };

  const handleRun = (suiteId: string) => {
    // Navigate to test run page or trigger test run
    navigate(`/test-runs/new?suiteId=${suiteId}`);
  };

  const handleViewDetails = (suite: any) => {
    navigate(`/test-suites/${suite.id}`);
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
      <MainLayout title={t("testSuites.title")}>
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
      <MainLayout title={t("testSuites.title")}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testSuites.title")}>
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
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800 text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              {t("testSuites.createButton")}
            </button>
          </div>
        </header>

        {/* Suite Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : testSuites.length === 0 ? (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-12 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-center">
            <Layers className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              No test suites yet
            </h3>
            <p className="text-on-surface-variant mb-6">
              Create your first test suite to get started
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all"
            >
              Create Test Suite
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {testSuites.map((suite) => (
              <div
                key={suite.id}
                className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all"
              >
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
                    <p className="text-xs text-on-surface-variant font-medium mt-1">
                      Created {formatDate(suite.createdDateTime)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Endpoints
                      </p>
                      <p className="text-lg font-black text-on-surface">
                        {suite.selectedEndpointCount || 0}
                      </p>
                    </div>
                    <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Test Cases
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
                      onClick={() => handleViewDetails(suite)}
                      className="px-3 py-2 bg-white dark:bg-slate-700 text-primary dark:text-indigo-400 font-bold text-xs rounded-lg shadow-sm border border-primary/10 dark:border-indigo-900/30 flex items-center gap-2 hover:bg-primary dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSuite(suite);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-on-surface-variant hover:text-error dark:hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {suite.testCaseCount > 0 && (
                    <button
                      onClick={() => handleRun(suite.id)}
                      className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 hover:bg-emerald-600 transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Run Tests
                    </button>
                  )}
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
        }}
        title={t("testSuites.modal.title")}
        footer={
          <>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormData({ name: "", description: "", environmentId: "" });
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("testSuites.modal.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !formData.name}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("testSuites.modal.confirm")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
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
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder="Brief description of this test suite"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSuite(null);
        }}
        title="Delete Test Suite"
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedSuite(null);
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
            <span className="font-bold">{selectedSuite?.name}</span>?
          </p>
          <p className="text-sm text-on-surface-variant">
            This action cannot be undone. All test cases in this suite will also
            be deleted.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
