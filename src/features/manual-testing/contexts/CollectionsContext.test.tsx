import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  CollectionsProvider,
  useCollections,
  useSavedRequests,
} from "./CollectionsContext";
import { Collection, SavedRequest, RequestConfig } from "../types";

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

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <CollectionsProvider>{children}</CollectionsProvider>
);

const createMockRequestConfig = (): RequestConfig => ({
  method: "GET",
  url: "https://api.example.com/users",
  params: [],
  headers: [],
  body: {
    type: "none",
    content: "",
  },
  auth: {
    type: "none",
  },
});

describe("CollectionsContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("useCollections", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCollections());
      }).toThrow("useCollections must be used within CollectionsProvider");

      consoleSpy.mockRestore();
    });

    it("should initialize with empty collections", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      expect(result.current.collections).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should add a new collection", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const newCollection: Collection = {
        id: "col-1",
        name: "API Tests",
        description: "Collection of API tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(newCollection);
      });

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0]).toEqual(newCollection);
    });

    it("should update a collection", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const newCollection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(newCollection);
      });

      act(() => {
        result.current.updateCollection("col-1", {
          name: "Updated API Tests",
          description: "Updated description",
        });
      });

      expect(result.current.collections[0].name).toBe("Updated API Tests");
      expect(result.current.collections[0].description).toBe(
        "Updated description",
      );
    });

    it("should delete a collection", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const newCollection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(newCollection);
      });

      act(() => {
        result.current.deleteCollection("col-1");
      });

      expect(result.current.collections).toHaveLength(0);
    });

    it("should persist collections to localStorage", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const newCollection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(newCollection);
      });

      const stored = localStorageMock.getItem("manual-testing-collections");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("col-1");
    });

    it("should get collection by id", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
      });

      const found = result.current.getCollectionById("col-1");
      expect(found).toEqual(collection);
    });

    it("should return undefined for non-existent collection", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const found = result.current.getCollectionById("non-existent");
      expect(found).toBeUndefined();
    });
  });

  describe("Request Management", () => {
    it("should add a request to a collection", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
      });

      act(() => {
        result.current.addRequest("col-1", request);
      });

      expect(result.current.collections[0].requests).toHaveLength(1);
      expect(result.current.collections[0].requests[0]).toEqual(request);
    });

    it("should update a request", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
        result.current.addRequest("col-1", request);
      });

      act(() => {
        result.current.updateRequest("req-1", {
          name: "Get All Users",
          description: "Fetches all users",
        });
      });

      const updatedRequest = result.current.collections[0].requests[0];
      expect(updatedRequest.name).toBe("Get All Users");
      expect(updatedRequest.description).toBe("Fetches all users");
    });

    it("should delete a request", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
        result.current.addRequest("col-1", request);
      });

      act(() => {
        result.current.deleteRequest("req-1");
      });

      expect(result.current.collections[0].requests).toHaveLength(0);
    });

    it("should move request between collections", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection1: Collection = {
        id: "col-1",
        name: "Collection 1",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection2: Collection = {
        id: "col-2",
        name: "Collection 2",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection1);
        result.current.addCollection(collection2);
        result.current.addRequest("col-1", request);
      });

      act(() => {
        result.current.moveRequest("req-1", "col-2");
      });

      expect(result.current.collections[0].requests).toHaveLength(0);
      expect(result.current.collections[1].requests).toHaveLength(1);
      expect(result.current.collections[1].requests[0].collectionId).toBe(
        "col-2",
      );
    });

    it("should duplicate a request", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
        result.current.addRequest("col-1", request);
      });

      act(() => {
        result.current.duplicateRequest("req-1");
      });

      expect(result.current.collections[0].requests).toHaveLength(2);
      expect(result.current.collections[0].requests[1].name).toBe(
        "Get Users (Copy)",
      );
      expect(result.current.collections[0].requests[1].id).not.toBe("req-1");
    });

    it("should get request by id", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection);
        result.current.addRequest("col-1", request);
      });

      const found = result.current.getRequestById("req-1");
      expect(found).toEqual(request);
    });

    it("should return undefined for non-existent request", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const found = result.current.getRequestById("non-existent");
      expect(found).toBeUndefined();
    });

    it("should get all requests across collections", () => {
      const { result } = renderHook(() => useCollections(), { wrapper });

      const collection1: Collection = {
        id: "col-1",
        name: "Collection 1",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection2: Collection = {
        id: "col-2",
        name: "Collection 2",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request1: SavedRequest = {
        id: "req-1",
        name: "Request 1",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request2: SavedRequest = {
        id: "req-2",
        name: "Request 2",
        config: createMockRequestConfig(),
        collectionId: "col-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addCollection(collection1);
        result.current.addCollection(collection2);
        result.current.addRequest("col-1", request1);
        result.current.addRequest("col-2", request2);
      });

      const allRequests = result.current.getAllRequests();
      expect(allRequests).toHaveLength(2);
      expect(allRequests.map((r) => r.id)).toEqual(["req-1", "req-2"]);
    });
  });

  describe("useSavedRequests", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSavedRequests());
      }).toThrow("useSavedRequests must be used within CollectionsProvider");

      consoleSpy.mockRestore();
    });

    it("should provide request-related functions", () => {
      const { result } = renderHook(() => useSavedRequests(), { wrapper });

      expect(typeof result.current.getAllRequests).toBe("function");
      expect(typeof result.current.getRequestById).toBe("function");
      expect(typeof result.current.addRequest).toBe("function");
      expect(typeof result.current.updateRequest).toBe("function");
      expect(typeof result.current.deleteRequest).toBe("function");
      expect(typeof result.current.moveRequest).toBe("function");
      expect(typeof result.current.duplicateRequest).toBe("function");
    });

    it("should work with useSavedRequests hook", () => {
      const { result } = renderHook(
        () => ({
          collections: useCollections(),
          requests: useSavedRequests(),
        }),
        { wrapper },
      );

      const collection: Collection = {
        id: "col-1",
        name: "API Tests",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: SavedRequest = {
        id: "req-1",
        name: "Get Users",
        config: createMockRequestConfig(),
        collectionId: "col-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.collections.addCollection(collection);
        result.current.requests.addRequest("col-1", request);
      });

      const allRequests = result.current.requests.getAllRequests();
      expect(allRequests).toHaveLength(1);
      expect(allRequests[0].id).toBe("req-1");
    });
  });

  describe("LocalStorage Persistence", () => {
    it("should load collections from localStorage on initialization", () => {
      const collection: Collection = {
        id: "col-1",
        name: "Persisted Collection",
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorageMock.setItem(
        "manual-testing-collections",
        JSON.stringify([collection]),
      );

      const { result } = renderHook(() => useCollections(), { wrapper });

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0].name).toBe("Persisted Collection");
    });

    it("should handle localStorage errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      localStorageMock.setItem("manual-testing-collections", "invalid json");

      const { result } = renderHook(() => useCollections(), { wrapper });

      expect(result.current.collections).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
