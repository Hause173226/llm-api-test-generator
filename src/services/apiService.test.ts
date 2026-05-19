import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService } from "./apiService";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("apiService auto refresh", () => {
  const fetchMock = vi.fn();
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
    storage.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    fetchMock.mockReset();
    storage.set("authToken", "expired-access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes once and retries the original request with the new access token", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "fresh-access-token",
          user: { id: "user-1" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    const response = await apiService.get<{ id: string }>("/projects/project-1");

    expect(response.id).toBe("project-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh-token");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      credentials: "include",
      headers: expect.objectContaining({
        Authorization: "Bearer fresh-access-token",
      }),
    });
  });

  it("shares one refresh request across concurrent 401 responses", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "fresh-access-token",
          user: { id: "user-1" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-2" }));

    const [first, second] = await Promise.all([
      apiService.get<{ id: string }>("/projects/project-1"),
      apiService.get<{ id: string }>("/projects/project-2"),
    ]);

    expect(first.id).toBe("project-1");
    expect(second.id).toBe("project-2");
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/auth/refresh-token"),
      ),
    ).toHaveLength(1);
  });
});
