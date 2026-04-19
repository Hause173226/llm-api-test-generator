import { useState, useEffect } from 'react';
import environmentService, {
  ExecutionEnvironment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  getConflictReasonCode,
} from '../services/environmentService';
import { handleError } from '../utils/errorHandler';

export const useEnvironments = (projectId: string) => {
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
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
      const newEnv = await environmentService.createEnvironment(projectId, data);
      setEnvironments(prev => {
        const updated = newEnv.isDefault
          ? prev.map(env => ({ ...env, isDefault: false }))
          : prev;
        return [...updated, newEnv];
      });
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const updateEnvironment = async (
    environmentId: string,
    data: Partial<UpdateEnvironmentRequest>
  ): Promise<boolean> => {
    try {
      const current = environments.find(env => env.id === environmentId);
      if (!current) throw new Error('Environment not found');

      const payload: UpdateEnvironmentRequest = {
        rowVersion: data.rowVersion ?? current.rowVersion,
        name: data.name ?? current.name,
        baseUrl: data.baseUrl ?? current.baseUrl,
        variables: data.variables ?? current.variables,
        headers: data.headers ?? current.headers,
        authConfig: data.authConfig !== undefined ? data.authConfig : current.authConfig,
        isDefault: data.isDefault ?? current.isDefault,
      };

      const updated = await environmentService.updateEnvironment(projectId, environmentId, payload);
      setEnvironments(prev => prev.map(env => (env.id === environmentId ? updated : env)));
      return true;
    } catch (err) {
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === 'CONCURRENCY_CONFLICT') {
        // Caller nên reload data và thử lại
        handleError(new Error('Dữ liệu đã thay đổi bởi thao tác khác. Vui long tải lại và thử lại.'));
      } else {
        handleError(err);
      }
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
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === 'CONCURRENCY_CONFLICT') {
        handleError(new Error('Dữ liệu đã thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.'));
      } else {
        handleError(err);
      }
      return false;
    }
  };

  const setDefaultEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      const target = environments.find(env => env.id === environmentId);
      if (!target) throw new Error('Environment not found');

      const updated = await environmentService.updateEnvironment(projectId, environmentId, {
        rowVersion: target.rowVersion,
        name: target.name,
        baseUrl: target.baseUrl,
        variables: target.variables,
        headers: target.headers,
        authConfig: target.authConfig,
        isDefault: true,
      });

      setEnvironments(prev => prev.map(env =>
        env.id === environmentId ? updated : { ...env, isDefault: false }
      ));
      return true;
    } catch (err) {
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === 'CONCURRENCY_CONFLICT') {
        handleError(new Error('Dữ liệu đã thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.'));
      } else {
        handleError(err);
      }
      return false;
    }
  };

  const cloneEnvironment = async (environmentId: string, newName: string): Promise<boolean> => {
    try {
      const target = environments.find(env => env.id === environmentId);
      if (!target) throw new Error('Environment not found');

      const cloned = await environmentService.createEnvironment(projectId, {
        name: newName,
        baseUrl: target.baseUrl,
        variables: target.variables ?? {},
        headers: target.headers ?? {},
        // authConfig không clone vì chứa secret đã bị mask
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
