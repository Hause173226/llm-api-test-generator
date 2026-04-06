import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckSquare, Loader2, Play, Square } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useProject } from "../contexts/ProjectContext";
import environmentService, { Environment } from "../services/environmentService";
import endpointService, { Endpoint } from "../services/endpointService";
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
  const method = String(testCase.method || endpoint?.method || "GET").toUpperCase();
  const path = testCase.path || endpoint?.path || "(unknown path)";
  return `${method} ${path}`.trim();
};

export default function GenerationRunExecutePage() {
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
  const [endpointById, setEndpointById] = useState<Record<string, Endpoint>>({});
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
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

  const getDefaultEnvironmentId = (items: Environment[]) => {
    if (items.length === 0) return "";
    const defaultEnv = items.find((env) => env.isDefault);
    return defaultEnv?.id || items[0].id;
  };

  const buildRunsUrl = () => {
    const params = new URLSearchParams();
    if (suiteId) {
      params.set("suiteId", suiteId);
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

        const suiteDetail = await testSuiteService.getTestSuiteDetail(projectId, suiteId);
        const apiSpecId = suiteDetail?.apiSpecId || suiteDetail?.ApiSpecId;

        const [suiteCasesResponse, envs, endpointsResponse] = await Promise.all([
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
        ]);

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
        const filtered = (suiteCasesResponse.items || []).filter((item) =>
          idSet.has(item.id),
        );

        setTestCases(filtered);
        setSelectedTestCaseIds(filtered.map((item) => item.id));
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
            Suite: <span className="font-semibold text-on-surface">{suiteName || "N/A"}</span>
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
              <p className="text-sm text-on-surface-variant">No endpoint detected yet.</p>
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
              <p className="text-3xl font-black text-on-surface">{testCases.length}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 dark:border-slate-800 p-4 bg-surface-container-low dark:bg-slate-800/40">
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                Selected To Execute
              </p>
              <p className="text-3xl font-black text-on-surface">{selectedTestCaseIds.length}</p>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTestCaseIds(testCases.map((item) => item.id))
                  }
                  className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTestCaseIds([])}
                  className="text-xs font-semibold text-on-surface-variant hover:underline flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  Clear
                </button>
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
              Execute Selected
            </button>
            <button
              type="button"
              onClick={() => handleExecute("all")}
              disabled={
                isSubmitting || environments.length === 0 || testCases.length === 0
              }
              className="px-5 py-2.5 rounded-lg bg-surface-container-high dark:bg-slate-700 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Play className="w-4 h-4" />
              Execute All
            </button>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
