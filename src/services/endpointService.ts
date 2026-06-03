import apiService from "./apiService";

export interface Endpoint {
  id: string;
  projectId: string;
  apiSpecId?: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  httpMethod?: string; // API contract field name
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: any;
  securityRequirements?: any[];
  raw?: any;
  tags?: string[];
  isDeprecated?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointsResponse {
  items: Endpoint[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

const ENDPOINT_CACHE_TTL_MS = 30000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type EndpointCacheKey = {
  projectId: string;
  specId: string;
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  method: string;
  tag: string;
};

const endpointCache = new Map<string, CacheEntry<EndpointsResponse>>();
const pendingEndpointRequests = new Map<string, Promise<EndpointsResponse>>();
let endpointCacheRevision = 0;

const buildEndpointCacheKey = (
  projectId: string,
  specId: string,
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  method?: string,
  tag?: string,
) =>
  JSON.stringify({
    projectId,
    specId,
    pageNumber,
    pageSize,
    searchTerm,
    method: method || "",
    tag: tag || "",
  } satisfies EndpointCacheKey);

const parseEndpointCacheKey = (key: string): EndpointCacheKey | null => {
  try {
    return JSON.parse(key) as EndpointCacheKey;
  } catch {
    return null;
  }
};

const invalidateEndpointCache = (projectId?: string, specId?: string) => {
  endpointCacheRevision += 1;

  for (const key of endpointCache.keys()) {
    const parsed = parseEndpointCacheKey(key);
    if (!parsed) {
      endpointCache.delete(key);
      continue;
    }

    const matchesProject = !projectId || parsed.projectId === projectId;
    const matchesSpec = !specId || parsed.specId === specId;
    if (matchesProject && matchesSpec) {
      endpointCache.delete(key);
    }
  }

  for (const key of pendingEndpointRequests.keys()) {
    const parsed = parseEndpointCacheKey(key);
    if (!parsed) {
      pendingEndpointRequests.delete(key);
      continue;
    }

    const matchesProject = !projectId || parsed.projectId === projectId;
    const matchesSpec = !specId || parsed.specId === specId;
    if (matchesProject && matchesSpec) {
      pendingEndpointRequests.delete(key);
    }
  }
};

const endpointService = {
  // Get all endpoints for a specification
  getEndpoints: async (
    projectId: string,
    specId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    searchTerm: string = "",
    method?: string,
    tag?: string,
  ): Promise<EndpointsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (searchTerm) params.searchTerm = searchTerm;
    if (method) params.method = method;
    if (tag) params.tag = tag;

    const cacheKey = buildEndpointCacheKey(
      projectId,
      specId,
      pageNumber,
      pageSize,
      searchTerm,
      method,
      tag,
    );
    const now = Date.now();
    const cached = endpointCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const pending = pendingEndpointRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const revisionAtStart = endpointCacheRevision;
    const requestPromise = (async () => {
      // Backend returns array directly, not paginated response
      const rawItems = await apiService.get<any[]>(
        `/projects/${projectId}/specifications/${specId}/endpoints`,
        { params },
      );

      // Map Backend response to Frontend format
      const items: Endpoint[] = Array.isArray(rawItems)
        ? rawItems.map((item: any) => ({
            id: item.id,
            projectId: projectId,
            apiSpecId: specId,
            path: item.path || "",
            method: item.httpMethod || "GET",
            httpMethod: item.httpMethod || "GET",
            operationId: item.operationId || item.OperationId,
            summary: item.summary || item.Summary,
            description: item.description || item.summary || "",
            parameters: item.parameters || item.Parameters || [],
            requestBody: item.requestBody || item.RequestBody,
            responses: item.responses || item.Responses,
            security:
              item.security ||
              item.securityRequirements ||
              item.Security ||
              item.SecurityRequirements,
            securityRequirements:
              item.securityRequirements || item.SecurityRequirements || [],
            tags: item.tags
              ? typeof item.tags === "string"
                ? JSON.parse(item.tags)
                : item.tags
              : [],
            isActive: !item.isDeprecated,
            createdAt: item.createdDateTime || new Date().toISOString(),
            updatedAt: item.updatedDateTime || new Date().toISOString(),
            raw: item,
          }))
        : [];

      // Convert to paginated response format
      const response = {
        items,
        totalCount: items.length,
        pageNumber: 1,
        pageSize: items.length,
        totalPages: 1,
      };

      if (revisionAtStart === endpointCacheRevision) {
        endpointCache.set(cacheKey, {
          expiresAt: Date.now() + ENDPOINT_CACHE_TTL_MS,
          value: response,
        });
      }

      return response;
    })();

    pendingEndpointRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (pendingEndpointRequests.get(cacheKey) === requestPromise) {
        pendingEndpointRequests.delete(cacheKey);
      }
    }
  },

  // Get endpoint by ID
  getEndpointById: async (
    projectId: string,
    specId: string,
    endpointId: string,
  ): Promise<Endpoint> => {
    return await apiService.get<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`,
    );
  },

  // Create endpoint manually
  // FE-03 contract: required fields are httpMethod + path
  createEndpoint: async (
    projectId: string,
    specId: string,
    data: Partial<Endpoint>,
  ): Promise<Endpoint> => {
    const apiPayload = {
      ...data,
      httpMethod: data.method || data.httpMethod,
    };
    // Remove FE-only 'method' key so we don't confuse backend
    delete (apiPayload as any).method;

    const created = await apiService.post<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints`,
      apiPayload,
    );
    invalidateEndpointCache(projectId, specId);
    return created;
  },

  // Update endpoint
  // FE-03 contract: required fields are httpMethod + path
  updateEndpoint: async (
    projectId: string,
    specId: string,
    endpointId: string,
    data: Partial<Endpoint>,
  ): Promise<Endpoint> => {
    const apiPayload = {
      ...data,
      httpMethod: data.method || data.httpMethod,
    };
    delete (apiPayload as any).method;

    const updated = await apiService.put<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`,
      apiPayload,
    );
    invalidateEndpointCache(projectId, specId);
    return updated;
  },

  // Delete endpoint
  deleteEndpoint: async (
    projectId: string,
    specId: string,
    endpointId: string,
  ): Promise<void> => {
    await apiService.delete(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`,
    );
    invalidateEndpointCache(projectId, specId);
  },

  // Get endpoint statistics
  getEndpointStats: async (
    projectId: string,
    specId: string,
    endpointId: string,
  ): Promise<any> => {
    return await apiService.get(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}/stats`,
    );
  },

  // Get all unique tags
  getTags: async (projectId: string, specId: string): Promise<string[]> => {
    return await apiService.get<string[]>(
      `/projects/${projectId}/specifications/${specId}/endpoints/tags`,
    );
  },

  invalidateCache: invalidateEndpointCache,
};

export default endpointService;
