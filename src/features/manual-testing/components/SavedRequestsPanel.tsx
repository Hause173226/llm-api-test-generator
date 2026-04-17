import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequestConfig } from "../contexts/ManualTestingContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import KeyValueEditor from "./KeyValueEditor";
import { Environment } from "../types";
import { HttpMethod, KeyValuePair, RequestConfig } from "../types";
import Modal from "../../../components/ui/Modal";
import apiService from "../../../services/apiService";
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
  const [environmentDraftName, setEnvironmentDraftName] = useState("");
  const [environmentDraftVariables, setEnvironmentDraftVariables] = useState<
    KeyValuePair[]
  >([createEnvironmentVariableDraft("baseUrl", "")]);
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
    setEnvironmentDraftName("");
    setEnvironmentDraftVariables([
      createEnvironmentVariableDraft("baseUrl", ""),
    ]);
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
    setEnvironmentDraftName(targetEnvironment.name);
    setEnvironmentDraftVariables(
      toEnvironmentDraftVariables(targetEnvironment),
    );
    setIsEnvironmentModalOpen(true);
  };

  const handleSaveEnvironment = () => {
    const name = environmentDraftName.trim();
    if (!name) return;

    const normalizedVariables = environmentDraftVariables
      .filter((item) => item.key.trim())
      .map((item, index) => ({
        ...item,
        id: item.id || `env-kv-${Date.now()}-${index}`,
        key: item.key.trim(),
        value: item.value ?? "",
        enabled: item.enabled !== false,
      }));

    if (environmentModalMode === "edit" && editingEnvironmentId) {
      updateEnvironment(editingEnvironmentId, {
        name,
        variables: normalizedVariables,
      });

      if (activeEnvironment?.id === editingEnvironmentId) {
        setActiveEnvironment({
          ...activeEnvironment,
          name,
          variables: normalizedVariables,
          updatedAt: new Date(),
        });
      }
    } else {
      const created = createEnvironment(name, normalizedVariables);
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

      <Modal
        isOpen={isEnvironmentModalOpen}
        onClose={() => {
          if (isLoading) return;
          setIsEnvironmentModalOpen(false);
          resetEnvironmentDraft();
        }}
        title={
          environmentModalMode === "edit"
            ? "Edit Environment"
            : "New Environment"
        }
        footer={
          <>
            <button
              onClick={() => {
                setIsEnvironmentModalOpen(false);
                resetEnvironmentDraft();
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEnvironment}
              disabled={isLoading || !environmentDraftName.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
            >
              {environmentModalMode === "edit" ? "Save" : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            placeholder={t("manualTesting.environmentNamePlaceholder")}
            value={environmentDraftName}
            onChange={(e) => setEnvironmentDraftName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Variables
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              You can define variables with any key and use them in
              URL/Header/Body via syntax {"{{variableName}}"}.
            </div>
          </div>

          <KeyValueEditor
            items={environmentDraftVariables}
            onChange={setEnvironmentDraftVariables}
            placeholderKey="Variable key (e.g. baseUrl)"
            placeholderValue="Variable value"
          />
        </div>
      </Modal>
    </div>
  );
};

export default SavedRequestsPanel;
