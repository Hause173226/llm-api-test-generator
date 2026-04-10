import { useState, useEffect, useRef } from 'react';
import { dashboardService, DashboardMetrics, ActivityItem, TopEndpoint } from '../services/dashboardService';

export const useDashboard = (projectId?: string) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeProjects: 0,
    totalEndpoints: 0,
    monthlyTestRuns: 0,
    passRate: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const inFlightProjectIdRef = useRef<string>('');

  const fetchDashboardData = async () => {
    const projectKey = projectId || '';
    if (inFlightRef.current && inFlightProjectIdRef.current === projectKey) {
      return inFlightRef.current;
    }

    const requestPromise = (async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsData, activityData, endpointsData] = await Promise.all([
        dashboardService.getMetrics(projectId),
        dashboardService.getRecentActivity(projectId),
        dashboardService.getTopEndpoints(projectId),
      ]);

      setMetrics(metricsData);
      setActivity(activityData);
      setTopEndpoints(endpointsData);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
    })();

    inFlightRef.current = requestPromise;
    inFlightProjectIdRef.current = projectKey;

    try {
      await requestPromise;
    } finally {
      if (inFlightRef.current === requestPromise) {
        inFlightRef.current = null;
        inFlightProjectIdRef.current = '';
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [projectId]);

  return {
    metrics,
    activity,
    topEndpoints,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};
