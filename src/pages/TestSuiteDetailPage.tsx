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
  Search,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
import { apiService } from "../services/apiService";
import { useProject } from "../contexts/ProjectContext";
import testCaseService, { TestCase } from "../services/testCaseService";

interface SuiteSuggestionModel {
  id: string;
  suggestedName?: string;
  suggestedDescription?: string;
  testType?: string;
  suggestionType?: string;
  priority?: string;
  reviewStatus?: string;
  llmModel?: string;
  tokensUsed?: number;
  createdDateTime?: string;
}

type SuiteTab = "testcases" | "details" | "suggestions";

export default function TestSuiteDetailPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";
  const tabFromQuery = (searchParams.get("tab") || "details").toLowerCase();

  const [suite, setSuite] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suggestions, setSuggestions] = useState<SuiteSuggestionModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState<SuiteTab>("details");

  useEffect(() => {
    if (
      tabFromQuery === "testcases" ||
      tabFromQuery === "details" ||
      tabFromQuery === "suggestions"
    ) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const changeTab = (tab: SuiteTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const getBusinessContextMap = (suiteData: any): Record<string, string> => {
    if (!suiteData) return {};

    return (
      suiteData.endpointBusinessContexts ||
      suiteData.EndpointBusinessContexts ||
      {}
    );
  };

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
      console.log("Suite data from API:", suiteData);

      // WORKAROUND: Backend detail API returns testCaseCount=0, but list API returns correct count
      // Fetch from list to get correct testCaseCount
      try {
        const allSuites = await testSuiteService.getTestSuites(projectId);
        const suiteFromList = allSuites.find((s: any) => s.id === suiteId);
        if (suiteFromList && suiteFromList.testCaseCount !== undefined) {
          suiteData.testCaseCount = suiteFromList.testCaseCount;
          console.log(
            "Updated testCaseCount from list API:",
            suiteFromList.testCaseCount,
          );
        }
      } catch (err) {
        console.warn("Failed to fetch testCaseCount from list API:", err);
      }

      setSuite(suiteData);

      try {
        setIsLoadingTestCases(true);
        const testCaseResponse = await testCaseService.getTestCases(
          suiteId,
          1,
          300,
        );
        setTestCases(testCaseResponse.items || []);
      } catch (testCaseErr) {
        console.warn("Failed to load test cases:", testCaseErr);
        setTestCases([]);
      } finally {
        setIsLoadingTestCases(false);
      }

      try {
        setIsLoadingSuggestions(true);
        const suggestionResponse = await apiService.get<SuiteSuggestionModel[]>(
          `/test-suites/${suiteId}/llm-suggestions`,
        );
        setSuggestions(
          Array.isArray(suggestionResponse) ? suggestionResponse : [],
        );
      } catch (suggestionErr) {
        console.warn("Failed to load LLM suggestions:", suggestionErr);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }

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

      // Auto-create and approve proposal if it doesn't exist yet
      try {
        // Try to get the latest proposal
        let latestProposal;
        try {
          latestProposal = await apiService.get(
            `/test-suites/${suiteId}/order-proposals/latest`,
          );
        } catch (err: any) {
          // If 404, proposal doesn't exist yet, create it
          if (err.status === 404) {
            console.log("No proposal found, creating one...");
            latestProposal = await apiService.post(
              `/test-suites/${suiteId}/order-proposals`,
              {
                SpecificationId: suiteData.apiSpecId,
                SelectedEndpointIds: suiteData.selectedEndpointIds || [],
                Source: "User",
                ReasoningNote: "Initial proposal created on page load",
              },
            );
            console.log("Created initial proposal:", latestProposal);
          } else {
            throw err;
          }
        }

        // Approve if not already approved
        if (
          latestProposal &&
          latestProposal.proposalId &&
          latestProposal.status !== "Approved"
        ) {
          await apiService.post(
            `/test-suites/${suiteId}/order-proposals/${latestProposal.proposalId}/approve`,
            {
              RowVersion: latestProposal.rowVersion,
              ReviewNotes: "Auto-approved on page load",
            },
          );
          console.log("Order proposal auto-approved successfully");
        }
      } catch (approveErr) {
        // Silently fail - user can still manually approve if needed
        console.warn("Auto-approve on load failed:", approveErr);
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

  const handleGlobalBusinessRulesChange = (value: string) => {
    setSuite((prev: any) => {
      if (!prev) return prev;

      return {
        ...prev,
        globalBusinessRules: value,
      };
    });
    setHasChanges(true);
  };

  const handleEndpointContextChange = (endpointId: string, value: string) => {
    setSuite((prev: any) => {
      if (!prev) return prev;

      const contextMap = {
        ...getBusinessContextMap(prev),
      };

      if (!value.trim()) {
        delete contextMap[endpointId];
      } else {
        contextMap[endpointId] = value;
      }

      return {
        ...prev,
        endpointBusinessContexts: contextMap,
      };
    });
    setHasChanges(true);
  };

  const handleSaveOrder = async () => {
    if (!suite || !projectId) return;

    try {
      setIsSubmitting(true);
      const orderedIds = endpoints.map((ep) => ep.id);

      const updatedSuite = await testSuiteService.updateTestSuite(
        projectId,
        suite.id,
        {
          name: suite.name,
          description: suite.description,
          apiSpecId: suite.apiSpecId,
          generationType: suite.generationType,
          selectedEndpointIds: orderedIds,
          endpointBusinessContexts: getBusinessContextMap(suite),
          globalBusinessRules: suite.globalBusinessRules,
          rowVersion: suite.rowVersion,
        },
      );

      // Update suite with new rowVersion, but keep other fields like testCaseCount
      setSuite({ ...suite, ...updatedSuite });
      showSuccessToast("Suite configuration saved successfully");
      setHasChanges(false);

      // Create and approve the order proposal
      try {
        // Step 1: Create a new proposal with the ordered endpoints
        const newProposal = await apiService.post(
          `/test-suites/${suite.id}/order-proposals`,
          {
            SpecificationId: suite.apiSpecId,
            SelectedEndpointIds: orderedIds,
            Source: "User", // Valid values: Ai, User, System
            ReasoningNote: "Order updated by user",
          },
        );

        console.log("Created proposal:", newProposal);

        if (newProposal && newProposal.proposalId) {
          // Step 2: Approve the newly created proposal
          await apiService.post(
            `/test-suites/${suite.id}/order-proposals/${newProposal.proposalId}/approve`,
            {
              RowVersion: newProposal.rowVersion,
              ReviewNotes: "Auto-approved after order save",
            },
          );
          showSuccessToast("Order approved successfully");
        }
      } catch (approveErr) {
        // If auto-approve fails, show a warning but don't fail the whole operation
        console.error("Auto-approve failed:", approveErr);
        showErrorToast(
          "Order saved but approval failed. Please approve manually before generating test cases.",
        );
      }

      // Refresh data to ensure we have latest rowVersion
      await fetchData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateTestCases = async () => {
    if (!suite || !projectId) return;

    // Check if regenerating (already has test cases)
    const isRegenerate = suite.testCaseCount > 0;

    // Navigate to generating page with parameters
    navigate(
      `/test-suites/${suite.id}/generating?suiteId=${suite.id}&specId=${suite.apiSpecId}&regenerate=${isRegenerate}`,
    );
  };

  const handleRunTests = () => {
    navigate(`/test-runs/new?suiteId=${suiteId}`);
  };

  const refreshTestCases = async () => {
    if (!suiteId) return;

    try {
      setIsLoadingTestCases(true);
      const testCaseResponse = await testCaseService.getTestCases(
        suiteId,
        1,
        300,
      );
      setTestCases(testCaseResponse.items || []);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoadingTestCases(false);
    }
  };

  const refreshSuggestions = async () => {
    if (!suiteId) return;

    try {
      setIsLoadingSuggestions(true);
      const suggestionResponse = await apiService.get<SuiteSuggestionModel[]>(
        `/test-suites/${suiteId}/llm-suggestions`,
      );
      setSuggestions(
        Array.isArray(suggestionResponse) ? suggestionResponse : [],
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleGenerateSuggestions = async (forceRefresh = false) => {
    if (!suite || !suiteId || !suite.apiSpecId) {
      showErrorToast("Selected test suite does not have an API specification.");
      return;
    }

    try {
      setIsGeneratingSuggestions(true);

      try {
        await apiService.post(
          `/test-suites/${suiteId}/llm-suggestions/generate`,
          {
            specificationId: suite.apiSpecId,
            forceRefresh,
          },
        );
      } catch (err: any) {
        const statusCode = err?.status ?? err?.response?.status;
        const message = String(
          err?.message || err?.response?.data?.message || "",
        );
        const alreadyHasPendingSuggestions =
          statusCode === 400 &&
          (message.includes("ForceRefresh=true") ||
            message.includes("suggestion preview"));

        if (!alreadyHasPendingSuggestions) {
          throw err;
        }
      }

      await refreshSuggestions();
      showSuccessToast(
        forceRefresh
          ? "LLM suggestions regenerated successfully."
          : "LLM suggestions are ready.",
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsGeneratingSuggestions(false);
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

  const filteredEndpoints = endpoints.filter((endpoint) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      endpoint.path?.toLowerCase().includes(keyword) ||
      endpoint.description?.toLowerCase().includes(keyword) ||
      endpoint.tags?.some((tag: string) =>
        tag?.toLowerCase().includes(keyword),
      );

    const matchesMethod = !filterMethod || endpoint.method === filterMethod;

    return matchesSearch && matchesMethod;
  });

  const isFiltering = !!searchTerm.trim() || !!filterMethod;

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
            {activeTab === "details" && hasChanges && (
              <button
                onClick={handleSaveOrder}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            )}
            {activeTab === "details" && (
              <button
                onClick={handleGenerateTestCases}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Sparkles className="w-5 h-5" />
                {suite.testCaseCount === 0
                  ? "Generate Test Cases"
                  : "Regenerate Test Cases"}
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeTab("testcases")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === "testcases"
                ? "bg-primary text-white"
                : "bg-surface-container-high dark:bg-slate-800 text-on-surface",
            )}
          >
            Test Cases
          </button>
          <button
            type="button"
            onClick={() => changeTab("details")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === "details"
                ? "bg-primary text-white"
                : "bg-surface-container-high dark:bg-slate-800 text-on-surface",
            )}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => changeTab("suggestions")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === "suggestions"
                ? "bg-primary text-white"
                : "bg-surface-container-high dark:bg-slate-800 text-on-surface",
            )}
          >
            LLM Suggestion
          </button>
        </div>

        {activeTab === "testcases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">
                Test Cases ({testCases.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshTestCases}
                  disabled={isLoadingTestCases}
                  className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4",
                      isLoadingTestCases && "animate-spin",
                    )}
                  />
                  Refresh
                </button>
                <button
                  onClick={handleRunTests}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white font-semibold flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Execute
                </button>
              </div>
            </div>

            {isLoadingTestCases ? (
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading test cases...
              </div>
            ) : testCases.length === 0 ? (
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
                No test cases found for this suite.
              </div>
            ) : (
              <div className="space-y-2">
                {testCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {testCase.name}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {testCase.method} {testCase.path}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/test-suites/${suiteId}/test-cases/${testCase.id}`,
                          )
                        }
                        className="px-3 py-2 rounded-md bg-surface-container-high dark:bg-slate-800 text-xs font-semibold text-on-surface"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {suggestions.length === 0 ? (
                <button
                  onClick={() => handleGenerateSuggestions(false)}
                  disabled={isGeneratingSuggestions}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {isGeneratingSuggestions ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate
                </button>
              ) : (
                <button
                  onClick={() => setIsRegenerateModalOpen(true)}
                  disabled={isGeneratingSuggestions}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {isGeneratingSuggestions ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              )}
              <button
                onClick={refreshSuggestions}
                disabled={isLoadingSuggestions}
                className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4",
                    isLoadingSuggestions && "animate-spin",
                  )}
                />
                Refresh
              </button>
            </div>

            {isLoadingSuggestions ? (
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading LLM suggestions...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
                No LLM suggestions found for this suite.
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800"
                  >
                    <p className="text-sm font-semibold text-on-surface">
                      {suggestion.suggestedName || "Untitled suggestion"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {suggestion.suggestedDescription || "No description"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-2 uppercase tracking-widest">
                      {suggestion.testType ||
                        suggestion.suggestionType ||
                        "Unknown"}{" "}
                      • {suggestion.reviewStatus || "Pending"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
                  placeholder="Search endpoints..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
                  Method
                </span>
                {["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"].map(
                  (method) => (
                    <button
                      key={method}
                      onClick={() =>
                        setFilterMethod(method === "ALL" ? "" : method)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                        (method === "ALL" && !filterMethod) ||
                          method === filterMethod
                          ? "bg-primary dark:bg-indigo-600 text-on-primary"
                          : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                      )}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Info Banner */}
            {suite.testCaseCount === 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                <p className="text-sm text-amber-800 dark:text-amber-400">
                  💡 No test cases yet. Click "Generate Test Cases" to let LLM
                  automatically create test cases for all endpoints in this
                  suite. You can reorder endpoints below to control the
                  execution sequence.
                </p>
              </div>
            )}

            {/* Endpoints List - Drag & Drop */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 dark:border-slate-800">
                <h2 className="text-xl font-bold text-on-surface">
                  Endpoints ({filteredEndpoints.length}/{endpoints.length})
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {isFiltering
                    ? "Filtering is active. Clear search/filter to reorder endpoints."
                    : "Drag and drop to reorder execution sequence"}
                </p>
                <div className="mt-4">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Global Business Rules
                  </label>
                  <textarea
                    value={suite.globalBusinessRules || ""}
                    onChange={(e) =>
                      handleGlobalBusinessRulesChange(e.target.value)
                    }
                    placeholder="Optional rules for all endpoints, e.g. User must verify email before checkout"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {filteredEndpoints.length === 0 ? (
                  <div className="px-6 py-12 text-center text-on-surface-variant">
                    No endpoints match current search/filter
                  </div>
                ) : (
                  filteredEndpoints.map((endpoint, index) => (
                    <div
                      key={endpoint.id}
                      draggable={!isFiltering}
                      onDragStart={() => !isFiltering && handleDragStart(index)}
                      onDragOver={(e) =>
                        !isFiltering && handleDragOver(e, index)
                      }
                      onDragEnd={() => !isFiltering && handleDragEnd()}
                      className={cn(
                        "px-6 py-4 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors",
                        draggedIndex === index && "opacity-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-4",
                          !isFiltering && "cursor-move",
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

                      <div className="mt-3 ml-12">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                          Endpoint Business Context
                        </label>
                        <textarea
                          value={
                            getBusinessContextMap(suite)[endpoint.id] || ""
                          }
                          onChange={(e) =>
                            handleEndpointContextChange(
                              endpoint.id,
                              e.target.value,
                            )
                          }
                          placeholder="Optional rule for this endpoint, e.g. Only allow registration for users >= 17"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <Modal
          isOpen={isRegenerateModalOpen}
          onClose={() => setIsRegenerateModalOpen(false)}
          title="Regenerate LLM Suggestions"
          footer={
            <>
              <button
                onClick={() => setIsRegenerateModalOpen(false)}
                disabled={isGeneratingSuggestions}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsRegenerateModalOpen(false);
                  await handleGenerateSuggestions(true);
                }}
                disabled={isGeneratingSuggestions}
                className="px-8 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingSuggestions && (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                Confirm Regenerate
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-on-surface">
              This will force refresh LLM suggestions for this suite.
            </p>
            <p className="text-sm text-on-surface-variant">
              Use this when you want to regenerate new suggestions instead of
              keeping existing pending data.
            </p>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
