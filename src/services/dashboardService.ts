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
  async getMetrics(projectId?: string): Promise<DashboardMetrics> {
    try {
      // Always get total active projects (not filtered by project)
      const projectsPromise = apiService.get<{ items: any[] }>('/projects')
        .then(res => {
          console.log('Projects response:', res);
          const items = Array.isArray(res) ? res : (res.items || []);
          const activeCount = items.filter((p: any) => p.isActive === true || p.status === 'Active').length;
          console.log('Active projects count:', activeCount, 'from', items.length, 'total');
          return activeCount;
        })
        .catch(err => {
          console.error('Error fetching projects:', err);
          return 0;
        });
      
      let endpointsCount = 0;
      let monthlyRuns = 0;
      let passRate = 0;

      if (projectId) {
        // Get project-specific data
        try {
          // Get all specifications for the project
          const specs = await apiService.get<any[]>(`/projects/${projectId}/specifications`);
          console.log('Specifications response:', specs);
          const specsArray = Array.isArray(specs) ? specs : [];
          
          // Count endpoints across all specifications
          if (specsArray.length > 0) {
            const endpointCounts = await Promise.all(
              specsArray.map(async (spec) => {
                try {
                  const endpoints = await apiService.get<any>(`/projects/${projectId}/specifications/${spec.id}/endpoints`);
                  const items = Array.isArray(endpoints) ? endpoints : (endpoints.items || []);
                  console.log(`Spec ${spec.name}: ${items.length} endpoints`);
                  return items.length;
                } catch {
                  return 0;
                }
              })
            );
            endpointsCount = endpointCounts.reduce((sum, count) => sum + count, 0);
            console.log('Total endpoints:', endpointsCount);
          }

          // Get test runs for the project
          try {
            const testRuns = await apiService.get<any>(`/projects/${projectId}/test-runs`);
            console.log('Test runs response:', testRuns);
            const runsArray = Array.isArray(testRuns) ? testRuns : (testRuns.items || []);
            
            // Calculate monthly runs (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            monthlyRuns = runsArray.filter((run: any) => 
              new Date(run.createdDateTime || run.createdAt) >= thirtyDaysAgo
            ).length;

            // Calculate pass rate
            if (runsArray.length > 0) {
              const passedRuns = runsArray.filter((run: any) => 
                run.status === 'Passed' || run.status === 'Success' || run.status === 'Completed'
              ).length;
              passRate = (passedRuns / runsArray.length) * 100;
            }
            console.log('Monthly runs:', monthlyRuns, 'Pass rate:', passRate.toFixed(1) + '%');
          } catch (err) {
            console.error('Error fetching test runs:', err);
          }
        } catch (err) {
          console.error('Error fetching project data:', err);
        }
      }

      const activeProjects = await projectsPromise;

      return {
        activeProjects,
        totalEndpoints: endpointsCount,
        monthlyTestRuns: monthlyRuns,
        passRate: passRate,
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

  async getRecentActivity(projectId?: string): Promise<ActivityItem[]> {
    try {
      if (!projectId) return [];

      const response = await apiService.get<any>(`/projects/${projectId}/test-runs`);
      const items = Array.isArray(response) ? response : (response.items || []);

      return items
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdDateTime || a.createdAt).getTime();
          const dateB = new Date(b.createdDateTime || b.createdAt).getTime();
          return dateB - dateA;
        })
        .slice(0, 10)
        .map((run: any) => ({
          id: run.id,
          type: (run.status === 'Failed' || run.status === 'Error') ? 'test_failure' : 'test_run',
          message: `Test Run "${run.testSuiteName || run.name || 'Unknown'}" ${(run.status || 'completed').toLowerCase()}`,
          timestamp: run.createdDateTime || run.createdAt,
        }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  async getTopEndpoints(projectId?: string): Promise<TopEndpoint[]> {
    try {
      if (!projectId) return [];

      // Get all specifications for the project
      const specs = await apiService.get<any[]>(`/projects/${projectId}/specifications`);
      const specsArray = Array.isArray(specs) ? specs : [];
      
      if (specsArray.length === 0) return [];

      // Get endpoints from all specifications
      const allEndpoints: TopEndpoint[] = [];
      for (const spec of specsArray) {
        try {
          const response = await apiService.get<any>(`/projects/${projectId}/specifications/${spec.id}/endpoints`);
          const items = Array.isArray(response) ? response : (response.items || []);

          const endpoints = items.map((endpoint: any) => ({
            path: endpoint.path || endpoint.url || '/',
            service: spec.name || 'API Service',
            method: endpoint.method || endpoint.httpMethod || 'GET',
            status: (endpoint.isActive || endpoint.status === 'active') ? 'Active' : 'Error',
            latency: endpoint.latency ? `${endpoint.latency}ms` : '--',
            coverage: endpoint.coverage || 0,
          }));

          allEndpoints.push(...endpoints);
        } catch (err) {
          console.error(`Error fetching endpoints for spec ${spec.id}:`, err);
        }
      }

      // Sort by coverage and return top 10
      return allEndpoints
        .sort((a, b) => b.coverage - a.coverage)
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching top endpoints:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();
