import { apiService } from './apiService';
import { projectService } from './projectService';
import { testSuiteService } from './testSuiteService';
import testRunService, { type TestRun } from './testRunService';

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
  private projectRunsCache = new Map<
    string,
    { expiresAt: number; promise: Promise<TestRun[]> }
  >();

  private async getProjectTestRuns(projectId: string): Promise<TestRun[]> {
    const cached = this.projectRunsCache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise;
    }

    const promise = (async () => {
      const suites = await testSuiteService.getTestSuites(projectId);
      if (!suites.length) return [];

      const runsBySuite = await Promise.all(
        suites.map(async (suite) => {
          try {
            const result = await testRunService.getTestRunsByTestSuite(
              suite.id,
              1,
              100,
            );
            return result.items.map((run) => ({
              ...run,
              projectId,
              testSuiteId: run.testSuiteId || suite.id,
              testSuiteName: run.testSuiteName || suite.name,
            }));
          } catch (error) {
            console.error(
              `Error fetching test runs for suite ${suite.id}:`,
              error,
            );
            return [];
          }
        }),
      );

      return runsBySuite
        .flat()
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.startedAt || 0).getTime() -
            new Date(a.createdAt || a.startedAt || 0).getTime(),
        );
    })();

    this.projectRunsCache.set(projectId, {
      expiresAt: Date.now() + 30_000,
      promise,
    });

    promise.finally(() => {
      const current = this.projectRunsCache.get(projectId);
      if (current?.promise === promise) {
        this.projectRunsCache.delete(projectId);
      }
    });

    return promise;
  }

  async getMetrics(projectId?: string): Promise<DashboardMetrics> {
    try {
      // Always get total active projects (not filtered by project)
      const projectsPromise = projectService.getProjects(1, 50)
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

          // Get test runs for every suite in the project. Backend does not expose
          // /projects/{projectId}/test-runs; the stable contract is suite-level.
          try {
            const runsArray = await this.getProjectTestRuns(projectId);
            
            // Calculate monthly runs (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            monthlyRuns = runsArray.filter((run) => 
              new Date(run.createdAt || run.startedAt || 0) >= thirtyDaysAgo
            ).length;

            // Calculate pass rate from executed test cases, not run status.
            const totalExecutedTests = runsArray.reduce(
              (sum, run) => sum + Number(run.totalTests || 0),
              0,
            );
            const totalPassedTests = runsArray.reduce(
              (sum, run) => sum + Number(run.passedTests || 0),
              0,
            );
            if (totalExecutedTests > 0) {
              passRate = (totalPassedTests / totalExecutedTests) * 100;
            } else if (runsArray.length > 0) {
              const completedRuns = runsArray.filter(
                (run) => run.status === 'completed',
              ).length;
              passRate = (completedRuns / runsArray.length) * 100;
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

      const items = await this.getProjectTestRuns(projectId);

      return items
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.startedAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 10)
        .map((run) => ({
          id: run.id,
          type: run.status === 'failed' ? 'test_failure' : 'test_run',
          message: `Test Run "${run.testSuiteName || 'Unknown suite'}" ${(run.status || 'completed').toLowerCase()}`,
          timestamp: run.createdAt || run.startedAt || new Date().toISOString(),
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
