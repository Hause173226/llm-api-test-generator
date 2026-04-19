import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { Environment, EnvironmentVariable, KeyValuePair } from "../types";
import type { ExecutionAuthConfig } from "../../../services/environmentService";
import KeyValueEditor from "./KeyValueEditor";

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

type EnvironmentFormData = {
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  headers: Record<string, string>;
  authConfig: ExecutionAuthConfig;
  isDefault: boolean;
};

function createEnvironmentFromForm(form: EnvironmentFormData): Environment {
  const now = new Date();
  const variables: EnvironmentVariable[] = Object.entries(form.variables).map(
    ([key, value], index) => ({
      id: `new-var-${index}`,
      key,
      value,
      enabled: true,
    }),
  );
  // Add baseUrl as a variable if provided
  if (form.baseUrl) {
    variables.unshift({
      id: "new-var-baseUrl",
      key: "baseUrl",
      value: form.baseUrl,
      enabled: true,
    });
  }
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: form.name,
    baseUrl: form.baseUrl,
    variables,
    isDefault: form.isDefault,
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

const EnvironmentPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    environments,
    activeEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironment();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<EnvironmentFormData>({
    name: "",
    baseUrl: "",
    variables: {},
    headers: {},
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

  const updateAuthConfig = (partial: Partial<ExecutionAuthConfig>) => {
    setFormData((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, ...partial },
    }));
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

  const parseScopes = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    const created = createEnvironmentFromForm(formData);
    addEnvironment(created);
    setActiveEnvironment(created);
    setShowCreateModal(false);
    resetForm();
  };

  useEffect(() => {
    if (!activeEnvironment && environments.length > 0) {
      setActiveEnvironment(environments[0]);
    }
  }, [activeEnvironment, environments, setActiveEnvironment]);

  const activeVariables = useMemo(
    () => activeEnvironment?.variables || [],
    [activeEnvironment],
  );
  const editorItems = useMemo<KeyValuePair[]>(
    () =>
      activeVariables.map((item) => ({
        id: item.id,
        key: item.key,
        value: item.value,
        enabled: item.enabled,
        description: item.description,
      })),
    [activeVariables],
  );

  const handleDeleteEnvironment = () => {
    if (!activeEnvironment) return;
    if (!confirm(t("manualTesting.deleteEnvironmentConfirm"))) return;
    deleteEnvironment(activeEnvironment.id);
  };

  const handleVariablesChange = (variables: EnvironmentVariable[]) => {
    if (!activeEnvironment) return;
    updateEnvironment(activeEnvironment.id, { variables });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("manualTesting.activeEnvironment")}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {activeVariables.filter((item) => item.enabled).length} {t("manualTesting.variables")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
        <select
          value={activeEnvironment?.id || ""}
          onChange={(e) => {
            const found = environments.find((item) => item.id === e.target.value) || null;
            setActiveEnvironment(found);
          }}
          className="min-w-0 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <option value="">{t("manualTesting.noEnvironment")}</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {t("manualTesting.createEnvironment")}
          </button>
          <button
            onClick={handleDeleteEnvironment}
            disabled={!activeEnvironment}
            className="w-full sm:w-auto shrink-0 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {t("manualTesting.deleteEnvironment")}
          </button>
        </div>
      </div>

      {!activeEnvironment ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t("manualTesting.noEnvironment")}
        </div>
      ) : (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {t("manualTesting.variables")}
          </div>
          <KeyValueEditor
            items={editorItems}
            onChange={(items) =>
              handleVariablesChange(
                items.map((item) => ({
                  id: item.id,
                  key: item.key,
                  value: item.value,
                  enabled: item.enabled,
                  description: item.description,
                })) as EnvironmentVariable[],
              )
            }
            placeholderKey="baseUrl"
            placeholderValue="https://api.example.com"
          />
        </div>
      )}

      {/* Create Environment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                New Environment
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Name */}
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Environment name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

              {/* Base URL */}
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="Base URL"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

              {/* Variables Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowVariablesSection(!showVariablesSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showVariablesSection ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Environment Variables
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
                          <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <input type="text" value={key} readOnly className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setFormData((prev) => ({ ...prev, variables: { ...prev.variables, [key]: e.target.value } }))}
                            placeholder="Variable value"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button onClick={() => removeVariable(key)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer">Remove</button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <input type="text" value={variableKey} onChange={(e) => setVariableKey(e.target.value)} placeholder="Key" className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="text" value={variableValue} onChange={(e) => setVariableValue(e.target.value)} placeholder="Variable value" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <span className="text-sm font-medium px-2 py-1 invisible">Remove</span>
                      </div>
                      <button onClick={addVariable} className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-1 cursor-pointer">+ Add</button>
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
                  {showHeadersSection ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Default Headers
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
                          <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <input type="text" value={key} readOnly className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setFormData((prev) => ({ ...prev, headers: { ...prev.headers, [key]: e.target.value } }))}
                            placeholder="Header value"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button onClick={() => removeHeader(key)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer">Remove</button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <input type="text" value={headerKey} onChange={(e) => setHeaderKey(e.target.value)} placeholder="Header name" className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="text" value={headerValue} onChange={(e) => setHeaderValue(e.target.value)} placeholder="Header value" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <span className="text-sm font-medium px-2 py-1 invisible">Remove</span>
                      </div>
                      <button onClick={addHeader} className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-1 cursor-pointer">+ Add</button>
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
                  {showAuthSection ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Authentication</span>
                  <span className="text-xs text-slate-400">({formData.authConfig.authType})</span>
                </button>
                {showAuthSection && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 mt-2">
                    <select
                      value={formData.authConfig.authType}
                      onChange={(e) => updateAuthConfig({ authType: e.target.value as ExecutionAuthConfig["authType"] })}
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
                        <input type="text" value={formData.authConfig.headerName || ""} onChange={(e) => updateAuthConfig({ headerName: e.target.value || null })} placeholder="Header Name (default: Authorization)" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="password" value={formData.authConfig.token || ""} onChange={(e) => updateAuthConfig({ token: e.target.value || null })} placeholder="Token" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}

                    {formData.authConfig.authType === "Basic" && (
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={formData.authConfig.username || ""} onChange={(e) => updateAuthConfig({ username: e.target.value || null })} placeholder="Username" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="password" value={formData.authConfig.password || ""} onChange={(e) => updateAuthConfig({ password: e.target.value || null })} placeholder="Password" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}

                    {formData.authConfig.authType === "ApiKey" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={formData.authConfig.apiKeyName || ""} onChange={(e) => updateAuthConfig({ apiKeyName: e.target.value || null })} placeholder="API Key Name" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input type="password" value={formData.authConfig.apiKeyValue || ""} onChange={(e) => updateAuthConfig({ apiKeyValue: e.target.value || null })} placeholder="API Key Value" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <select value={formData.authConfig.apiKeyLocation || "Header"} onChange={(e) => updateAuthConfig({ apiKeyLocation: e.target.value as ExecutionAuthConfig["apiKeyLocation"] })} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="Header">Header</option>
                          <option value="Query">Query</option>
                        </select>
                      </div>
                    )}

                    {formData.authConfig.authType === "OAuth2ClientCredentials" && (
                      <div className="space-y-3">
                        <input type="url" value={formData.authConfig.tokenUrl || ""} onChange={(e) => updateAuthConfig({ tokenUrl: e.target.value || null })} placeholder="Token URL" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={formData.authConfig.clientId || ""} onChange={(e) => updateAuthConfig({ clientId: e.target.value || null })} placeholder="Client ID" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input type="password" value={formData.authConfig.clientSecret || ""} onChange={(e) => updateAuthConfig({ clientSecret: e.target.value || null })} placeholder="Client Secret" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <input type="text" value={(formData.authConfig.scopes || []).join(", ")} onChange={(e) => updateAuthConfig({ scopes: parseScopes(e.target.value) })} placeholder="Scopes (comma separated)" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="manual-isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="manual-isDefault" className="text-sm text-slate-700 dark:text-slate-300">
                  Set as default environment
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentPanel;