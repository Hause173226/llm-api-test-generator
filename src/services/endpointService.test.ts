import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import endpointService from "./endpointService";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("endpointService cache", () => {
  const fetchMock = vi.fn();
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
    endpointService.invalidateCache();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
    fetchMock.mockReset();
  });

  afterEach(() => {
    endpointService.invalidateCache();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the TTL-cached endpoint list for the same cache key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ id: "ep-1", path: "/users", httpMethod: "GET" }]),
    );

    const first = await endpointService.getEndpoints("project-1", "spec-1");
    const second = await endpointService.getEndpoints("project-1", "spec-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.items).toHaveLength(1);
    expect(second.items[0].id).toBe("ep-1");
  });

  it("uses request filters as part of the cache key", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: "ep-1", path: "/users", httpMethod: "GET" }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: "ep-2", path: "/users", httpMethod: "POST" }]),
      );

    await endpointService.getEndpoints("project-1", "spec-1", 1, 20, "", "GET");
    await endpointService.getEndpoints("project-1", "spec-1", 1, 20, "", "POST");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes matching in-flight endpoint requests", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = endpointService.getEndpoints("project-1", "spec-1");
    const second = endpointService.getEndpoints("project-1", "spec-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse([{ id: "ep-1", path: "/users", httpMethod: "GET" }]));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.items[0].id).toBe("ep-1");
    expect(secondResult.items[0].id).toBe("ep-1");
  });

  it("invalidates endpoint cache after a successful mutation", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: "ep-1", path: "/users", httpMethod: "GET" }]),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "ep-2", path: "/orders" }))
      .mockResolvedValueOnce(
        jsonResponse([
          { id: "ep-1", path: "/users", httpMethod: "GET" },
          { id: "ep-2", path: "/orders", httpMethod: "POST" },
        ]),
      );

    await endpointService.getEndpoints("project-1", "spec-1");
    await endpointService.createEndpoint("project-1", "spec-1", {
      path: "/orders",
      method: "POST",
    });
    const refreshed = await endpointService.getEndpoints("project-1", "spec-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refreshed.items).toHaveLength(2);
  });

  it("clears pending requests after failure so later calls can retry", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "failed" }, 500))
      .mockResolvedValueOnce(
        jsonResponse([{ id: "ep-1", path: "/users", httpMethod: "GET" }]),
      );

    const first = endpointService.getEndpoints("project-1", "spec-1");
    const second = endpointService.getEndpoints("project-1", "spec-1");
    await Promise.allSettled([first, second]);

    const retried = await endpointService.getEndpoints("project-1", "spec-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retried.items[0].id).toBe("ep-1");
  });
});
