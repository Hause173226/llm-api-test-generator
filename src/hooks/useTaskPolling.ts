import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimated_time_remaining?: number; // seconds
  progress?: number; // 0-100
  result?: any;
  error?: string;
}

interface UseTaskPollingOptions {
  pollingInterval?: number; // ms, default 10000
  onCompleted?: (data: TaskStatus) => void;
  onFailed?: (data: TaskStatus) => void;
}

export function useTaskPolling(
  taskId: string | null,
  options: UseTaskPollingOptions = {},
) {
  const {
    pollingInterval = 10_000,
    onCompleted,
    onFailed,
  } = options;

  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  // Keep callback refs up to date without re-triggering effects
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchStatus = useCallback(async (id: string) => {
    try {
      const data = await apiService.get<TaskStatus>(`/tasks/${id}/status`);
      setTaskStatus(data);
      setError(null);

      if (data.status === 'completed') {
        stopPolling();
        onCompletedRef.current?.(data);
      } else if (data.status === 'failed') {
        stopPolling();
        onFailedRef.current?.(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch task status');
    }
  }, [stopPolling]);

  useEffect(() => {
    if (!taskId) {
      stopPolling();
      setTaskStatus(null);
      setError(null);
      return;
    }

    // Initial fetch immediately
    setIsPolling(true);
    fetchStatus(taskId);

    // Start polling
    intervalRef.current = setInterval(() => {
      fetchStatus(taskId);
    }, pollingInterval);

    // Cleanup on unmount or taskId change
    return () => {
      stopPolling();
    };
  }, [taskId, pollingInterval, fetchStatus, stopPolling]);

  return {
    taskStatus,
    isPolling,
    error,
    stopPolling,
  };
}
