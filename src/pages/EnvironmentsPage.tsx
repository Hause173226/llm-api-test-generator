import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Settings2,
  ShieldCheck,
  Globe,
  Lock,
  Key,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Edit,
  Star,
  X,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useEnvironments } from "../hooks/useEnvironments";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";

export default function EnvironmentsPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const {
    environments,
    loading,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setDefaultEnvironment,
    cloneEnvironment,
    testEnvironment,
    refetch,
  } = useEnvironments(projectId);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseUrl: "",
    variables: {} as Record<string, string>,
    headers: {} as Record<string, string>,
    isDefault: false,
  });

  const [variableKey, setVariableKey] = useState("");
  const [variableValue, setVariableValue] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      baseUrl: "",
      variables: {},
      headers: {},
      isDefault: false,
    });
    setVariableKey("");
    setVariableValue("");
    setHeaderKey("");
    setHeaderValue("");
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.baseUrl) {
      toast.error(t("environments.errors.missingFields"));
      return;
    }

    const success = await createEnvironment({
      projectId: projectId,
      ...formData,
    });

    if (success) {
      toast.success(t("environments.success.created"));
      setShowCreateModal(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!selectedEnvId) return;

    const success = await updateEnvironment(selectedEnvId, formData);
    if (success) {
      toast.success(t("environments.success.updated"));
      setShowEditModal(false);
      setSelectedEnvId(null);
      resetForm();
    }
  };

  const handleDelete = async (envId: string) => {
    if (!confirm(t("environments.confirm.delete"))) return;

    const success = await deleteEnvironment(envId);
    if (success) {
      toast.success(t("environments.success.deleted"));
    }
  };

  const handleSetDefault = async (envId: string) => {
    const success = await setDefaultEnvironment(envId);
    if (success) {
      toast.success(t("environments.success.setDefault"));
    }
  };

  const handleClone = async (envId: string, name: string) => {
    const newName = prompt(t("environments.clone.prompt"), `${name} (Copy)`);
    if (!newName) return;

    const success = await cloneEnvironment(envId, newName);
    if (success) {
      toast.success(t("environments.success.cloned"));
    }
  };

  const handleTest = async (envId: string) => {
    setTesting(envId);
    const result = await testEnvironment(envId);
    setTesting(null);

    if (result) {
      toast.success(t("environments.success.testPassed"));
    } else {
      toast.error(t("environments.errors.testFailed"));
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(t("environments.success.urlCopied"));
  };

  const openEditModal = (env: any) => {
    setSelectedEnvId(env.id);
    setFormData({
      name: env.name,
      description: env.description || "",
      baseUrl: env.baseUrl,
      variables: env.variables || {},
      headers: env.headers || {},
      isDefault: env.isDefault,
    });
    setShowEditModal(true);
  };

  const openVariablesModal = (env: any) => {
    setSelectedEnvId(env.id);
    setFormData({
      name: env.name,
      description: env.description || "",
      baseUrl: env.baseUrl,
      variables: env.variables || {},
      headers: env.headers || {},
      isDefault: env.isDefault,
    });
    setShowVariablesModal(true);
  };

  const addVariable = () => {
    if (!variableKey || !variableValue) return;
    setFormData((prev) => ({
      ...prev,
      variables: { ...prev.variables, [variableKey]: variableValue },
    }));
    setVariableKey("");
    setVariableValue("");
  };

  const removeVariable = (key: string) => {
    setFormData((prev) => {
      const newVars = { ...prev.variables };
      delete newVars[key];
      return { ...prev, variables: newVars };
    });
  };

  const addHeader = () => {
    if (!headerKey || !headerValue) return;
    setFormData((prev) => ({
      ...prev,
      headers: { ...prev.headers, [headerKey]: headerValue },
    }));
    setHeaderKey("");
    setHeaderValue("");
  };

  const removeHeader = (key: string) => {
    setFormData((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const saveVariables = async () => {
    if (!selectedEnvId) return;
    const success = await updateEnvironment(selectedEnvId, {
      variables: formData.variables,
      headers: formData.headers,
    });
    if (success) {
      toast.success(t("environments.success.variablesSaved"));
      setShowVariablesModal(false);
      setSelectedEnvId(null);
      resetForm();
    }
  };

  if (loading) {
    return (
      <MainLayout title={t("environments.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!projectId) {
    return (
      <MainLayout title={t("environments.title")}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("environments.title")}>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("environments.title")}
            </h1>
            <p className="text-on-surface-variant max-w-2xl">
              {t("environments.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              {t("environments.add")}
            </button>
          </div>
        </header>

        {/* Environment Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {environments.map((env) => (
            <div
              key={env.id}
              className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all"
            >
              <div className="p-8 space-y-8 flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                        env.isDefault
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant",
                      )}
                    >
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-on-surface tracking-tight">
                          {env.name}
                        </h3>
                        {env.isDefault && (
                          <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {t("environments.status.default")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            env.isActive
                              ? "bg-emerald-500"
                              : "bg-amber-500 animate-pulse",
                          )}
                        ></span>
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                          {env.isActive
                            ? t("environments.status.operational")
                            : t("environments.status.inactive")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative group/menu">
                    <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                      <button
                        onClick={() => openEditModal(env)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleSetDefault(env.id)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        {t("environments.actions.setDefault")}
                      </button>
                      <button
                        onClick={() => handleClone(env.id, env.name)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {t("common.clone")}
                      </button>
                      <button
                        onClick={() => handleDelete(env.id)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-error hover:bg-surface-container flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </div>

                {env.description && (
                  <p className="text-sm text-on-surface-variant">
                    {env.description}
                  </p>
                )}

                <div className="space-y-4">
                  <div
                    onClick={() => handleCopyUrl(env.baseUrl)}
                    className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl group/url cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <ExternalLink className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                      <span className="text-sm font-mono text-on-surface truncate">
                        {env.baseUrl}
                      </span>
                    </div>
                    <Copy className="w-4 h-4 text-primary opacity-0 group-hover/url:opacity-100 transition-opacity" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-2xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t("environments.details.variables")}
                      </p>
                      <p className="text-sm font-bold text-on-surface">
                        {Object.keys(env.variables || {}).length}{" "}
                        {t("environments.details.defined")}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-2xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t("environments.details.headers")}
                      </p>
                      <p className="text-sm font-bold text-on-surface">
                        {Object.keys(env.headers || {}).length}{" "}
                        {t("environments.details.defined")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-surface-container-low/50 border-t border-outline-variant/10 flex items-center justify-between">
                <button
                  onClick={() => handleTest(env.id)}
                  disabled={testing === env.id}
                  className="flex items-center gap-2 text-sm font-bold text-on-surface hover:text-primary transition-colors disabled:opacity-50"
                >
                  {testing === env.id ? (
                    <div className="w-4 h-4 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t("environments.actions.test")}
                </button>
                <button
                  onClick={() => openVariablesModal(env)}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-2"
                >
                  {t("environments.details.configureVariables")}
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:bg-surface-container-low transition-all min-h-[340px]"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-on-surface-variant" />
            </div>
            <h4 className="text-xl font-bold text-on-surface">
              {t("environments.register.title")}
            </h4>
            <p className="text-sm text-on-surface-variant mt-2 max-w-xs">
              {t("environments.register.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {showCreateModal
                ? t("environments.create.title")
                : t("environments.edit.title")}
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("environments.form.name")}
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
                  {t("environments.form.description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("environments.form.baseUrl")}
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder="https://api.example.com"
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm font-bold text-on-surface"
                >
                  {t("environments.form.setAsDefault")}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={showCreateModal ? handleCreate : handleEdit}
                  className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] transition-all"
                >
                  {showCreateModal ? t("common.create") : t("common.save")}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedEnvId(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {t("environments.variables.title")}
            </h3>

            <div className="space-y-6">
              {/* Variables Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-on-surface">
                  {t("environments.variables.envVars")}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={variableKey}
                    onChange={(e) => setVariableKey(e.target.value)}
                    placeholder={t("environments.variables.keyPlaceholder")}
                    className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                  <input
                    type="text"
                    value={variableValue}
                    onChange={(e) => setVariableValue(e.target.value)}
                    placeholder={t("environments.variables.valuePlaceholder")}
                    className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                  <button
                    onClick={addVariable}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:scale-105 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.variables).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-on-surface">
                          {key}
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          = {value}
                        </span>
                      </div>
                      <button
                        onClick={() => removeVariable(key)}
                        className="p-1 hover:bg-surface-container rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Headers Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-on-surface">
                  {t("environments.variables.headers")}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    placeholder={t(
                      "environments.variables.headerKeyPlaceholder",
                    )}
                    className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                  <input
                    type="text"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder={t(
                      "environments.variables.headerValuePlaceholder",
                    )}
                    className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary-fixed text-on-surface font-bold text-sm"
                  />
                  <button
                    onClick={addHeader}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:scale-105 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-on-surface">
                          {key}
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          : {value}
                        </span>
                      </div>
                      <button
                        onClick={() => removeHeader(key)}
                        className="p-1 hover:bg-surface-container rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveVariables}
                  className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] transition-all"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setSelectedEnvId(null);
                    resetForm();
                  }}
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
