import { useState, useEffect } from 'react';
import llmSuggestionService, { LLMSuggestion, GenerateSuggestionsRequest } from '../services/llmSuggestionService';
import { handleError } from '../utils/errorHandler';

export const useSuggestions = (projectId: string, type?: string, status?: string) => {
  const [suggestions, setSuggestions] = useState<LLMSuggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchSuggestions = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await llmSuggestionService.getSuggestions(
        projectId,
        page,
        pagination.pageSize,
        type,
        status
      );
      setSuggestions(response.items);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
      });
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await llmSuggestionService.getSuggestionStats(projectId);
      setStats(data);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSuggestions();
      fetchStats();
    }
  }, [projectId, type, status]);

  const generateSuggestions = async (data: GenerateSuggestionsRequest): Promise<boolean> => {
    try {
      setGenerating(true);
      const newSuggestions = await llmSuggestionService.generateSuggestions(data);
      // Refresh the list after generation
      await fetchSuggestions();
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const acceptSuggestion = async (suggestionId: string): Promise<boolean> => {
    try {
      await llmSuggestionService.acceptSuggestion(projectId, suggestionId);
      // Update local state
      setSuggestions(prev =>
        prev.map(s => (s.id === suggestionId ? { ...s, status: 'accepted' as const } : s))
      );
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const rejectSuggestion = async (suggestionId: string, reason?: string): Promise<boolean> => {
    try {
      await llmSuggestionService.rejectSuggestion(projectId, suggestionId, reason);
      // Update local state
      setSuggestions(prev =>
        prev.map(s => (s.id === suggestionId ? { ...s, status: 'rejected' as const } : s))
      );
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const implementSuggestion = async (suggestionId: string, testSuiteId: string): Promise<boolean> => {
    try {
      await llmSuggestionService.implementSuggestion(projectId, suggestionId, testSuiteId);
      // Update local state
      setSuggestions(prev =>
        prev.map(s => (s.id === suggestionId ? { ...s, status: 'implemented' as const } : s))
      );
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const batchAccept = async (suggestionIds: string[]): Promise<boolean> => {
    try {
      await llmSuggestionService.batchAcceptSuggestions(projectId, suggestionIds);
      await fetchSuggestions();
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const batchReject = async (suggestionIds: string[]): Promise<boolean> => {
    try {
      await llmSuggestionService.batchRejectSuggestions(projectId, suggestionIds);
      await fetchSuggestions();
      await fetchStats();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const changePage = (page: number) => {
    fetchSuggestions(page);
  };

  return {
    suggestions,
    stats,
    loading,
    generating,
    error,
    pagination,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    implementSuggestion,
    batchAccept,
    batchReject,
    changePage,
    refetch: fetchSuggestions,
  };
};
