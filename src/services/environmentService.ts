import apiService from './apiService';

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  baseUrl: string;
  variables: Record<string, string>;
  headers?: Record<string, string>;
  isDefault: boolean;
  isActive?: boolean;
  createdDateTime?: string;
  updatedDateTime?: string;
  rowVersion?: string;
}

export interface CreateEnvironmentRequest {
  projectId: string;
  name: string;
  description?: string;
  baseUrl: string;
  variables?: Record<string, string>;
  headers?: Record<string, string>;
  isDefault?: boolean;
}

const environmentService = {
  // Get all environments for a project
  getEnvironments: async (projectId: string): Promise<Environment[]> => {
    const data = await apiService.get<Environment[]>(`/projects/${projectId}/execution-environments`);
    return Array.isArray(data)
      ? data.map((env) => ({
          ...env,
          // Backend does not expose isActive; default to true for UI status badge.
          isActive: env.isActive ?? true,
        }))
      : [];
  },

  // Get environment by ID
  getEnvironmentById: async (projectId: string, environmentId: string): Promise<Environment> => {
    const env = await apiService.get<Environment>(`/projects/${projectId}/execution-environments/${environmentId}`);
    return {
      ...env,
      isActive: env?.isActive ?? true,
    };
  },

  // Create environment
  createEnvironment: async (data: CreateEnvironmentRequest): Promise<Environment> => {
    const payload = {
      name: data.name,
      baseUrl: data.baseUrl,
      variables: data.variables || {},
      headers: data.headers || {},
      isDefault: data.isDefault || false,
    };

    const env = await apiService.post<Environment>(`/projects/${data.projectId}/execution-environments`, payload);
    return {
      ...env,
      isActive: env?.isActive ?? true,
    };
  },

  // Update environment
  updateEnvironment: async (
    projectId: string,
    environmentId: string,
    data: Partial<Environment>
  ): Promise<Environment> => {
    const payload = {
      rowVersion: data.rowVersion,
      name: data.name,
      baseUrl: data.baseUrl,
      variables: data.variables || {},
      headers: data.headers || {},
      isDefault: data.isDefault || false,
    };

    const env = await apiService.put<Environment>(
      `/projects/${projectId}/execution-environments/${environmentId}`,
      payload
    );
    return {
      ...env,
      isActive: env?.isActive ?? true,
    };
  },

  // Delete environment
  deleteEnvironment: async (projectId: string, environmentId: string, rowVersion: string): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/execution-environments/${environmentId}?rowVersion=${encodeURIComponent(rowVersion)}`);
  },

  // Backend has no dedicated set-default/clone/test endpoints.
  // These behaviors are handled at hook/page layer via update/create flows.
};

export default environmentService;
