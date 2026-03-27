import apiService from './apiService';

export interface Endpoint {
  id: string;
  projectId: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  tags?: string[];
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

const endpointService = {
  // Get all endpoints for a specification
  getEndpoints: async (
    projectId: string,
    specId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    searchTerm: string = '',
    method?: string,
    tag?: string
  ): Promise<EndpointsResponse> => {
    const params: any = { pageNumber, pageSize };
    if (searchTerm) params.searchTerm = searchTerm;
    if (method) params.method = method;
    if (tag) params.tag = tag;

    // Backend returns array directly, not paginated response
    const rawItems = await apiService.get<any[]>(
      `/projects/${projectId}/specifications/${specId}/endpoints`,
      { params }
    );
    
    // Map Backend response to Frontend format
    const items: Endpoint[] = Array.isArray(rawItems) ? rawItems.map((item: any) => ({
      id: item.id,
      projectId: projectId,
      path: item.path || '',
      method: item.httpMethod || 'GET',
      description: item.description || item.summary || '',
      parameters: item.parameters || [],
      requestBody: item.requestBody,
      responses: item.responses,
      tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
      isActive: !item.isDeprecated,
      createdAt: item.createdDateTime || new Date().toISOString(),
      updatedAt: item.updatedDateTime || new Date().toISOString(),
    })) : [];
    
    // Convert to paginated response format
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length,
      totalPages: 1,
    };
  },

  // Get endpoint by ID
  getEndpointById: async (projectId: string, specId: string, endpointId: string): Promise<Endpoint> => {
    return await apiService.get<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`
    );
  },

  // Create endpoint manually
  createEndpoint: async (projectId: string, specId: string, data: Partial<Endpoint>): Promise<Endpoint> => {
    return await apiService.post<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints`,
      data
    );
  },

  // Update endpoint
  updateEndpoint: async (
    projectId: string,
    specId: string,
    endpointId: string,
    data: Partial<Endpoint>
  ): Promise<Endpoint> => {
    return await apiService.put<Endpoint>(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`,
      data
    );
  },

  // Delete endpoint
  deleteEndpoint: async (projectId: string, specId: string, endpointId: string): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}`);
  },

  // Get endpoint statistics
  getEndpointStats: async (projectId: string, specId: string, endpointId: string): Promise<any> => {
    return await apiService.get(
      `/projects/${projectId}/specifications/${specId}/endpoints/${endpointId}/stats`
    );
  },

  // Get all unique tags
  getTags: async (projectId: string, specId: string): Promise<string[]> => {
    return await apiService.get<string[]>(
      `/projects/${projectId}/specifications/${specId}/endpoints/tags`
    );
  },
};

export default endpointService;
