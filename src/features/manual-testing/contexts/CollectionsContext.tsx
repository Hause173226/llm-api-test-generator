import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Collection, SavedRequest, RequestConfig } from "../types";

interface CollectionsState {
  collections: Collection[];
  isLoading: boolean;
  error: Error | null;
}

interface CollectionsContextValue extends CollectionsState {
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addRequest: (collectionId: string, request: SavedRequest) => void;
  updateRequest: (requestId: string, updates: Partial<SavedRequest>) => void;
  deleteRequest: (requestId: string) => void;
  moveRequest: (requestId: string, targetCollectionId: string) => void;
  duplicateRequest: (requestId: string) => void;
  getRequestById: (requestId: string) => SavedRequest | undefined;
  getCollectionById: (collectionId: string) => Collection | undefined;
  getAllRequests: () => SavedRequest[];
}

const CollectionsContext = createContext<CollectionsContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "manual-testing-collections";

interface CollectionsProviderProps {
  children: ReactNode;
}

export const CollectionsProvider: React.FC<CollectionsProviderProps> = ({
  children,
}) => {
  const [collections, setCollectionsState] = useState<Collection[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((col: Collection) => ({
          ...col,
          createdAt: new Date(col.createdAt),
          updatedAt: new Date(col.updatedAt),
          requests: col.requests.map((req: SavedRequest) => ({
            ...req,
            createdAt: new Date(req.createdAt),
            updatedAt: new Date(req.updatedAt),
          })),
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to load collections from localStorage:", error);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Persist collections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    } catch (error) {
      console.error("Failed to save collections to localStorage:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to save collections"),
      );
    }
  }, [collections]);

  const setCollections = useCallback((cols: Collection[]) => {
    setCollectionsState(cols);
  }, []);

  const addCollection = useCallback((collection: Collection) => {
    setCollectionsState((prev) => [...prev, collection]);
  }, []);

  const updateCollection = useCallback(
    (id: string, updates: Partial<Collection>) => {
      setCollectionsState((prev) =>
        prev.map((col) =>
          col.id === id ? { ...col, ...updates, updatedAt: new Date() } : col,
        ),
      );
    },
    [],
  );

  const deleteCollection = useCallback((id: string) => {
    setCollectionsState((prev) => prev.filter((col) => col.id !== id));
  }, []);

  const addRequest = useCallback(
    (collectionId: string, request: SavedRequest) => {
      setCollectionsState((prev) =>
        prev.map((col) => {
          if (col.id === collectionId) {
            return {
              ...col,
              requests: [...col.requests, request],
              updatedAt: new Date(),
            };
          }
          return col;
        }),
      );
    },
    [],
  );

  const updateRequest = useCallback(
    (requestId: string, updates: Partial<SavedRequest>) => {
      setCollectionsState((prev) =>
        prev.map((col) => ({
          ...col,
          requests: col.requests.map((req) =>
            req.id === requestId
              ? { ...req, ...updates, updatedAt: new Date() }
              : req,
          ),
          updatedAt: col.requests.some((req) => req.id === requestId)
            ? new Date()
            : col.updatedAt,
        })),
      );
    },
    [],
  );

  const deleteRequest = useCallback((requestId: string) => {
    setCollectionsState((prev) =>
      prev.map((col) => {
        const hasRequest = col.requests.some((req) => req.id === requestId);
        if (hasRequest) {
          return {
            ...col,
            requests: col.requests.filter((req) => req.id !== requestId),
            updatedAt: new Date(),
          };
        }
        return col;
      }),
    );
  }, []);

  const moveRequest = useCallback(
    (requestId: string, targetCollectionId: string) => {
      setCollectionsState((prev) => {
        // Find the request to move
        let requestToMove: SavedRequest | undefined;
        let sourceCollectionId: string | undefined;

        for (const col of prev) {
          const found = col.requests.find((req) => req.id === requestId);
          if (found) {
            requestToMove = found;
            sourceCollectionId = col.id;
            break;
          }
        }

        if (!requestToMove || !sourceCollectionId) {
          return prev;
        }

        // Remove from source and add to target
        return prev.map((col) => {
          if (col.id === sourceCollectionId) {
            return {
              ...col,
              requests: col.requests.filter((req) => req.id !== requestId),
              updatedAt: new Date(),
            };
          }
          if (col.id === targetCollectionId) {
            return {
              ...col,
              requests: [
                ...col.requests,
                { ...requestToMove, collectionId: targetCollectionId },
              ],
              updatedAt: new Date(),
            };
          }
          return col;
        });
      });
    },
    [],
  );

  const duplicateRequest = useCallback((requestId: string) => {
    setCollectionsState((prev) => {
      // Find the request to duplicate
      let requestToDuplicate: SavedRequest | undefined;
      let collectionId: string | undefined;

      for (const col of prev) {
        const found = col.requests.find((req) => req.id === requestId);
        if (found) {
          requestToDuplicate = found;
          collectionId = col.id;
          break;
        }
      }

      if (!requestToDuplicate || !collectionId) {
        return prev;
      }

      // Create a duplicate with a new ID and updated name
      const duplicate: SavedRequest = {
        ...requestToDuplicate,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${requestToDuplicate.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add duplicate to the same collection
      return prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            requests: [...col.requests, duplicate],
            updatedAt: new Date(),
          };
        }
        return col;
      });
    });
  }, []);

  const getRequestById = useCallback(
    (requestId: string): SavedRequest | undefined => {
      for (const col of collections) {
        const found = col.requests.find((req) => req.id === requestId);
        if (found) {
          return found;
        }
      }
      return undefined;
    },
    [collections],
  );

  const getCollectionById = useCallback(
    (collectionId: string): Collection | undefined => {
      return collections.find((col) => col.id === collectionId);
    },
    [collections],
  );

  const getAllRequests = useCallback((): SavedRequest[] => {
    return collections.flatMap((col) => col.requests);
  }, [collections]);

  const value: CollectionsContextValue = {
    collections,
    isLoading,
    error,
    setCollections,
    addCollection,
    updateCollection,
    deleteCollection,
    addRequest,
    updateRequest,
    deleteRequest,
    moveRequest,
    duplicateRequest,
    getRequestById,
    getCollectionById,
    getAllRequests,
  };

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
};

/**
 * Main hook - provides full collections context
 */
export const useCollections = (): CollectionsContextValue => {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within CollectionsProvider");
  }
  return context;
};

/**
 * Specialized hook for working with saved requests
 */
export const useSavedRequests = () => {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useSavedRequests must be used within CollectionsProvider");
  }
  return {
    getAllRequests: context.getAllRequests,
    getRequestById: context.getRequestById,
    addRequest: context.addRequest,
    updateRequest: context.updateRequest,
    deleteRequest: context.deleteRequest,
    moveRequest: context.moveRequest,
    duplicateRequest: context.duplicateRequest,
  };
};
