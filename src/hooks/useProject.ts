import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services';
import { handleError } from '../utils/errorHandler';
import { Project } from './useProjects';

export interface ProjectDetails extends Project {
  metrics?: {
    totalSuites: number;
    successRate: number;
    endpoints: number;
  };
  dataSource?: {
    type: string;
    fileName: string;
    uploadedAt: string;
  };
  timeline?: Array<{
    action: string;
    time: string;
    status: 'success' | 'error' | 'info';
  }>;
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getProjectDetail(projectId);
      setProject(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    isLoading,
    error,
    refetch: fetchProject,
  };
}
