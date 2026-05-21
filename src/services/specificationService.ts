import apiService from "./apiService";
import { ManualSpecificationRequest } from "../types/manualSpec";

export interface Specification {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: "openapi" | "postman" | "graphql";
  sourceType?: "openapi" | "postman" | "graphql" | string;
  content: string;
  version?: string;
  parseStatus: "Pending" | "Success" | "Failed";
  parsedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdDateTime?: string;
  updatedDateTime?: string;
  isActive?: boolean;
  // FE-18: soft-delete support
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface SpecificationUploadRequest {
  projectId: string;
  name: string;
  description?: string;
  type: string;
  file: File;
}

const SPECIFICATION_CACHE_TTL_MS = 30000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type SpecificationCacheKey = {
  projectId: string;
  includeDeleted: boolean;
};

const specificationCache = new Map<string, CacheEntry<Specification[]>>();
const pendingSpecificationRequests = new Map<
  string,
  Promise<Specification[]>
>();
let specificationCacheRevision = 0;

const buildSpecificationCacheKey = (
  projectId: string,
  includeDeleted: boolean,
) =>
  JSON.stringify({
    projectId,
    includeDeleted,
  } satisfies SpecificationCacheKey);

const parseSpecificationCacheKey = (
  key: string,
): SpecificationCacheKey | null => {
  try {
    return JSON.parse(key) as SpecificationCacheKey;
  } catch {
    return null;
  }
};

const invalidateSpecificationCache = (projectId?: string) => {
  specificationCacheRevision += 1;

  for (const key of specificationCache.keys()) {
    const parsed = parseSpecificationCacheKey(key);
    if (!parsed || !projectId || parsed.projectId === projectId) {
      specificationCache.delete(key);
    }
  }

  for (const key of pendingSpecificationRequests.keys()) {
    const parsed = parseSpecificationCacheKey(key);
    if (!parsed || !projectId || parsed.projectId === projectId) {
      pendingSpecificationRequests.delete(key);
    }
  }
};

const specificationService = {
  // Get all specifications for a project
  // FE-18: pass includeDeleted=true to see soft-deleted specs (trash view)
  getSpecifications: async (
    projectId: string,
    includeDeleted: boolean = false,
  ): Promise<Specification[]> => {
    const params: Record<string, any> = {};
    if (includeDeleted) params.includeDeleted = true;

    const cacheKey = buildSpecificationCacheKey(projectId, includeDeleted);
    const now = Date.now();
    const cached = specificationCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const pending = pendingSpecificationRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const revisionAtStart = specificationCacheRevision;
    const requestPromise = (async () => {
      const response = await apiService.get<Specification[]>(
        `/projects/${projectId}/specifications`,
        { params },
      );
      const result = Array.isArray(response) ? response : [];

      if (revisionAtStart === specificationCacheRevision) {
        specificationCache.set(cacheKey, {
          expiresAt: Date.now() + SPECIFICATION_CACHE_TTL_MS,
          value: result,
        });
      }

      return result;
    })();

    pendingSpecificationRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (pendingSpecificationRequests.get(cacheKey) === requestPromise) {
        pendingSpecificationRequests.delete(cacheKey);
      }
    }
  },

  // Get specification by ID
  getSpecificationById: async (
    projectId: string,
    specId: string,
  ): Promise<Specification> => {
    return await apiService.get<Specification>(
      `/projects/${projectId}/specifications/${specId}`,
    );
  },

  // Upload new specification
  uploadSpecification: async (
    data: SpecificationUploadRequest,
  ): Promise<Specification> => {
    const formData = new FormData();
    formData.append("Name", data.name);
    formData.append("File", data.file);

    // Map type to SourceType enum (0=OpenAPI, 1=Postman, 2=GraphQL)
    let sourceType = 0; // Default OpenAPI
    if (data.type.toLowerCase().includes("postman")) {
      sourceType = 1;
    } else if (data.type.toLowerCase().includes("graphql")) {
      sourceType = 2;
    }
    formData.append("SourceType", sourceType.toString());

    // Optional fields
    formData.append("Version", "1.0.0"); // Default version
    formData.append("AutoActivate", "true"); // Auto activate after upload
    formData.append("UploadMethod", "0"); // StorageGatewayContract = 0

    const uploaded = await apiService.uploadFile<Specification>(
      `/projects/${data.projectId}/specifications/upload`,
      formData,
    );
    invalidateSpecificationCache(data.projectId);
    return uploaded;
  },

  // Update specification
  updateSpecification: async (
    projectId: string,
    specId: string,
    data: { name?: string; description?: string },
  ): Promise<Specification> => {
    const updated = await apiService.put<Specification>(
      `/projects/${projectId}/specifications/${specId}`,
      data,
    );
    invalidateSpecificationCache(projectId);
    return updated;
  },

  // Delete specification
  deleteSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/specifications/${specId}`);
    invalidateSpecificationCache(projectId);
  },

  // Create manual specification
  createManualSpecification: async (
    projectId: string,
    data: ManualSpecificationRequest,
  ): Promise<any> => {
    const created = await apiService.post(
      `/projects/${projectId}/specifications/manual`,
      data,
    );
    invalidateSpecificationCache(projectId);
    return created;
  },

  // Get available upload methods
  getUploadMethods: async (projectId: string): Promise<any[]> => {
    return await apiService.get<any[]>(
      `/projects/${projectId}/specifications/upload-methods`,
    );
  },

  // Import from cURL command
  importCurl: async (projectId: string, data: { curlCommand: string; name?: string }): Promise<any> => {
    const imported = await apiService.post(
      `/projects/${projectId}/specifications/curl-import`,
      data,
    );
    invalidateSpecificationCache(projectId);
    return imported;
  },

  // Activate a specification
  activateSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<Specification> => {
    const activated = await apiService.put<Specification>(
      `/projects/${projectId}/specifications/${specId}/activate`,
    );
    invalidateSpecificationCache(projectId);
    return activated;
  },

  // Deactivate a specification
  deactivateSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<Specification> => {
    const deactivated = await apiService.put<Specification>(
      `/projects/${projectId}/specifications/${specId}/deactivate`,
    );
    invalidateSpecificationCache(projectId);
    return deactivated;
  },

  // FE-18: Restore a soft-deleted specification
  restoreSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<void> => {
    await apiService.post(
      `/projects/${projectId}/specifications/${specId}/restore`,
    );
    invalidateSpecificationCache(projectId);
  },

  invalidateCache: invalidateSpecificationCache,
};

export default specificationService;
