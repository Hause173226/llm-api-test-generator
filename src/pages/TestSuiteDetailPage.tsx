import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  GripVertical,
  Loader2,
  AlertTriangle,
  Save,
  Play,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
import { useProject } from "../contexts/ProjectContext";

export default function TestSuiteDetailPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProject } = useProject();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";

  const [suite, setSuite] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, [suiteId, projectId]);

  const fetchData = async () => {
    if (!suiteId || !projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch suite details
      const suiteData = await testSuiteService.getTestSuiteDetail(
        projectId,
        suiteId,
      );
      setSuite(suiteData);

      // Fetch endpoints if suite has them
      if (suiteData.apiSpecId && suiteData.selectedEndpointIds?.length > 0) {
        const response = await endpointService.getEndpoints(
          suiteData.projectId,
          suiteData.apiSpecId,
        );

        const allEndpoints = response.items || [];

        // Filter and sort endpoints based on selectedEndpointIds order
        const orderedEndpoints = suiteData.selectedEndpointIds
          .map((id: string) => allEndpoints.find((ep: any) => ep.id === id))
          .filter(Boolean);

        setEndpoints(orderedEndpoints);
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEndpoints = [...endpoints];
    const draggedItem = newEndpoints[draggedIndex];
    newEndpoints.splice(draggedIndex, 1);
    newEndpoints.splice(index, 0, draggedItem);

    setEndpoints(newEndpoints);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveOrder = async () => {
    if (!suite) return;

    try {
      setIsSubmitting(true);
      const orderedIds = endpoints.map((ep) => ep.id);

      await testSuiteService.updateTestSuite(suite.id, {
        name: suite.name,
        description: suite.description,
        apiSpecId: suite.apiSpecId,
        generationType: suite.generationType,
        selectedEndpointIds: orderedIds,
        endpointBusinessContexts: suite.endpointBusinessContexts,
        globalBusinessRules: suite.globalBusinessRules,
      });

      showSuccessToast("Endpoint order saved successfully");
      setHasChanges(false);
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateTestCases = async () => {
    if (!suite) return;

    try {
      setIsSubmitting(true);
      // TODO: Call API to trigger test case generation
      showSuccessToast(
        "Test case generation started. This may take a few minutes.",
      );
      // Optionally navigate or refresh
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunTests = () => {
    navigate(`/test-runs/new?suiteId=${suiteId}`);
  };

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "POST":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "PUT":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "DELETE":
        return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
      case "PATCH":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Test Suite Details">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Test Suite Details">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!suite) {
    return (
      <MainLayout title="Test Suite Details">
        <div className="text-center py-20">
          <p className="text-on-surface-variant">Test suite not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={suite.name}>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">Back</span>
            </button>
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              {suite.name}
            </h1>
            {suite.description && (
              <p className="text-on-surface-variant">{suite.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            {hasChanges && (
              <button
                onClick={handleSaveOrder}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Save Order
              </button>
            )}
            {suite.testCaseCount === 0 ? (
              <button
                onClick={handleGenerateTestCases}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Sparkles className="w-5 h-5" />
                Generate Test Cases
              </button>
            ) : (
              <button
                onClick={handleRunTests}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Run Tests
              </button>
            )}
          </div>
        </header>

        {/* Suite Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Status
            </p>
            <p className="text-2xl font-black text-on-surface">
              {suite.status}
            </p>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Generation Type
            </p>
            <p className="text-2xl font-black text-on-surface">
              {suite.generationType}
            </p>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Endpoints
            </p>
            <p className="text-2xl font-black text-on-surface">
              {suite.selectedEndpointCount || 0}
            </p>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Test Cases
            </p>
            <p className="text-2xl font-black text-on-surface">
              {suite.testCaseCount || 0}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        {suite.testCaseCount === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              💡 No test cases yet. Click "Generate Test Cases" to let LLM
              automatically create test cases for all endpoints in this suite.
              You can reorder endpoints below to control the execution sequence.
            </p>
          </div>
        )}

        {/* Endpoints List - Drag & Drop */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10 dark:border-slate-800">
            <h2 className="text-xl font-bold text-on-surface">
              Endpoints ({endpoints.length})
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Drag and drop to reorder execution sequence
            </p>
          </div>
          <div className="divide-y divide-outline-variant/10 dark:divide-slate-800">
            {endpoints.length === 0 ? (
              <div className="px-6 py-12 text-center text-on-surface-variant">
                No endpoints found
              </div>
            ) : (
              endpoints.map((endpoint, index) => (
                <div
                  key={endpoint.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "px-6 py-4 flex items-center gap-4 cursor-move hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors",
                    draggedIndex === index && "opacity-50",
                  )}
                >
                  <GripVertical className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                  <div className="flex items-center gap-1 text-on-surface-variant font-mono text-sm flex-shrink-0">
                    <span className="w-6 text-right">{index + 1}</span>
                    <span>.</span>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter min-w-[70px] text-center flex-shrink-0",
                      getMethodColor(endpoint.method),
                    )}
                  >
                    {endpoint.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">
                      {endpoint.path}
                    </p>
                    {endpoint.description && (
                      <p className="text-xs text-on-surface-variant truncate">
                        {endpoint.description}
                      </p>
                    )}
                  </div>
                  {endpoint.tags &&
                    Array.isArray(endpoint.tags) &&
                    endpoint.tags.length > 0 && (
                      <div className="flex gap-1 flex-shrink-0">
                        {endpoint.tags
                          .slice(0, 2)
                          .map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        {endpoint.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full">
                            +{endpoint.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
