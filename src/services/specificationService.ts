import apiService from './apiService';
import { ManualSpecificationRequest } from '../types/manualSpec';

export interface Specification {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: 'openapi' | 'postman' | 'graphql';
  content: string;
  version?: string;
  parseStatus: 'Pending' | 'Success' | 'Failed';
  parsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpecificationUploadRequest {
  projectId: string;
  name: string;
  description?: string;
  type: string;
  file: File;
}

const specificationService = {
  // Get all specifications for a project
  getSpecifications: async (projectId: string): Promise<Specification[]> => {
    const response = await apiService.get<Specification[]>(`/projects/${projectId}/specifications`);
    return Array.isArray(response) ? response : [];
  },

  // Get specification by ID
  getSpecificationById: async (projectId: string, specId: string): Promise<Specification> => {
    return await apiService.get<Specification>(`/projects/${projectId}/specifications/${specId}`);
  },

  // Upload new specification
  uploadSpecification: async (data: SpecificationUploadRequest): Promise<Specification> => {
    const formData = new FormData();
    formData.append('Name', data.name);
    formData.append('File', data.file);

    // Map type to SourceType enum (0=OpenAPI, 1=Postman, 2=GraphQL)
    let sourceType = 0; // Default OpenAPI
    if (data.type.toLowerCase().includes('postman')) {
      sourceType = 1;
    } else if (data.type.toLowerCase().includes('graphql')) {
      sourceType = 2;
    }
    formData.append('SourceType', sourceType.toString());

    // Optional fields
    formData.append('Version', '1.0.0'); // Default version
    formData.append('AutoActivate', 'true'); // Auto activate after upload
    formData.append('UploadMethod', '0'); // StorageGatewayContract = 0

    return await apiService.uploadFile<Specification>(`/projects/${data.projectId}/specifications/upload`, formData);
  },

  // Update specification
  updateSpecification: async (
    projectId: string,
    specId: string,
    data: { name?: string; description?: string }
  ): Promise<Specification> => {
    return await apiService.put<Specification>(`/projects/${projectId}/specifications/${specId}`, data);
  },

  // Delete specification
  deleteSpecification: async (projectId: string, specId: string): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/specifications/${specId}`);
  },

  // Create manual specification
  createManualSpecification: async (
    projectId: string,
    data: ManualSpecificationRequest
  ): Promise<Specification> => {
    return await apiService.post<Specification>(
      `/projects/${projectId}/specifications/manual`,
      data
    );
  },

  // Note: Parse happens automatically via background job after upload
  // No manual parse endpoint exists - check parseStatus field instead
};

export default specificationService;
