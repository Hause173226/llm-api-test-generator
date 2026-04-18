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

const specificationService = {
  // Get all specifications for a project
  // FE-18: pass includeDeleted=true to see soft-deleted specs (trash view)
  getSpecifications: async (
    projectId: string,
    includeDeleted: boolean = false,
  ): Promise<Specification[]> => {
    const params: Record<string, any> = {};
    if (includeDeleted) params.includeDeleted = true;

    const response = await apiService.get<Specification[]>(
      `/projects/${projectId}/specifications`,
      { params },
    );
    return Array.isArray(response) ? response : [];
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

    return await apiService.uploadFile<Specification>(
      `/projects/${data.projectId}/specifications/upload`,
      formData,
    );
  },

  // Update specification
  updateSpecification: async (
    projectId: string,
    specId: string,
    data: { name?: string; description?: string },
  ): Promise<Specification> => {
    return await apiService.put<Specification>(
      `/projects/${projectId}/specifications/${specId}`,
      data,
    );
  },

  // Delete specification
  deleteSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<void> => {
    await apiService.delete(`/projects/${projectId}/specifications/${specId}`);
  },

  // Create manual specification
  createManualSpecification: async (
    projectId: string,
    data: ManualSpecificationRequest,
  ): Promise<any> => {
    return await apiService.post(
      `/projects/${projectId}/specifications/manual`,
      data,
    );
  },

  // Get available upload methods
  getUploadMethods: async (projectId: string): Promise<any[]> => {
    return await apiService.get<any[]>(
      `/projects/${projectId}/specifications/upload-methods`,
    );
  },

  // Import from cURL command
  importCurl: async (projectId: string, data: { curlCommand: string; name?: string }): Promise<any> => {
    return await apiService.post(
      `/projects/${projectId}/specifications/curl-import`,
      data,
    );
  },

  // Activate a specification
  activateSpecification: async (projectId: string, specId: string): Promise<any> => {
    return await apiService.put(
      `/projects/${projectId}/specifications/${specId}/activate`,
    );
  },

  // Deactivate a specification
  deactivateSpecification: async (projectId: string, specId: string): Promise<any> => {
    return await apiService.put(
      `/projects/${projectId}/specifications/${specId}/deactivate`,
    );
  },

  // FE-18: Restore a soft-deleted specification
  restoreSpecification: async (
    projectId: string,
    specId: string,
  ): Promise<void> => {
    await apiService.post(
      `/projects/${projectId}/specifications/${specId}/restore`,
    );
  },
};

export default specificationService;
