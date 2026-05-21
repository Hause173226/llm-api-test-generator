import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiService } from "./apiService";
import { testSuiteService } from "./testSuiteService";

vi.mock("./apiService", () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiService = vi.mocked(apiService);

describe("testSuiteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the full persisted scope when updating a suite", async () => {
    mockedApiService.put.mockResolvedValueOnce({
      id: "suite-1",
      projectId: "project-1",
      name: "Generated Suite",
      generationType: 0,
      status: 1,
      approvalStatus: 2,
      selectedEndpointIds: ["endpoint-1", "endpoint-2"],
      endpointBusinessContexts: {
        "endpoint-1": "customer must be authenticated",
      },
      globalBusinessRules: "Keep generated test coverage intact.",
      selectedEndpointCount: 2,
      testCaseCount: 8,
      createdById: "user-1",
      createdDateTime: "2026-01-01T00:00:00.000Z",
      rowVersion: "new-row-version",
    });

    const result = await testSuiteService.updateTestSuite(
      "project-1",
      "suite-1",
      {
        name: "Generated Suite",
        description: "Updated scope after generation",
        apiSpecId: "spec-1",
        generationType: "Auto",
        selectedEndpointIds: ["endpoint-1", "endpoint-2"],
        endpointBusinessContexts: {
          "endpoint-1": "customer must be authenticated",
        },
        globalBusinessRules: "Keep generated test coverage intact.",
        rowVersion: "current-row-version",
      },
    );

    expect(mockedApiService.put).toHaveBeenCalledWith(
      "/projects/project-1/test-suites/suite-1",
      {
        name: "Generated Suite",
        description: "Updated scope after generation",
        apiSpecId: "spec-1",
        generationType: "Auto",
        selectedEndpointIds: ["endpoint-1", "endpoint-2"],
        endpointBusinessContexts: {
          "endpoint-1": "customer must be authenticated",
        },
        globalBusinessRules: "Keep generated test coverage intact.",
        rowVersion: "current-row-version",
      },
    );
    expect(result.generationType).toBe("Auto");
    expect(result.status).toBe("Ready");
    expect(result.approvalStatus).toBe("Approved");
    expect(result.testCaseCount).toBe(8);
  });
});
