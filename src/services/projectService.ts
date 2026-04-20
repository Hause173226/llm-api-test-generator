import { apiService } from './apiService';

export type ProjectWorkspaceMode = 'Manual' | 'Automated';

const PROJECT_WORKSPACE_MODE_STORAGE_KEY = 'projectWorkspaceModes';

const getWindowStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const readWorkspaceModeMap = (): Record<string, ProjectWorkspaceMode> => {
  const storage = getWindowStorage();
  if (!storage) {
    return {};
  }

  const rawValue = storage.getItem(PROJECT_WORKSPACE_MODE_STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, ProjectWorkspaceMode>;
    return parsed || {};
  } catch {
    return {};
  }
};

const writeWorkspaceModeMap = (value: Record<string, ProjectWorkspaceMode>) => {
  const storage = getWindowStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PROJECT_WORKSPACE_MODE_STORAGE_KEY, JSON.stringify(value));
};

export const setProjectWorkspaceMode = (
  projectId: string,
  mode: ProjectWorkspaceMode,
) => {
  if (!projectId) {
    return;
  }

  const current = readWorkspaceModeMap();
  current[projectId] = mode;
  writeWorkspaceModeMap(current);
};

export const getProjectWorkspaceMode = (
  projectId: string,
): ProjectWorkspaceMode | undefined => {
  if (!projectId) {
    return undefined;
  }

  return readWorkspaceModeMap()[projectId];
};

const inferProjectWorkspaceMode = (
  project: Partial<Project> & { description?: string; workspaceMode?: ProjectWorkspaceMode },
): ProjectWorkspaceMode => {
  if (project.workspaceMode === 'Manual' || project.workspaceMode === 'Automated') {
    return project.workspaceMode;
  }

  const storedMode = project.id ? getProjectWorkspaceMode(project.id) : undefined;
  if (storedMode) {
    return storedMode;
  }

  const description = `${project.description || ''}`.toLowerCase();
  if (description.includes('manual testing') || description.includes('manual workspace')) {
    return 'Manual';
  }

  return 'Automated';
};

export const mergeProjectWorkspaceMode = <T extends Partial<Project>>(
  project: T,
): T & { workspaceMode: ProjectWorkspaceMode } => ({
  ...project,
  workspaceMode: inferProjectWorkspaceMode(project),
});

export const filterProjectsByWorkspaceMode = <T extends Partial<Project>>(
  projects: T[],
  mode: ProjectWorkspaceMode,
) => projects.filter((project) => inferProjectWorkspaceMode(project) === mode);

// Types
export interface ActiveSpecSummary {
  endpointCount?: number;
  parseStatus?: string;
  sourceType?: string;
  updatedDateTime?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  specificationDocument: string;
  lastExecutionDate?: string;
  lastRunAt?: string;
  status: 'active' | 'archived';
  type: 'REST' | 'GraphQL' | 'gRPC';
  workspaceMode?: ProjectWorkspaceMode;
  // Overview fields from BE
  totalSpecifications?: number;
  activeSpecName?: string;
  activeSpecSummary?: ActiveSpecSummary;
  // Fallback fields
  endpointCount?: number;
  parseStatus?: string;
  sourceType?: string;
  updatedDateTime?: string;
  totalEndpoints?: number;
  TotalEndpoints?: number;
  totalTestSuites?: number;
  totalSuites?: number;
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
  workspaceMode?: ProjectWorkspaceMode;
}

// Project Service
class ProjectService {
  async getProjects(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<ProjectListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });

    const response = await apiService.get<ProjectListResponse>(
      `/projects?${params.toString()}`
    );

    return {
      ...response,
      items: Array.isArray(response.items)
        ? response.items.map((project) => mergeProjectWorkspaceMode(project))
        : [],
    };
  }

  async getProjectDetail(projectId: string): Promise<Project> {
    const response = await apiService.get<Project>(`/projects/${projectId}`);
    return mergeProjectWorkspaceMode(response);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await apiService.post<Project>('/projects', data);

    if (response?.id && data.workspaceMode) {
      setProjectWorkspaceMode(response.id, data.workspaceMode);
    }

    return mergeProjectWorkspaceMode(response);
  }

  async updateProject(
    projectId: string,
    data: Partial<CreateProjectRequest>
  ): Promise<Project> {
    const response = await apiService.put<Project>(`/projects/${projectId}`, data);

    if (data.workspaceMode) {
      setProjectWorkspaceMode(projectId, data.workspaceMode);
    }

    return mergeProjectWorkspaceMode(response);
  }

  async deleteProject(projectId: string): Promise<void> {
    await apiService.delete(`/projects/${projectId}`);
  }
}

export const projectService = new ProjectService();
