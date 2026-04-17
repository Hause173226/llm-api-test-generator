import type { Collection, SavedRequest, RequestConfig } from "../types";

/**
 * CollectionsService - Manages collections via backend API with LocalStorage fallback
 *
 * Features:
 * - Backend API integration for collections (with LocalStorage fallback)
 * - CRUD operations for collections and requests
 * - Request organization and management
 * - moveRequest and duplicateRequest methods
 *
 * Requirements: 17.5, 18.2, 18.5, 18.6
 */
class CollectionsService {
  private readonly STORAGE_KEY = "manual-testing-collections";
  private readonly USE_BACKEND = false; // TODO: Enable when backend API is available

  /**
   * Get all collections
   * Requirement 18.2: Support creating, renaming, and deleting collections
   *
   * @returns Promise resolving to array of collections
   */
  async getCollections(): Promise<Collection[]> {
    if (this.USE_BACKEND) {
      return this.getCollectionsFromBackend();
    }
    return this.getCollectionsFromLocalStorage();
  }

  /**
   * Get a specific collection by ID
   *
   * @param id - Collection ID
   * @returns Promise resolving to collection or null if not found
   */
  async getCollection(id: string): Promise<Collection | null> {
    const collections = await this.getCollections();
    return collections.find((c) => c.id === id) || null;
  }

  /**
   * Create a new collection
   * Requirement 17.3: Allow creating new collections
   * Requirement 18.2: Support creating collections
   *
   * @param name - Collection name
   * @param description - Optional collection description
   * @returns Promise resolving to created collection
   */
  async createCollection(
    name: string,
    description?: string,
  ): Promise<Collection> {
    const newCollection: Collection = {
      id: this.generateId(),
      name,
      description,
      requests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.USE_BACKEND) {
      return this.createCollectionInBackend(newCollection);
    }

    const collections = await this.getCollections();
    collections.push(newCollection);
    this.saveCollectionsToLocalStorage(collections);

    return newCollection;
  }

  /**
   * Update a collection
   * Requirement 18.2: Support renaming collections
   *
   * @param id - Collection ID
   * @param updates - Partial collection updates
   * @returns Promise resolving to updated collection or null if not found
   */
  async updateCollection(
    id: string,
    updates: Partial<Omit<Collection, "id" | "createdAt">>,
  ): Promise<Collection | null> {
    const collections = await this.getCollections();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) {
      return null;
    }

