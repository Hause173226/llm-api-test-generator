import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useRequestConfig,
  useResponseData,
} from "../contexts/ManualTestingContext";
import { useVariables } from "../contexts/EnvironmentContext";
import { AuthConfig, HttpMethod, RequestConfig } from "../types";
import KeyValueEditor from "./KeyValueEditor";
import { sendRequest } from "../utils/sendRequest";

type BuilderTab = "params" | "auth" | "headers" | "body";

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
  OPTIONS: "text-purple-600",
  HEAD: "text-cyan-600",
};

function normalizeAuth(auth: RequestConfig["auth"] | undefined): AuthConfig {
  if (!auth) return { type: "none" };
  if (auth.type === "bearer") {
    return { type: "bearer", bearer: { token: auth.bearer?.token || "" } };
  }
  if (auth.type === "basic") {
    return {
      type: "basic",
      basic: {
        username: auth.basic?.username || "",
        password: auth.basic?.password || "",
      },
    };
  }
  if (auth.type === "apiKey") {
    return {
      type: "apiKey",
      apiKey: {
        key: auth.apiKey?.key || "",
        value: auth.apiKey?.value || "",
        addTo: auth.apiKey?.addTo || "header",
      },
    };
  }
  return { type: "none" };
}

const RequestBuilder: React.FC = () => {
  const { t } = useTranslation();
  const {
    requestConfig,
    executionTarget,
    setRequestConfig,
    updateRequestConfig,
  } = useRequestConfig();
  const { setResponseData, setLoading, setError } = useResponseData();
  const { resolveVariables, activeEnvironment, getAllVariables } =
    useVariables();

  const [headers, setHeaders] = useState(requestConfig.headers || []);
  const [params, setParams] = useState(requestConfig.params || []);
  const [bodyType, setBodyType] = useState(requestConfig.body?.type || "none");
  const [bodyText, setBodyText] = useState(requestConfig.body?.content || "");
  const [formData, setFormData] = useState(requestConfig.body?.formData || []);
  const [auth, setAuth] = useState<AuthConfig>(
    normalizeAuth(requestConfig.auth),
  );
  const [activeTab, setActiveTab] = useState<BuilderTab>("params");
  const [isVariableMenuOpen, setIsVariableMenuOpen] = useState(false);
  const [highlightedVariableIndex, setHighlightedVariableIndex] = useState(0);
  const [isEditingTestCaseName, setIsEditingTestCaseName] = useState(false);
  const variableMenuRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHeaders(requestConfig.headers || []);
    setParams(requestConfig.params || []);
    setBodyType(requestConfig.body?.type || "none");
    setBodyText(requestConfig.body?.content || "");
    setFormData(requestConfig.body?.formData || []);
    setAuth(normalizeAuth(requestConfig.auth));
  }, [requestConfig]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!isVariableMenuOpen) return;
      if (!variableMenuRef.current) return;
      if (variableMenuRef.current.contains(event.target as Node)) return;
      setIsVariableMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [isVariableMenuOpen]);

  const availableVariables = useMemo(
    () => getAllVariables().filter((item) => item.key?.trim()),
    [getAllVariables],
  );

  useEffect(() => {
    if (isVariableMenuOpen) {
      setHighlightedVariableIndex(0);
    }
  }, [isVariableMenuOpen]);

  useEffect(() => {
    if (!executionTarget?.suiteId) {
      setIsEditingTestCaseName(false);
    }
  }, [executionTarget?.suiteId]);

  const methodColor = useMemo(() => {
    return (
      METHOD_COLORS[(requestConfig.method || "GET") as HttpMethod] ||
      "text-slate-700"
    );
  }, [requestConfig.method]);

  const onMethodChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    updateRequestConfig({ method: ev.target.value as HttpMethod });
  };

  const onUrlChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    updateRequestConfig({ url: ev.target.value });
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
      return;
    }

    if (e.key === "{" && availableVariables.length > 0) {
      setIsVariableMenuOpen(true);
      setHighlightedVariableIndex(0);
      return;
    }

    if (!isVariableMenuOpen || availableVariables.length === 0) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsVariableMenuOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedVariableIndex(
        (prev) => (prev + 1) % availableVariables.length,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedVariableIndex((prev) =>
        prev === 0 ? availableVariables.length - 1 : prev - 1,
      );
      return;
    }

    if (e.key === "Tab" || e.key === "Enter") {
      const selected = availableVariables[highlightedVariableIndex];
      if (!selected) return;
      e.preventDefault();
      insertVariableToUrl(selected.key);
    }
  };

  const insertVariableToUrl = (variableKey: string) => {
    const key = variableKey.trim();
    if (!key) return;

    const token = `{{${key}}}`;
    const currentUrl = requestConfig.url || "";
    const inputEl = urlInputRef.current;

    if (!inputEl) {
      updateRequestConfig({ url: `${currentUrl}${token}` });
      setIsVariableMenuOpen(false);
      return;
    }

    const selectionStart = inputEl.selectionStart ?? currentUrl.length;
    const selectionEnd = inputEl.selectionEnd ?? selectionStart;
    const nextUrl =
      currentUrl.slice(0, selectionStart) +
      token +
      currentUrl.slice(selectionEnd);

    updateRequestConfig({ url: nextUrl });
    setIsVariableMenuOpen(false);

    requestAnimationFrame(() => {
      inputEl.focus();
      const nextCursor = selectionStart + token.length;
      inputEl.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const applyLocalEditors = (): RequestConfig => {
    const body: RequestConfig["body"] = {
      type: bodyType as RequestConfig["body"]["type"],
      content: bodyText,
      formData,
    };

    const nextConfig: RequestConfig = {
      ...requestConfig,
      headers,
      params,
      body,
      auth,
    };

    setRequestConfig(nextConfig);
    return nextConfig;
  };

  const onSend = async () => {
    const nextConfig = applyLocalEditors();

    if (!nextConfig.url || !nextConfig.url.trim()) {
      setError(new Error(t("manualTesting.urlRequired") || "URL is required"));
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await sendRequest(nextConfig, {
        resolveVariables,
        suiteId: executionTarget.suiteId || undefined,
        testCaseId: executionTarget.testCaseId || undefined,
        environmentId: activeEnvironment?.id,
      });
      setResponseData(response);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const onAuthTypeChange = (nextType: AuthConfig["type"]) => {
    if (nextType === "none") {
      setAuth({ type: "none" });
      return;
    }
    if (nextType === "bearer") {
      setAuth({
        type: "bearer",
        bearer: {
          token: auth.type === "bearer" ? auth.bearer?.token || "" : "",
        },
      });
      return;
    }
    if (nextType === "basic") {
      setAuth({
        type: "basic",
        basic: {
          username: auth.type === "basic" ? auth.basic?.username || "" : "",
          password: auth.type === "basic" ? auth.basic?.password || "" : "",
        },
      });
      return;
    }
    setAuth({
      type: "apiKey",
      apiKey: {
        key: auth.type === "apiKey" ? auth.apiKey?.key || "" : "",
        value: auth.type === "apiKey" ? auth.apiKey?.value || "" : "",
        addTo:
          auth.type === "apiKey" ? auth.apiKey?.addTo || "header" : "header",
      },
    });
  };

  const onSaveTestCase = () => {
    window.dispatchEvent(new CustomEvent("manual-testing-save-test-case"));
  };

  const tabButton = (tab: BuilderTab, label: string) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 text-sm rounded-lg border transition-all ${
          active
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {executionTarget?.suiteId && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Test Case
          </span>
          {isEditingTestCaseName ? (
            <input
              autoFocus
              value={requestConfig.testCaseName || ""}
              onChange={(e) =>
                updateRequestConfig({ testCaseName: e.target.value })
              }
              onBlur={() => setIsEditingTestCaseName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingTestCaseName(false);
                }
                if (e.key === "Escape") {
                  setIsEditingTestCaseName(false);
                }
              }}
              placeholder={t("manualTesting.saveTestCaseNamePlaceholder")}
              className="h-8 w-64 max-w-full px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTestCaseName(true)}
              className="h-8 px-2.5 rounded-md border border-transparent text-sm text-left text-slate-700 dark:text-slate-200 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
              title={t("manualTesting.saveTestCaseNamePlaceholder")}
            >
              {requestConfig.testCaseName?.trim() ||
                t("manualTesting.saveTestCaseNamePlaceholder")}
            </button>
          )}
          <button
            type="button"
            onClick={onSaveTestCase}
            className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {executionTarget.testCaseId
              ? t("manualTesting.saveChanges")
              : t("manualTesting.saveToProject")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)] lg:grid-cols-[110px_minmax(0,1fr)_auto] gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
        <select
          value={requestConfig.method}
          onChange={onMethodChange}
          className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold ${methodColor}`}
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <div className="min-w-0 flex items-center gap-2">
          <input
            ref={urlInputRef}
            value={requestConfig.url}
            onChange={onUrlChange}
            onKeyDown={handleUrlKeyDown}
            placeholder={
              t("manualTesting.urlPlaceholder") ||
              "https://api.example.com/path"
            }
            className="w-full min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/70 font-mono"
          />

          <div className="relative" ref={variableMenuRef}>
            <button
              type="button"
              onClick={() => setIsVariableMenuOpen((prev) => !prev)}
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold"
              title="Insert environment variable"
            >
              {"{}"}
            </button>

            {isVariableMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20 p-1">
                {availableVariables.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                    No variables in active environment
                  </div>
                )}

                {availableVariables.map((variable) => (
                  <button
                    key={variable.id}
                    type="button"
                    onMouseEnter={() => {
                      const index = availableVariables.findIndex(
                        (item) => item.id === variable.id,
                      );
                      if (index >= 0) setHighlightedVariableIndex(index);
                    }}
                    onClick={() => insertVariableToUrl(variable.key)}
                    className={`w-full text-left px-2 py-1.5 rounded-md ${
                      availableVariables[highlightedVariableIndex]?.id ===
                      variable.id
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {variable.key}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {`{{${variable.key}}}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onSend}
          className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t("manualTesting.send")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("manualTesting.ctrlEnterHint")}
        </div>
        <div className="text-slate-600 dark:text-slate-300 break-all sm:break-normal">
          {t("manualTesting.activeEnvironment")}:{" "}
          {activeEnvironment?.name || t("manualTesting.noEnvironment")}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabButton("params", t("manualTesting.queryParams"))}
        {tabButton("auth", t("manualTesting.auth"))}
        {tabButton("headers", t("manualTesting.headers"))}
        {tabButton("body", t("manualTesting.body"))}
      </div>

      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
        {activeTab === "params" && (
          <KeyValueEditor
            items={params}
            onChange={setParams}
            placeholderKey="page"
            placeholderValue="1"
          />
        )}

        {activeTab === "headers" && (
          <KeyValueEditor
            items={headers}
            onChange={setHeaders}
            placeholderKey="Authorization"
            placeholderValue="Bearer {{token}}"
          />
        )}

        {activeTab === "auth" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium">
                {t("manualTesting.authType")}
              </label>
              <select
                value={auth.type}
                onChange={(e) =>
                  onAuthTypeChange(e.target.value as AuthConfig["type"])
                }
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="none">{t("manualTesting.authNone")}</option>
                <option value="bearer">{t("manualTesting.authBearer")}</option>
                <option value="basic">{t("manualTesting.authBasic")}</option>
                <option value="apiKey">{t("manualTesting.authApiKey")}</option>
              </select>
            </div>

            {auth.type === "none" && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t("manualTesting.authNone")}
              </div>
            )}

            {auth.type === "bearer" && (
              <input
                value={auth.bearer?.token || ""}
                onChange={(e) =>
                  setAuth({ type: "bearer", bearer: { token: e.target.value } })
                }
                placeholder={t("manualTesting.token")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            )}

            {auth.type === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={auth.basic?.username || ""}
                  onChange={(e) =>
                    setAuth({
                      type: "basic",
                      basic: {
                        username: e.target.value,
                        password: auth.basic?.password || "",
                      },
                    })
                  }
                  placeholder={t("manualTesting.username")}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="password"
                  value={auth.basic?.password || ""}
                  onChange={(e) =>
                    setAuth({
                      type: "basic",
                      basic: {
                        username: auth.basic?.username || "",
                        password: e.target.value,
                      },
                    })
                  }
                  placeholder={t("manualTesting.password")}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            )}

            {auth.type === "apiKey" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={auth.apiKey?.key || ""}
                    onChange={(e) =>
                      setAuth({
                        type: "apiKey",
                        apiKey: {
                          key: e.target.value,
                          value: auth.apiKey?.value || "",
                          addTo: auth.apiKey?.addTo || "header",
                        },
                      })
                    }
                    placeholder={t("manualTesting.apiKeyName")}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    value={auth.apiKey?.value || ""}
                    onChange={(e) =>
                      setAuth({
                        type: "apiKey",
                        apiKey: {
                          key: auth.apiKey?.key || "",
                          value: e.target.value,
                          addTo: auth.apiKey?.addTo || "header",
                        },
                      })
                    }
                    placeholder={t("manualTesting.apiKeyValue")}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <select
                  value={auth.apiKey?.addTo || "header"}
                  onChange={(e) =>
                    setAuth({
                      type: "apiKey",
                      apiKey: {
                        key: auth.apiKey?.key || "",
                        value: auth.apiKey?.value || "",
                        addTo: e.target.value as "header" | "query",
                      },
                    })
                  }
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="header">{t("manualTesting.header")}</option>
                  <option value="query">{t("manualTesting.query")}</option>
                </select>
              </div>
            )}
          </div>
        )}

        {activeTab === "body" && (
          <div className="space-y-3">
            <select
              value={bodyType}
              onChange={(e) =>
                setBodyType(e.target.value as RequestConfig["body"]["type"])
              }
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="none">None</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="raw">Raw</option>
              <option value="form">Form (x-www-form-urlencoded)</option>
            </select>

            {bodyType === "none" && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t("manualTesting.noBodyHint")}
              </div>
            )}

            {bodyType === "form" && (
              <KeyValueEditor
                items={formData}
                onChange={setFormData}
                placeholderKey="field"
                placeholderValue="value"
              />
            )}

            {bodyType !== "none" && bodyType !== "form" && (
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder={t("manualTesting.bodyPlaceholder")}
                className="w-full h-60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/70 font-mono text-sm"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestBuilder;
