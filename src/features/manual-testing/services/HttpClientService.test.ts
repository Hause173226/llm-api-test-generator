import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { httpClientService } from "./HttpClientService";
import type { RequestConfig } from "../types";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("HttpClientService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default axios mock
    mockedAxios.CancelToken = {
      source: vi.fn(() => ({
        token: {},
        cancel: vi.fn(),
      })),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeRequest", () => {
    it("should execute a GET request successfully", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: { message: "success" },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const response = await httpClientService.executeRequest(config);

      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.body).toContain("success");
      expect(response.time).toBeGreaterThanOrEqual(0);
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it("should include query parameters in URL", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [
          { id: "1", key: "page", value: "1", enabled: true },
          { id: "2", key: "limit", value: "10", enabled: true },
          { id: "3", key: "disabled", value: "test", enabled: false },
        ],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("page=1"),
        })
      );
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("limit=10"),
        })
      );
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.not.stringContaining("disabled=test"),
        })
      );
    });

    it("should include enabled headers", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [],
        headers: [
          { id: "1", key: "Accept", value: "application/json", enabled: true },
          {
            id: "2",
            key: "X-Custom",
            value: "custom-value",
            enabled: true,
          },
          {
            id: "3",
            key: "X-Disabled",
            value: "disabled",
            enabled: false,
          },
        ],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
            "X-Custom": "custom-value",
          }),
        })
      );
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            "X-Disabled": "disabled",
          }),
        })
      );
    });

    it("should send JSON body for POST request", async () => {
      const mockResponse = {
        status: 201,
        statusText: "Created",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "POST",
        url: "https://api.example.com/users",
        params: [],
        headers: [],
        body: {
          type: "json",
          content: JSON.stringify({ name: "John", email: "john@example.com" }),
        },
        auth: { type: "none" },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          data: { name: "John", email: "john@example.com" },
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should add Bearer token authentication", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/protected",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "bearer",
          bearer: { token: "test-token-123" },
        },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        })
      );
    });

    it("should add Basic authentication", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/protected",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "basic",
          basic: { username: "user", password: "pass" },
        },
      };

      await httpClientService.executeRequest(config);

      const expectedAuth = `Basic ${btoa("user:pass")}`;
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });

    it("should add API Key to headers", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "apiKey",
          apiKey: { key: "X-API-Key", value: "secret-key", addTo: "header" },
        },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "secret-key",
          }),
        })
      );
    });

    it("should respect custom timeout", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/slow",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
        timeout: 5000,
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it("should use default timeout when not specified", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      await httpClientService.executeRequest(config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000, // Default 30 seconds
        })
      );
    });

    it("should parse cookies from Set-Cookie header", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {
          "set-cookie": [
            "session=abc123; Path=/; HttpOnly; Secure",
            "user=john; Domain=.example.com; Expires=Wed, 21 Oct 2025 07:28:00 GMT",
          ],
        },
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/login",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const response = await httpClientService.executeRequest(config);

      expect(response.cookies).toHaveLength(2);
      expect(response.cookies[0]).toMatchObject({
        name: "session",
        value: "abc123",
        httpOnly: true,
        secure: true,
      });
      expect(response.cookies[1]).toMatchObject({
        name: "user",
        value: "john",
        domain: ".example.com",
      });
    });

    it("should handle network errors", async () => {
      const networkError = {
        isAxiosError: true,
        message: "Network Error",
      };
      
      mockedAxios.isAxiosError = vi.fn(() => true);
      mockedAxios.mockRejectedValueOnce(networkError);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      await expect(httpClientService.executeRequest(config)).rejects.toThrow(
        /Network error/
      );
    });

    it("should handle timeout errors", async () => {
      const timeoutError = {
        isAxiosError: true,
        code: "ECONNABORTED",
        message: "timeout of 5000ms exceeded",
      };
      
      mockedAxios.isAxiosError = vi.fn(() => true);
      mockedAxios.mockRejectedValueOnce(timeoutError);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/slow",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
        timeout: 5000,
      };

      await expect(httpClientService.executeRequest(config)).rejects.toThrow(
        /Request timeout/
      );
    });

    it("should handle CORS errors", async () => {
      const corsError = {
        isAxiosError: true,
        message: "CORS policy blocked",
      };
      
      mockedAxios.isAxiosError = vi.fn(() => true);
      mockedAxios.mockRejectedValueOnce(corsError);

      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      await expect(httpClientService.executeRequest(config)).rejects.toThrow(
        /CORS error/
      );
    });
  });

  describe("cancelRequest", () => {
    it("should cancel an ongoing request", () => {
      const mockCancel = vi.fn();
      const mockCancelSource = {
        token: {},
        cancel: mockCancel,
      };

      mockedAxios.CancelToken = {
        source: vi.fn(() => mockCancelSource),
      } as any;

      const requestId = "test-request-id";

      // Start a request (we don't await it)
      const config: RequestConfig = {
        id: requestId,
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      // Mock a pending request
      mockedAxios.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ status: 200, data: {} }), 1000);
          })
      );

      httpClientService.executeRequest(config);

      // Cancel the request
      httpClientService.cancelRequest(requestId);

      expect(mockCancel).toHaveBeenCalledWith("Request cancelled by user");
    });
  });

  describe("validateRequest", () => {
    it("should return valid for a properly configured request", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [{ id: "1", key: "page", value: "1", enabled: true }],
        headers: [{ id: "1", key: "Accept", value: "application/json", enabled: true }],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error when URL is empty", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "url",
        message: "URL is required",
        severity: "error",
      });
    });

    it("should return error when URL is malformed", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "not-a-valid-url",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "url",
        message: expect.stringContaining("malformed"),
        severity: "error",
      });
    });

    it("should return error when JSON body is invalid", () => {
      const config: RequestConfig = {
        method: "POST",
        url: "https://api.example.com/users",
        params: [],
        headers: [],
        body: {
          type: "json",
          content: '{ "name": "John", invalid json }',
        },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "body",
        message: expect.stringContaining("Invalid JSON syntax"),
        severity: "error",
      });
    });

    it("should not validate empty JSON body", () => {
      const config: RequestConfig = {
        method: "POST",
        url: "https://api.example.com/users",
        params: [],
        headers: [],
        body: {
          type: "json",
          content: "",
        },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return warning when bearer token is missing", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/protected",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "bearer",
          bearer: { token: "" },
        },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "auth.bearer.token",
        message: expect.stringContaining("Bearer token is required"),
        severity: "warning",
      });
    });

    it("should return warnings when basic auth credentials are missing", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/protected",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "basic",
          basic: { username: "", password: "" },
        },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        field: "auth.basic.username",
        severity: "warning",
      });
      expect(result.errors[1]).toMatchObject({
        field: "auth.basic.password",
        severity: "warning",
      });
    });

    it("should return warnings when API key fields are missing", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: {
          type: "apiKey",
          apiKey: { key: "", value: "", addTo: "header" },
        },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        field: "auth.apiKey.key",
        severity: "warning",
      });
      expect(result.errors[1]).toMatchObject({
        field: "auth.apiKey.value",
        severity: "warning",
      });
    });

    it("should return warning when enabled header has empty key", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [],
        headers: [
          { id: "1", key: "", value: "some-value", enabled: true },
          { id: "2", key: "Accept", value: "application/json", enabled: true },
        ],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "headers[0].key",
        message: expect.stringContaining("empty key"),
        severity: "warning",
      });
    });

    it("should not validate disabled headers", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [],
        headers: [
          { id: "1", key: "", value: "some-value", enabled: false },
        ],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return warning when enabled param has empty key", () => {
      const config: RequestConfig = {
        method: "GET",
        url: "https://api.example.com/users",
        params: [
          { id: "1", key: "", value: "some-value", enabled: true },
          { id: "2", key: "page", value: "1", enabled: true },
        ],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "params[0].key",
        message: expect.stringContaining("empty key"),
        severity: "warning",
      });
    });

    it("should handle multiple validation errors", () => {
      const config: RequestConfig = {
        method: "POST",
        url: "",
        params: [{ id: "1", key: "", value: "val", enabled: true }],
        headers: [{ id: "1", key: "", value: "val", enabled: true }],
        body: {
          type: "json",
          content: "{ invalid json",
        },
        auth: {
          type: "bearer",
          bearer: { token: "" },
        },
      };

      const result = httpClientService.validateRequest(config);

      expect(result.isValid).toBe(false); // Has error-level issues
      expect(result.errors.length).toBeGreaterThan(3);
      
      // Check for critical errors
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain("url");
      expect(errorFields).toContain("body");
    });
  });
});