    const updatedCollection: Collection = {
      ...collections[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    collections[index] = updatedCollection;

    if (this.USE_BACKEND) {
      return this.updateCollectionInBackend(updatedCollection);
    }

    this.saveCollectionsToLocalStorage(collections);
    return updatedCollection;
  }

  /**
   * Delete a collection
   * Requirement 18.2: Support deleting collections
   *
   * @param id - Collection ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteCollection(id: string): Promise<boolean> {
    const collections = await this.getCollections();
    const filtered = collections.filter((c) => c.id !== id);

    if (filtered.length === collections.length) {
      return false; // Collection not found
    }

    if (this.USE_BACKEND) {
      return this.deleteCollectionInBackend(id);
    }

    this.saveCollectionsToLocalStorage(filtered);
    return true;
  }

  /**
   * Save a request to a collection
   * Requirement 17.1: Provide "Save" button to save current request
   * Requirement 17.4: Store complete request configuration
   *
   * @param collectionId - Collection ID to save request to
   * @param request - Saved request to add
   * @returns Promise resolving to saved request
   */
  async saveRequest(
    collectionId: string,
    request: Omit<SavedRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedRequest | null> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      return null;
    }

    const newRequest: SavedRequest = {
      ...request,
      id: this.generateId(),
      collectionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    collection.requests.push(newRequest);
    collection.updatedAt = new Date();

    if (this.USE_BACKEND) {
      await this.updateCollectionInBackend(collection);
    } else {
      this.saveCollectionsToLocalStorage(collections);
    }

    return newRequest;
  }

  /**
   * Update a saved request
   * Requirement 18.2: Support editing saved requests
   *
   * @param requestId - Request ID to update
   * @param updates - Partial request updates
   * @returns Promise resolving to updated request or null if not found
   */
  async updateRequest(
    requestId: string,
    updates: Partial<Omit<SavedRequest, "id" | "collectionId" | "createdAt">>,
  ): Promise<SavedRequest | null> {
    const collections = await this.getCollections();

    for (const collection of collections) {
      const requestIndex = collection.requests.findIndex(
        (r) => r.id === requestId,
      );

      if (requestIndex !== -1) {
        const updatedRequest: SavedRequest = {
          ...collection.requests[requestIndex],
          ...updates,
          updatedAt: new Date(),
        };

        collection.requests[requestIndex] = updatedRequest;
        collection.updatedAt = new Date();

        if (this.USE_BACKEND) {
          await this.updateCollectionInBackend(collection);
        } else {
          this.saveCollectionsToLocalStorage(collections);
        }

        return updatedRequest;
      }
    }

    return null;
  }

  /**
   * Delete a saved request
   * Requirement 18.2: Support deleting saved requests
   *
   * @param requestId - Request ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteRequest(requestId: string): Promise<boolean> {
    const collections = await this.getCollections();

    for (const collection of collections) {
      const initialLength = collection.requests.length;
      collection.requests = collection.requests.filter((r) => r.id !== requestId);

      if (collection.requests.length < initialLength) {
        collection.updatedAt = new Date();

        if (this.USE_BACKEND) {
          await this.updateCollectionInBackend(collection);
        } else {
          this.saveCollectionsToLocalStorage(collections);
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Move a request to a different collection
   * Requirement 18.5: Support moving requests between collections
   *
   * @param requestId - Request ID to move
   * @param targetCollectionId - Target collection ID
   * @returns Promise resolving to true if moved, false if request or collection not found
   */
  async moveRequest(
    requestId: string,
    targetCollectionId: string,
  ): Promise<boolean> {
    const collections = await this.getCollections();

    // Find source collection and request
    let sourceCollection: Collection | null = null;
    let requestToMove: SavedRequest | null = null;

    for (const collection of collections) {
      const request = collection.requests.find((r) => r.id === requestId);
      if (request) {
        sourceCollection = collection;
        requestToMove = request;
        break;
      }
    }

    if (!sourceCollection || !requestToMove) {
      return false; // Request not found
    }

    // Find target collection
    const targetCollection = collections.find((c) => c.id === targetCollectionId);
    if (!targetCollection) {
      return false; // Target collection not found
    }

    // Don't move if already in target collection
    if (sourceCollection.id === targetCollectionId) {
      return true;
    }

    // Remove from source collection
    sourceCollection.requests = sourceCollection.requests.filter(
      (r) => r.id !== requestId,
    );
    sourceCollection.updatedAt = new Date();

    // Add to target collection
    const movedRequest: SavedRequest = {
      ...requestToMove,
      collectionId: targetCollectionId,
      updatedAt: new Date(),
    };
    targetCollection.requests.push(movedRequest);
    targetCollection.updatedAt = new Date();

    if (this.USE_BACKEND) {
      await this.updateCollectionInBackend(sourceCollection);
      await this.updateCollectionInBackend(targetCollection);
    } else {
      this.saveCollectionsToLocalStorage(collections);
    }

    return true;
  }

  /**
   * Duplicate a saved request
   * Requirement 18.6: Support duplicating saved requests
   *
   * @param requestId - Request ID to duplicate
   * @param newName - Optional name for the duplicated request
   * @returns Promise resolving to duplicated request or null if original not found
   */
  async duplicateRequest(
    requestId: string,
    newName?: string,
  ): Promise<SavedRequest | null> {
    const collections = await this.getCollections();

    for (const collection of collections) {
      const originalRequest = collection.requests.find((r) => r.id === requestId);

      if (originalRequest) {
        const duplicatedRequest: SavedRequest = {
          ...originalRequest,
          id: this.generateId(),
          name: newName || `${originalRequest.name} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        collection.requests.push(duplicatedRequest);
        collection.updatedAt = new Date();

        if (this.USE_BACKEND) {
          await this.updateCollectionInBackend(collection);
        } else {
          this.saveCollectionsToLocalStorage(collections);
        }

        return duplicatedRequest;
      }
    }

    return null;
  }

  /**
   * Get all requests from a specific collection
   *
   * @param collectionId - Collection ID
   * @returns Promise resolving to array of requests
   */
  async getRequestsByCollection(collectionId: string): Promise<SavedRequest[]> {
    const collection = await this.getCollection(collectionId);
    return collection?.requests || [];
  }

  /**
   * Get a specific request by ID
   *
   * @param requestId - Request ID
   * @returns Promise resolving to request or null if not found
   */
  async getRequest(requestId: string): Promise<SavedRequest | null> {
    const collections = await this.getCollections();

    for (const collection of collections) {
      const request = collection.requests.find((r) => r.id === requestId);
      if (request) {
        return request;
      }
    }

    return null;
  }

  // ===== LocalStorage Implementation =====

  /**
   * Get collections from LocalStorage
   * @returns Array of collections
   */
  private getCollectionsFromLocalStorage(): Collection[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      // Convert date strings back to Date objects
      return parsed.map((collection: any) => ({
        ...collection,
        createdAt: new Date(collection.createdAt),
        updatedAt: new Date(collection.updatedAt),
        requests: collection.requests.map((request: any) => ({
          ...request,
          createdAt: new Date(request.createdAt),
          updatedAt: new Date(request.updatedAt),
        })),
      }));
    } catch (error) {
      console.error("Failed to load collections from LocalStorage:", error);
      return [];
    }
  }

  /**
   * Save collections to LocalStorage
   * @param collections - Array of collections to save
   */
  private saveCollectionsToLocalStorage(collections: Collection[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(collections));
    } catch (error) {
      console.error("Failed to save collections to LocalStorage:", error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.error("LocalStorage quota exceeded. Unable to save collections.");
      }
    }
  }

  // ===== Backend API Implementation (Placeholder) =====

  /**
   * Get collections from backend API
   * TODO: Implement when backend API is available
   */
  private async getCollectionsFromBackend(): Promise<Collection[]> {
    try {
      const response = await fetch("/api/collections");
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch collections from backend:", error);
      // Fallback to LocalStorage
      return this.getCollectionsFromLocalStorage();
    }
  }

  /**
   * Create collection in backend API
   * TODO: Implement when backend API is available
   */
  private async createCollectionInBackend(
    collection: Collection,
  ): Promise<Collection> {
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collection),
      });
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to create collection in backend:", error);
      // Fallback to LocalStorage
      const collections = this.getCollectionsFromLocalStorage();
      collections.push(collection);
      this.saveCollectionsToLocalStorage(collections);
      return collection;
    }
  }

  /**
   * Update collection in backend API
   * TODO: Implement when backend API is available
   */
  private async updateCollectionInBackend(
    collection: Collection,
  ): Promise<Collection> {
    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collection),
      });
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to update collection in backend:", error);
      // Fallback to LocalStorage
      const collections = this.getCollectionsFromLocalStorage();
      const index = collections.findIndex((c) => c.id === collection.id);
      if (index !== -1) {
        collections[index] = collection;
        this.saveCollectionsToLocalStorage(collections);
      }
      return collection;
    }
  }

  /**
   * Delete collection in backend API
   * TODO: Implement when backend API is available
   */
  private async deleteCollectionInBackend(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
      return true;
    } catch (error) {
      console.error("Failed to delete collection in backend:", error);
      // Fallback to LocalStorage
      const collections = this.getCollectionsFromLocalStorage();
      const filtered = collections.filter((c) => c.id !== id);
      this.saveCollectionsToLocalStorage(filtered);
      return true;
    }
  }

  // ===== Utility Methods =====

  /**
   * Generate a unique ID
   * @returns Unique ID string
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const collectionsService = new CollectionsService();
export default collectionsService;
