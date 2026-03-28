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
      const current = environments.find(env => env.id === environmentId);
      if (!current) {
        throw new Error('Environment not found');
      }

      const updated = await environmentService.updateEnvironment(projectId, environmentId, {
        ...current,
        ...data,
      });
      setEnvironments(prev => prev.map(env => (env.id === environmentId ? updated : env)));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const deleteEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      const current = environments.find(env => env.id === environmentId);
      if (!current?.rowVersion) {
        throw new Error('Missing rowVersion for delete operation');
      }

      await environmentService.deleteEnvironment(projectId, environmentId, current.rowVersion);
      setEnvironments(prev => prev.filter(env => env.id !== environmentId));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const setDefaultEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      const target = environments.find(env => env.id === environmentId);
      if (!target) {
        throw new Error('Environment not found');
      }

      const updated = await environmentService.updateEnvironment(projectId, environmentId, {
        ...target,
        isDefault: true,
      });

      // Update local state to reflect single default environment.
      setEnvironments(prev => prev.map(env => {
        if (env.id === environmentId) {
          return updated;
        }

        return {
          ...env,
          isDefault: false,
        };
      }));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const cloneEnvironment = async (environmentId: string, newName: string): Promise<boolean> => {
    try {
      const target = environments.find(env => env.id === environmentId);
      if (!target) {
        throw new Error('Environment not found');
      }

      const cloned = await environmentService.createEnvironment({
        projectId,
        name: newName,
        description: target.description,
        baseUrl: target.baseUrl,
        variables: target.variables || {},
        headers: target.headers || {},
        isDefault: false,
      });
      setEnvironments(prev => [...prev, cloned]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const testEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      const target = environments.find(env => env.id === environmentId);
      if (!target) {
        throw new Error('Environment not found');
      }

      // No backend test endpoint yet; return a lightweight local validation result.
      return /^https?:\/\//i.test(target.baseUrl || '');
    } catch (err) {
      handleError(err);
      return false;
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
