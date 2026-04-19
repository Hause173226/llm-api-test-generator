import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckSquare, Loader2, Play, Plus, Square } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import Modal from "../components/ui/Modal";
import { useProject } from "../contexts/ProjectContext";
import environmentService, {
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
  const batchLabel = searchParams.get("batchLabel") || "Generated Item";
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

  const getDefaultEnvironmentId = (items: ExecutionEnvironment[]) => {
    if (items.length === 0) return "";
    const defaultEnv = items.find((env) => env.isDefault);
    return defaultEnv?.id || items[0].id;
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
    const defaultMethod = String(fallbackEndpoint?.method || "GET").toUpperCase();
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

      const methodText = String(manualTestCaseForm.method || "GET").toUpperCase();
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
          manualTestCaseForm.description.trim() || "Created manually from run page",
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
          expectedStatus: String(Number(manualTestCaseForm.expectedStatus || "200") || 200),
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
        const createdTestCase = await testCaseService.getTestCaseById(suiteId, createdId);
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
      showErrorToast("No execution environment found for this project");
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

    try {
      setIsSubmitting(true);
      await testRunService.startTestRun({
        testSuiteId: suiteId,
        environmentId: selectedEnvironmentId,
        selectedTestCaseIds: targetIds,
      });

      showSuccessToast(
        mode === "all"
          ? `Started run for all ${targetIds.length} test case(s)`
          : `Started run for ${targetIds.length} selected test case(s)`,
      );
      navigate(buildRunsUrl());
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
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
            ? (suiteCasesResponse.items || []).filter((item) => idSet.has(item.id))
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
            ? finalTestCases.filter((item) => idSet.has(item.id)).map((item) => item.id)
            : finalTestCases.map((item) => item.id)
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
    <MainLayout title="Run Generated Test Cases">
      <Modal
        isOpen={manualTestCaseModalOpen}
        onClose={() => {
          if (!isCreatingManualTestCase) {
            setManualTestCaseModalOpen(false);
          }
        }}
        title="Add Manual Test Case"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setManualTestCaseModalOpen(false)}
              disabled={isCreatingManualTestCase}
              className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface text-sm font-semibold disabled:opacity-60"
            >
              Cancel
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
              Add Test Case
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Name
            </label>
            <input
              value={manualTestCaseForm.name}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Method
              </label>
              <select
                value={manualTestCaseForm.method}
                onChange={(e) =>
                  setManualTestCaseForm((prev) => ({ ...prev, method: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Expected Status
              </label>
              <input
                type="number"
                min={100}
                max={599}
                value={manualTestCaseForm.expectedStatus}
                onChange={(e) =>
                  setManualTestCaseForm((prev) => ({ ...prev, expectedStatus: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Endpoint URL
            </label>
            <input
              value={manualTestCaseForm.endpointUrl}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({ ...prev, endpointUrl: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder="/api/products"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={manualTestCaseForm.description}
              onChange={(e) =>
                setManualTestCaseForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder="Optional description"
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(buildSuiteDetailUrl())}
            className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface text-sm font-semibold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Suite
          </button>
          <div className="text-sm text-on-surface-variant">
            Suite:{" "}
            <span className="font-semibold text-on-surface">
              {suiteName || "N/A"}
            </span>
          </div>
        </div>

        <section className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm p-5 space-y-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
              Generation Context
            </p>
            <h1 className="text-2xl font-bold text-on-surface">{batchLabel}</h1>
            <p className="text-sm text-on-surface-variant">
              {generatedAt
                ? `Generated at ${new Date(generatedAt).toLocaleString()}`
                : "Generated item"}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40 space-y-3">
            <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
              Endpoints In This Item
            </p>
            {endpointList.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No endpoint detected yet.
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
                Total Test Cases In This Item
              </p>
              <p className="text-3xl font-black text-on-surface">
                {testCases.length}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40">
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                Selected To Execute
              </p>
              <p className="text-3xl font-black text-on-surface">
                {selectedTestCaseIds.length}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Select Environment
            </label>
            <select
              value={selectedEnvironmentId}
              onChange={(e) => setSelectedEnvironmentId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
              disabled={environments.length === 0}
            >
              {environments.length === 0 ? (
                <option value="">No environment found</option>
              ) : (
                environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                    {env.isDefault ? " (default)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-on-surface-variant gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading generated test cases...
            </div>
          ) : testCases.length === 0 ? (
            <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-300 text-sm">
              This generated item has no available test cases to execute.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 bg-surface-container-low dark:bg-slate-800/40 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">
                  Add a manual test case directly from this run page.
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
                  Add Test Case
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedTestCaseIds.length === testCases.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTestCaseIds([])}
                    className="text-xs font-semibold text-on-surface-variant hover:underline flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedTestCaseIds(testCases.map((item) => item.id))}
                    className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select all
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {testCases.map((testCase) => {
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
                              Endpoint: {endpointLabel}
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
                          Open
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 flex-wrap">
            {environments.length === 0 && !isLoading && (
              <p className="text-xs text-amber-600 dark:text-amber-400 w-full text-right">
                No execution environment found. Please create one in{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => navigate(`/environments?projectId=${projectId}`)}
                >
                  Environments
                </button>{" "}
                before running tests.
              </p>
            )}
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
    </MainLayout>
  );
}
