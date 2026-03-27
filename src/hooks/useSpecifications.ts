import { useState, useEffect, useCallback } from 'react';
import { specificationService, Specification } from '../services';
import { handleError } from '../utils/errorHandler';

export function useSpecifications(projectId: string) {
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecifications = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await specificationService.getSpecifications(projectId);
      setSpecifications(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
      setSpecifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSpecifications();
  }, [fetchSpecifications]);

  const uploadSpecification = async (data: {
    name: string;
    description?: string;
    type: string;
    file: File;
  }) => {
    try {
      const newSpec = await specificationService.uploadSpecification({
        projectId,
        ...data,
      });
      await fetchSpecifications(); // Refresh list
      return newSpec;
    } catch (err) {
      throw err;
    }
  };

  const updateSpecification = async (
    specId: string,
    data: { name?: string; description?: string }
  ) => {
    try {
      const updated = await specificationService.updateSpecification(projectId, specId, data);
      await fetchSpecifications(); // Refresh list
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteSpecification = async (specId: string) => {
    try {
      await specificationService.deleteSpecification(projectId, specId);
      await fetchSpecifications(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  return {
    specifications,
    isLoading,
    error,
    refetch: fetchSpecifications,
    uploadSpecification,
    updateSpecification,
    deleteSpecification,
  };
}
