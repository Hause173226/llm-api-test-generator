import { useState, useEffect } from 'react';
import { dashboardService, DashboardMetrics, ActivityItem, TopEndpoint } from '../services/dashboardService';

export const useDashboard = () => {
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

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsData, activityData, endpointsData] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getRecentActivity(),
        dashboardService.getTopEndpoints(),
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    metrics,
    activity,
    topEndpoints,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};
