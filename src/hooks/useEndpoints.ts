import { useState, useEffect, useCallback } from 'react';
import { endpointService, Endpoint, EndpointsResponse } from '../services';
import { handleError } from '../utils/errorHandler';

export function useEndpoints(
  projectId: string,
  specId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  searchTerm: string = '',
  method?: string,
  tag?: string
) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    if (!projectId || !specId) {
      setEndpoints([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Note: Backend doesn't support filtering, so we fetch all and filter client-side
      const response: EndpointsResponse = await endpointService.getEndpoints(
        projectId,
        specId,
        1, // Always fetch page 1
        9999, // Fetch all
        '', // No search term
        undefined, // No method filter
        undefined // No tag filter
      );
      setEndpoints(response.items || []);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, specId]); // Remove filters from dependencies

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const createEndpoint = async (data: Partial<Endpoint>) => {
    if (!specId) throw new Error('No specification selected');
    try {
      const newEndpoint = await endpointService.createEndpoint(projectId, specId, data);
      await fetchEndpoints(); // Refresh list
      return newEndpoint;
    } catch (err) {
      throw err;
    }
  };

  const updateEndpoint = async (endpointId: string, data: Partial<Endpoint>) => {
    if (!specId) throw new Error('No specification selected');
    try {
      const updated = await endpointService.updateEndpoint(projectId, specId, endpointId, data);
      await fetchEndpoints(); // Refresh list
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteEndpoint = async (endpointId: string) => {
    if (!specId) throw new Error('No specification selected');
    try {
      await endpointService.deleteEndpoint(projectId, specId, endpointId);
      await fetchEndpoints(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const getEndpointStats = async (endpointId: string) => {
    if (!specId) throw new Error('No specification selected');
    try {
      return await endpointService.getEndpointStats(projectId, specId, endpointId);
    } catch (err) {
      throw err;
    }
  };

  return {
    endpoints,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchEndpoints,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    getEndpointStats,
  };
}
