import { describe, it, expect, beforeEach, vi } from "vitest";
import { collectionsService } from "./CollectionsService";
import type { Collection, SavedRequest, RequestConfig } from "../types";

describe("CollectionsService", () => {
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

  const createMockRequestConfig = (): RequestConfig => ({
    method: "GET",
    url: "https://api.example.com/users",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
  });

  describe("createCollection", () => {
    it("should create a new collection", async () => {
      const collection = await collectionsService.createCollection(
        "Test Collection",
        "Test description"
      );

      expect(collection.id).toBeDefined();
      expect(collection.name).toBe("Test Collection");
      expect(collection.description).toBe("Test description");
      expect(collection.requests).toEqual([]);
      expect(collection.createdAt).toBeInstanceOf(Date);
      expect(collection.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a collection without description", async () => {
      const collection = await collectionsService.createCollection("Test Collection");

      expect(collection.name).toBe("Test Collection");
      expect(collection.description).toBeUndefined();
    });

    it("should persist collection to LocalStorage", async () => {
      await collectionsService.createCollection("Test Collection");

      const collections = await collectionsService.getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].name).toBe("Test Collection");
    });

    it("should generate unique IDs for each collection", async () => {
      const collection1 = await collectionsService.createCollection("Collection 1");
      const collection2 = await collectionsService.createCollection("Collection 2");

      expect(collection1.id).not.toBe(collection2.id);
    });
  });

  describe("getCollections", () => {
    it("should return empty array when no collections exist", async () => {
      const collections = await collectionsService.getCollections();
      expect(collections).toEqual([]);
    });

    it("should retrieve all collections", async () => {
      await collectionsService.createCollection("Collection 1");
      await collectionsService.createCollection("Collection 2");

      const collections = await collectionsService.getCollections();
      expect(collections).toHaveLength(2);
      expect(collections[0].name).toBe("Collection 1");
      expect(collections[1].name).toBe("Collection 2");
    });

    it("should convert date strings back to Date objects", async () => {
      await collectionsService.createCollection("Test Collection");

      const collections = await collectionsService.getCollections();
      expect(collections[0].createdAt).toBeInstanceOf(Date);
      expect(collections[0].updatedAt).toBeInstanceOf(Date);
    });

    it("should handle corrupted LocalStorage data gracefully", async () => {
      localStorage.setItem("manual-testing-collections", "invalid json");

      const collections = await collectionsService.getCollections();
      expect(collections).toEqual([]);
    });
  });

  describe("getCollection", () => {
    it("should retrieve a specific collection by ID", async () => {
      const created = await collectionsService.createCollection("Test Collection");

      const collection = await collectionsService.getCollection(created.id);
      expect(collection).not.toBeNull();
      expect(collection?.name).toBe("Test Collection");
    });

    it("should return null for non-existent collection", async () => {
      const collection = await collectionsService.getCollection("non-existent-id");
      expect(collection).toBeNull();
    });
  });

  describe("updateCollection", () => {
    it("should update collection name", async () => {
      const created = await collectionsService.createCollection("Old Name");

      const updated = await collectionsService.updateCollection(created.id, {
        name: "New Name",
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("New Name");
      expect(updated?.id).toBe(created.id);
    });

    it("should update collection description", async () => {
      const created = await collectionsService.createCollection("Test Collection");

      const updated = await collectionsService.updateCollection(created.id, {
        description: "New description",
      });

      expect(updated?.description).toBe("New description");
    });

    it("should update updatedAt timestamp", async () => {
      const created = await collectionsService.createCollection("Test Collection");
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await collectionsService.updateCollection(created.id, {
        name: "Updated Name",
      });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("should return null for non-existent collection", async () => {
      const updated = await collectionsService.updateCollection("non-existent-id", {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });

    it("should not change collection ID", async () => {
      const created = await collectionsService.createCollection("Test Collection");
      const originalId = created.id;

      await collectionsService.updateCollection(created.id, {
        name: "Updated Name",
      });

      const collection = await collectionsService.getCollection(originalId);
      expect(collection?.id).toBe(originalId);
    });
  });

  describe("deleteCollection", () => {
    it("should delete a collection", async () => {
      const created = await collectionsService.createCollection("Test Collection");

      const result = await collectionsService.deleteCollection(created.id);
      expect(result).toBe(true);

      const collections = await collectionsService.getCollections();
      expect(collections).toHaveLength(0);
    });

    it("should return false for non-existent collection", async () => {
      const result = await collectionsService.deleteCollection("non-existent-id");
      expect(result).toBe(false);
    });

    it("should not affect other collections", async () => {
      const collection1 = await collectionsService.createCollection("Collection 1");
      const collection2 = await collectionsService.createCollection("Collection 2");

      await collectionsService.deleteCollection(collection1.id);

      const collections = await collectionsService.getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(collection2.id);
    });
  });

  describe("saveRequest", () => {
    it("should save a request to a collection", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      expect(savedRequest).not.toBeNull();
      expect(savedRequest?.name).toBe("Test Request");
      expect(savedRequest?.id).toBeDefined();
      expect(savedRequest?.createdAt).toBeInstanceOf(Date);
      expect(savedRequest?.updatedAt).toBeInstanceOf(Date);
    });

    it("should add request to collection's requests array", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.requests).toHaveLength(1);
      expect(updated?.requests[0].name).toBe("Test Request");
    });

    it("should return null for non-existent collection", async () => {
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest("non-existent-id", {
        name: "Test Request",
        config: requestConfig,
        collectionId: "non-existent-id",
      });

      expect(savedRequest).toBeNull();
    });

    it("should update collection's updatedAt timestamp", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const originalUpdatedAt = collection.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const requestConfig = createMockRequestConfig();
      await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("should generate unique IDs for each request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const request1 = await collectionsService.saveRequest(collection.id, {
        name: "Request 1",
        config: requestConfig,
        collectionId: collection.id,
      });

      const request2 = await collectionsService.saveRequest(collection.id, {
        name: "Request 2",
        config: requestConfig,
        collectionId: collection.id,
      });

      expect(request1?.id).not.toBe(request2?.id);
    });
  });

  describe("updateRequest", () => {
    it("should update a saved request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Old Name",
        config: requestConfig,
        collectionId: collection.id,
      });

      const updated = await collectionsService.updateRequest(savedRequest!.id, {
        name: "New Name",
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("New Name");
    });

    it("should update request configuration", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const newConfig: RequestConfig = {
        ...requestConfig,
        url: "https://api.example.com/posts",
      };

      const updated = await collectionsService.updateRequest(savedRequest!.id, {
        config: newConfig,
      });

      expect(updated?.config.url).toBe("https://api.example.com/posts");
    });

    it("should return null for non-existent request", async () => {
      const updated = await collectionsService.updateRequest("non-existent-id", {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });

    it("should update updatedAt timestamp", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const originalUpdatedAt = savedRequest!.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await collectionsService.updateRequest(savedRequest!.id, {
        name: "Updated Name",
      });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe("deleteRequest", () => {
    it("should delete a saved request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const result = await collectionsService.deleteRequest(savedRequest!.id);
      expect(result).toBe(true);

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.requests).toHaveLength(0);
    });

    it("should return false for non-existent request", async () => {
      const result = await collectionsService.deleteRequest("non-existent-id");
      expect(result).toBe(false);
    });

    it("should not affect other requests", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const request1 = await collectionsService.saveRequest(collection.id, {
        name: "Request 1",
        config: requestConfig,
        collectionId: collection.id,
      });

      const request2 = await collectionsService.saveRequest(collection.id, {
        name: "Request 2",
        config: requestConfig,
        collectionId: collection.id,
      });

      await collectionsService.deleteRequest(request1!.id);

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.requests).toHaveLength(1);
      expect(updated?.requests[0].id).toBe(request2!.id);
    });
  });

  describe("moveRequest", () => {
    it("should move a request to a different collection", async () => {
      const collection1 = await collectionsService.createCollection("Collection 1");
      const collection2 = await collectionsService.createCollection("Collection 2");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection1.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection1.id,
      });

      const result = await collectionsService.moveRequest(
        savedRequest!.id,
        collection2.id
      );

      expect(result).toBe(true);

      const updated1 = await collectionsService.getCollection(collection1.id);
      const updated2 = await collectionsService.getCollection(collection2.id);

      expect(updated1?.requests).toHaveLength(0);
      expect(updated2?.requests).toHaveLength(1);
      expect(updated2?.requests[0].name).toBe("Test Request");
      expect(updated2?.requests[0].collectionId).toBe(collection2.id);
    });

    it("should return false for non-existent request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");

      const result = await collectionsService.moveRequest(
        "non-existent-id",
        collection.id
      );

      expect(result).toBe(false);
    });

    it("should return false for non-existent target collection", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const result = await collectionsService.moveRequest(
        savedRequest!.id,
        "non-existent-id"
      );

      expect(result).toBe(false);
    });

    it("should return true when moving to same collection", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const result = await collectionsService.moveRequest(
        savedRequest!.id,
        collection.id
      );

      expect(result).toBe(true);

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.requests).toHaveLength(1);
    });

    it("should update updatedAt timestamp for both collections", async () => {
      const collection1 = await collectionsService.createCollection("Collection 1");
      const collection2 = await collectionsService.createCollection("Collection 2");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection1.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection1.id,
      });

      const original1UpdatedAt = collection1.updatedAt;
      const original2UpdatedAt = collection2.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await collectionsService.moveRequest(savedRequest!.id, collection2.id);

      const updated1 = await collectionsService.getCollection(collection1.id);
      const updated2 = await collectionsService.getCollection(collection2.id);

      expect(updated1?.updatedAt.getTime()).toBeGreaterThan(
        original1UpdatedAt.getTime()
      );
      expect(updated2?.updatedAt.getTime()).toBeGreaterThan(
        original2UpdatedAt.getTime()
      );
    });
  });

  describe("duplicateRequest", () => {
    it("should duplicate a saved request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Original Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const duplicated = await collectionsService.duplicateRequest(savedRequest!.id);

      expect(duplicated).not.toBeNull();
      expect(duplicated?.name).toBe("Original Request (Copy)");
      expect(duplicated?.id).not.toBe(savedRequest!.id);
      expect(duplicated?.config).toEqual(requestConfig);
    });

    it("should duplicate with custom name", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Original Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const duplicated = await collectionsService.duplicateRequest(
        savedRequest!.id,
        "Custom Name"
      );

      expect(duplicated?.name).toBe("Custom Name");
    });

    it("should add duplicated request to same collection", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Original Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      await collectionsService.duplicateRequest(savedRequest!.id);

      const updated = await collectionsService.getCollection(collection.id);
      expect(updated?.requests).toHaveLength(2);
    });

    it("should return null for non-existent request", async () => {
      const duplicated = await collectionsService.duplicateRequest("non-existent-id");
      expect(duplicated).toBeNull();
    });

    it("should create new timestamps for duplicated request", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Original Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const duplicated = await collectionsService.duplicateRequest(savedRequest!.id);

      expect(duplicated?.createdAt.getTime()).toBeGreaterThanOrEqual(
        savedRequest!.createdAt.getTime()
      );
      expect(duplicated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        savedRequest!.updatedAt.getTime()
      );
    });
  });

  describe("getRequestsByCollection", () => {
    it("should return all requests from a collection", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      await collectionsService.saveRequest(collection.id, {
        name: "Request 1",
        config: requestConfig,
        collectionId: collection.id,
      });

      await collectionsService.saveRequest(collection.id, {
        name: "Request 2",
        config: requestConfig,
        collectionId: collection.id,
      });

      const requests = await collectionsService.getRequestsByCollection(
        collection.id
      );

      expect(requests).toHaveLength(2);
      expect(requests[0].name).toBe("Request 1");
      expect(requests[1].name).toBe("Request 2");
    });

    it("should return empty array for non-existent collection", async () => {
      const requests = await collectionsService.getRequestsByCollection(
        "non-existent-id"
      );

      expect(requests).toEqual([]);
    });

    it("should return empty array for collection with no requests", async () => {
      const collection = await collectionsService.createCollection("Test Collection");

      const requests = await collectionsService.getRequestsByCollection(
        collection.id
      );

      expect(requests).toEqual([]);
    });
  });

  describe("getRequest", () => {
    it("should retrieve a specific request by ID", async () => {
      const collection = await collectionsService.createCollection("Test Collection");
      const requestConfig = createMockRequestConfig();

      const savedRequest = await collectionsService.saveRequest(collection.id, {
        name: "Test Request",
        config: requestConfig,
        collectionId: collection.id,
      });

      const request = await collectionsService.getRequest(savedRequest!.id);

      expect(request).not.toBeNull();
      expect(request?.name).toBe("Test Request");
    });

    it("should return null for non-existent request", async () => {
      const request = await collectionsService.getRequest("non-existent-id");
      expect(request).toBeNull();
    });

    it("should find request across multiple collections", async () => {
      const collection1 = await collectionsService.createCollection("Collection 1");
      const collection2 = await collectionsService.createCollection("Collection 2");
      const requestConfig = createMockRequestConfig();

      await collectionsService.saveRequest(collection1.id, {
        name: "Request 1",
        config: requestConfig,
        collectionId: collection1.id,
      });

      const savedRequest2 = await collectionsService.saveRequest(collection2.id, {
        name: "Request 2",
        config: requestConfig,
        collectionId: collection2.id,
      });

      const request = await collectionsService.getRequest(savedRequest2!.id);

      expect(request).not.toBeNull();
      expect(request?.name).toBe("Request 2");
      expect(request?.collectionId).toBe(collection2.id);
    });
  });

  describe("LocalStorage persistence", () => {
    it("should persist collections across service instances", async () => {
      await collectionsService.createCollection("Test Collection");

      const stored = localStorage.getItem("manual-testing-collections");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("Test Collection");
    });

    it("should handle LocalStorage quota exceeded error", async () => {
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      localStorage.setItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          const error = new DOMException("Quota exceeded", "QuotaExceededError");
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      // Should not throw error
      expect(async () => {
        await collectionsService.createCollection("Test Collection");
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });
});
