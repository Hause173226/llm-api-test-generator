import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useProject } from "../contexts/ProjectContext";
import { useTestSuites } from "../hooks/useTestSuites";
import { apiService } from "../services/apiService";
import testRunService, {
  TestRun,
  TestRunDetailResponse,
} from "../services/testRunService";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";

interface FailureExplanationModel {
  testSuiteId: string;
  testRunId: string;
  testCaseId: string;
  summaryVi?: string;
  possibleCauses?: string[];
  suggestedNextActions?: string[];
}

export default function SuggestionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();

  const suiteIdFromQuery = searchParams.get("suiteId") || "";
  const selectedProjectId = selectedProject?.id || "";

  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runDetail, setRunDetail] = useState<TestRunDetailResponse | null>(
    null,
  );
  const [runDetailsUnavailable, setRunDetailsUnavailable] = useState(false);
  const [explanationsByCaseId, setExplanationsByCaseId] = useState<
    Record<string, FailureExplanationModel | null>
  >({});
  const [loadingExplanationByCaseId, setLoadingExplanationByCaseId] = useState<
    Record<string, boolean>
  >({});
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const { testSuites, isLoading: isLoadingSuites } =
    useTestSuites(selectedProjectId);

  useEffect(() => {
    if (!testSuites.length) {
      setSelectedSuiteId("");
      return;
    }

    if (
      suiteIdFromQuery &&
      testSuites.some((suite) => suite.id === suiteIdFromQuery)
    ) {
      setSelectedSuiteId(suiteIdFromQuery);
      return;
    }

    if (
      !selectedSuiteId ||
      !testSuites.some((suite) => suite.id === selectedSuiteId)
    ) {
      setSelectedSuiteId(testSuites[0].id);
    }
  }, [suiteIdFromQuery, selectedSuiteId, testSuites]);

  const selectedSuite = useMemo(
    () => testSuites.find((suite) => suite.id === selectedSuiteId),
    [selectedSuiteId, testSuites],
  );

  const syncQuery = (projectId: string, suiteId: string) => {
    const next = new URLSearchParams();
    if (projectId) {
      next.set("projectId", projectId);
    }
    if (suiteId) {
      next.set("suiteId", suiteId);
    }
    setSearchParams(next, { replace: true });
  };

  const fetchRuns = async (suiteId: string) => {
    if (!suiteId) {
      setRuns([]);
      setSelectedRunId("");
      return;
    }

    try {
      setIsLoadingRuns(true);
      const response = await testRunService.getTestRunsByTestSuite(
        suiteId,
        1,
        50,
      );
      const items = response.items || [];
      setRuns(items);

      if (items.length > 0) {
        const preferredRun = items.some((run) => run.id === selectedRunId)
          ? selectedRunId
          : items[0].id;
        setSelectedRunId(preferredRun);
      } else {
        setSelectedRunId("");
      }
    } catch (err) {
      setRuns([]);
      setSelectedRunId("");
      handleError(err);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  const fetchRunDetail = async (suiteId: string, runId: string) => {
    if (!suiteId || !runId) {
      setRunDetail(null);
      setRunDetailsUnavailable(false);
      return;
    }

    try {
      setIsLoadingDetail(true);
      let detail: TestRunDetailResponse | null = null;
      // Backend can return resultsSource=unavailable briefly before cache is populated.
      for (let attempt = 0; attempt < 4; attempt++) {
        detail = await testRunService.getTestRunResults(suiteId, runId);
        const unavailable =
          (detail?.resultsSource || "").toLowerCase() === "unavailable";
        const hasCases =
          Array.isArray(detail?.cases) && detail.cases.length > 0;

        if (!unavailable || hasCases) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setRunDetail(detail);
      setRunDetailsUnavailable(
        (detail?.resultsSource || "").toLowerCase() === "unavailable" &&
        (detail?.cases?.length || 0) === 0,
      );
      setExplanationsByCaseId({});
    } catch (err) {
      setRunDetail(null);
      setRunDetailsUnavailable(false);
      handleError(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId || !selectedSuiteId) {
      return;
    }

    syncQuery(selectedProjectId, selectedSuiteId);
    fetchRuns(selectedSuiteId);
  }, [selectedProjectId, selectedSuiteId]);

  useEffect(() => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    fetchRunDetail(selectedSuiteId, selectedRunId);
  }, [selectedSuiteId, selectedRunId]);

  const getExplanation = async (testCaseId: string) => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    try {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: true,
      }));
      const data = await apiService.get<FailureExplanationModel>(
        `/test-suites/${selectedSuiteId}/test-runs/${selectedRunId}/failures/${testCaseId}/explanation`,
      );
      setExplanationsByCaseId((prev) => ({
        ...prev,
        [testCaseId]: data || null,
      }));
    } catch {
      setExplanationsByCaseId((prev) => ({ ...prev, [testCaseId]: null }));
    } finally {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: false,
      }));
    }
  };

  const generateExplanation = async (testCaseId: string) => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    try {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: true,
      }));
      const data = await apiService.post<FailureExplanationModel>(
        `/test-suites/${selectedSuiteId}/test-runs/${selectedRunId}/failures/${testCaseId}/explanation`,
      );
      setExplanationsByCaseId((prev) => ({
        ...prev,
        [testCaseId]: data || null,
      }));
      showSuccessToast("Failure explanation generated.");
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: false,
      }));
    }
  };

  const failedCases = (runDetail?.cases || []).filter(
    (testCase) => (testCase.status || "").toLowerCase() === "failed",
  );

  const generateAllFailed = async () => {
    if (failedCases.length === 0) {
      showErrorToast("No failed test cases to explain.");
      return;
    }

    try {
      setIsGeneratingAll(true);
      for (const failedCase of failedCases) {
        await generateExplanation(failedCase.testCaseId);
      }
      showSuccessToast("Generated explanations for all failed cases.");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <MainLayout title="Execute Analysis">
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              Run Details va Failure Explanation
            </h1>
            <p className="text-on-surface-variant max-w-3xl">
              Trang nay dung cho Execute: xem run details va giai thich loi cho
              failed cases.
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                `/runs${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`,
              )
            }
            className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Back to Runs
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Test Suite
            </label>
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              disabled={!selectedProjectId || isLoadingSuites}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface disabled:opacity-60"
            >
              <option value="">Select test suite...</option>
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Test Run
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              disabled={!selectedSuiteId || isLoadingRuns}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface disabled:opacity-60"
            >
              <option value="">Select test run...</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  #{run.runNumber || "-"} - {run.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedProjectId && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
            Please select a project from the sidebar to inspect run details.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateAllFailed}
            disabled={
              !selectedRunId || isGeneratingAll || failedCases.length === 0
            }
            className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate All Explanations
          </button>

          <button
            onClick={() => {
              fetchRuns(selectedSuiteId);
              if (selectedSuiteId && selectedRunId) {
                fetchRunDetail(selectedSuiteId, selectedRunId);
              }
            }}
            disabled={!selectedSuiteId || isLoadingRuns || isLoadingDetail}
            className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoadingRuns || isLoadingDetail ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>

          {selectedSuite && (
            <span className="text-sm text-on-surface-variant">
              Suite:{" "}
              <span className="font-semibold text-on-surface">
                {selectedSuite.name}
              </span>
            </span>
          )}
        </div>

        {!selectedSuiteId && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
            Select a test suite to inspect execute details.
          </div>
        )}

        {selectedSuiteId && isLoadingRuns && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading test runs...
          </div>
        )}

        {selectedSuiteId && !isLoadingRuns && runs.length === 0 && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-on-surface font-semibold">
                  No test runs found for this suite.
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Execute this suite first, then come back for explanations.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedRunId && isLoadingDetail && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading run details...
          </div>
        )}

        {selectedRunId && !isLoadingDetail && runDetail && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              Run Details ({runDetail.cases.length} cases)
            </h2>

            {runDetailsUnavailable && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                Chi tiet ket qua run hien tai khong con trong cache
                (resultsSource=unavailable), nen khong the tao Failure
                Explanation. Hay chay lai test run de tao du lieu moi.
              </div>
            )}

            {runDetail.cases.map((testCase) => {
              const explanation = explanationsByCaseId[testCase.testCaseId];
              const loadingExplanation =
                !!loadingExplanationByCaseId[testCase.testCaseId];
              const isFailed =
                (testCase.status || "").toLowerCase() === "failed";

              return (
                <div
                  key={testCase.testCaseId}
                  className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                      {testCase.status || "Unknown"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                      HTTP: {testCase.httpStatusCode ?? "N/A"}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-on-surface">
                    {testCase.name}
                  </p>
                  <p className="text-on-surface-variant mt-1">
                    {testCase.resolvedUrl || "No resolved URL"}
                  </p>

                  {isFailed && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            generateExplanation(testCase.testCaseId)
                          }
                          disabled={loadingExplanation}
                          className="px-3 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {loadingExplanation ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Generate Explanation
                        </button>
                        <button
                          onClick={() => getExplanation(testCase.testCaseId)}
                          disabled={loadingExplanation}
                          className="px-3 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface text-xs font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          <RefreshCw
                            className={cn(
                              "w-3 h-3",
                              loadingExplanation && "animate-spin",
                            )}
                          />
                          Get Existing
                        </button>
                      </div>

                      {explanation && (
                        <div className="text-sm text-on-surface-variant space-y-2">
                          <p className="text-on-surface font-semibold">
                            {explanation.summaryVi || "No summary"}
                          </p>

                          {Array.isArray(explanation.possibleCauses) &&
                            explanation.possibleCauses.length > 0 && (
                              <div>
                                <p className="font-semibold">
                                  Possible causes:
                                </p>
                                {explanation.possibleCauses.map(
                                  (cause, index) => (
                                    <p
                                      key={`${testCase.testCaseId}-cause-${index}`}
                                    >
                                      - {cause}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}

                          {Array.isArray(explanation.suggestedNextActions) &&
                            explanation.suggestedNextActions.length > 0 && (
                              <div>
                                <p className="font-semibold">
                                  Suggested actions:
                                </p>
                                {explanation.suggestedNextActions.map(
                                  (action, index) => (
                                    <p
                                      key={`${testCase.testCaseId}-action-${index}`}
                                    >
                                      - {action}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
