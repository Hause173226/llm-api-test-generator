import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequestConfig } from "../contexts/ManualTestingContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import KeyValueEditor from "./KeyValueEditor";
import { Environment } from "../types";
import { HttpMethod, KeyValuePair, RequestConfig } from "../types";
import Modal from "../../../components/ui/Modal";
import apiService from "../../../services/apiService";
import environmentService from "../../../services/environmentService";
import {
  Project,
  filterProjectsByWorkspaceMode,
  projectService,
} from "../../../services/projectService";
import {
  TestSuite,
  testSuiteService,
} from "../../../services/testSuiteService";
import testCaseService, { TestCase } from "../../../services/testCaseService";
import { X, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { ExecutionAuthConfig } from "../../../services/environmentService";

const methodToEnumMap: Record<HttpMethod, number> = {
  GET: 0,
  POST: 1,
  PUT: 2,
  DELETE: 3,
  PATCH: 4,
  HEAD: 5,
  OPTIONS: 6,
};

const bodyTypeToEnumMap: Record<RequestConfig["body"]["type"], number> = {
  none: 0,
  json: 1,
  form: 3,
  raw: 4,
  xml: 4,
};

const guidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toPairs = (input: unknown): KeyValuePair[] => {
  let record: Record<string, unknown> = {};

  if (typeof input === "string" && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        record = parsed;
      }
    } catch {
      record = {};
    }
  } else if (input && typeof input === "object" && !Array.isArray(input)) {
    record = input as Record<string, unknown>;
  }

  return Object.entries(record).map(([key, value], index) => ({
    id: `kv-${index}-${key}`,
    key,
    value: value == null ? "" : String(value),
    enabled: true,
  }));
};

const toRecord = (pairs: KeyValuePair[] = []) => {
  const output: Record<string, string> = {};
  pairs.forEach((pair) => {
    if (!pair.key?.trim()) return;
    if (pair.enabled === false) return;
    output[pair.key.trim()] = pair.value ?? "";
  });
  return output;
};

const inferBodyType = (rawBody: string): RequestConfig["body"]["type"] => {
  const body = rawBody?.trim();
  if (!body) return "none";

  try {
    JSON.parse(body);
    return "json";
  } catch {
    return "raw";
  }
};

const normalizeMethod = (method: string): HttpMethod => {
  const upper = method?.toUpperCase();
  if (upper === "GET") return "GET";
  if (upper === "POST") return "POST";
  if (upper === "PUT") return "PUT";
  if (upper === "PATCH") return "PATCH";
  if (upper === "DELETE") return "DELETE";
  if (upper === "HEAD") return "HEAD";
  if (upper === "OPTIONS") return "OPTIONS";
  return "GET";
};

const createEnvironment = (
  name: string,
  variables: KeyValuePair[],
): Environment => {
  const now = new Date();
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    variables: variables
      .filter((item) => item.key.trim())
      .map((item, index) => ({
        id: item.id || `env-var-${Date.now()}-${index}`,
        key: item.key.trim(),
        value: item.value ?? "",
        enabled: item.enabled !== false,
      })),
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
};

