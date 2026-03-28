import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Play,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { apiService } from "../services/apiService";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
import { testSuiteService } from "../services/testSuiteService";
import specificationService from "../services/specificationService";

export default function TestCasesListPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";

  const [testCases, setTestCases] = useState<any[]>([]);
  const [suite, setSuite] = useState<any>(null);
  const [specification, setSpecification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (suiteId && projectId) {
      fetchData();
    }
  }, [suiteId, projectId]);

  const fetchData = async () => {
    if (!suiteId || !projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch suite info
      const suiteData = await testSuiteService.getTestSuiteDetail(
        projectId,
        suiteId,
      );
      setSuite(suiteData);

      // Fetch specification if apiSpecId exists
      if (suiteData.apiSpecId) {
        try {
          const specData = await specificationService.getSpecificationById(
            projectId,
            suiteData.apiSpecId,
          );
          setSpecification(specData);
        } catch (err) {
          console.error("Failed to fetch specification:", err);
        }
      }

      // Fetch test cases
      const response = await apiService.get(
        `/test-suites/${suiteId}/test-cases`,
      );
      setTestCases(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = (testCaseId: string) => {
    navigate(`/test-suites/${suiteId}/test-cases/${testCaseId}`);
  };

  const toggleTestCaseSelection = (testCaseId: string) => {
    const newSelection = new Set(selectedTestCases);
    if (newSelection.has(testCaseId)) {
      newSelection.delete(testCaseId);
    } else {
      newSelection.add(testCaseId);
    }

    setSelectedTestCases(newSelection);
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredTestCases.map((tc) => tc.id);
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedTestCases.has(id));

    const newSelection = new Set(selectedTestCases);

    if (allSelected) {
      filteredIds.forEach((id) => newSelection.delete(id));
    } else {
      filteredIds.forEach((id) => newSelection.add(id));
    }

    setSelectedTestCases(newSelection);
  };

  const handleExecute = (selectedOnly: boolean) => {
    if (!suiteId) return;

    const params = new URLSearchParams({
      suiteId,
    });

    if (projectId) {
      params.set("projectId", projectId);
    }

    if (selectedOnly && selectedTestCases.size > 0) {
      params.set("testCaseIds", Array.from(selectedTestCases).join(","));
    }

    navigate(`/runs?${params.toString()}`);
  };

  const handleDelete = async (testCaseId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;

    try {
      await apiService.delete(
        `/test-suites/${suiteId}/test-cases/${testCaseId}`,
      );
      showSuccessToast("Test case deleted successfully");
      fetchData();
    } catch (err) {
      handleError(err);
    }
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

  const getTestTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "happypath":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "boundary":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "negative":
        return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
  };

  const filteredTestCases = testCases.filter((tc) => {
    const matchesSearch =
      !searchTerm ||
      tc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || tc.testType === filterType;
    return matchesSearch && matchesType;
  });

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

  return (
    <MainLayout title="Test Cases">
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <button
              onClick={() => navigate(`/test-suites/${suiteId}`)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">Back to Suite</span>
            </button>
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              Test Cases
            </h1>
            {suite && (
              <div className="space-y-1">
                <p className="text-on-surface-variant">
                  Suite: <span className="font-semibold">{suite.name}</span>
                </p>
                {specification && (
                  <p className="text-primary dark:text-indigo-400 font-semibold text-sm">
                    📄 API Spec: {specification.name}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedTestCases.size > 0 && (
              <button
                onClick={() => handleExecute(true)}
                className="px-6 py-3 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Play className="w-5 h-5" />
                Execute Selected ({selectedTestCases.size})
              </button>
            )}
            <button
              onClick={() => handleExecute(false)}
              disabled={testCases.length === 0}
              className="px-6 py-3 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-surface font-bold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Execute All
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
              placeholder="Search test cases..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
              Type
            </span>
            {["ALL", "HappyPath", "Boundary", "Negative"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type === "ALL" ? "" : type)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  (type === "ALL" && !filterType) || type === filterType
                    ? "bg-primary dark:bg-indigo-600 text-on-primary"
                    : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  filteredTestCases.length > 0 &&
                  filteredTestCases.every((tc) => selectedTestCases.has(tc.id))
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm font-medium text-on-surface">
                Select All
              </span>
            </label>
            <p className="text-sm text-on-surface-variant">
              Showing {filteredTestCases.length} of {testCases.length} test cases
            </p>
          </div>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
            {selectedTestCases.size} Selected
          </span>
        </div>

        {/* Test Cases Grid */}
        {filteredTestCases.length === 0 ? (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-12 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-center">
            <Sparkles className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              No test cases found
            </h3>
            <p className="text-on-surface-variant">
              {searchTerm || filterType
                ? "Try adjusting your filters"
                : "Generate test cases to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTestCases.map((testCase) => (
              <div
                key={testCase.id}
                className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTestCases.has(testCase.id)}
                      onChange={() => toggleTestCaseSelection(testCase.id)}
                      className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex flex-col gap-2">
                      <span
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter min-w-[60px] text-center",
                          getMethodColor(testCase.requestHttpMethod),
                        )}
                      >
                        {testCase.requestHttpMethod}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold text-center",
                          getTestTypeColor(testCase.testType),
                        )}
                      >
                        {testCase.testType}
                      </span>
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-lg font-bold text-on-surface tracking-tight">
                        {testCase.name}
                      </h3>
                      {testCase.description && (
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {testCase.description}
                        </p>
                      )}
                      <p className="text-xs font-mono text-on-surface-variant">
                        {testCase.requestUrl}
                      </p>
                      {testCase.tags && testCase.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {testCase.tags.map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Status
                      </p>
                      <div className="flex items-center gap-1.5">
                        {testCase.isEnabled ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-bold",
                            testCase.isEnabled
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-400",
                          )}
                        >
                          {testCase.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(testCase.id)}
                        className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit test case"
                      >
                        <Edit3 className="w-4 h-4 text-on-surface-variant" />
                      </button>
                      <button
                        onClick={() => handleDelete(testCase.id)}
                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        title="Delete test case"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
