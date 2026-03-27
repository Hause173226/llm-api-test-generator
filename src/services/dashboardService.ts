import { apiService } from './apiService';

// Types
export interface DashboardMetrics {
  activeProjects: number;
  totalEndpoints: number;
  monthlyTestRuns: number;
  passRate: number;
}

export interface ActivityItem {
  id: string;
  type: 'test_run' | 'test_failure' | 'ai_suggestion' | 'user_joined';
  message: string;
  timestamp: string;
  icon?: string;
  color?: string;
}

export interface TopEndpoint {
  path: string;
  service: string;
  method: string;
  status: string;
  latency: string;
  coverage: number;
}

// Dashboard Service
class DashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const [projectsRes, endpointsRes, statsRes] = await Promise.all([
        apiService.get<{ totalCount: number }>('/projects?status=active&pageSize=1'),
        apiService.get<{ totalCount: number }>('/endpoints?pageSize=1'),
        apiService.get<{ monthlyRuns: number; passRate: number }>('/test-runs/stats'),
      ]);

      return {
        activeProjects: projectsRes.totalCount || 0,
        totalEndpoints: endpointsRes.totalCount || 0,
        monthlyTestRuns: statsRes.monthlyRuns || 0,
        passRate: statsRes.passRate || 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values on error
      return {
        activeProjects: 0,
        totalEndpoints: 0,
        monthlyTestRuns: 0,
        passRate: 0,
      };
    }
  }

  async getRecentActivity(): Promise<ActivityItem[]> {
    try {
      const response = await apiService.get<{
        items: Array<{
          id: string;
          status: string;
          testSuiteName: string;
          createdAt: string;
        }>;
      }>('/test-runs?pageSize=10&sortBy=createdAt&sortOrder=desc');

      return response.items.map((run) => ({
        id: run.id,
        type: run.status === 'Failed' ? 'test_failure' : 'test_run',
        message: `Test Run "${run.testSuiteName}" ${run.status.toLowerCase()}`,
        timestamp: run.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  async getTopEndpoints(): Promise<TopEndpoint[]> {
    try {
      const response = await apiService.get<{
        items: Array<{
          path: string;
          method: string;
          status: string;
          latency?: number;
          coverage?: number;
        }>;
      }>('/endpoints?pageSize=10&sortBy=coverage&sortOrder=desc');

      return response.items.map((endpoint) => ({
        path: endpoint.path,
        service: 'API Service', // Default service name
        method: endpoint.method,
        status: endpoint.status === 'active' ? 'Active' : 'Error',
        latency: endpoint.latency ? `${endpoint.latency}ms` : '--',
        coverage: endpoint.coverage || 0,
      }));
    } catch (error) {
      console.error('Error fetching top endpoints:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();
