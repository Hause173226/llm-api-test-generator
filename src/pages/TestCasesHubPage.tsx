import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
import { handleError } from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";
import specificationService from "../services/specificationService";

export default function TestCasesHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProject } = useProject();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";

  const [testSuites, setTestSuites] = useState<any[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchTestSuites();
    }
  }, [projectId]);

  const fetchTestSuites = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      const suites = await testSuiteService.getTestSuites(projectId);
      setTestSuites(Array.isArray(suites) ? suites : []);

      // Fetch specifications for all suites
      const specs = await specificationService.getSpecifications(projectId);
      const specsMap: Record<string, any> = {};
      specs.forEach((spec) => {
        specsMap[spec.id] = spec;
      });
      setSpecifications(specsMap);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuite = (suiteId: string) => {
    navigate(`/test-suites/${suiteId}?tab=testcases`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!projectId) {
    return (
      <MainLayout title="Test Cases">
        <NoProjectSelected />
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout title="Test Cases">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Test Cases">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={fetchTestSuites}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Test Cases">
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              Test Cases
            </h1>
            <p className="text-on-surface-variant">
              Select a test suite to view and manage its test cases
            </p>
          </div>
        </header>

        {/* Test Suites Grid */}
        {testSuites.length === 0 ? (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-12 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-center">
            <Layers className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              No test suites yet
            </h3>
            <p className="text-on-surface-variant mb-6">
              Create a test suite first to manage test cases
            </p>
            <button
              onClick={() => navigate("/test-suites")}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all"
            >
              Go to Test Suites
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {testSuites.map((suite) => (
              <button
                key={suite.id}
                onClick={() => handleSelectSuite(suite.id)}
                className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 hover:shadow-lg transition-all text-left"
              >
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-primary-fixed/30 dark:bg-indigo-900/30 rounded-lg">
                      <Layers className="w-6 h-6 text-primary dark:text-indigo-400" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-on-surface tracking-tight group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                      {suite.name}
                    </h3>
                    {suite.description && (
                      <p className="text-xs text-on-surface-variant font-medium mt-1">
                        {suite.description}
                      </p>
                    )}
                    {suite.apiSpecId && specifications[suite.apiSpecId] && (
                      <p className="text-xs text-primary dark:text-indigo-400 font-semibold mt-1">
                        📄 {specifications[suite.apiSpecId].name}
                      </p>
                    )}
                    <p className="text-xs text-on-surface-variant font-medium mt-1">
                      Created {formatDate(suite.createdDateTime)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Endpoints
                      </p>
                      <p className="text-lg font-black text-on-surface">
                        {suite.selectedEndpointCount || 0}
                      </p>
                    </div>
                    <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Test Cases
                      </p>
                      <p className="text-lg font-black text-on-surface">
                        {suite.testCaseCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-surface-container-low/50 dark:bg-slate-800/50 border-t border-outline-variant/10 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {suite.status}
                  </span>
                  <div className="flex items-center gap-2 text-primary dark:text-indigo-400 font-bold text-sm">
                    View Test Cases
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
