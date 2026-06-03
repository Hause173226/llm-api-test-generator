import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import Modal from "../components/ui/Modal";
import { useProject } from "../contexts/ProjectContext";
import environmentService, {
  ExecutionAuthConfig,
  ExecutionEnvironment,
} from "../services/environmentService";
import endpointService, { Endpoint } from "../services/endpointService";
import { apiService } from "../services/apiService";
import testCaseService, { TestCase } from "../services/testCaseService";
import testRunService from "../services/testRunService";
import { testSuiteService } from "../services/testSuiteService";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";

const ENV_CHANGED_EVENT = "execution-environments:changed";
const notifyEnvironmentChanged = (projectId: string) => {
  if (typeof window === "undefined" || !projectId) return;
  window.dispatchEvent(
    new CustomEvent(ENV_CHANGED_EVENT, { detail: { projectId } }),
  );
};

const createDefaultEnvAuthConfig = (): ExecutionAuthConfig => ({
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

const toEndpointKey = (
  testCase: TestCase,
  endpointById: Record<string, Endpoint>,
) => {
  const endpoint = endpointById[testCase.endpointId];
  const method = String(
    testCase.method || endpoint?.method || "GET",
  ).toUpperCase();
  const path = testCase.path || endpoint?.path || "(unknown path)";
  return `${method} ${path}`.trim();
};

export default function GenerationRunExecutePage() {
  const { t } = useTranslation();
  const { suiteId } = useParams<{ suiteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";
  const batchLabel =
    searchParams.get("batchLabel") ||
    t("pages.GenerationRunExecutePage.generated_item");
  const generatedAt = searchParams.get("generatedAt") || "";
  const rawIds = searchParams.get("testCaseIds") || "";

  const batchTestCaseIds = useMemo(
    () =>
      rawIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [rawIds],
  );

  const lastProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      if (suiteId) {
        navigate("/test-suites", { replace: true });
      }
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate, suiteId]);

  const [suiteName, setSuiteName] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [endpointById, setEndpointById] = useState<Record<string, Endpoint>>(
    {},
  );
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [manualTestCaseModalOpen, setManualTestCaseModalOpen] = useState(false);
  const [isCreatingManualTestCase, setIsCreatingManualTestCase] =
    useState(false);
  const [manualTestCaseForm, setManualTestCaseForm] = useState({
    name: "",
    description: "",
    method: "GET",
    endpointUrl: "",
    expectedStatus: "200",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Environment creation modal state
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envModalMode, setEnvModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editingEnvRowVersion, setEditingEnvRowVersion] = useState<
    string | null
  >(null);
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  const [showSelectedEnvDetail, setShowSelectedEnvDetail] = useState(false);
  const [envForm, setEnvForm] = useState({
    name: "",
    baseUrl: "",
    variables: {} as Record<string, string>,
    headers: {} as Record<string, string>,
    authConfig: createDefaultEnvAuthConfig(),
    isDefault: false,
  });
  const [envVarKey, setEnvVarKey] = useState("");
  const [envVarValue, setEnvVarValue] = useState("");
  const [envHeaderKey, setEnvHeaderKey] = useState("");
  const [envHeaderValue, setEnvHeaderValue] = useState("");
  const [showEnvVarsSection, setShowEnvVarsSection] = useState(false);
  const [showEnvHeadersSection, setShowEnvHeadersSection] = useState(false);
  const [showEnvAuthSection, setShowEnvAuthSection] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterEndpoint, setFilterEndpoint] = useState("");
  const [filterTestType, setFilterTestType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const endpointList = useMemo(() => {
    const map = new Map<string, number>();
    for (const testCase of testCases) {
      const key = toEndpointKey(testCase, endpointById);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries()).map(([endpoint, total]) => ({
      endpoint,
      total,
    }));
  }, [testCases, endpointById]);

  // Unique filter options derived from test cases
  const uniqueMethods = useMemo(() => {
    const methods = new Set<string>();
    for (const tc of testCases) {
      const m = String(
        tc.method || endpointById[tc.endpointId]?.method || "GET",
      ).toUpperCase();
      methods.add(m);
    }
    return Array.from(methods).sort();
  }, [testCases, endpointById]);

  const uniqueEndpoints = useMemo(() => {
    const map = new Map<string, string>();
    for (const tc of testCases) {
      const key = toEndpointKey(tc, endpointById);
      if (!map.has(key)) map.set(key, key);
    }
    return Array.from(map.keys()).sort();
  }, [testCases, endpointById]);

  const uniqueTestTypes = useMemo(() => {
    const types = new Set<string>();
    for (const tc of testCases) {
      if (tc.testType) types.add(tc.testType);
    }
    return Array.from(types).sort();
  }, [testCases]);

  // Filtered test cases
  const filteredTestCases = useMemo(() => {
    let result = testCases;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (tc) =>
          tc.name.toLowerCase().includes(q) ||
          (tc.description || "").toLowerCase().includes(q),
      );
    }

    if (filterMethod) {
      result = result.filter((tc) => {
        const m = String(
          tc.method || endpointById[tc.endpointId]?.method || "GET",
        ).toUpperCase();
        return m === filterMethod;
      });
    }

    if (filterEndpoint) {
      result = result.filter(
        (tc) => toEndpointKey(tc, endpointById) === filterEndpoint,
      );
    }

    if (filterTestType) {
      result = result.filter((tc) => tc.testType === filterTestType);
    }

    return result;
  }, [
    testCases,
    searchQuery,
    filterMethod,
    filterEndpoint,
    filterTestType,
    endpointById,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTestCases.length / pageSize),
  );

  const pagedTestCases = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredTestCases.slice(start, start + pageSize);
  }, [filteredTestCases, currentPage, pageSize, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMethod, filterEndpoint, filterTestType, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const allFilteredSelected =
    filteredTestCases.length > 0 &&
    filteredTestCases.every((item) => selectedTestCaseIds.includes(item.id));
  const selectedFilteredCount = filteredTestCases.filter((item) =>
    selectedTestCaseIds.includes(item.id),
  ).length;
  const isAllSelected =
    testCases.length > 0 && selectedTestCaseIds.length === testCases.length;

  const getDefaultEnvironmentId = (items: ExecutionEnvironment[]) => {
    if (items.length === 0) return "";
    const defaultEnv = items.find((env) => env.isDefault);
    return defaultEnv?.id || items[0].id;
  };

  const selectedEnvironment =
    environments.find((env) => env.id === selectedEnvironmentId) || null;

  // ── Environment creation helpers ──────────────────────────────────────
  const resetEnvForm = () => {
    setEnvForm({
      name: "",
      baseUrl: "",
      variables: {},
      headers: {},
      authConfig: createDefaultEnvAuthConfig(),
      isDefault: false,
    });
    setEnvVarKey("");
    setEnvVarValue("");
    setEnvHeaderKey("");
    setEnvHeaderValue("");
    setShowEnvVarsSection(false);
    setShowEnvHeadersSection(false);
    setShowEnvAuthSection(false);
  };

  const openCreateEnvironmentModal = () => {
    setEnvModalMode("create");
    setEditingEnvId(null);
    setEditingEnvRowVersion(null);
    resetEnvForm();
    setIsEnvModalOpen(true);
  };

  const applyEnvironmentToForm = (environment: ExecutionEnvironment) => {
    setEditingEnvId(environment.id);
    setEditingEnvRowVersion(environment.rowVersion ?? null);
    setEnvForm({
      name: environment.name || "",
      baseUrl: environment.baseUrl || "",
      variables: { ...(environment.variables || {}) },
      headers: { ...(environment.headers || {}) },
      authConfig: {
        ...createDefaultEnvAuthConfig(),
        ...(environment.authConfig || {}),
      },
      isDefault: Boolean(environment.isDefault),
    });
    setShowEnvVarsSection(Object.keys(environment.variables || {}).length > 0);
    setShowEnvHeadersSection(Object.keys(environment.headers || {}).length > 0);
    setShowEnvAuthSection(
      Boolean(
        environment.authConfig?.authType &&
          environment.authConfig.authType !== "None",
      ),
    );
  };

  const openEditEnvironmentModal = async () => {
    if (!selectedEnvironment || !projectId) {
      showErrorToast("Please select an environment first.");
      return;
    }

    setEnvModalMode("edit");

    let environmentToEdit = selectedEnvironment;
    if (!selectedEnvironment.rowVersion) {
      try {
        environmentToEdit = await environmentService.getEnvironmentById(
          projectId,
          selectedEnvironment.id,
        );
        setEnvironments((prev) =>
          prev.map((env) =>
            env.id === environmentToEdit.id ? environmentToEdit : env,
          ),
        );
      } catch (err) {
        handleError(err);
        return;
      }
    }

    applyEnvironmentToForm(environmentToEdit);
    setIsEnvModalOpen(true);
  };

  const updateEnvAuth = (partial: Partial<ExecutionAuthConfig>) => {
    setEnvForm((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, ...partial },
    }));
  };

  const addEnvVar = () => {
    if (!envVarKey) return;
    setEnvForm((prev) => ({
      ...prev,
      variables: { ...prev.variables, [envVarKey]: envVarValue },
    }));
    setEnvVarKey("");
    setEnvVarValue("");
  };

  const removeEnvVar = (key: string) => {
    setEnvForm((prev) => {
      const v = { ...prev.variables };
      delete v[key];
      return { ...prev, variables: v };
    });
  };

  const addEnvHeader = () => {
    if (!envHeaderKey) return;
    setEnvForm((prev) => ({
      ...prev,
      headers: { ...prev.headers, [envHeaderKey]: envHeaderValue },
    }));
    setEnvHeaderKey("");
    setEnvHeaderValue("");
  };

  const removeEnvHeader = (key: string) => {
    setEnvForm((prev) => {
      const h = { ...prev.headers };
      delete h[key];
      return { ...prev, headers: h };
    });
  };

  const handleCreateEnvironment = async () => {
    if (!envForm.name.trim() || !projectId) return;
    try {
      setIsCreatingEnv(true);
      const auth = envForm.authConfig;
      const payload = {
        name: envForm.name.trim(),
        baseUrl: envForm.baseUrl.trim(),
        variables:
          Object.keys(envForm.variables).length > 0 ? envForm.variables : null,
        headers:
          Object.keys(envForm.headers).length > 0 ? envForm.headers : null,
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
        isDefault: envForm.isDefault,
      };
      const created = await environmentService.createEnvironment(
        projectId,
        payload,
      );
      setEnvironments((prev) => {
        const updated = created.isDefault
          ? prev.map((env) => ({ ...env, isDefault: false }))
          : prev;
        return [...updated, created];
      });
      setSelectedEnvironmentId(created.id);
      notifyEnvironmentChanged(projectId);
      showSuccessToast("Environment created successfully");
      setIsEnvModalOpen(false);
      resetEnvForm();
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreatingEnv(false);
    }
  };

  const handleSaveEnvironment = async () => {
    if (!envForm.name.trim() || !projectId) return;

    if (envModalMode === "edit") {
      if (!editingEnvId) {
        showErrorToast("Please select an environment first.");
        return;
      }

      try {
        setIsCreatingEnv(true);
        let resolvedRowVersion = editingEnvRowVersion;
        if (!resolvedRowVersion) {
          const latest = await environmentService.getEnvironmentById(
            projectId,
            editingEnvId,
          );
          resolvedRowVersion = latest.rowVersion ?? null;
          setEditingEnvRowVersion(resolvedRowVersion);
          setEnvironments((prev) =>
            prev.map((env) => (env.id === latest.id ? latest : env)),
          );
        }

        const auth = envForm.authConfig;
        const payload = {
          rowVersion: resolvedRowVersion,
          name: envForm.name.trim(),
          baseUrl: envForm.baseUrl.trim(),
          variables:
            Object.keys(envForm.variables).length > 0
              ? envForm.variables
              : null,
          headers:
            Object.keys(envForm.headers).length > 0 ? envForm.headers : null,
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
            scopes:
              auth.scopes && auth.scopes.length > 0 ? auth.scopes : [""],
          } as ExecutionAuthConfig,
          isDefault: envForm.isDefault,
        };

        const updated = await environmentService.updateEnvironment(
          projectId,
          editingEnvId,
          payload,
        );

        setEnvironments((prev) => {
          let next = prev.map((env) => (env.id === updated.id ? updated : env));
          if (updated.isDefault) {
            next = next.map((env) =>
              env.id === updated.id ? env : { ...env, isDefault: false },
            );
          }
          return next;
        });
        setSelectedEnvironmentId(updated.id);
        notifyEnvironmentChanged(projectId);
        showSuccessToast("Environment updated successfully");
        setIsEnvModalOpen(false);
        setEnvModalMode("create");
        setEditingEnvId(null);
        setEditingEnvRowVersion(null);
        resetEnvForm();
      } catch (err) {
        handleError(err);
      } finally {
        setIsCreatingEnv(false);
      }

      return;
    }

    await handleCreateEnvironment();
  };

  const buildRunsUrl = () => {
    const params = new URLSearchParams();
    if (suiteId) {
      params.set("activeSuiteId", suiteId);
    }
    if (projectId) {
      params.set("projectId", projectId);
    }
    return params.toString() ? `/runs?${params.toString()}` : "/runs";
  };

  const buildSuiteDetailUrl = () => {
    if (!suiteId) {
      return "/test-suites";
    }

    const params = new URLSearchParams();
    params.set("tab", "testcases");
    if (projectId) {
      params.set("projectId", projectId);
    }

    return `/test-suites/${suiteId}?${params.toString()}`;
  };

  const toggleTestCase = (testCaseId: string) => {
    setSelectedTestCaseIds((prev) => {
      if (prev.includes(testCaseId)) {
        return prev.filter((id) => id !== testCaseId);
      }
      return [...prev, testCaseId];
    });
  };

  const openManualTestCaseModal = () => {
    const fallbackEndpoint = Object.values(endpointById)[0];
    const defaultMethod = String(
      fallbackEndpoint?.method || "GET",
    ).toUpperCase();
    const defaultUrl = String(fallbackEndpoint?.path || "").trim();

    setManualTestCaseForm({
      name: `Manual Test Case ${new Date().toLocaleString()}`,
      description: "",
      method: defaultMethod,
      endpointUrl: defaultUrl,
      expectedStatus: "200",
    });
    setManualTestCaseModalOpen(true);
  };

  const handleCreateManualTestCase = async () => {
    if (!suiteId) return;

    const endpointUrl = manualTestCaseForm.endpointUrl.trim();
    if (!endpointUrl) {
      showErrorToast("Endpoint URL is required");
      return;
    }

    try {
      setIsCreatingManualTestCase(true);

      const methodText = String(
        manualTestCaseForm.method || "GET",
      ).toUpperCase();
      const methodToEnum: Record<string, number> = {
        GET: 0,
        POST: 1,
        PUT: 2,
        DELETE: 3,
        PATCH: 4,
        HEAD: 5,
        OPTIONS: 6,
      };
      const httpMethod = methodToEnum[methodText] ?? 0;

      const payload = {
        endpointId: undefined,
        name:
          manualTestCaseForm.name.trim() ||
          `Manual Test Case ${new Date().toLocaleString()}`,
        description:
          manualTestCaseForm.description.trim() ||
          "Created manually from run page",
        testType: 0,
        priority: 2,
        isEnabled: true,
        tags: [],
        request: {
          httpMethod,
          url: endpointUrl,
          headers: JSON.stringify({}),
          pathParams: null,
          queryParams: JSON.stringify({}),
          bodyType: 0,
          body: null,
          timeout: 30000,
        },
        expectation: {
          expectedStatus: String(
            Number(manualTestCaseForm.expectedStatus || "200") || 200,
          ),
          responseSchema: null,
          headerChecks: null,
          bodyContains: null,
          bodyNotContains: null,
          jsonPathChecks: null,
          maxResponseTime: null,
        },
        variables: [],
      };

      const created = await apiService.post<any>(
        `/test-suites/${suiteId}/test-cases`,
        payload,
      );

      const createdId = created?.id || created?.Id;
      if (createdId) {
        const createdTestCase = await testCaseService.getTestCaseById(
          suiteId,
          createdId,
        );
        setTestCases((prev) => [createdTestCase, ...prev]);
        setSelectedTestCaseIds((prev) => [createdId, ...prev]);
      }

      setManualTestCaseModalOpen(false);
      showSuccessToast("Manual test case created in run page");
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreatingManualTestCase(false);
    }
  };

  const handleExecute = async (mode: "selected" | "all") => {
    if (!suiteId) return;

    if (environments.length === 0) {
      showErrorToast(
        t(
          "pages.GenerationRunExecutePage.no_execution_environment_found_for_project",
        ),
      );
      return;
    }

    if (!selectedEnvironmentId) {
      showErrorToast("Please select an execution environment");
      return;
    }

    const targetIds =
      mode === "all" ? testCases.map((item) => item.id) : selectedTestCaseIds;

    if (targetIds.length === 0) {
      showErrorToast("Please select at least one test case");
      return;
    }

    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (suiteId) params.set("suiteId", suiteId);
    params.set("pendingEnvironmentId", selectedEnvironmentId);
    params.set("pendingTestCaseIds", targetIds.join(","));
    navigate(`/runs?${params.toString()}`);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!suiteId || !projectId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const suiteDetail = await testSuiteService.getTestSuiteDetail(
          projectId,
          suiteId,
        );
        const apiSpecId = suiteDetail?.apiSpecId;

        const [suiteCasesResponse, envs, endpointsResponse] = await Promise.all(
          [
            testCaseService.getTestCases(suiteId, 1, 500),
            environmentService.getEnvironments(projectId),
            apiSpecId
              ? endpointService.getEndpoints(projectId, apiSpecId, 1, 1000)
              : Promise.resolve({
                  items: [] as Endpoint[],
                  totalCount: 0,
                  pageNumber: 1,
                  pageSize: 0,
                  totalPages: 1,
                }),
          ],
        );

        setSuiteName(suiteDetail?.name || "");
        setEnvironments(envs);
        setSelectedEnvironmentId(getDefaultEnvironmentId(envs));

        const endpointMap = (endpointsResponse.items || []).reduce(
          (acc, endpoint) => {
            acc[endpoint.id] = endpoint;
            return acc;
          },
          {} as Record<string, Endpoint>,
        );
        setEndpointById(endpointMap);

        const idSet = new Set(batchTestCaseIds);
        const filtered =
          idSet.size > 0
            ? (suiteCasesResponse.items || []).filter((item) =>
                idSet.has(item.id),
              )
            : suiteCasesResponse.items || [];

        // Fallback: nếu filter ra rỗng nhưng có IDs trong URL,
        // có thể do ID mismatch — load tất cả test cases của suite
        const finalTestCases =
          filtered.length === 0 && idSet.size > 0
            ? suiteCasesResponse.items || []
            : filtered;

        setTestCases(finalTestCases);
        setSelectedTestCaseIds(
          idSet.size > 0
            ? finalTestCases
                .filter((item) => idSet.has(item.id))
                .map((item) => item.id)
            : finalTestCases.map((item) => item.id),
        );
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [suiteId, projectId, batchTestCaseIds]);

  return (
    <MainLayout title={t("pages.GenerationRunExecutePage.title")}>
      <Modal
        isOpen={manualTestCaseModalOpen}
        onClose={() => {
          if (!isCreatingManualTestCase) {
            setManualTestCaseModalOpen(false);
          }
        }}
        title={t("pages.GenerationRunExecutePage.manual_test_case_title")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setManualTestCaseModalOpen(false)}
              disabled={isCreatingManualTestCase}
              className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface text-sm font-semibold disabled:opacity-60"
            >
              {t("pages.GenerationRunExecutePage.cancel")}
            </button>
            <button
              type="button"
              onClick={handleCreateManualTestCase}
              disabled={isCreatingManualTestCase}
              className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {isCreatingManualTestCase ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {t("pages.GenerationRunExecutePage.add_test_case")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("pages.GenerationRunExecutePage.name")}
            </label>
            <input
              value={manualTestCaseForm.name}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("pages.GenerationRunExecutePage.method")}
              </label>
              <select
                value={manualTestCaseForm.method}
                onChange={(e) =>
                  setManualTestCaseForm((prev) => ({
                    ...prev,
                    method: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              >
                <option value="GET">
                  {t("pages.GenerationRunExecutePage.get")}
                </option>
                <option value="POST">
                  {t("pages.GenerationRunExecutePage.post")}
                </option>
                <option value="PUT">
                  {t("pages.GenerationRunExecutePage.put")}
                </option>
                <option value="PATCH">
                  {t("pages.GenerationRunExecutePage.patch")}
                </option>
                <option value="DELETE">
                  {t("pages.GenerationRunExecutePage.delete")}
                </option>
                <option value="HEAD">
                  {t("pages.GenerationRunExecutePage.head")}
                </option>
                <option value="OPTIONS">
                  {t("pages.GenerationRunExecutePage.options")}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("pages.GenerationRunExecutePage.expected_status")}
              </label>
              <input
                type="number"
                min={100}
                max={599}
                value={manualTestCaseForm.expectedStatus}
                onChange={(e) =>
                  setManualTestCaseForm((prev) => ({
                    ...prev,
                    expectedStatus: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("pages.GenerationRunExecutePage.endpoint_url")}
            </label>
            <input
              value={manualTestCaseForm.endpointUrl}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({
                  ...prev,
                  endpointUrl: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={t(
                "pages.GenerationRunExecutePage.endpoint_url_placeholder",
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("pages.GenerationRunExecutePage.description")}
            </label>
            <textarea
              rows={3}
              value={manualTestCaseForm.description}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={t(
                "pages.GenerationRunExecutePage.description_placeholder",
              )}
            />
          </div>
        </div>
      </Modal>

      <StepTransitionOverlay
        isVisible={isLoading || isSubmitting}
        title={
          isSubmitting
            ? t("overlay.execute.startRunTitle")
            : t("overlay.execute.preparingTitle")
        }
        message={
          isSubmitting
            ? t("overlay.execute.startRunMessage")
            : t("overlay.execute.preparingMessage")
        }
        stepLabel={
          isSubmitting
            ? t("overlay.execute.startRunStep")
            : t("overlay.execute.preparingStep")
        }
      />
      <div className="space-y-6">
      
        <section className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm p-5 space-y-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.GenerationRunExecutePage.generation_context")}
            </p>
            <h1 className="text-2xl font-bold text-on-surface">{batchLabel}</h1>
            <p className="text-sm text-on-surface-variant">
              {generatedAt
                ? t("pages.GenerationRunExecutePage.generated_at", {
                    value: new Date(generatedAt).toLocaleString(),
                  })
                : t("pages.GenerationRunExecutePage.generated_item")}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40 space-y-3">
            <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.GenerationRunExecutePage.endpoints_in_this_item")}
            </p>
            {endpointList.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                {t("pages.GenerationRunExecutePage.no_endpoint_detected_yet")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {endpointList.map((item) => (
                  <span
                    key={item.endpoint}
                    className="px-2.5 py-1 rounded-md text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                  >
                    {item.endpoint} ({item.total})
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40">
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                {t(
                  "pages.GenerationRunExecutePage.total_test_cases_in_this_item",
                )}
              </p>
              <p className="text-3xl font-black text-on-surface">
                {testCases.length}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40">
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                {t("pages.GenerationRunExecutePage.selected_to_execute")}
              </p>
              <p className="text-3xl font-black text-on-surface">
                {selectedTestCaseIds.length}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("pages.GenerationRunExecutePage.select_environment")}
            </label>
            {environments.length === 0 ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t(
                    "pages.GenerationRunExecutePage.no_environment_found_create_one_to_execu",
                  )}
                </p>
                <button
                  type="button"
                  onClick={openCreateEnvironmentModal}
                  className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t("pages.GenerationRunExecutePage.create_environment")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedEnvironmentId}
                  onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                      {env.isDefault
                        ? t(
                            "pages.GenerationRunExecutePage.default_environment_suffix",
                          )
                        : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowSelectedEnvDetail((prev) => !prev)}
                  className="shrink-0 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="View selected environment details"
                >
                  <Eye className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={openEditEnvironmentModal}
                  className="shrink-0 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Edit selected environment"
                >
                  <Pencil className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={openCreateEnvironmentModal}
                  className="shrink-0 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t(
                    "pages.GenerationRunExecutePage.create_environment_tooltip",
                  )}
                >
                  <Plus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            )}
            {showSelectedEnvDetail && selectedEnvironment && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p>
                    <span className="font-semibold">Name:</span>{" "}
                    {selectedEnvironment.name}
                  </p>
                  <p>
                    <span className="font-semibold">Base URL:</span>{" "}
                    {selectedEnvironment.baseUrl || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Auth:</span>{" "}
                    {selectedEnvironment.authConfig?.authType || "None"}
                  </p>
                  <p>
                    <span className="font-semibold">Default:</span>{" "}
                    {selectedEnvironment.isDefault ? "Yes" : "No"}
                  </p>
                  <p>
                    <span className="font-semibold">Variables:</span>{" "}
                    {Object.keys(selectedEnvironment.variables || {}).length}
                  </p>
                  <p>
                    <span className="font-semibold">Headers:</span>{" "}
                    {Object.keys(selectedEnvironment.headers || {}).length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-on-surface-variant gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("pages.GenerationRunExecutePage.loading_generated_test_cases")}
            </div>
          ) : testCases.length === 0 ? (
            <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-300 text-sm">
              {t(
                "pages.GenerationRunExecutePage.this_generated_item_has_no_available_tes",
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 bg-surface-container-low dark:bg-slate-800/40 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">
                  {t(
                    "pages.GenerationRunExecutePage.add_a_manual_test_case_directly_from_thi",
                  )}
                </p>
                <button
                  type="button"
                  onClick={openManualTestCaseModal}
                  disabled={isCreatingManualTestCase}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {isCreatingManualTestCase ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {t("pages.GenerationRunExecutePage.add_test_case")}
                </button>
              </div>

              {/* Filter Bar */}
              <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                  <span className="text-xs font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-widest">
                    {t("pages.GenerationRunExecutePage.test_case_filters")}
                  </span>
                  {(searchQuery ||
                    filterMethod ||
                    filterEndpoint ||
                    filterTestType) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterMethod("");
                        setFilterEndpoint("");
                        setFilterTestType("");
                      }}
                      className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      {t("pages.GenerationRunExecutePage.clear_filters")}
                    </button>
                  )}
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t(
                      "pages.GenerationRunExecutePage.search_placeholder",
                    )}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all placeholder:text-on-surface-variant/60"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                  >
                    <option value="">
                      {t("pages.GenerationRunExecutePage.all_methods")}
                    </option>
                    {uniqueMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterTestType}
                    onChange={(e) => setFilterTestType(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                  >
                    <option value="">
                      {t("pages.GenerationRunExecutePage.all_test_types")}
                    </option>
                    {uniqueTestTypes.map((tt) => (
                      <option key={tt} value={tt}>
                        {tt}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterEndpoint}
                    onChange={(e) => setFilterEndpoint(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                  >
                    <option value="">
                      {t("pages.GenerationRunExecutePage.all_endpoints")}
                    </option>
                    {uniqueEndpoints.map((ep) => (
                      <option key={ep} value={ep}>
                        {ep}
                      </option>
                    ))}
                  </select>
                </div>

                {(searchQuery ||
                  filterMethod ||
                  filterEndpoint ||
                  filterTestType) && (
                  <p className="text-xs text-on-surface-variant mt-2">
                    {t(
                      "pages.GenerationRunExecutePage.showing_filtered_testcases",
                      {
                        filtered: filteredTestCases.length,
                        total: testCases.length,
                      },
                    )}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center gap-3 flex-wrap">
                {allFilteredSelected ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTestCaseIds([])}
                    className="text-xs font-semibold text-on-surface-variant hover:underline flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {t("pages.GenerationRunExecutePage.clear")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTestCaseIds(
                        filteredTestCases.map((item) => item.id),
                      )
                    }
                    className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select all ({filteredTestCases.length})
                  </button>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 flex-wrap">
                  {environments.length === 0 && !isLoading && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 w-full text-right">
                      {t(
                        "pages.GenerationRunExecutePage.no_execution_environment_found",
                      )}{" "}
                      <button
                        type="button"
                        className="underline font-semibold"
                        onClick={openCreateEnvironmentModal}
                      >
                        {t("pages.GenerationRunExecutePage.create_one")}
                      </button>{" "}
                      {t(
                        "pages.GenerationRunExecutePage.to_run_tests_suffix",
                      )}
                    </p>
                  )}
                  {!isAllSelected && (
                    <button
                      type="button"
                      onClick={() => handleExecute("selected")}
                      disabled={
                        isSubmitting ||
                        environments.length === 0 ||
                        selectedFilteredCount === 0
                      }
                      className="px-5 py-2.5 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      <Play className="w-4 h-4" />
                      Execute Selected ({selectedFilteredCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExecute("all")}
                    disabled={
                      isSubmitting ||
                      environments.length === 0 ||
                      testCases.length === 0
                    }
                    className="px-5 py-2.5 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <Play className="w-4 h-4" />
                    Execute All ({testCases.length})
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredTestCases.length === 0 ? (
                  <div className="py-6 text-center text-sm text-on-surface-variant">
                    {t(
                      "pages.GenerationRunExecutePage.no_test_cases_match_the_current_filters",
                    )}
                  </div>
                ) : null}
                {pagedTestCases.map((testCase) => {
                  const checked = selectedTestCaseIds.includes(testCase.id);
                  const endpointLabel = toEndpointKey(testCase, endpointById);

                  return (
                    <div
                      key={testCase.id}
                      className="rounded-xl border border-outline-variant/10 dark:border-slate-800 bg-surface-container-low dark:bg-slate-800/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTestCase(testCase.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">
                              {testCase.name}
                            </p>
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 font-semibold truncate">
                              {t(
                                "pages.GenerationRunExecutePage.endpoint_endpointlabel",
                                { endpointLabel },
                              )}
                            </p>
                            {testCase.description && (
                              <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                                {testCase.description}
                              </p>
                            )}
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (projectId) {
                              params.set("projectId", projectId);
                            }
                            const target = params.toString()
                              ? `/test-suites/${suiteId}/test-cases/${testCase.id}?${params.toString()}`
                              : `/test-suites/${suiteId}/test-cases/${testCase.id}`;
                            navigate(target);
                          }}
                          className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface text-sm font-semibold"
                        >
                          {t("pages.GenerationRunExecutePage.open")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTestCases.length > 0 && (
                <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-xs text-on-surface-variant">
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, filteredTestCases.length)}{" "}
                    of {filteredTestCases.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1.5 rounded-md bg-surface-container-low dark:bg-slate-800 text-xs text-on-surface border border-outline-variant/20 dark:border-slate-600"
                    >
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-surface-container-high dark:bg-slate-700 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-on-surface-variant min-w-[64px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-surface-container-high dark:bg-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 flex-wrap">
            {environments.length === 0 && !isLoading && (
              <p className="text-xs text-amber-600 dark:text-amber-400 w-full text-right">
                {t("pages.GenerationRunExecutePage.no_execution_environment_found")}{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={openCreateEnvironmentModal}
                >
                  {t("pages.GenerationRunExecutePage.create_one")}
                </button>{" "}
                {t("pages.GenerationRunExecutePage.to_run_tests_suffix")}
              </p>
            )}
            {!isAllSelected && (
              <button
                type="button"
                onClick={() => handleExecute("selected")}
                disabled={
                  isSubmitting ||
                  environments.length === 0 ||
                  selectedTestCaseIds.length === 0 ||
                  testCases.length === 0
                }
                className="px-5 py-2.5 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Play className="w-4 h-4" />
                Execute Selected ({selectedTestCaseIds.length})
              </button>
            )}
              <button
                type="button"
                onClick={() => handleExecute("all")}
              disabled={
                isSubmitting ||
                environments.length === 0 ||
                testCases.length === 0
              }
              className="px-5 py-2.5 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Play className="w-4 h-4" />
              Execute All ({testCases.length})
            </button>
          </div>
        </section>
      </div>

      {/* Environment Creation Modal */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {envModalMode === "edit"
                  ? "Edit Environment"
                  : "New Environment"}
              </h3>
              <button
                onClick={() => {
                  setIsEnvModalOpen(false);
                  setEnvModalMode("create");
                  setEditingEnvId(null);
                  setEditingEnvRowVersion(null);
                  resetEnvForm();
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Name */}
              <input
                type="text"
                value={envForm.name}
                onChange={(e) =>
                  setEnvForm({ ...envForm, name: e.target.value })
                }
                placeholder={t(
                  "pages.GenerationRunExecutePage.env_name_placeholder",
                )}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

              {/* Base URL */}
              <input
                type="url"
                value={envForm.baseUrl}
                onChange={(e) =>
                  setEnvForm({ ...envForm, baseUrl: e.target.value })
                }
                placeholder={t(
                  "pages.GenerationRunExecutePage.env_base_url_placeholder",
                )}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

              {/* Variables */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowEnvVarsSection(!showEnvVarsSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showEnvVarsSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Variables
                  </span>
                  <span className="text-xs text-slate-400">
                    ({Object.keys(envForm.variables).length})
                  </span>
                </button>
                {showEnvVarsSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      {t("pages.GenerationRunExecutePage.variables_help")}
                    </p>
                    <div className="space-y-2">
                      {Object.entries(envForm.variables).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                          />
                          <input
                            type="text"
                            value={key}
                            readOnly
                            className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setEnvForm((p) => ({
                                ...p,
                                variables: {
                                  ...p.variables,
                                  [key]: e.target.value,
                                },
                              }))
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.variable_value_placeholder",
                            )}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => removeEnvVar(key)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer"
                          >
                            {t("pages.GenerationRunExecutePage.remove")}
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                        />
                        <input
                          type="text"
                          value={envVarKey}
                          onChange={(e) => setEnvVarKey(e.target.value)}
                          placeholder={t(
                            "pages.GenerationRunExecutePage.variable_key_placeholder",
                          )}
                          className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={envVarValue}
                          onChange={(e) => setEnvVarValue(e.target.value)}
                          placeholder={t(
                            "pages.GenerationRunExecutePage.variable_value_placeholder",
                          )}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium px-2 py-1 invisible">
                          {t("pages.GenerationRunExecutePage.remove")}
                        </span>
                      </div>
                      <button
                        onClick={addEnvVar}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 px-1 py-1 cursor-pointer"
                      >
                        {t("pages.GenerationRunExecutePage.add")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Headers */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setShowEnvHeadersSection(!showEnvHeadersSection)
                  }
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showEnvHeadersSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("pages.GenerationRunExecutePage.headers")}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({Object.keys(envForm.headers).length})
                  </span>
                </button>
                {showEnvHeadersSection && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-6">
                      {t(
                        "pages.GenerationRunExecutePage.custom_headers_sent_with_every_request",
                      )}
                    </p>
                    <div className="space-y-2">
                      {Object.entries(envForm.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                          />
                          <input
                            type="text"
                            value={key}
                            readOnly
                            className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setEnvForm((p) => ({
                                ...p,
                                headers: {
                                  ...p.headers,
                                  [key]: e.target.value,
                                },
                              }))
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.header_value_placeholder",
                            )}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => removeEnvHeader(key)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 cursor-pointer"
                          >
                            {t("pages.GenerationRunExecutePage.remove")}
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                        />
                        <input
                          type="text"
                          value={envHeaderKey}
                          onChange={(e) => setEnvHeaderKey(e.target.value)}
                          placeholder={t(
                            "pages.GenerationRunExecutePage.header_key_placeholder",
                          )}
                          className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={envHeaderValue}
                          onChange={(e) => setEnvHeaderValue(e.target.value)}
                          placeholder={t(
                            "pages.GenerationRunExecutePage.header_value_placeholder",
                          )}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium px-2 py-1 invisible">
                          {t("pages.GenerationRunExecutePage.remove")}
                        </span>
                      </div>
                      <button
                        onClick={addEnvHeader}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 px-1 py-1 cursor-pointer"
                      >
                        {t("pages.GenerationRunExecutePage.add")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Authentication */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowEnvAuthSection(!showEnvAuthSection)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer"
                >
                  {showEnvAuthSection ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("pages.GenerationRunExecutePage.authentication")}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({envForm.authConfig.authType})
                  </span>
                </button>
                {showEnvAuthSection && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 mt-2">
                    <select
                      value={envForm.authConfig.authType}
                      onChange={(e) =>
                        updateEnvAuth({
                          authType: e.target
                            .value as ExecutionAuthConfig["authType"],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="None">
                        {t("manualTesting.authNone")}
                      </option>
                      <option value="BearerToken">
                        {t("manualTesting.authBearer")}
                      </option>
                      <option value="Basic">
                        {t("manualTesting.authBasic")}
                      </option>
                      <option value="ApiKey">
                        {t("manualTesting.authApiKey")}
                      </option>
                      <option value="OAuth2ClientCredentials">
                        {t(
                          "pages.GenerationRunExecutePage.oauth2_client_credentials",
                        )}
                      </option>
                    </select>

                    {envForm.authConfig.authType === "BearerToken" && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={envForm.authConfig.headerName || ""}
                          onChange={(e) =>
                            updateEnvAuth({
                              headerName: e.target.value || null,
                            })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_header_name_placeholder",
                          )}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={envForm.authConfig.token || ""}
                          onChange={(e) =>
                            updateEnvAuth({ token: e.target.value || null })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_token_placeholder",
                          )}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {envForm.authConfig.authType === "Basic" && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={envForm.authConfig.username || ""}
                          onChange={(e) =>
                            updateEnvAuth({ username: e.target.value || null })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_username_placeholder",
                          )}
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="password"
                          value={envForm.authConfig.password || ""}
                          onChange={(e) =>
                            updateEnvAuth({ password: e.target.value || null })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_password_placeholder",
                          )}
                          className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {envForm.authConfig.authType === "ApiKey" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={envForm.authConfig.apiKeyName || ""}
                            onChange={(e) =>
                              updateEnvAuth({
                                apiKeyName: e.target.value || null,
                              })
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.auth_api_key_name_placeholder",
                            )}
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={envForm.authConfig.apiKeyValue || ""}
                            onChange={(e) =>
                              updateEnvAuth({
                                apiKeyValue: e.target.value || null,
                              })
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.auth_api_key_value_placeholder",
                            )}
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <select
                          value={envForm.authConfig.apiKeyLocation || "Header"}
                          onChange={(e) =>
                            updateEnvAuth({
                              apiKeyLocation: e.target
                                .value as ExecutionAuthConfig["apiKeyLocation"],
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Header">
                            {t("manualTesting.header")}
                          </option>
                          <option value="Query">
                            {t("manualTesting.query")}
                          </option>
                        </select>
                      </div>
                    )}

                    {envForm.authConfig.authType ===
                      "OAuth2ClientCredentials" && (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={envForm.authConfig.tokenUrl || ""}
                          onChange={(e) =>
                            updateEnvAuth({ tokenUrl: e.target.value || null })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_token_url_placeholder",
                          )}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={envForm.authConfig.clientId || ""}
                            onChange={(e) =>
                              updateEnvAuth({
                                clientId: e.target.value || null,
                              })
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.auth_client_id_placeholder",
                            )}
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            value={envForm.authConfig.clientSecret || ""}
                            onChange={(e) =>
                              updateEnvAuth({
                                clientSecret: e.target.value || null,
                              })
                            }
                            placeholder={t(
                              "pages.GenerationRunExecutePage.auth_client_secret_placeholder",
                            )}
                            className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={(envForm.authConfig.scopes || []).join(", ")}
                          onChange={(e) =>
                            updateEnvAuth({
                              scopes: e.target.value.trim()
                                ? e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                : [],
                            })
                          }
                          placeholder={t(
                            "pages.GenerationRunExecutePage.auth_scopes_placeholder",
                          )}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  id="envDefaultCheck"
                  checked={envForm.isDefault}
                  onChange={(e) =>
                    setEnvForm({ ...envForm, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="envDefaultCheck"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  {t(
                    "pages.GenerationRunExecutePage.set_as_default_environment",
                  )}
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEnvModalOpen(false);
                    setEnvModalMode("create");
                    setEditingEnvId(null);
                    setEditingEnvRowVersion(null);
                    resetEnvForm();
                  }}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t("pages.GenerationRunExecutePage.cancel")}
                </button>
                <button
                  onClick={handleSaveEnvironment}
                  disabled={isCreatingEnv || !envForm.name.trim()}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isCreatingEnv && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {envModalMode === "edit" ? "Save changes" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
