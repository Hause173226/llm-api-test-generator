import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import testRunService, { TestRun } from "../services/testRunService";
import { showErrorToast } from "../utils/errorHandler";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min

type WatchStatus =
  | "starting"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export default function ExecutionWatchPage() {
  const { suiteId, runId: runIdParam } = useParams<{
    suiteId: string;
    runId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectId = searchParams.get("projectId") || "";
  // "start-watch" mode params
  const environmentId = searchParams.get("environmentId") || "";
  const testCaseIdsParam = searchParams.get("testCaseIds") || "";

  // resolved runId (either from path or obtained after startTestRun)
  const [resolvedRunId, setResolvedRunId] = useState<string | null>(
    runIdParam || null,
  );

  const [run, setRun] = useState<TestRun | null>(null);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(
    runIdParam ? "running" : "starting",
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dots, setDots] = useState(".");

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Animated dots
  useEffect(() => {
    dotsRef.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => {
      if (dotsRef.current) clearInterval(dotsRef.current);
    };
  }, []);

  // Elapsed time ticker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start run if in "start-watch" mode (no runId in path)
  useEffect(() => {
    if (runIdParam || !suiteId || !environmentId || !testCaseIdsParam) return;

    const testCaseIds = testCaseIdsParam.split(",").filter(Boolean);
    if (testCaseIds.length === 0) return;

    isMountedRef.current = true;

    const startRun = async () => {
      try {
        const result = await testRunService.startTestRun({
          testSuiteId: suiteId,
          environmentId,
          selectedTestCaseIds: testCaseIds,
        });
        if (!isMountedRef.current) return;
        const id = result?.run?.id;
        if (id) {
          setResolvedRunId(id);
          setWatchStatus("running");
        } else {
          showErrorToast("Failed to start test run: no run ID returned");
          setWatchStatus("failed");
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        showErrorToast("Failed to start test run");
        setWatchStatus("failed");
      }
    };

    startRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId, runIdParam, environmentId, testCaseIdsParam]);

  // Polling
  useEffect(() => {
    if (!suiteId || !resolvedRunId) return;
    if (watchStatus === "starting") return; // wait until run is started
    isMountedRef.current = true;

    let stopped = false;

    const poll = async () => {
      const deadline = startTimeRef.current + POLL_TIMEOUT_MS;

      while (!stopped && Date.now() < deadline) {
        try {
          const latest = await testRunService.getTestRunById(
            suiteId,
            resolvedRunId,
          );

          if (!isMountedRef.current) return;
          setRun(latest);

          const status = (latest.status || "").toLowerCase();

          if (status === "completed") {
            setWatchStatus("completed");
            return;
          }
          if (status === "failed") {
            setWatchStatus("failed");
            return;
          }
          if (status === "cancelled") {
            setWatchStatus("cancelled");
            return;
          }
        } catch (err: any) {
          if (!isMountedRef.current) return;
          showErrorToast("Failed to fetch run status. Retrying...");
        }

        await new Promise<void>((res) => setTimeout(res, POLL_INTERVAL_MS));
      }

      if (!stopped && isMountedRef.current) {
        setWatchStatus("timeout");
      }
    };

    poll();

    return () => {
      stopped = true;
      isMountedRef.current = false;
    };
  }, [suiteId, resolvedRunId, watchStatus]);

  const buildRunsUrl = () => {
    const params = new URLSearchParams();
    if (suiteId) params.set("activeSuiteId", suiteId);
    if (projectId) params.set("projectId", projectId);
    return `/runs?${params.toString()}`;
  };

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const isFinished =
    watchStatus === "completed" ||
    watchStatus === "failed" ||
    watchStatus === "cancelled" ||
    watchStatus === "timeout";
  const passedPct =
    run && run.totalTests > 0
      ? Math.round((run.passedTests / run.totalTests) * 100)
      : 0;

  const failedPct =
    run && run.totalTests > 0
      ? Math.round((run.failedTests / run.totalTests) * 100)
      : 0;

  return (
    <MainLayout title="Executing Test Run">
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header gradient */}
            <div
              className={`p-8 text-center bg-gradient-to-br ${
                watchStatus === "completed"
                  ? "from-emerald-500 to-emerald-700"
                  : watchStatus === "failed"
                    ? "from-rose-500 to-rose-700"
                    : watchStatus === "cancelled"
                      ? "from-slate-500 to-slate-700"
                      : watchStatus === "timeout"
                        ? "from-amber-500 to-amber-700"
                        : "from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800"
              }`}
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                {watchStatus === "running" && (
                  <Play className="w-10 h-10 text-white animate-pulse" />
                )}
                {watchStatus === "completed" && (
                  <CheckCircle2 className="w-10 h-10 text-white" />
                )}
                {(watchStatus === "failed" || watchStatus === "timeout") && (
                  <AlertTriangle className="w-10 h-10 text-white" />
                )}
                {watchStatus === "cancelled" && (
                  <XCircle className="w-10 h-10 text-white" />
                )}
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">
                {watchStatus === "starting" && `Starting Test Run${dots}`}
                {watchStatus === "running" && `Executing Test Run${dots}`}
                {watchStatus === "completed" && "Run Completed!"}
                {watchStatus === "failed" && "Run Failed"}
                {watchStatus === "cancelled" && "Run Cancelled"}
                {watchStatus === "timeout" && "Timed Out"}
              </h1>
              <p className="text-white/80 text-sm">
                {watchStatus === "starting" &&
                  "Submitting test run to the server..."}
                {watchStatus === "running" &&
                  "Running your test cases against the environment..."}
                {watchStatus === "completed" &&
                  "All test cases have been executed."}
                {watchStatus === "failed" && "The run encountered errors."}
                {watchStatus === "cancelled" && "The run was cancelled."}
                {watchStatus === "timeout" &&
                  "The run is taking longer than expected."}
              </p>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Elapsed time */}
              <div className="flex items-center justify-between text-sm text-on-surface-variant">
                <span>Elapsed time</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  {formatElapsed(elapsedMs)}
                </span>
              </div>

              {/* Spinner while starting or running */}
              {(watchStatus === "starting" || watchStatus === "running") && (
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <Loader2 className="w-12 h-12 text-primary dark:text-indigo-400 animate-spin" />
                  <p className="text-sm text-on-surface-variant">
                    {watchStatus === "starting"
                      ? "Sending request to server..."
                      : `Polling run status every ${POLL_INTERVAL_MS / 1000}s`}
                    {watchStatus === "running" && run && run.totalTests > 0 && (
                      <span className="ml-2 font-semibold text-on-surface">
                        ({run.passedTests + run.failedTests + run.skippedTests}/
                        {run.totalTests} done)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Results summary when done */}
              {isFinished && run && (
                <div className="space-y-4">
                  {/* Progress bar */}
                  {run.totalTests > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                        <span>Pass rate</span>
                        <span className="font-semibold">{passedPct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-surface-container-high dark:bg-slate-700 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${passedPct}%` }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-700"
                          style={{ width: `${failedPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      {
                        label: "Total",
                        value: run.totalTests,
                        color: "bg-slate-100 dark:bg-slate-800 text-on-surface",
                      },
                      {
                        label: "Passed",
                        value: run.passedTests,
                        color:
                          "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                      },
                      {
                        label: "Failed",
                        value: run.failedTests,
                        color:
                          "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
                      },
                      {
                        label: "Skipped",
                        value: run.skippedTests,
                        color:
                          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`rounded-xl p-3 ${stat.color}`}
                      >
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs mt-1 font-semibold">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Run number */}
              {run?.runNumber && (
                <p className="text-xs text-on-surface-variant text-center">
                  Run #{run.runNumber}
                  {run.completedAt &&
                    ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
                </p>
              )}

              {/* Timeout message */}
              {watchStatus === "timeout" && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    The run is still in progress. You can view its status on the
                    Execution Runs page.
                  </p>
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={() => navigate(buildRunsUrl())}
                className="w-full px-6 py-3 rounded-xl bg-primary dark:bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {watchStatus === "running" ? (
                  <>
                    <Play className="w-4 h-4" />
                    View in Execution Runs
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    View Results
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
