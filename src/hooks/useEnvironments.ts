import { useState, useEffect } from 'react';
import environmentService, { Environment, CreateEnvironmentRequest } from '../services/environmentService';
import { handleError } from '../utils/errorHandler';

export const useEnvironments = (projectId: string) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironments = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await environmentService.getEnvironments(projectId);
      setEnvironments(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, [projectId]);

  const createEnvironment = async (data: CreateEnvironmentRequest): Promise<boolean> => {
    try {
      const newEnv = await environmentService.createEnvironment(data);
      setEnvironments(prev => [...prev, newEnv]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const updateEnvironment = async (
    environmentId: string,
    data: Partial<Environment>
  ): Promise<boolean> => {
    try {
      const updated = await environmentService.updateEnvironment(projectId, environmentId, data);
      setEnvironments(prev => prev.map(env => (env.id === environmentId ? updated : env)));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const deleteEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      await environmentService.deleteEnvironment(projectId, environmentId);
      setEnvironments(prev => prev.filter(env => env.id !== environmentId));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const setDefaultEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      await environmentService.setDefaultEnvironment(projectId, environmentId);
      // Update local state to reflect the new default
      setEnvironments(prev =>
        prev.map(env => ({
          ...env,
          isDefault: env.id === environmentId,
        }))
      );
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const cloneEnvironment = async (environmentId: string, newName: string): Promise<boolean> => {
    try {
      const cloned = await environmentService.cloneEnvironment(projectId, environmentId, newName);
      setEnvironments(prev => [...prev, cloned]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const testEnvironment = async (environmentId: string): Promise<any> => {
    try {
      const result = await environmentService.testEnvironment(projectId, environmentId);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  return {
    environments,
    loading,
    error,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setDefaultEnvironment,
    cloneEnvironment,
    testEnvironment,
    refetch: fetchEnvironments,
  };
};
