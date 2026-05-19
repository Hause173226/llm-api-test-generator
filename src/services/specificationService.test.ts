import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import specificationService from "./specificationService";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("specificationService cache", () => {
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
    specificationService.invalidateCache();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
    fetchMock.mockReset();
  });

  afterEach(() => {
    specificationService.invalidateCache();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the TTL-cached specification list for the same cache key", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "spec-1", name: "OpenAPI" }]));

    const first = await specificationService.getSpecifications("project-1");
    const second = await specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first[0].id).toBe("spec-1");
    expect(second[0].name).toBe("OpenAPI");
  });

  it("uses includeDeleted as part of the cache key", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: "spec-1", name: "Active" }]))
      .mockResolvedValueOnce(
        jsonResponse([
          { id: "spec-1", name: "Active" },
          { id: "spec-2", name: "Deleted", isDeleted: true },
        ]),
      );

    await specificationService.getSpecifications("project-1", false);
    await specificationService.getSpecifications("project-1", true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes matching in-flight specification requests", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = specificationService.getSpecifications("project-1");
    const second = specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse([{ id: "spec-1", name: "OpenAPI" }]));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult[0].id).toBe("spec-1");
    expect(secondResult[0].id).toBe("spec-1");
  });

  it("invalidates specification cache after a successful mutation", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: "spec-1", name: "Old" }]))
      .mockResolvedValueOnce(jsonResponse({ id: "spec-1", name: "New" }))
      .mockResolvedValueOnce(jsonResponse([{ id: "spec-1", name: "New" }]));

    await specificationService.getSpecifications("project-1");
    await specificationService.updateSpecification("project-1", "spec-1", {
      name: "New",
    });
    const refreshed = await specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refreshed[0].name).toBe("New");
  });

  it("calls the activate endpoint and invalidates the specification cache", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: "spec-1", name: "OpenAPI", isActive: false }]),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "spec-1", name: "OpenAPI", isActive: true }),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: "spec-1", name: "OpenAPI", isActive: true }]),
      );

    await specificationService.getSpecifications("project-1");
    await specificationService.activateSpecification("project-1", "spec-1");
    const refreshed = await specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/projects/project-1/specifications/spec-1/activate",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect(refreshed[0].isActive).toBe(true);
  });

  it("calls the deactivate endpoint and invalidates the specification cache", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: "spec-1", name: "OpenAPI", isActive: true }]),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "spec-1", name: "OpenAPI", isActive: false }),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: "spec-1", name: "OpenAPI", isActive: false }]),
      );

    await specificationService.getSpecifications("project-1");
    await specificationService.deactivateSpecification("project-1", "spec-1");
    const refreshed = await specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/projects/project-1/specifications/spec-1/deactivate",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect(refreshed[0].isActive).toBe(false);
  });

  it("clears pending requests after failure so later calls can retry", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "failed" }, 500))
      .mockResolvedValueOnce(jsonResponse([{ id: "spec-1", name: "OpenAPI" }]));

    const first = specificationService.getSpecifications("project-1");
    const second = specificationService.getSpecifications("project-1");
    await Promise.allSettled([first, second]);

    const retried = await specificationService.getSpecifications("project-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retried[0].id).toBe("spec-1");
  });
});
