import { apiService } from './apiService';

// Types
export interface Project {
  id: string;
  name: string;
  description: string;
  specificationDocument: string;
  lastExecutionDate?: string;
  status: 'active' | 'archived';
  type: 'REST' | 'GraphQL' | 'gRPC';
}

export interface ProjectListResponse {
  items: Project[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  type: 'REST' | 'GraphQL' | 'gRPC';
}

// Project Service
class ProjectService {
  async getProjects(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<ProjectListResponse> {
    const params = new URLSearchParams({
      pageNumber: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });

    return await apiService.get<ProjectListResponse>(
      `/projects?${params.toString()}`
    );
  }

  async getProjectDetail(projectId: string): Promise<Project> {
    return await apiService.get<Project>(`/projects/${projectId}`);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return await apiService.post<Project>('/projects', data);
  }

  async updateProject(
    projectId: string,
    data: Partial<CreateProjectRequest>
  ): Promise<Project> {
    return await apiService.put<Project>(`/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}`);
  }
}

export const projectService = new ProjectService();
