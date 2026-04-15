import { describe, it, expect, beforeEach, vi } from "vitest";
import { historyService } from "./HistoryService";
import type { RequestConfig, ResponseData } from "../types";

describe("HistoryService", () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // Reset localStorage before each test
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  const createMockRequest = (): RequestConfig => ({
    method: "GET",
    url: "https://api.example.com/users",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
  });

  const createMockResponse = (): ResponseData => ({
    status: 200,
    statusText: "OK",
    headers: {},
    body: '{"success": true}',
    contentType: "application/json",
    size: 18,
    time: 150,
    cookies: [],
    timestamp: new Date(),
  });

  describe("addToHistory", () => {
    it("should add a request to history", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      const history = historyService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].config.url).toBe("https://api.example.com/users");
      expect(history[0].response.status).toBe(200);
      expect(history[0].response.time).toBe(150);
    });

    it("should add entries in reverse chronological order (newest first)", () => {
      const request1 = { ...createMockRequest(), url: "https://api.example.com/users/1" };
      const request2 = { ...createMockRequest(), url: "https://api.example.com/users/2" };
      const response = createMockResponse();

      historyService.addToHistory(request1, response);
      historyService.addToHistory(request2, response);

      const history = historyService.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].config.url).toBe("https://api.example.com/users/2");
      expect(history[1].config.url).toBe("https://api.example.com/users/1");
    });

    it("should enforce 100-entry limit with FIFO eviction", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        historyService.addToHistory(
          { ...request, url: `https://api.example.com/users/${i}` },
          response
        );
      }

      const history = historyService.getHistory();
      expect(history).toHaveLength(100);
      // Newest entry should be first
      expect(history[0].config.url).toBe("https://api.example.com/users/104");
      // Oldest entry should be at index 99
      expect(history[99].config.url).toBe("https://api.example.com/users/5");
    });

    it("should generate unique IDs for each entry", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);
      historyService.addToHistory(request, response);

      const history = historyService.getHistory();
      expect(history[0].id).not.toBe(history[1].id);
    });

    it("should store timestamp as Date object", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      const history = historyService.getHistory();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe("getHistory", () => {
    it("should return empty array when no history exists", () => {
      const history = historyService.getHistory();
      expect(history).toEqual([]);
    });

    it("should retrieve persisted history from LocalStorage", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      // Simulate page reload by getting history again
      const history = historyService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].config.url).toBe("https://api.example.com/users");
    });

    it("should handle corrupted LocalStorage data gracefully", () => {
      localStorage.setItem("manual_testing_history", "invalid json");

      const history = historyService.getHistory();
      expect(history).toEqual([]);
    });

    it("should convert timestamp strings back to Date objects", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      const history = historyService.getHistory();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe("clearHistory", () => {
    it("should remove all history entries", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);
      historyService.addToHistory(request, response);

      expect(historyService.getHistory()).toHaveLength(2);

      historyService.clearHistory();

      expect(historyService.getHistory()).toHaveLength(0);
    });

    it("should not throw error when clearing empty history", () => {
      expect(() => historyService.clearHistory()).not.toThrow();
    });
  });

  describe("deleteHistoryEntry", () => {
    it("should delete a specific history entry by ID", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);
      historyService.addToHistory(request, response);

      const history = historyService.getHistory();
      const idToDelete = history[0].id;

      historyService.deleteHistoryEntry(idToDelete);

      const updatedHistory = historyService.getHistory();
      expect(updatedHistory).toHaveLength(1);
      expect(updatedHistory.find((e) => e.id === idToDelete)).toBeUndefined();
    });

    it("should not affect other entries when deleting one", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(
        { ...request, url: "https://api.example.com/users/1" },
        response
      );
      historyService.addToHistory(
        { ...request, url: "https://api.example.com/users/2" },
        response
      );
      historyService.addToHistory(
        { ...request, url: "https://api.example.com/users/3" },
        response
      );

      const history = historyService.getHistory();
      const idToDelete = history[1].id; // Delete middle entry

      historyService.deleteHistoryEntry(idToDelete);

      const updatedHistory = historyService.getHistory();
      expect(updatedHistory).toHaveLength(2);
      expect(updatedHistory[0].config.url).toBe("https://api.example.com/users/3");
      expect(updatedHistory[1].config.url).toBe("https://api.example.com/users/1");
    });

    it("should handle deleting non-existent ID gracefully", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      const historyBefore = historyService.getHistory();
      historyService.deleteHistoryEntry("non-existent-id");
      const historyAfter = historyService.getHistory();

      expect(historyAfter).toHaveLength(historyBefore.length);
    });
  });

  describe("LocalStorage persistence", () => {
    it("should persist history across service instances", () => {
      const request = createMockRequest();
      const response = createMockResponse();

      historyService.addToHistory(request, response);

      // Verify data is in localStorage
      const stored = localStorage.getItem("manual_testing_history");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].config.url).toBe("https://api.example.com/users");
    });

    it("should handle LocalStorage quota exceeded error", () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      localStorage.setItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          const error = new DOMException("Quota exceeded", "QuotaExceededError");
          throw error;
        }
        // Allow second call (retry with reduced history) to succeed
        originalSetItem.call(localStorage, key, value);
      });

      const request = createMockRequest();
      const response = createMockResponse();

      // Add many entries to trigger quota error
      for (let i = 0; i < 100; i++) {
        historyService.addToHistory(request, response);
      }

      // Should not throw error
      expect(() => historyService.addToHistory(request, response)).not.toThrow();

      // Restore original setItem
      localStorage.setItem = originalSetItem;
    });
  });
});
