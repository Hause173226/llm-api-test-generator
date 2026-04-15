import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  ManualTestingProvider,
  useManualTesting,
  useRequestConfig,
  useResponseData,
} from "./ManualTestingContext";
import { RequestConfig, ResponseData } from "../types";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ManualTestingProvider>{children}</ManualTestingProvider>
);

describe("ManualTestingContext", () => {
  describe("useManualTesting", () => {
    it("should provide default request configuration", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      expect(result.current.requestConfig).toEqual({
        method: "GET",
        url: "",
        params: [],
        headers: [],
        body: {
          type: "none",
          content: "",
        },
        auth: {
          type: "none",
        },
        timeout: 30000,
      });
    });

    it("should initialize with null response data", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      expect(result.current.responseData).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should update request configuration", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      const newConfig: RequestConfig = {
        method: "POST",
        url: "https://api.example.com/users",
        params: [],
        headers: [
          {
            id: "1",
            key: "Content-Type",
            value: "application/json",
            enabled: true,
          },
        ],
        body: {
          type: "json",
          content: '{"name": "John"}',
        },
        auth: {
          type: "bearer",
          bearer: { token: "test-token" },
        },
      };

      act(() => {
        result.current.setRequestConfig(newConfig);
      });

      expect(result.current.requestConfig).toEqual(newConfig);
    });

    it("should partially update request configuration", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      act(() => {
        result.current.updateRequestConfig({
          method: "POST",
          url: "https://api.example.com",
        });
      });

      expect(result.current.requestConfig.method).toBe("POST");
      expect(result.current.requestConfig.url).toBe("https://api.example.com");
      expect(result.current.requestConfig.params).toEqual([]);
    });

    it("should set response data", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      const responseData: ResponseData = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: '{"success": true}',
        contentType: "application/json",
        size: 18,
        time: 150,
        cookies: [],
        timestamp: new Date(),
      };

      act(() => {
        result.current.setResponseData(responseData);
      });

      expect(result.current.responseData).toEqual(responseData);
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should set error state", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      const error = new Error("Network error");

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toEqual(error);
    });

    it("should reset request to default state", () => {
      const { result } = renderHook(() => useManualTesting(), { wrapper });

      // Set some state
      act(() => {
        result.current.updateRequestConfig({
          method: "POST",
          url: "https://api.example.com",
        });
        result.current.setResponseData({
          status: 200,
          statusText: "OK",
          headers: {},
          body: "{}",
          contentType: "application/json",
          size: 2,
          time: 100,
          cookies: [],
          timestamp: new Date(),
        });
        result.current.setError(new Error("Test error"));
      });

      // Reset
      act(() => {
        result.current.resetRequest();
      });

      expect(result.current.requestConfig.method).toBe("GET");
      expect(result.current.requestConfig.url).toBe("");
      expect(result.current.responseData).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("useRequestConfig", () => {
    it("should provide request configuration methods", () => {
      const { result } = renderHook(() => useRequestConfig(), { wrapper });

      expect(result.current.requestConfig).toBeDefined();
      expect(result.current.setRequestConfig).toBeDefined();
      expect(result.current.updateRequestConfig).toBeDefined();
      expect(result.current.resetRequest).toBeDefined();
    });

    it("should update request configuration", () => {
      const { result } = renderHook(() => useRequestConfig(), { wrapper });

      act(() => {
        result.current.updateRequestConfig({ method: "DELETE" });
      });

      expect(result.current.requestConfig.method).toBe("DELETE");
    });
  });

  describe("useResponseData", () => {
    it("should provide response data methods", () => {
      const { result } = renderHook(() => useResponseData(), { wrapper });

      expect(result.current.responseData).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.setResponseData).toBeDefined();
      expect(result.current.setLoading).toBeDefined();
      expect(result.current.setError).toBeDefined();
    });

    it("should update response data", () => {
      const { result } = renderHook(() => useResponseData(), { wrapper });

      const responseData: ResponseData = {
        status: 404,
        statusText: "Not Found",
        headers: {},
        body: "",
        contentType: "text/plain",
        size: 0,
        time: 50,
        cookies: [],
        timestamp: new Date(),
      };

      act(() => {
        result.current.setResponseData(responseData);
      });

      expect(result.current.responseData).toEqual(responseData);
    });
  });

  describe("error handling", () => {
    it("should throw error when useManualTesting is used outside provider", () => {
      expect(() => {
        renderHook(() => useManualTesting());
      }).toThrow("useManualTesting must be used within ManualTestingProvider");
    });

    it("should throw error when useRequestConfig is used outside provider", () => {
      expect(() => {
        renderHook(() => useRequestConfig());
      }).toThrow("useRequestConfig must be used within ManualTestingProvider");
    });

    it("should throw error when useResponseData is used outside provider", () => {
      expect(() => {
        renderHook(() => useResponseData());
      }).toThrow("useResponseData must be used within ManualTestingProvider");
    });
  });
});
