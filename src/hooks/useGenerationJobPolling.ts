import { useEffect, useMemo, useState } from "react";
import testSuiteLlmSuggestionService, {
  GenerationJobStatus,
  GenerationJobStatusModel,
} from "../services/testSuiteLlmSuggestionService";

export const TERMINAL_GENERATION_STATUSES: GenerationJobStatus[] = [
  "Completed",
  "Failed",
  "Cancelled",
];

const DEFAULT_TIMEOUT_MS = 300000;
const activePollers = new Map<string, ActivePoller>();

type ActivePoller = {
  controller: AbortController;
  listeners: Set<(status: GenerationJobStatusModel) => void>;
  latestStatus: GenerationJobStatusModel | null;
  promise: Promise<GenerationJobStatus>;
};

export type PollGenerationJobStatusOptions = {
  suiteId: string;
  jobId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onStatus?: (status: GenerationJobStatusModel) => void;
};

export type UseGenerationJobPollingOptions = {
  suiteId?: string | null;
  jobId?: string | null;
  enabled?: boolean;
  timeoutMs?: number;
};

export type UseGenerationJobPollingResult = {
  status: GenerationJobStatus | null;
  phaseLabel: string;
  terminalStatus: GenerationJobStatus | null;
  error: Error | null;
  isPolling: boolean;
};

export const isTerminalGenerationStatus = (
  status?: GenerationJobStatus | null,
) => !!status && TERMINAL_GENERATION_STATUSES.includes(status);

export const getGenerationStatusLabel = (
  status?: GenerationJobStatus | null,
) => {
  switch (status) {
    case "Queued":
      return "Starting refinement...";
    case "Triggering":
      return "Sending to n8n...";
    case "WaitingForCallback":
      return "Refining suggestions...";
    case "Completed":
      return "Suggestions ready.";
    case "Failed":
      return "Generation failed.";
    case "Cancelled":
      return "Generation cancelled.";
    default:
      return "Generating suggestions...";
  }
};

export const getGenerationPollingDelay = (
  status: GenerationJobStatus,
  attempt: number,
  isHidden = typeof document !== "undefined" ? document.hidden : false,
) => {
  const baseDelay =
    status === "WaitingForCallback"
      ? 5000
      : status === "Queued" || status === "Triggering"
        ? 2000
        : 2500;
  const backoffDelay = Math.min(
    baseDelay + Math.max(0, attempt - 3) * 1000,
    10000,
  );
  return isHidden ? Math.max(backoffDelay, 10000) : backoffDelay;
};

const abortError = () => new DOMException("Polling aborted", "AbortError");

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
      reject(abortError());
    };

    signal.addEventListener("abort", onAbort);
  });

const getPollerKey = (suiteId: string, jobId: string) => `${suiteId}:${jobId}`;

const runPoller = async (
  suiteId: string,
  jobId: string,
  timeoutMs: number,
  poller: ActivePoller,
) => {
  const timeoutAt = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < timeoutAt) {
    if (poller.controller.signal.aborted) {
      throw abortError();
    }

    const job = await testSuiteLlmSuggestionService.getGenerationStatus(
      suiteId,
      jobId,
      { signal: poller.controller.signal },
    );

    poller.latestStatus = job;
    poller.listeners.forEach((listener) => listener(job));

    if (isTerminalGenerationStatus(job.status)) {
      return job.status;
    }

    attempt += 1;
    await wait(
      getGenerationPollingDelay(job.status, attempt),
      poller.controller.signal,
    );
  }

  throw new Error("LLM suggestion generation timed out.");
};

const releaseListener = (
  key: string,
  poller: ActivePoller,
  listener?: (status: GenerationJobStatusModel) => void,
) => {
  if (listener) {
    poller.listeners.delete(listener);
  }

  if (poller.listeners.size === 0 && !poller.controller.signal.aborted) {
    poller.controller.abort();
    activePollers.delete(key);
  }
};

const withCallerAbort = (
  key: string,
  poller: ActivePoller,
  listener: ((status: GenerationJobStatusModel) => void) | undefined,
  signal: AbortSignal | undefined,
) => {
  if (!signal) {
    return poller.promise.finally(() => releaseListener(key, poller, listener));
  }

  if (signal.aborted) {
    releaseListener(key, poller, listener);
    return Promise.reject(abortError());
  }

  return new Promise<GenerationJobStatus>((resolve, reject) => {
    const onAbort = () => {
      releaseListener(key, poller, listener);
      reject(abortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });
    poller.promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
      releaseListener(key, poller, listener);
    });
  });
};

export const pollGenerationJobStatus = ({
  suiteId,
  jobId,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onStatus,
}: PollGenerationJobStatusOptions): Promise<GenerationJobStatus> => {
  const key = getPollerKey(suiteId, jobId);
  const existing = activePollers.get(key);

  if (existing) {
    if (onStatus) {
      existing.listeners.add(onStatus);
      if (existing.latestStatus) {
        onStatus(existing.latestStatus);
      }
    }
    return withCallerAbort(key, existing, onStatus, signal);
  }

  const poller: ActivePoller = {
    controller: new AbortController(),
    listeners: new Set(onStatus ? [onStatus] : []),
    latestStatus: null,
    promise: Promise.resolve("Cancelled"),
  };

  poller.promise = runPoller(suiteId, jobId, timeoutMs, poller).finally(() => {
    activePollers.delete(key);
  });
  activePollers.set(key, poller);

  return withCallerAbort(key, poller, onStatus, signal);
};

export function useGenerationJobPolling({
  suiteId,
  jobId,
  enabled = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseGenerationJobPollingOptions): UseGenerationJobPollingResult {
  const [status, setStatus] = useState<GenerationJobStatus | null>(null);
  const [terminalStatus, setTerminalStatus] =
    useState<GenerationJobStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!enabled || !suiteId || !jobId) {
      setStatus(null);
      setTerminalStatus(null);
      setError(null);
      setIsPolling(false);
      return;
    }

    const controller = new AbortController();
    setStatus(null);
    setTerminalStatus(null);
    setError(null);
    setIsPolling(true);

    pollGenerationJobStatus({
      suiteId,
      jobId,
      signal: controller.signal,
      timeoutMs,
      onStatus: (job) => setStatus(job.status),
    })
      .then((nextTerminalStatus) => {
        if (!controller.signal.aborted) {
          setTerminalStatus(nextTerminalStatus);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsPolling(false);
        }
      });

    return () => controller.abort();
  }, [enabled, suiteId, jobId, timeoutMs]);

  const phaseLabel = useMemo(() => getGenerationStatusLabel(status), [status]);

  return {
    status,
    phaseLabel,
    terminalStatus,
    error,
    isPolling,
  };
}
