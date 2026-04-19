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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useEnvironments } from "../hooks/useEnvironments";
import { useProject } from "../contexts/ProjectContext";
import type { ExecutionAuthConfig } from "../services/environmentService";
import NoProjectSelected from "../components/common/NoProjectSelected";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";

const createDefaultAuthConfig = (): ExecutionAuthConfig => ({
  authType: "None",
  headerName: null,
  token: null,
  username: null,
  password: null,
  apiKeyName: null,
  apiKeyValue: null,
  apiKeyLocation: "Header",
  tokenUrl: null,
  clientId: null,
  clientSecret: null,
  scopes: [],
});

export default function EnvironmentsPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("environments.title"));
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

  type EnvironmentFormData = {
    name: string;
    baseUrl: string;
    variables: Record<string, string>;
    headers: Record<string, string>;
    authConfig: ExecutionAuthConfig;
    isDefault: boolean;
  };

  const [formData, setFormData] = useState<EnvironmentFormData>({
    name: "",
    baseUrl: "",
    variables: {} as Record<string, string>,
    headers: {} as Record<string, string>,
    authConfig: createDefaultAuthConfig(),
    isDefault: false,
  });

  const [variableKey, setVariableKey] = useState("");
  const [variableValue, setVariableValue] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [showVariablesSection, setShowVariablesSection] = useState(false);
  const [showHeadersSection, setShowHeadersSection] = useState(false);
  const [showAuthSection, setShowAuthSection] = useState(false);

  const updateAuthConfig = (partial: Partial<ExecutionAuthConfig>) => {
    setFormData((prev) => ({
      ...prev,
      authConfig: {
        ...prev.authConfig,
        ...partial,
      },
    }));
  };

  const parseScopes = (raw: string) => {
    if (!raw.trim()) {
      return [] as string[];
    }

    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      baseUrl: "",
      variables: {},
      headers: {},
      authConfig: createDefaultAuthConfig(),
      isDefault: false,
    });
    setVariableKey("");
    setVariableValue("");
    setHeaderKey("");
    setHeaderValue("");
    setShowVariablesSection(false);
    setShowHeadersSection(false);
    setShowAuthSection(false);
  };

  const buildPayload = () => {
    const vars = Object.keys(formData.variables).length > 0 ? formData.variables : null;
    const hdrs = Object.keys(formData.headers).length > 0 ? formData.headers : null;
    const auth = formData.authConfig;
    return {
      name: formData.name,
      baseUrl: formData.baseUrl,
      variables: vars as any,
      headers: hdrs as any,
      authConfig: {
        authType: auth.authType,
        headerName: auth.headerName || null,
        token: auth.token || null,
        username: auth.username || null,
        password: auth.password || null,
        apiKeyName: auth.apiKeyName || null,
        apiKeyValue: auth.apiKeyValue || null,
        apiKeyLocation: auth.apiKeyLocation || "Header",
        tokenUrl: auth.tokenUrl || null,
        clientId: auth.clientId || null,
        clientSecret: auth.clientSecret || null,
        scopes: auth.scopes && auth.scopes.length > 0 ? auth.scopes : [""],
      },
      isDefault: formData.isDefault,
    };
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.baseUrl) {
      toast.error(t("environments.errors.missingFields"));
      return;
    }

    const success = await createEnvironment(buildPayload());

    if (success) {
      toast.success(t("environments.success.created"));
      setShowCreateModal(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!selectedEnvId) return;

    const success = await updateEnvironment(selectedEnvId, buildPayload());
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
      baseUrl: env.baseUrl,
      variables: env.variables || {},
      headers: env.headers || {},
      authConfig: {
        ...createDefaultAuthConfig(),
        ...(env.authConfig || {}),
      },
      isDefault: env.isDefault,
    });
    setShowVariablesSection(Object.keys(env.variables || {}).length > 0);
    setShowHeadersSection(Object.keys(env.headers || {}).length > 0);
    setShowAuthSection(env.authConfig?.authType && env.authConfig.authType !== "None");
    setShowEditModal(true);
  };

  const openVariablesModal = (env: any) => {
    setSelectedEnvId(env.id);
    setFormData({
      name: env.name,
      baseUrl: env.baseUrl,
      variables: env.variables || {},
      headers: env.headers || {},
      authConfig: {
        ...createDefaultAuthConfig(),
        ...(env.authConfig || {}),
      },
      isDefault: env.isDefault,
    });
    setShowVariablesModal(true);
  };

  const addVariable = () => {
    if (!variableKey) return;
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
    if (!headerKey) return;
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
      authConfig: formData.authConfig,
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
      <MainLayout title={t("environments.title")} breadcrumbs={breadcrumbs}>
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
      <MainLayout title={t("environments.title")} breadcrumbs={breadcrumbs}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("environments.title")} breadcrumbs={breadcrumbs}>
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
              className="px-6 py-3 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                          {t("environments.status.operational")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative group/menu">
                    <button className="p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                      <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                      <button
                        onClick={() => openEditModal(env)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleSetDefault(env.id)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                      >
                        <Star className="w-4 h-4" />
                        {t("environments.actions.setDefault")}
                      </button>
                      <button
                        onClick={() => handleClone(env.id, env.name)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        {t("common.clone")}
                      </button>
                      <button
                        onClick={() => handleDelete(env.id)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-error hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </div>

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
                  className="flex items-center gap-2 text-sm font-bold text-on-surface hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
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
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-2 cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {showCreateModal
                  ? t("environments.create.title")
                  : t("environments.edit.title")}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedEnvId(null);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Environment Name */}
              <div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("environments.form.name")}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Base URL */}
              <div>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder={t("environments.form.baseUrl")}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Variables Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowVariablesSection(!showVariablesSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showVariablesSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("environments.variables.envVars")}
                  </span>
                  <span className="text-xs text-slate-400">({Object.keys(formData.variables).length})</span>
                </button>
                {showVariablesSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      {"You can define variables with any key and use them in URL/Header/Body via syntax {{variableName}}."}
                    </p>
                    <div className="space-y-2">
                      {Object.entries(formData.variables).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={key}
                            readOnly
                            className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                variables: { ...prev.variables, [key]: e.target.value },
                              }));
                            }}
                            placeholder="Variable value"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => removeVariable(key)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={variableKey}
                          onChange={(e) => setVariableKey(e.target.value)}
                          placeholder="Key"
                          className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={variableValue}
                          onChange={(e) => setVariableValue(e.target.value)}
                          placeholder="Variable value"
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium px-2 py-1 invisible">Remove</span>
                      </div>
                      <button
                        onClick={addVariable}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-1 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Headers Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowHeadersSection(!showHeadersSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showHeadersSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("environments.variables.headers")}
                  </span>
                  <span className="text-xs text-slate-400">({Object.keys(formData.headers).length})</span>
                </button>
                {showHeadersSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      Custom headers sent with every request.
                    </p>
                    <div className="space-y-2">
                      {Object.entries(formData.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={key}
                            readOnly
                            className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                headers: { ...prev.headers, [key]: e.target.value },
                              }));
                            }}
                            placeholder="Header value"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => removeHeader(key)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={headerKey}
                          onChange={(e) => setHeaderKey(e.target.value)}
                          placeholder="Header name"
                          className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={headerValue}
                          onChange={(e) => setHeaderValue(e.target.value)}
                          placeholder="Header value"
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium px-2 py-1 invisible">Remove</span>
                      </div>
                      <button
                        onClick={addHeader}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-1 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Authentication Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAuthSection(!showAuthSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showAuthSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Authentication
                  </span>
                  <span className="text-xs text-slate-400">({formData.authConfig.authType})</span>
                </button>
                {showAuthSection && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 mt-2">
                    <select
                      value={formData.authConfig.authType}
                      onChange={(e) =>
                        updateAuthConfig({
                          authType: e.target.value as ExecutionAuthConfig["authType"],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="None">None</option>
                      <option value="BearerToken">Bearer Token</option>
                      <option value="Basic">Basic</option>
                      <option value="ApiKey">API Key</option>
                      <option value="OAuth2ClientCredentials">OAuth2 Client Credentials</option>
                    </select>

                    {formData.authConfig.authType === "BearerToken" && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={formData.authConfig.headerName || ""}
                          onChange={(e) => updateAuthConfig({ headerName: e.target.value || null })}
                          placeholder="Header Name (default: Authorization)"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={formData.authConfig.token || ""}
                          onChange={(e) => updateAuthConfig({ token: e.target.value || null })}
                          placeholder="Token"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {formData.authConfig.authType === "Basic" && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={formData.authConfig.username || ""}
                          onChange={(e) => updateAuthConfig({ username: e.target.value || null })}
                          placeholder="Username"
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={formData.authConfig.password || ""}
                          onChange={(e) => updateAuthConfig({ password: e.target.value || null })}
                          placeholder="Password"
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {formData.authConfig.authType === "ApiKey" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={formData.authConfig.apiKeyName || ""}
                            onChange={(e) => updateAuthConfig({ apiKeyName: e.target.value || null })}
                            placeholder="API Key Name (e.g. x-api-key)"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={formData.authConfig.apiKeyValue || ""}
                            onChange={(e) => updateAuthConfig({ apiKeyValue: e.target.value || null })}
                            placeholder="API Key Value"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <select
                          value={formData.authConfig.apiKeyLocation || "Header"}
                          onChange={(e) =>
                            updateAuthConfig({
                              apiKeyLocation: e.target.value as ExecutionAuthConfig["apiKeyLocation"],
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Header">Header</option>
                          <option value="Query">Query</option>
                        </select>
                      </div>
                    )}

                    {formData.authConfig.authType === "OAuth2ClientCredentials" && (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={formData.authConfig.tokenUrl || ""}
                          onChange={(e) => updateAuthConfig({ tokenUrl: e.target.value || null })}
                          placeholder="Token URL"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={formData.authConfig.clientId || ""}
                            onChange={(e) => updateAuthConfig({ clientId: e.target.value || null })}
                            placeholder="Client ID"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={formData.authConfig.clientSecret || ""}
                            onChange={(e) => updateAuthConfig({ clientSecret: e.target.value || null })}
                            placeholder="Client Secret"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={(formData.authConfig.scopes || []).join(", ")}
                          onChange={(e) => updateAuthConfig({ scopes: parseScopes(e.target.value) })}
                          placeholder="Scopes (comma separated)"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  {t("environments.form.setAsDefault")}
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedEnvId(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={showCreateModal ? handleCreate : handleEdit}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {showCreateModal ? t("common.create") : t("common.save")}
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
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:scale-105 transition-all cursor-pointer"
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
                        className="p-1 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
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
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:scale-105 transition-all cursor-pointer"
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
                        className="p-1 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
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
                  className="flex-1 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setSelectedEnvId(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
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
