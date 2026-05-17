import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import testSuiteLlmSuggestionService, {
  GenerationJobStatus,
  GenerationJobStatusModel,
} from "../services/testSuiteLlmSuggestionService";
import {
  getGenerationPollingDelay,
  pollGenerationJobStatus,
} from "./useGenerationJobPolling";

vi.mock("../services/testSuiteLlmSuggestionService", () => ({
  default: {
    getGenerationStatus: vi.fn(),
  },
}));

const statusModel = (
  status: GenerationJobStatus,
): GenerationJobStatusModel => ({
  jobId: "job-1",
  testSuiteId: "suite-1",
  status,
  queuedAt: "2026-01-01T00:00:00.000Z",
});

describe("generation job polling", () => {
  const getStatusMock = vi.mocked(
    testSuiteLlmSuggestionService.getGenerationStatus,
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    getStatusMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls queued jobs every 2 seconds and resolves on Completed", async () => {
    const onStatus = vi.fn();
    getStatusMock
      .mockResolvedValueOnce(statusModel("Queued"))
      .mockResolvedValueOnce(statusModel("Completed"));

    const promise = pollGenerationJobStatus({
      suiteId: "suite-1",
      jobId: "job-1",
      onStatus,
    });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toBe("Completed");
    expect(getStatusMock).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Queued" }),
    );
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Completed" }),
    );
  });

  it("uses a 5 second interval while waiting for callback", async () => {
    getStatusMock
      .mockResolvedValueOnce(statusModel("WaitingForCallback"))
      .mockResolvedValueOnce(statusModel("Completed"));

    const promise = pollGenerationJobStatus({
      suiteId: "suite-1",
      jobId: "job-waiting",
    });

    await vi.advanceTimersByTimeAsync(4999);
    expect(getStatusMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe("Completed");
    expect(getStatusMock).toHaveBeenCalledTimes(2);
  });

  it.each(["Failed", "Cancelled"] as GenerationJobStatus[])(
    "resolves immediately on terminal %s status",
    async (status) => {
      getStatusMock.mockResolvedValueOnce(statusModel(status));

      await expect(
        pollGenerationJobStatus({
          suiteId: "suite-1",
          jobId: `job-${status}`,
        }),
      ).resolves.toBe(status);

      expect(getStatusMock).toHaveBeenCalledTimes(1);
    },
  );

  it("increases polling interval when the document is hidden", () => {
    expect(getGenerationPollingDelay("Queued", 1, true)).toBe(10000);
    expect(getGenerationPollingDelay("WaitingForCallback", 1, true)).toBe(
      10000,
    );
  });

  it("rejects on timeout without starting a request when the timeout is expired", async () => {
    await expect(
      pollGenerationJobStatus({
        suiteId: "suite-1",
        jobId: "job-timeout",
        timeoutMs: 0,
      }),
    ).rejects.toThrow("timed out");

    expect(getStatusMock).not.toHaveBeenCalled();
  });

  it("aborts polling and releases the active loop", async () => {
    const controller = new AbortController();
    getStatusMock.mockResolvedValueOnce(statusModel("Queued"));

    const promise = pollGenerationJobStatus({
      suiteId: "suite-1",
      jobId: "job-abort",
      signal: controller.signal,
    });

    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("shares one active polling loop for the same suite and job", async () => {
    getStatusMock
      .mockResolvedValueOnce(statusModel("Queued"))
      .mockResolvedValueOnce(statusModel("Completed"));

    const first = pollGenerationJobStatus({
      suiteId: "suite-1",
      jobId: "job-shared",
    });
    const second = pollGenerationJobStatus({
      suiteId: "suite-1",
      jobId: "job-shared",
    });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(first).resolves.toBe("Completed");
    await expect(second).resolves.toBe("Completed");
    expect(getStatusMock).toHaveBeenCalledTimes(2);
  });
});
