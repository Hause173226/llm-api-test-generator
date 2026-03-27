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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
    return await apiService.get<Environment[]>(`/projects/${projectId}/environments`);
  },

  // Get environment by ID
  getEnvironmentById: async (projectId: string, environmentId: string): Promise<Environment> => {
    return await apiService.get<Environment>(`/projects/${projectId}/environments/${environmentId}`);
  },

  // Create environment
  createEnvironment: async (data: CreateEnvironmentRequest): Promise<Environment> => {
    return await apiService.post<Environment>(`/projects/${data.projectId}/environments`, data);
  },

  // Update environment
  updateEnvironment: async (
    projectId: string,
    environmentId: string,
    data: Partial<Environment>
  ): Promise<Environment> => {
    return await apiService.put<Environment>(
      `/projects/${projectId}/environments/${environmentId}`,
      data
    );
  },

  // Delete environment
  deleteEnvironment: async (projectId: string, environmentId: string): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/environments/${environmentId}`);
  },

  // Set default environment
  setDefaultEnvironment: async (projectId: string, environmentId: string): Promise<void> => {
    await apiService.post(`/projects/${projectId}/environments/${environmentId}/set-default`);
  },

  // Clone environment
  cloneEnvironment: async (
    projectId: string,
    environmentId: string,
    newName: string
  ): Promise<Environment> => {
    return await apiService.post<Environment>(
      `/projects/${projectId}/environments/${environmentId}/clone`,
      { name: newName }
    );
  },

  // Test environment connection
  testEnvironment: async (projectId: string, environmentId: string): Promise<any> => {
    return await apiService.post(
      `/projects/${projectId}/environments/${environmentId}/test`
    );
  },
};

export default environmentService;
