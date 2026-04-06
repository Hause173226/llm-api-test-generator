import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services';
import { handleError } from '../utils/errorHandler';
import type { Project as ServiceProject } from '../services/projectService';

export interface Project extends ServiceProject {
  specType?: string;
  specFileName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
  isActive?: boolean;
  totalEndpoints?: number;
  totalTestSuites?: number;
  activeSpecName?: string;
}

export interface ProjectsResponse {
  items: Project[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export function useProjects(pageNumber: number = 1, pageSize: number = 10, searchTerm: string = '') {
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await projectService.getProjects(pageNumber, pageSize, searchTerm);
      // Filter out archived projects - check both isActive and status fields
      const activeProjects = response.items.filter(p => {
        const project = p as Project;
        // Check isActive boolean field
        if (project.isActive === false) return false;
        // Check status string field (if exists)
        if ((project as any).status?.toLowerCase() === 'archived') return false;
        return true;
      });
      setProjects(activeProjects);
      setTotalCount(activeProjects.length);
      setTotalPages(Math.ceil(activeProjects.length / pageSize));
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, searchTerm]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: { name: string; description: string; specType: string; specFile?: File }) => {
    try {
      const newProject = await projectService.createProject({
        name: data.name,
        description: data.description,
        type: data.specType as 'REST' | 'GraphQL' | 'gRPC',
      });
      await fetchProjects(); // Refresh list
      return newProject;
    } catch (err) {
      throw err;
    }
  };

  const updateProject = async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
    try {
      const updated = await projectService.updateProject(id, data);
      await fetchProjects(); // Refresh list
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectService.deleteProject(id);
      await fetchProjects(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  return {
    projects,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
