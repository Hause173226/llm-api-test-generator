import { useState, useEffect, useCallback, useRef } from 'react';
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
  const inFlightRef = useRef<Promise<void> | null>(null);
  const inFlightKeyRef = useRef<string>('');

  const fetchProjects = useCallback(async () => {
    const requestKey = `${pageNumber}|${pageSize}|${searchTerm}`;
    if (inFlightRef.current && inFlightKeyRef.current === requestKey) {
      return inFlightRef.current;
    }

    const requestPromise = (async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await projectService.getProjects(pageNumber, pageSize, searchTerm);
      const allProjects = response.items as Project[];
      setProjects(allProjects);
      setTotalCount(response.totalCount || allProjects.length);
      const computedTotalPages = Math.max(
        1,
        Math.ceil((response.totalCount || allProjects.length) / pageSize),
      );
      setTotalPages(computedTotalPages);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
    })();

    inFlightRef.current = requestPromise;
    inFlightKeyRef.current = requestKey;

    try {
      await requestPromise;
    } finally {
      if (inFlightRef.current === requestPromise) {
        inFlightRef.current = null;
        inFlightKeyRef.current = '';
      }
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