const createEnvironmentVariableDraft = (
  key = "",
  value = "",
): KeyValuePair => ({
  id: `env-kv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key,
  value,
  enabled: true,
});

const toEnvironmentDraftVariables = (
  environment: Environment | null,
): KeyValuePair[] => {
  if (!environment || !environment.variables?.length) {
    return [createEnvironmentVariableDraft("baseUrl", "")];
  }

  return environment.variables.map((item, index) => ({
    id: item.id || `env-kv-${Date.now()}-${index}`,
    key: item.key,
    value: item.value,
    enabled: item.enabled !== false,
  }));
};

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

type EnvFormData = {
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  headers: Record<string, string>;
  authConfig: ExecutionAuthConfig;
  isDefault: boolean;
};

const SavedRequestsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { requestConfig, setRequestConfig, setExecutionTarget, resetRequest } =
    useRequestConfig();
  const {
    environments,
    activeEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironment();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [suiteName, setSuiteName] = useState("");
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [isSuiteModalOpen, setIsSuiteModalOpen] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null);
  const [testCaseName, setTestCaseName] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const [environmentModalMode, setEnvironmentModalMode] = useState<
    "create" | "edit"
  >("create");
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<
    string | null
  >(null);
  const [envFormData, setEnvFormData] = useState<EnvFormData>({
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
  const [isEnvironmentModalOpen, setIsEnvironmentModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const hasProjectSelected = Boolean(selectedProjectId);
  const hasSuiteSelected = Boolean(selectedSuiteId);

  const selectedSuite = useMemo(() => {
    return suites.find((suite) => suite.id === selectedSuiteId) || null;
  }, [suites, selectedSuiteId]);

  const activeTestCase = useMemo(() => {
    return (
      testCases.find((testCase) => testCase.id === activeTestCaseId) || null
    );
  }, [testCases, activeTestCaseId]);

  const loadProjects = async (preferredProjectId?: string) => {
    const response = await projectService.getProjects(1, 100);
    const items = filterProjectsByWorkspaceMode(response.items || [], "Manual");
    setProjects(items);

    const targetProjectId =
      preferredProjectId &&
      items.some((project) => project.id === preferredProjectId)
        ? preferredProjectId
        : selectedProjectId &&
            items.some((project) => project.id === selectedProjectId)
          ? selectedProjectId
          : items[0]?.id || "";

    setSelectedProjectId(targetProjectId);
  };

  const loadProjectContext = async (projectId: string) => {
    const suiteItems = await testSuiteService.getTestSuites(projectId);

    setSuites(suiteItems || []);
    setSelectedSuiteId((prev) => {
      if (prev && suiteItems.some((suite) => suite.id === prev)) return prev;
      return suiteItems[0]?.id || "";
    });
  };

  const applyTestCaseToBuilder = (testCase: TestCase) => {
    const bodyContent =
      typeof testCase.requestBody === "string"
        ? testCase.requestBody
        : testCase.requestBody != null
          ? JSON.stringify(testCase.requestBody, null, 2)
          : "";

    setRequestConfig({
      method: normalizeMethod(testCase.method),
      url: testCase.path || "",
      params: toPairs(testCase.queryParams),
      headers: toPairs(testCase.headers),
      body: {
        type: inferBodyType(bodyContent),
        content: bodyContent,
        formData: [],
      },
      auth: { type: "none" },
      timeout: 30000,
      testCaseName: testCase.name || "",
    });

    setExecutionTarget({
      suiteId: selectedSuiteId || null,
      testCaseId: testCase.id,
    });

    setActiveTestCaseId(testCase.id);
    setTestCaseName(testCase.name || "");
  };

  const loadTestCases = async (
    suiteId: string,
    preferredTestCaseId?: string,
  ) => {
    const response = await testCaseService.getTestCases(suiteId, 1, 200);
    const items = response.items || [];
    setTestCases(items);

    const selectedId =
      preferredTestCaseId ||
      (activeTestCaseId &&
      items.some((testCase) => testCase.id === activeTestCaseId)
        ? activeTestCaseId
        : null);

    if (selectedId) {
      const selected = items.find((testCase) => testCase.id === selectedId);
      if (selected) {
        applyTestCaseToBuilder(selected);
      }
      return;
    }

    setActiveTestCaseId(null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        await loadProjects();
      } catch (error) {
        console.error(error);
        alert(t("manualTesting.projectLoadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setSuites([]);
      setSelectedSuiteId("");
      setTestCases([]);
      return;
    }

    const run = async () => {
      try {
        setIsLoading(true);
        await loadProjectContext(selectedProjectId);
      } catch (error) {
        console.error(error);
        alert(t("manualTesting.projectLoadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedSuiteId) {
      setTestCases([]);
      setActiveTestCaseId(null);
      setTestCaseName("");
      setExecutionTarget({
        suiteId: null,
        testCaseId: null,
      });
      return;
    }

    setExecutionTarget({
      suiteId: selectedSuiteId,
      testCaseId: activeTestCaseId,
    });

    const run = async () => {
      try {
        await loadTestCases(selectedSuiteId);
      } catch (error) {
        console.error(error);
      }
    };

    void run();
  }, [
    selectedSuiteId,
    activeTestCaseId,
    selectedSuite?.selectedEndpointIds,
    setExecutionTarget,
  ]);

  const handleCreateProject = async () => {
    const name = projectName.trim();
    if (!name) return;

    try {
      setIsLoading(true);
      const project = await projectService.createProject({
        name,
        description: "Created from Manual Testing",
        type: "REST",
        workspaceMode: "Manual",
      });

      setProjectName("");
      await loadProjects(project.id);
      setIsProjectModalOpen(false);
    } catch (error) {
      console.error(error);
      alert(t("manualTesting.projectCreateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuite = async () => {
    const name = suiteName.trim();
    if (!selectedProjectId) {
      alert(t("manualTesting.projectRequiredToCreateSuite"));
      return;
    }
    if (!name) return;

    try {
      setIsLoading(true);
      const createdSuite = await testSuiteService.createTestSuite(
        selectedProjectId,
        {
          name,
          description: "Created from Manual Testing",
          generationType: "Manual",
          selectedEndpointIds: [],
          endpointBusinessContexts: {},
          globalBusinessRules: "",
        },
      );

      setSuiteName("");
      await loadProjectContext(selectedProjectId);
      setSelectedSuiteId(createdSuite.id);
      setIsSuiteModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to create test suite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTestCase = () => {
    setActiveTestCaseId(null);
    setTestCaseName("");
    setExecutionTarget({
      suiteId: selectedSuiteId || null,
      testCaseId: null,
    });
    resetRequest();
  };

  const openRenameModal = (testCase: TestCase) => {
    applyTestCaseToBuilder(testCase);
    setRenameDraft(testCase.name || "");
    setIsRenameModalOpen(true);
  };

  const buildTestCasePayload = (resolvedName: string) => {
    const methodEnum = methodToEnumMap[requestConfig.method] ?? 0;
    const bodyTypeEnum =
      bodyTypeToEnumMap[requestConfig.body?.type || "none"] ?? 0;
    const headers = toRecord(requestConfig.headers);
    const queryParams = toRecord(requestConfig.params);

    let bodyPayload: string | null = null;
    if (requestConfig.body?.type === "form") {
      const formRecord = toRecord(requestConfig.body.formData || []);
      bodyPayload = JSON.stringify(formRecord);
    } else if (requestConfig.body?.type && requestConfig.body.type !== "none") {
      bodyPayload = requestConfig.body.content || "";
    }

    return {
      endpointId: undefined,
      name: resolvedName,
      description: "",
      testType: 0,
      priority: 2,
      isEnabled: true,
      tags: [],
      request: {
        httpMethod: methodEnum,
        url: requestConfig.url,
        headers: JSON.stringify(headers),
        pathParams: null,
        queryParams: JSON.stringify(queryParams),
        bodyType: bodyTypeEnum,
        body: bodyPayload,
        timeout: requestConfig.timeout || 30000,
      },
      expectation: {
        expectedStatus: String(activeTestCase?.expectedStatus || 200),
        responseSchema: null,
        headerChecks: null,
        bodyContains: null,
        bodyNotContains: null,
        jsonPathChecks: null,
        maxResponseTime: null,
      },
      variables: [],
    };
  };

  const handleSaveTestCase = async (overrideName?: string) => {
    if (!selectedSuiteId) {
      alert(t("manualTesting.suiteRequiredToSaveCase"));
      return;
    }
    if (!requestConfig.url?.trim()) {
      alert(t("manualTesting.saveRequireUrl"));
      return;
    }

    const resolvedName =
      overrideName?.trim() ||
      requestConfig.testCaseName?.trim() ||
      testCaseName.trim() ||
      `${requestConfig.method} ${requestConfig.url}`;
    const payload = buildTestCasePayload(resolvedName);

    try {
      setIsLoading(true);

      let result: any;
      if (activeTestCaseId) {
        result = await apiService.put(
          `/test-suites/${selectedSuiteId}/test-cases/${activeTestCaseId}`,
          payload,
        );
      } else {
        result = await apiService.post(
          `/test-suites/${selectedSuiteId}/test-cases`,
          payload,
        );
      }

      const savedId = result?.id || result?.Id || activeTestCaseId;
      setTestCaseName(resolvedName);
      setRequestConfig({
        ...requestConfig,
        testCaseName: resolvedName,
      });
      await loadTestCases(selectedSuiteId, savedId || undefined);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to save test case");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameTestCase = async () => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      return;
    }

    await handleSaveTestCase(nextName);
    setIsRenameModalOpen(false);
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    if (!selectedSuiteId) return;
    if (!confirm(t("manualTesting.deleteConfirm"))) return;

    try {
      setIsLoading(true);
      await testCaseService.deleteTestCase(selectedSuiteId, testCaseId);

      if (activeTestCaseId === testCaseId) {
        setActiveTestCaseId(null);
        setTestCaseName("");
        setExecutionTarget({
          suiteId: selectedSuiteId || null,
          testCaseId: null,
        });
      }

      await loadTestCases(selectedSuiteId);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to delete test case");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onSaveRequested = () => {
      void handleSaveTestCase();
    };

    const onNewTestCaseRequested = () => {
      handleNewTestCase();
    };

    window.addEventListener("manual-testing-save-test-case", onSaveRequested);
    window.addEventListener(
      "manual-testing-new-test-case",
      onNewTestCaseRequested,
    );
    return () => {
      window.removeEventListener(
        "manual-testing-save-test-case",
        onSaveRequested,
      );
      window.removeEventListener(
        "manual-testing-new-test-case",
        onNewTestCaseRequested,
      );
    };
  }, [handleSaveTestCase]);

  const resetEnvironmentDraft = () => {
    setEnvironmentModalMode("create");
    setEditingEnvironmentId(null);
    setEnvFormData({
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

  const openCreateEnvironmentModal = () => {
    resetEnvironmentDraft();
    setIsEnvironmentModalOpen(true);
  };

  const openEditEnvironmentModal = (environment?: Environment | null) => {
    const targetEnvironment = environment || activeEnvironment;
    if (!targetEnvironment) return;
    setEnvironmentModalMode("edit");
    setEditingEnvironmentId(targetEnvironment.id);

    const vars: Record<string, string> = {};
    targetEnvironment.variables
      .filter((v) => v.key.trim() && v.key.trim() !== "baseUrl")
      .forEach((v) => {
        vars[v.key.trim()] = v.value ?? "";
      });

    setEnvFormData({
      name: targetEnvironment.name,
      baseUrl:
        targetEnvironment.baseUrl ||
        targetEnvironment.variables.find((v) => v.key.trim() === "baseUrl")
          ?.value ||
        "",
      variables: vars,
      headers: targetEnvironment.headers || {},
      authConfig: targetEnvironment.authConfig || createDefaultAuthConfig(),
      isDefault: targetEnvironment.isDefault || false,
    });

    if (Object.keys(vars).length > 0) setShowVariablesSection(true);
    if (
      targetEnvironment.headers &&
      Object.keys(targetEnvironment.headers).length > 0
    )
      setShowHeadersSection(true);
    if (
      targetEnvironment.authConfig &&
      targetEnvironment.authConfig.authType !== "None"
    )
      setShowAuthSection(true);

    setIsEnvironmentModalOpen(true);
  };

  const updateAuthConfig = (partial: Partial<ExecutionAuthConfig>) => {
    setEnvFormData((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, ...partial },
    }));
  };

  const parseScopes = (raw: string) => {
    if (!raw.trim()) return [] as string[];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const addVariable = () => {
    if (!variableKey) return;
    setEnvFormData((prev) => ({
      ...prev,
      variables: { ...prev.variables, [variableKey]: variableValue },
    }));
    setVariableKey("");
    setVariableValue("");
  };

  const removeVariable = (key: string) => {
    setEnvFormData((prev) => {
      const newVars = { ...prev.variables };
      delete newVars[key];
      return { ...prev, variables: newVars };
    });
  };

  const addHeader = () => {
    if (!headerKey) return;
    setEnvFormData((prev) => ({
      ...prev,
      headers: { ...prev.headers, [headerKey]: headerValue },
    }));
    setHeaderKey("");
    setHeaderValue("");
  };

  const removeHeader = (key: string) => {
    setEnvFormData((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const buildEnvPayload = () => {
    const vars =
      Object.keys(envFormData.variables).length > 0
        ? envFormData.variables
        : null;
    const hdrs =
      Object.keys(envFormData.headers).length > 0 ? envFormData.headers : null;
    const auth = envFormData.authConfig;
    return {
      name: envFormData.name,
      baseUrl: envFormData.baseUrl,
      variables: vars,
      headers: hdrs,
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
      } as ExecutionAuthConfig,
      isDefault: envFormData.isDefault,
    };
  };

  const handleSaveEnvironment = async () => {
    const name = envFormData.name.trim();
    if (!name) return;

    const payload = buildEnvPayload();

    if (environmentModalMode === "edit" && editingEnvironmentId) {
      const variableEntries = payload.variables
        ? Object.entries(payload.variables).map(([key, value], index) => ({
            id: `env-kv-${Date.now()}-${index}`,
            key,
            value: value ?? "",
            enabled: true,
          }))
        : [];

      // Get current environment and rowVersion
      let currentEnv = environments.find((e) => e.id === editingEnvironmentId);
      let rowVersion = currentEnv?.rowVersion;

      console.log("[SavedRequestsPanel] Before fetch:", {
        editingEnvironmentId,
        "currentEnv?.rowVersion": currentEnv?.rowVersion,
        rowVersion,
        selectedProjectId,
      });

      // If rowVersion is missing and we have a projectId, fetch latest from backend
      if (!rowVersion && selectedProjectId) {
        try {
          const latest = await environmentService.getEnvironmentById(
            selectedProjectId,
            editingEnvironmentId,
          );
          rowVersion = latest?.rowVersion;
          console.log("[SavedRequestsPanel] After fetch:", {
            "latest.rowVersion": latest?.rowVersion,
            rowVersion,
          });
        } catch (fetchErr) {
          console.error(
            "Failed to fetch latest environment before update:",
            fetchErr,
          );
        }
      }

      console.log("[SavedRequestsPanel] Calling updateEnvironment with:", {
        editingEnvironmentId,
        rowVersion,
        name,
        baseUrl: payload.baseUrl,
      });

      // Update via context (which will call the backend)
      await updateEnvironment(editingEnvironmentId, {
        rowVersion,
        name,
        baseUrl: payload.baseUrl,
        variables: variableEntries,
        headers: payload.headers || undefined,
        authConfig: payload.authConfig,
        isDefault: payload.isDefault,
      });

      // Update activeEnvironment if it's the one being edited
      if (activeEnvironment?.id === editingEnvironmentId) {
        setActiveEnvironment({
          ...activeEnvironment,
          name,
          baseUrl: payload.baseUrl,
          variables: variableEntries,
          headers: payload.headers || undefined,
          authConfig: payload.authConfig,
          isDefault: payload.isDefault,
          rowVersion: rowVersion ?? activeEnvironment.rowVersion,
          updatedAt: new Date(),
        });
      }
    } else {
      const now = new Date();
      const variableEntries = payload.variables
        ? Object.entries(payload.variables).map(([key, value], index) => ({
            id: `env-var-${Date.now()}-${index}`,
            key,
            value: value ?? "",
            enabled: true,
          }))
        : [];

      const created: Environment = {
        id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        baseUrl: payload.baseUrl,
        variables: variableEntries,
        headers: payload.headers || undefined,
        authConfig: payload.authConfig,
        isDefault: payload.isDefault,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      };

      addEnvironment(created);
      if (!selectedProjectId) {
        setActiveEnvironment(created);
      }
    }

    resetEnvironmentDraft();
    setIsEnvironmentModalOpen(false);
  };

  const handleDeleteEnvironment = (environmentId?: string) => {
    const targetId = environmentId || activeEnvironment?.id;
    if (!targetId) return;
    if (!confirm(t("manualTesting.deleteEnvironmentConfirm"))) return;
    deleteEnvironment(targetId);
  };

  return (
    <div>
      <div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("manualTesting.projects")}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("manualTesting.projectsHint")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
          <button
            onClick={() => setIsProjectModalOpen(true)}
            disabled={isLoading}
            className="w-full shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            New Project
          </button>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <option value="">{t("manualTesting.selectProject")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {hasProjectSelected && (
          <>
            <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("manualTesting.testSuites")}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("manualTesting.testSuitesHint")}
              </p>
            </div>

            <button
              onClick={() => setIsSuiteModalOpen(true)}
              disabled={isLoading || !selectedProjectId}
              className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              New Suite
            </button>

            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-0 bg-transparent text-slate-900 dark:text-slate-100"
            >
              <option value="">{t("manualTesting.selectSuite")}</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {hasSuiteSelected && (
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("manualTesting.savedTestCases")}
              </div>
              <button
                onClick={handleNewTestCase}
                className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                title={t("manualTesting.newTestCase")}
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {testCases.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {t("manualTesting.noTestCasesInProject")}
                </div>
              )}

              {testCases.map((testCase) => (
                <div
                  key={testCase.id}
                  onClick={() => applyTestCaseToBuilder(testCase)}
                  className={`px-2 py-2 rounded cursor-pointer transition-colors ${
                    testCase.id === activeTestCaseId
                      ? "bg-indigo-100/60 dark:bg-indigo-950/40 border-l-2 border-indigo-600"
                      : "hover:bg-slate-100/50 dark:hover:bg-slate-700/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="truncate font-medium text-sm"
                      title={testCase.name}
                    >
                      {testCase.name}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      {normalizeMethod(testCase.method)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 break-all leading-4 mt-1">
                    {testCase.path}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyTestCaseToBuilder(testCase);
                      }}
                      className="text-indigo-600 dark:text-indigo-400"
                    >
                      {t("manualTesting.loadCase")}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameModal(testCase);
                      }}
                      className="text-slate-600 dark:text-slate-300"
                    >
                      Edit Name
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteTestCase(testCase.id);
                      }}
                      className="text-red-500"
                    >
                      {t("manualTesting.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("manualTesting.activeEnvironment")}
          </label>
        </div>

        <button
          onClick={openCreateEnvironmentModal}
          className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          New Environment
        </button>

        <select
          value={activeEnvironment?.id || ""}
          onChange={(e) => {
            const found =
              environments.find((item) => item.id === e.target.value) || null;
            setActiveEnvironment(found);
          }}
          className="w-full px-3 py-2 rounded-lg border-0 bg-transparent text-slate-900 dark:text-slate-100"
        >
          <option value="">{t("manualTesting.noEnvironment")}</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>

        {!activeEnvironment && (
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("manualTesting.noEnvironment")}
          </div>
        )}

        {activeEnvironment && (
          <div className="mt-2 p-2.5 rounded-xl border border-indigo-400 bg-indigo-50/70 dark:border-indigo-500/50 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between gap-2">
              <div
                className="truncate font-medium text-sm"
                title={activeEnvironment.name}
              >
                {activeEnvironment.name}
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                ACTIVE
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
              {
                (activeEnvironment.variables || []).filter(
                  (item) => item.enabled !== false,
                ).length
              }{" "}
              variables
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              <button
                onClick={() => openEditEnvironmentModal(activeEnvironment)}
                className="text-slate-600 dark:text-slate-300"
              >
                Edit Env
              </button>
              <button
                onClick={() => handleDeleteEnvironment(activeEnvironment.id)}
                className="text-red-500"
              >
                {t("manualTesting.delete")}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => {
          if (isLoading) return;
          setIsProjectModalOpen(false);
          setProjectName("");
        }}
        title="New Project"
        footer={
          <>
            <button
              onClick={() => {
                setIsProjectModalOpen(false);
                setProjectName("");
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isLoading || !projectName.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
            >
              Create
            </button>
          </>
        }
      >
        <input
          placeholder={t("manualTesting.projectNamePlaceholder")}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="min-w-0 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </Modal>

      <Modal
        isOpen={isSuiteModalOpen}
        onClose={() => {
          if (isLoading) return;
          setIsSuiteModalOpen(false);
          setSuiteName("");
        }}
        title="New Suite"
        footer={
          <>
            <button
              onClick={() => {
                setIsSuiteModalOpen(false);
                setSuiteName("");
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSuite}
              disabled={isLoading || !suiteName.trim() || !selectedProjectId}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
            >
              Create
            </button>
          </>
        }
      >
        <input
          placeholder={t("manualTesting.suiteNamePlaceholder")}
          value={suiteName}
          onChange={(e) => setSuiteName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </Modal>

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => {
          if (isLoading) return;
          setIsRenameModalOpen(false);
        }}
        title="Edit Name"
        footer={
          <>
            <button
              onClick={() => setIsRenameModalOpen(false)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleRenameTestCase()}
              disabled={isLoading || !renameDraft.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
            >
              Save
            </button>
          </>
        }
      >
        <input
          placeholder={t("manualTesting.saveTestCaseNamePlaceholder")}
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </Modal>

      {/* Environment Create/Edit Modal */}
      {isEnvironmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {environmentModalMode === "edit"
                  ? "Edit Environment"
                  : "New Environment"}
              </h3>
              <button
                onClick={() => {
                  setIsEnvironmentModalOpen(false);
                  resetEnvironmentDraft();
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
                  value={envFormData.name}
                  onChange={(e) =>
                    setEnvFormData({ ...envFormData, name: e.target.value })
                  }
                  placeholder={t("environments.form.name")}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Base URL */}
              <div>
                <input
                  type="url"
                  value={envFormData.baseUrl}
                  onChange={(e) =>
                    setEnvFormData({ ...envFormData, baseUrl: e.target.value })
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
                    Variables
                  </span>
                  <span className="text-xs text-slate-400">
                    ({Object.keys(envFormData.variables).length})
                  </span>
                </button>
                {showVariablesSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      {
                        "You can define variables with any key and use them in URL/Header/Body via syntax {{variableName}}."
                      }
                    </p>
                    <div className="space-y-2">
                      {Object.entries(envFormData.variables).map(
                        ([key, value]) => (
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
                                setEnvFormData((prev) => ({
                                  ...prev,
                                  variables: {
                                    ...prev.variables,
                                    [key]: e.target.value,
                                  },
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
                        ),
                      )}
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
                        <span className="text-sm font-medium px-2 py-1 invisible">
                          Remove
                        </span>
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
                    Headers
                  </span>
                  <span className="text-xs text-slate-400">
                    ({Object.keys(envFormData.headers).length})
                  </span>
                </button>
                {showHeadersSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      Custom headers sent with every request.
                    </p>
                    <div className="space-y-2">
                      {Object.entries(envFormData.headers).map(
                        ([key, value]) => (
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
                                setEnvFormData((prev) => ({
                                  ...prev,
                                  headers: {
                                    ...prev.headers,
                                    [key]: e.target.value,
                                  },
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
                        ),
                      )}
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
                        <span className="text-sm font-medium px-2 py-1 invisible">
                          Remove
                        </span>
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
                  <span className="text-xs text-slate-400">
                    ({envFormData.authConfig.authType})
                  </span>
                </button>
                {showAuthSection && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 mt-2">
                    <select
                      value={envFormData.authConfig.authType}
                      onChange={(e) =>
                        updateAuthConfig({
                          authType: e.target
                            .value as ExecutionAuthConfig["authType"],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="None">None</option>
                      <option value="BearerToken">Bearer Token</option>
                      <option value="Basic">Basic</option>
                      <option value="ApiKey">API Key</option>
                      <option value="OAuth2ClientCredentials">
                        OAuth2 Client Credentials
                      </option>
                    </select>

                    {envFormData.authConfig.authType === "BearerToken" && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={envFormData.authConfig.headerName || ""}
                          onChange={(e) =>
                            updateAuthConfig({
                              headerName: e.target.value || null,
                            })
                          }
                          placeholder="Header Name (default: Authorization)"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={envFormData.authConfig.token || ""}
                          onChange={(e) =>
                            updateAuthConfig({ token: e.target.value || null })
                          }
                          placeholder="Token"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {envFormData.authConfig.authType === "Basic" && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={envFormData.authConfig.username || ""}
                          onChange={(e) =>
                            updateAuthConfig({
                              username: e.target.value || null,
                            })
                          }
                          placeholder="Username"
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={envFormData.authConfig.password || ""}
                          onChange={(e) =>
                            updateAuthConfig({
                              password: e.target.value || null,
                            })
                          }
                          placeholder="Password"
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {envFormData.authConfig.authType === "ApiKey" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={envFormData.authConfig.apiKeyName || ""}
                            onChange={(e) =>
                              updateAuthConfig({
                                apiKeyName: e.target.value || null,
                              })
                            }
                            placeholder="API Key Name (e.g. x-api-key)"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={envFormData.authConfig.apiKeyValue || ""}
                            onChange={(e) =>
                              updateAuthConfig({
                                apiKeyValue: e.target.value || null,
                              })
                            }
                            placeholder="API Key Value"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <select
                          value={
                            envFormData.authConfig.apiKeyLocation || "Header"
                          }
                          onChange={(e) =>
                            updateAuthConfig({
                              apiKeyLocation: e.target
                                .value as ExecutionAuthConfig["apiKeyLocation"],
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Header">Header</option>
                          <option value="Query">Query</option>
                        </select>
                      </div>
                    )}

                    {envFormData.authConfig.authType ===
                      "OAuth2ClientCredentials" && (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={envFormData.authConfig.tokenUrl || ""}
                          onChange={(e) =>
                            updateAuthConfig({
                              tokenUrl: e.target.value || null,
                            })
                          }
                          placeholder="Token URL"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={envFormData.authConfig.clientId || ""}
                            onChange={(e) =>
                              updateAuthConfig({
                                clientId: e.target.value || null,
                              })
                            }
                            placeholder="Client ID"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={envFormData.authConfig.clientSecret || ""}
                            onChange={(e) =>
                              updateAuthConfig({
                                clientSecret: e.target.value || null,
                              })
                            }
                            placeholder="Client Secret"
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={(envFormData.authConfig.scopes || []).join(
                            ", ",
                          )}
                          onChange={(e) =>
                            updateAuthConfig({
                              scopes: parseScopes(e.target.value),
                            })
                          }
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
                  id="envIsDefault"
                  checked={envFormData.isDefault}
                  onChange={(e) =>
                    setEnvFormData({
                      ...envFormData,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="envIsDefault"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  Set as default environment
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEnvironmentModalOpen(false);
                    resetEnvironmentDraft();
                  }}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEnvironment}
                  disabled={!envFormData.name.trim()}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {environmentModalMode === "edit" ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedRequestsPanel;
