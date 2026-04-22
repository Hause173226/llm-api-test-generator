import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  GripVertical,
  Loader2,
  AlertTriangle,
  Save,
  Play,
  Search,
  RefreshCw,
  CheckCircle2,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import GlobalSpinner from "../components/ui/GlobalSpinner";
import {
  handleError,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
import { apiService } from "../services/apiService";
import { useProject } from "../contexts/ProjectContext";
import testCaseService, { TestCase } from "../services/testCaseService";
import testSuiteLlmSuggestionService, {
  SuiteSuggestionModel,
  SuiteSuggestionQuery,
} from "../services/testSuiteLlmSuggestionService";
import SuggestionReviewPanel from "../components/test-runs/SuggestionReviewPanel";
import Modal from "../components/ui/Modal";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
type ProposalApiResponse = {
  proposalId?: string;
  ProposalId?: string;
  rowVersion?: string;
  RowVersion?: string;
  status?: string;
  Status?: string;
  proposedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  ProposedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  userModifiedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  UserModifiedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  appliedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  AppliedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
};

type SuiteTab = "testcases" | "details" | "suggestions";

type LocalGenerationRun = {
  id: string;
  generatedAt: string;
};

type GenerationItem = {
  id: string;
  label: string;
  generatedAt?: string;
  totalSuggestions: number;
  pendingSuggestions: number;
  approvedSuggestions: number;
  rejectedSuggestions: number;
  supersededSuggestions: number;
  testCaseIds: string[];
  suggestionIds: string[];
};

export default function TestSuiteDetailPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();
  const { t } = useTranslation();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";
  const tabFromQuery = (searchParams.get("tab") || "details").toLowerCase();

  const [suite, setSuite] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [allSpecEndpoints, setAllSpecEndpoints] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suggestions, setSuggestions] = useState<SuiteSuggestionModel[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<SuiteSuggestionModel[]>(
    [],
  );
  const [archivedSuggestions, setArchivedSuggestions] = useState<
    SuiteSuggestionModel[]
  >([]);
  const [generationRuns, setGenerationRuns] = useState<LocalGenerationRun[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isReviewingSuggestion, setIsReviewingSuggestion] = useState(false);
  const [isBulkReviewingSuggestions, setIsBulkReviewingSuggestions] =
    useState(false);
  const [isBulkRestoringSuggestions, setIsBulkRestoringSuggestions] =
    useState(false);
  const [isBulkApprovingSuggestions, setIsBulkApprovingSuggestions] =
    useState(false);
  const [isLoadingSuggestionDetail, setIsLoadingSuggestionDetail] =
    useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");
  const [addEndpointModalOpen, setAddEndpointModalOpen] = useState(false);
  const [manualEndpointModalOpen, setManualEndpointModalOpen] = useState(false);
  const [selectedEndpointIdsToAdd, setSelectedEndpointIdsToAdd] = useState<
    string[]
  >([]);
  const [manualEndpointForm, setManualEndpointForm] = useState({
    method: "GET",
    path: "",
    description: "",
  });
  const [isCreatingEndpoint, setIsCreatingEndpoint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasApprovedOrderOnce, setHasApprovedOrderOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [testCaseSearchTerm, setTestCaseSearchTerm] = useState("");
  const [testCaseFilterMethod, setTestCaseFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState<SuiteTab>("details");
  const [suggestionReviewStatusFilter, setSuggestionReviewStatusFilter] =
    useState("");
  const [suggestionTestTypeFilter, setSuggestionTestTypeFilter] = useState("");
  const [suggestionEndpointFilter, setSuggestionEndpointFilter] = useState("");
  const [expandedGenerationItemId, setExpandedGenerationItemId] = useState<
    string | null
  >(null);
  const hasAnyTestCases =
    Number(suite?.testCaseCount ?? 0) > 0 || testCases.length > 0;
  const hasGeneratedSuggestions = allSuggestions.length > 0;
  // Chỉ tính isStep1Completed sau khi load xong để tránh redirect nhầm
  const isStep1Completed = !isLoading && !hasChanges && hasGeneratedSuggestions;

  const breadcrumbs = useProjectBreadcrumbs(
    t("testSuites.title"),
    suite?.name || undefined,
  );

  const generationStorageKey = suiteId
    ? `suite-generation-runs:${suiteId}`
    : "suite-generation-runs:unknown";

  useEffect(() => {
    if (!suiteId) {
      setGenerationRuns([]);
      return;
    }

    try {
      const raw = localStorage.getItem(generationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const items = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.generatedAt === "string",
          )
        : [];

      setGenerationRuns(
        items.sort(
          (a: LocalGenerationRun, b: LocalGenerationRun) =>
            new Date(a.generatedAt).getTime() -
            new Date(b.generatedAt).getTime(),
        ),
      );
    } catch {
      setGenerationRuns([]);
    }
  }, [suiteId, generationStorageKey]);

  const persistGenerationRuns = (nextRuns: LocalGenerationRun[]) => {
    if (!suiteId) return;
    localStorage.setItem(generationStorageKey, JSON.stringify(nextRuns));
    setGenerationRuns(nextRuns);
  };

  const appendGenerationRun = (generatedAt: string) => {
    if (!suiteId) return;

    const run: LocalGenerationRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      generatedAt,
    };

    const nextRuns = [...generationRuns, run].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    persistGenerationRuns(nextRuns);
  };

  const getSuggestionFilters = (
    overrides?: Partial<SuiteSuggestionQuery>,
  ): SuiteSuggestionQuery => ({
    reviewStatus:
      overrides?.reviewStatus !== undefined
        ? overrides.reviewStatus
        : suggestionReviewStatusFilter || undefined,
    testType:
      overrides?.testType !== undefined
        ? overrides.testType
        : suggestionTestTypeFilter || undefined,
    endpointId:
      overrides?.endpointId !== undefined
        ? overrides.endpointId
        : suggestionEndpointFilter || undefined,
  });

  const applySuggestionToLocalState = (updated: SuiteSuggestionModel) => {
    setSuggestions((prev) => {
      const index = prev.findIndex((item) => item.id === updated.id);
      if (index === -1) {
        return [updated, ...prev];
      }

      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (
      tabFromQuery === "testcases" ||
      tabFromQuery === "details" ||
      tabFromQuery === "suggestions"
    ) {
      if (tabFromQuery === "suggestions" && !isStep1Completed) {
        setActiveTab("details");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "details");
        setSearchParams(params, { replace: true });
        return;
      }

      if (tabFromQuery === "testcases" && !hasAnyTestCases) {
        setActiveTab("details");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "details");
        setSearchParams(params, { replace: true });
      } else {
        setActiveTab(tabFromQuery as SuiteTab);
      }
    }
  }, [tabFromQuery, hasAnyTestCases, isStep1Completed, isLoading]);

  const changeTab = (tab: SuiteTab) => {
    const nextTab = tab === "testcases" && !hasAnyTestCases ? "details" : tab;

    if (tab === "testcases" && !hasAnyTestCases) {
      showInfoToast(
        "Chua co test case. Vui long tao test case trong tab Details.",
      );
    }

    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
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

  const availableSpecEndpoints = allSpecEndpoints.filter(
    (endpoint) => !endpoints.some((selected) => selected.id === endpoint.id),
  );

  const handleAddEndpointsFromSpec = () => {
    if (selectedEndpointIdsToAdd.length === 0) {
      showInfoToast("Please choose at least one endpoint to add.");
      return;
    }

    const selectedSet = new Set(selectedEndpointIdsToAdd);
    const toAdd = allSpecEndpoints.filter((endpoint) =>
      selectedSet.has(endpoint.id),
    );
    if (toAdd.length === 0) {
      showInfoToast("No valid endpoints selected.");
      return;
    }

    setEndpoints((prev) => {
      const prevIds = new Set(prev.map((item) => item.id));
      const deduped = toAdd.filter((item) => !prevIds.has(item.id));
      return [...prev, ...deduped];
    });
    setHasChanges(true);
    setSelectedEndpointIdsToAdd([]);
    setAddEndpointModalOpen(false);
    showSuccessToast(`Added ${toAdd.length} endpoint(s) to Step 1.`);
  };

  const handleCreateManualEndpoint = async () => {
    if (!projectId || !suite?.apiSpecId) {
      showErrorToast("Missing project/spec context.");
      return;
    }

    const path = manualEndpointForm.path.trim();
    if (!path) {
      showErrorToast("Endpoint path is required.");
      return;
    }

    try {
      setIsCreatingEndpoint(true);
      const method = manualEndpointForm.method.toUpperCase();

      const created = await endpointService.createEndpoint(
        projectId,
        suite.apiSpecId,
        {
          path,
          method: method as any,
          httpMethod: method,
          description: manualEndpointForm.description.trim() || undefined,
        } as any,
      );

      const normalized = {
        id: created?.id,
        projectId,
        path: created?.path || path,
        method: String(created?.method || method).toUpperCase(),
        description:
          created?.description || manualEndpointForm.description.trim(),
        tags: created?.tags || [],
      };

      if (!normalized.id) {
        showErrorToast("Create endpoint failed: missing endpoint id.");
        return;
      }

      setAllSpecEndpoints((prev) => {
        if (prev.some((item) => item.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
      setEndpoints((prev) => {
        if (prev.some((item) => item.id === normalized.id)) return prev;
        return [...prev, normalized];
      });

      setHasChanges(true);
      setManualEndpointForm({ method: "GET", path: "", description: "" });
      setManualEndpointModalOpen(false);
      showSuccessToast("Manual endpoint created and added to Step 1.");
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreatingEndpoint(false);
    }
  };

  const fetchData = async () => {
    if (!suiteId || !projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      let approvedOrderDetected = false;
      let hasLoadedSuggestions = false;

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
        const [loadedSuggestions] = await Promise.all([
          refreshSuggestions(),
          refreshAllSuggestions(),
        ]);
        hasLoadedSuggestions = Array.isArray(loadedSuggestions)
          ? loadedSuggestions.length > 0
          : false;
      } catch (suggestionErr) {
        console.warn("Failed to load LLM suggestions:", suggestionErr);
        setAllSuggestions([]);
        hasLoadedSuggestions = false;
      }

      // Fetch all endpoints for this spec and map selected ones into Step 1 order
      if (suiteData.apiSpecId) {
        const response = await endpointService.getEndpoints(
          suiteData.projectId,
          suiteData.apiSpecId,
        );

        const allEndpoints = response.items || [];
        setAllSpecEndpoints(allEndpoints);

        const normalizeOrder = (
          items?: Array<{ endpointId?: string; orderIndex?: number }>,
        ) =>
          (items || [])
            .filter((item) => Boolean(item?.endpointId))
            .sort(
              (a, b) =>
                (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
                (b.orderIndex ?? Number.MAX_SAFE_INTEGER),
            )
            .map((item) => item.endpointId as string);

        let orderedEndpointIds: string[] = suiteData.selectedEndpointIds || [];

        try {
          const latestProposal = await apiService.get<ProposalApiResponse>(
            `/test-suites/${suiteId}/order-proposals/latest`,
          );

          const latestProposalStatus = String(
            latestProposal?.status || latestProposal?.Status || "",
          ).toLowerCase();

          const appliedOrder = normalizeOrder(
            latestProposal?.appliedOrder || latestProposal?.AppliedOrder,
          );
          const userModifiedOrder = normalizeOrder(
            latestProposal?.userModifiedOrder ||
              latestProposal?.UserModifiedOrder,
          );
          const proposedOrder = normalizeOrder(
            latestProposal?.proposedOrder || latestProposal?.ProposedOrder,
          );

          const proposalOrder =
            appliedOrder.length > 0
              ? appliedOrder
              : userModifiedOrder.length > 0
                ? userModifiedOrder
                : proposedOrder;

          if (proposalOrder.length > 0) {
            orderedEndpointIds = proposalOrder;
          }

          if (
            appliedOrder.length > 0 ||
            latestProposalStatus === "approved" ||
            latestProposalStatus === "applied"
          ) {
            approvedOrderDetected = true;
          }
        } catch (proposalErr) {
          console.warn(
            "Failed to load latest order proposal, fallback to suite selectedEndpointIds.",
            proposalErr,
          );
        }

        // Filter and sort endpoints based on latest order proposal (fallback: selectedEndpointIds)
        const orderedEndpoints = orderedEndpointIds
          .map((id: string) => allEndpoints.find((ep: any) => ep.id === id))
          .filter(Boolean);

        setEndpoints(orderedEndpoints);
      } else {
        setAllSpecEndpoints([]);
        setEndpoints([]);
      }

      setHasApprovedOrderOnce(approvedOrderDetected || hasLoadedSuggestions);
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

  const handleSaveOrder = async (): Promise<boolean> => {
    if (!suite || !projectId) return false;

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
        const newProposal = await apiService.post<ProposalApiResponse>(
          `/test-suites/${suite.id}/order-proposals`,
          {
            SpecificationId: suite.apiSpecId,
            SelectedEndpointIds: orderedIds,
            Source: "User", // Valid values: Ai, User, System
            ReasoningNote: "Order updated by user",
          },
        );

        console.log("Created proposal:", newProposal);

        const proposalId = newProposal?.proposalId || newProposal?.ProposalId;
        const proposalRowVersion =
          newProposal?.rowVersion || newProposal?.RowVersion;

        if (proposalId) {
          // Step 2: Approve the newly created proposal
          await apiService.post(
            `/test-suites/${suite.id}/order-proposals/${proposalId}/approve`,
            {
              RowVersion: proposalRowVersion,
              ReviewNotes: "Auto-approved after order save",
            },
          );
          setHasApprovedOrderOnce(true);
          showSuccessToast("Order approved successfully");

          try {
            await testSuiteLlmSuggestionService.generate(suite.id, {
              specificationId: suite.apiSpecId,
              forceRefresh: true,
            });
            appendGenerationRun(new Date().toISOString());
            showSuccessToast("AI preview regenerated after approval.");
          } catch (suggestionErr: any) {
            const statusCode =
              suggestionErr?.status ?? suggestionErr?.response?.status;
            const message = String(
              suggestionErr?.message ||
                suggestionErr?.response?.data?.message ||
                "",
            );
            const alreadyHasPendingSuggestions =
              statusCode === 400 &&
              (message.includes("ForceRefresh=true") ||
                message.includes("suggestion preview"));

            if (!alreadyHasPendingSuggestions) {
              console.error(
                "Failed to auto-generate LLM suggestions after approval:",
                suggestionErr,
              );
              showErrorToast(
                "Order approved but AI preview generation failed.",
              );
            }
          }
        }
      } catch (approveErr) {
        // If auto-approve fails, show a warning but don't fail the whole operation
        console.error("Auto-approve failed:", approveErr);
        showErrorToast(
          "Order saved but approval failed. Please approve manually before AI review.",
        );
      }

      // Refresh data to ensure we have latest rowVersion
      await fetchData();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOrderAndGoToReview = async () => {
    const success = await handleSaveOrder();
    if (success) {
      changeTab("suggestions");
    }
  };

  const handleRunTests = () => {
    navigate(`/runs?suiteId=${suiteId}`);
  };

  const refreshTestCases = async (): Promise<TestCase[]> => {
    if (!suiteId) return [];

    try {
      setIsLoadingTestCases(true);
      const testCaseResponse = await testCaseService.getTestCases(
        suiteId,
        1,
        300,
      );
      const items = testCaseResponse.items || [];
      setTestCases(items);
      return items;
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      setIsLoadingTestCases(false);
    }
  };

  const refreshSuggestions = async (): Promise<SuiteSuggestionModel[]> => {
    if (!suiteId) return [];

    try {
      setIsLoadingSuggestions(true);
      const items = await testSuiteLlmSuggestionService.list(suiteId);
      const result = Array.isArray(items) ? items : [];
      setAllSuggestions(result);
      return result;
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Refresh archived (superseded) suggestions used only for timeline/history view
  const refreshArchivedSuggestions = async (): Promise<
    SuiteSuggestionModel[]
  > => {
    if (!suiteId) return [];

    try {
      const items = await testSuiteLlmSuggestionService.list(suiteId, {
        reviewStatus: "Superseded",
      });
      const result = Array.isArray(items) ? items : [];
      setArchivedSuggestions(result);
      return result;
    } catch (err) {
      handleError(err);
      setArchivedSuggestions([]);
      return [];
    }
  };

  // Refresh both active and archived suggestions; return active suggestions for compatibility
  const refreshAllSuggestions = async (): Promise<SuiteSuggestionModel[]> => {
    const active = await refreshSuggestions();
    // Keep archived refresh separate to avoid disturbing active loading flag
    await refreshArchivedSuggestions();
    return active;
  };

  const handleGenerateSuggestions = async (forceRefresh = false) => {
    if (!suite || !suiteId || !suite.apiSpecId) {
      showErrorToast("Selected test suite does not have an API specification.");
      return;
    }

    try {
      setIsGeneratingSuggestions(true);

      // H-01: Check order gate status before generation/suggestion
      try {
        const gateStatus = await testSuiteService.getOrderGateStatus(suiteId);
        if (!gateStatus.isGatePassed) {
          showErrorToast(
            gateStatus.message ||
              "Order gate not passed. Please approve the API order proposal first.",
          );
          setIsGeneratingSuggestions(false);
          return;
        }
      } catch (gateErr: any) {
        console.warn("Could not check order gate status:", gateErr);
        // Continue anyway; BE will reject if gate not passed
      }

      try {
        await testSuiteLlmSuggestionService.generate(suiteId, {
          specificationId: suite.apiSpecId,
          forceRefresh,
        });
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
      await refreshAllSuggestions();
      appendGenerationRun(new Date().toISOString());
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

  const handleOpenSuggestionDetail = async (suggestionId: string) => {
    if (!suiteId || !suggestionId) return null as any;

    try {
      setIsLoadingSuggestionDetail(true);
      const detail = await testSuiteLlmSuggestionService.detail(
        suiteId,
        suggestionId,
      );
      applySuggestionToLocalState(detail);
      return detail;
    } catch (err) {
      handleError(err);
      return null as any;
    } finally {
      setIsLoadingSuggestionDetail(false);
    }
  };

  const getLatestSuggestion = async (suggestion: SuiteSuggestionModel) => {
    if (suggestion.rowVersion) return suggestion;
    if (!suiteId) return suggestion;

    const detail = await testSuiteLlmSuggestionService.detail(
      suiteId,
      suggestion.id,
    );
    applySuggestionToLocalState(detail);
    return detail;
  };

  const maybeAutoNavigateToTestCases = (
    nextSuggestions: SuiteSuggestionModel[],
    nextTestCases: TestCase[],
  ) => {
    if (activeTab !== "suggestions") return;

    const hasPending = nextSuggestions.some(
      (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
    );
    const hasCases =
      nextTestCases.length > 0 || Number(suite?.testCaseCount ?? 0) > 0;

    if (!hasPending && hasCases) {
      // Dùng setActiveTab trực tiếp để bypass check hasAnyTestCases cũ trong changeTab
      setActiveTab("testcases");
      const params = new URLSearchParams(searchParams);
      params.set("tab", "testcases");
      setSearchParams(params, { replace: true });
    }
  };

  const handleApproveSuggestion = async (
    suggestion: SuiteSuggestionModel,
    payload?: {
      reviewNotes?: string;
      modifiedContent: {
        name?: string;
        description?: string;
        testType?: string;
        priority?: string;
        tags?: string[];
      };
    },
  ) => {
    if (!suiteId) return;

    try {
      setIsReviewingSuggestion(true);
      const latest = await getLatestSuggestion(suggestion);

      if (!latest.rowVersion) {
        showErrorToast(
          "Missing rowVersion for review. Please refresh and try again.",
        );
        return;
      }

      const result = await testSuiteLlmSuggestionService.review(
        suiteId,
        latest.id,
        {
          action: payload?.modifiedContent ? "Modify" : "Approve",
          rowVersion: latest.rowVersion,
          reviewNotes: payload?.reviewNotes,
          modifiedContent: payload?.modifiedContent,
        },
      );

      applySuggestionToLocalState(result);
      showSuccessToast(
        payload?.modifiedContent
          ? "Edited suggestion approved successfully."
          : "Suggestion approved successfully.",
      );

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);
      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsReviewingSuggestion(false);
    }
  };

  const handleRejectSuggestion = async (
    suggestion: SuiteSuggestionModel,
    reviewNotes: string,
  ): Promise<boolean> => {
    if (!suiteId) return false;

    try {
      setIsReviewingSuggestion(true);
      const latest = await getLatestSuggestion(suggestion);

      if (!latest.rowVersion) {
        showErrorToast(
          "Missing rowVersion for review. Please refresh and try again.",
        );
        return false;
      }

      const result = await testSuiteLlmSuggestionService.review(
        suiteId,
        latest.id,
        {
          action: "Reject",
          rowVersion: latest.rowVersion,
          reviewNotes,
        },
      );

      applySuggestionToLocalState(result);
      showSuccessToast("Suggestion reviewed successfully.");
      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);
      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsReviewingSuggestion(false);
    }
  };

  const handleBulkReview = async (
    action: "Approve" | "Reject",
    rejectNotes?: string,
  ) => {
    if (!suiteId) return;

    const hasFilteredSuggestions = displayedSuggestions.length > 0;
    if (!hasFilteredSuggestions) {
      showInfoToast("No suggestions available for current filters.");
      return;
    }

    if (action === "Reject" && !rejectNotes?.trim()) {
      setBulkRejectNotes("");
      setBulkRejectModalOpen(true);
      return;
    }

    try {
      setIsBulkReviewingSuggestions(true);
      const result = await testSuiteLlmSuggestionService.bulkReview(suiteId, {
        action,
        reviewNotes: rejectNotes?.trim() || undefined,
        filterByTestType: suggestionTestTypeFilter || undefined,
        filterByEndpointId: suggestionEndpointFilter || undefined,
      });

      showSuccessToast(
        `${action} completed. Processed ${result?.processedCount || 0} suggestion(s).`,
      );

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);
      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkReviewingSuggestions(false);
    }
  };

  const handleBulkRestore = async (suggestionIds: string[]) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast("No suggestions selected for restore.");
      return;
    }

    try {
      setIsBulkRestoringSuggestions(true);
      const result = await testSuiteLlmSuggestionService.bulkRestore(suiteId, {
        suggestionIds,
      });

      showSuccessToast(
        `Restore processed. Restored ${result?.processedCount || suggestionIds.length} suggestion(s).`,
      );

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);

      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkRestoringSuggestions(false);
    }
  };

  const handleBulkApprove = async (suggestionIds: string[]) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast("No suggestions selected for approve.");
      return;
    }

    try {
      setIsBulkApprovingSuggestions(true);
      const result = await testSuiteLlmSuggestionService.bulkApprove(suiteId, {
        suggestionIds,
      });

      showSuccessToast(
        `Approve processed. Approved ${result?.processedCount || suggestionIds.length} suggestion(s).`,
      );

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);

      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkApprovingSuggestions(false);
    }
  };

  const handleBulkRejectConfirm = async () => {
    if (!bulkRejectNotes.trim()) {
      showErrorToast("Review notes are required for bulk reject.");
      return;
    }
    setBulkRejectModalOpen(false);
    await handleBulkReview("Reject", bulkRejectNotes.trim());
    setBulkRejectNotes("");
  };

  const clearSuggestionFilters = () => {
    setSuggestionReviewStatusFilter("");
    setSuggestionTestTypeFilter("");
    setSuggestionEndpointFilter("");
  };

  const reviewableSuggestions = allSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() !== "superseded",
  );

  const pendingSuggestionsCount = reviewableSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
  ).length;
  const approvedSuggestionsCount = reviewableSuggestions.filter((item) => {
    const status = String(item.reviewStatus || "").toLowerCase();
    return status === "approved" || status === "modifiedandapproved";
  }).length;
  const rejectedSuggestionsCount = reviewableSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() === "rejected",
  ).length;
  const filteredApprovedSuggestionsCount = allSuggestions.filter((item) => {
    const status = String(item.reviewStatus || "").toLowerCase();
    return status === "approved" || status === "modifiedandapproved";
  }).length;
  const shouldShowSuggestionBulkActions = allSuggestions.some(
    (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
  );

  const steps: Array<{
    id: SuiteTab;
    title: string;
    helper: string;
    isDone: boolean;
  }> = [
    {
      id: "details",
      title: "Step 1: Configure",
      helper: hasChanges
        ? "Endpoint changes pending approval"
        : allSuggestions.length > 0
          ? "Order approved and AI preview is available"
          : "Approve order to generate AI preview",
      isDone: isStep1Completed,
    },
    {
      id: "suggestions",
      title: "Step 2: AI Review",
      helper:
        reviewableSuggestions.length === 0
          ? "Generate AI suggestions"
          : `${pendingSuggestionsCount} pending, ${approvedSuggestionsCount} approved`,
      isDone:
        reviewableSuggestions.length > 0 &&
        pendingSuggestionsCount === 0 &&
        approvedSuggestionsCount > 0,
    },
    {
      id: "testcases",
      title: "Step 3: Test Cases",
      helper: hasAnyTestCases
        ? `${testCases.length || suite?.testCaseCount || 0} test cases ready`
        : "No test cases yet",
      isDone: hasAnyTestCases,
    },
  ];

  const activeStepIndex = steps.findIndex((step) => step.id === activeTab);

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

  const getTestCaseMethod = (testCase: TestCase): string => {
    const method = String((testCase as any).method || "").toUpperCase();
    return method || "GET";
  };

  const filteredTestCases = testCases.filter((testCase) => {
    const keyword = testCaseSearchTerm.trim().toLowerCase();
    const method = getTestCaseMethod(testCase);
    const testType = String((testCase as any).testType || "").toLowerCase();

    const matchesSearch =
      !keyword ||
      testCase.name?.toLowerCase().includes(keyword) ||
      testCase.description?.toLowerCase().includes(keyword) ||
      testCase.path?.toLowerCase().includes(keyword) ||
      method.toLowerCase().includes(keyword) ||
      testType.includes(keyword);

    const matchesMethod =
      !testCaseFilterMethod || method === testCaseFilterMethod;

    return matchesSearch && matchesMethod;
  });

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

  const getSuggestionDate = (suggestion: SuiteSuggestionModel) => {
    const value = suggestion.createdDateTime || suggestion.updatedDateTime;
    if (!value) return null;

    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  };

  const fallbackGenerationItems = () => {
    // Cluster suggestions by time-gap so two generate actions close in time are still separated.
    const splitGapMs = 20 * 1000;
    const combined = [...allSuggestions, ...archivedSuggestions];
    const withTime = combined
      .map((suggestion) => ({
        suggestion,
        time: getSuggestionDate(suggestion),
      }))
      .sort((a, b) => {
        if (a.time === null && b.time === null) return 0;
        if (a.time === null) return -1;
        if (b.time === null) return 1;
        return a.time - b.time;
      });

    const groups: Array<{
      id: string;
      generatedAt?: string;
      items: SuiteSuggestionModel[];
    }> = [];
    let currentGroup: {
      id: string;
      generatedAt?: string;
      items: SuiteSuggestionModel[];
    } | null = null;
    let lastTime: number | null = null;

    for (const entry of withTime) {
      const { suggestion, time } = entry;

      if (!currentGroup) {
        currentGroup = {
          id: `auto-${time ?? `unknown-${suggestion.id}`}`,
          generatedAt: time !== null ? new Date(time).toISOString() : undefined,
          items: [suggestion],
        };
        lastTime = time;
        continue;
      }

      if (time === null || lastTime === null || time - lastTime <= splitGapMs) {
        currentGroup.items.push(suggestion);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: `auto-${time}`,
          generatedAt: new Date(time).toISOString(),
          items: [suggestion],
        };
      }

      if (time !== null) {
        lastTime = time;
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups
      .map((group, index) => {
        const items = group.items;

        const pendingSuggestions = items.filter(
          (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
        ).length;
        const approvedSuggestions = items.filter((item) => {
          const status = String(item.reviewStatus || "").toLowerCase();
          return status === "approved" || status === "modifiedandapproved";
        }).length;
        const rejectedSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "rejected",
        ).length;
        const supersededSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "superseded",
        ).length;

        return {
          id: group.id,
          label: `Generate #${index + 1}`,
          generatedAt: group.generatedAt,
          totalSuggestions: items.length,
          pendingSuggestions,
          approvedSuggestions,
          rejectedSuggestions,
          supersededSuggestions,
          testCaseIds: Array.from(
            new Set(
              items
                .map((item) => item.appliedTestCaseId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
          suggestionIds: items.map((item) => item.id),
        } as GenerationItem;
      })
      .sort((a, b) => {
        const aTime = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const bTime = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return aTime - bTime;
      });
  };

  const generationItems: GenerationItem[] = (() => {
    const combinedForTimeline = [...allSuggestions, ...archivedSuggestions];
    if (combinedForTimeline.length === 0) {
      return [];
    }

    // If local run markers are missing or only partially available, fallback clustering is safer.
    if (generationRuns.length <= 1) {
      return fallbackGenerationItems();
    }

    const sortedRuns = [...generationRuns].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    const groups = new Map<string, SuiteSuggestionModel[]>();
    sortedRuns.forEach((run) => groups.set(run.id, []));

    combinedForTimeline.forEach((suggestion) => {
      const suggestionTime = getSuggestionDate(suggestion);
      if (suggestionTime === null) {
        const firstRun = sortedRuns[0];
        groups.set(firstRun.id, [
          ...(groups.get(firstRun.id) || []),
          suggestion,
        ]);
        return;
      }

      let assignedRunId = sortedRuns[0].id;
      for (let i = 0; i < sortedRuns.length; i++) {
        const currentRun = sortedRuns[i];
        const nextRun = sortedRuns[i + 1];
        const currentTime = new Date(currentRun.generatedAt).getTime();
        const nextTime = nextRun
          ? new Date(nextRun.generatedAt).getTime()
          : Number.POSITIVE_INFINITY;

        if (suggestionTime >= currentTime && suggestionTime < nextTime) {
          assignedRunId = currentRun.id;
          break;
        }

        if (suggestionTime >= currentTime) {
          assignedRunId = currentRun.id;
        }
      }

      groups.set(assignedRunId, [
        ...(groups.get(assignedRunId) || []),
        suggestion,
      ]);
    });

    return sortedRuns
      .map((run, index) => {
        const items = groups.get(run.id) || [];

        const pendingSuggestions = items.filter(
          (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
        ).length;
        const approvedSuggestions = items.filter((item) => {
          const status = String(item.reviewStatus || "").toLowerCase();
          return status === "approved" || status === "modifiedandapproved";
        }).length;
        const rejectedSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "rejected",
        ).length;
        const supersededSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "superseded",
        ).length;

        return {
          id: run.id,
          label: `Generate #${index + 1}`,
          generatedAt: run.generatedAt,
          totalSuggestions: items.length,
          pendingSuggestions,
          approvedSuggestions,
          rejectedSuggestions,
          supersededSuggestions,
          testCaseIds: Array.from(
            new Set(
              items
                .map((item) => item.appliedTestCaseId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
          suggestionIds: items.map((item) => item.id),
        };
      })
      .filter((item) => item.totalSuggestions > 0)
      .sort(
        (a, b) =>
          new Date(a.generatedAt || 0).getTime() -
          new Date(b.generatedAt || 0).getTime(),
      );
  })();

  useEffect(() => {
    if (
      expandedGenerationItemId &&
      !generationItems.some((item) => item.id === expandedGenerationItemId)
    ) {
      setExpandedGenerationItemId(null);
    }
  }, [expandedGenerationItemId, generationItems]);

  const expandedGenerationItem = expandedGenerationItemId
    ? generationItems.find((item) => item.id === expandedGenerationItemId)
    : undefined;

  const displayedSuggestions = (() => {
    const base = expandedGenerationItem
      ? // When viewing a specific generation, include both active and archived (superseded)
        [...allSuggestions, ...archivedSuggestions].filter((item) =>
          new Set(expandedGenerationItem.suggestionIds).has(item.id),
        )
      : allSuggestions;

    return base.filter((item) => {
      if (suggestionReviewStatusFilter) {
        if (
          String(item.reviewStatus || "").toLowerCase() !==
          suggestionReviewStatusFilter.toLowerCase()
        )
          return false;
      }
      if (suggestionTestTypeFilter) {
        if (
          String(item.testType || "").toLowerCase() !==
          suggestionTestTypeFilter.toLowerCase()
        )
          return false;
      }
      if (suggestionEndpointFilter) {
        if (item.endpointId !== suggestionEndpointFilter) return false;
      }
      return true;
    });
  })();

  const handleRunGenerationItem = (item: GenerationItem) => {
    if (!suiteId) return;

    if (item.testCaseIds.length === 0) {
      showInfoToast(
        "This generation has no approved test cases yet. Approve suggestions first.",
      );
      return;
    }

    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("batchLabel", item.label);
    if (item.generatedAt) {
      params.set("generatedAt", item.generatedAt);
    }
    params.set("testCaseIds", item.testCaseIds.join(","));
    navigate(`/test-suites/${suiteId}/generation-run?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
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
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="text-center py-20">
          <p className="text-on-surface-variant">Test suite not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      {isSubmitting && <GlobalSpinner label="Đang xử lý..." />}

      {/* Bulk Reject Modal */}
      <Modal
        isOpen={bulkRejectModalOpen}
        onClose={() => {
          if (!isBulkReviewingSuggestions) setBulkRejectModalOpen(false);
        }}
        title="Bulk Reject Suggestions"
        footer={
          <>
            <button
              onClick={() => setBulkRejectModalOpen(false)}
              disabled={isBulkReviewingSuggestions}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkRejectConfirm}
              disabled={isBulkReviewingSuggestions || !bulkRejectNotes.trim()}
              className="px-8 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isBulkReviewingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Confirm Reject All
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            This will reject all{" "}
            <span className="font-bold text-on-surface">
              {
                displayedSuggestions.filter(
                  (s) =>
                    String(s.reviewStatus || "").toLowerCase() === "pending",
                ).length
              }
            </span>{" "}
            pending suggestions matching current filters.
          </p>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Review Notes (required)
            </label>
            <textarea
              value={bulkRejectNotes}
              onChange={(e) => setBulkRejectNotes(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder="Explain why these suggestions should be rejected"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={addEndpointModalOpen}
        onClose={() => setAddEndpointModalOpen(false)}
        title="Add Endpoints From Spec"
        footer={
          <>
            <button
              onClick={() => setAddEndpointModalOpen(false)}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEndpointsFromSpec}
              disabled={selectedEndpointIdsToAdd.length === 0}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Selected ({selectedEndpointIdsToAdd.length})
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {availableSpecEndpoints.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              All endpoints from this spec are already in Step 1.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {availableSpecEndpoints.map((endpoint) => {
                const checked = selectedEndpointIdsToAdd.includes(endpoint.id);
                return (
                  <label
                    key={endpoint.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEndpointIdsToAdd((prev) => [
                            ...prev,
                            endpoint.id,
                          ]);
                        } else {
                          setSelectedEndpointIdsToAdd((prev) =>
                            prev.filter((id) => id !== endpoint.id),
                          );
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface">
                        {endpoint.method} {endpoint.path}
                      </p>
                      {!!endpoint.description && (
                        <p className="text-xs text-on-surface-variant mt-1 truncate">
                          {endpoint.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={manualEndpointModalOpen}
        onClose={() => {
          if (!isCreatingEndpoint) setManualEndpointModalOpen(false);
        }}
        title="Add Manual Endpoint"
        footer={
          <>
            <button
              onClick={() => setManualEndpointModalOpen(false)}
              disabled={isCreatingEndpoint}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateManualEndpoint}
              disabled={isCreatingEndpoint || !manualEndpointForm.path.trim()}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreatingEndpoint ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Endpoint
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Method
              </label>
              <select
                value={manualEndpointForm.method}
                onChange={(e) =>
                  setManualEndpointForm((prev) => ({
                    ...prev,
                    method: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Path
              </label>
              <input
                value={manualEndpointForm.path}
                onChange={(e) =>
                  setManualEndpointForm((prev) => ({
                    ...prev,
                    path: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                placeholder="/api/products/{id}"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={manualEndpointForm.description}
              onChange={(e) =>
                setManualEndpointForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder="Optional description"
            />
          </div>
        </div>
      </Modal>

      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
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
              {activeTab === "details" && (!isStep1Completed || hasChanges) && (
                <button
                  onClick={handleApproveOrderAndGoToReview}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {hasChanges && hasApprovedOrderOnce
                    ? "Save & Approve Order"
                    : "Approve Order"}
                </button>
              )}
            </div>
          </header>

          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {steps.map((step, index) => {
                const isActive = step.id === activeTab;
                const isAccessible =
                  step.id === "details" ||
                  (step.id === "suggestions" && isStep1Completed) ||
                  (step.id === "testcases" && hasAnyTestCases);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (!isAccessible) {
                        if (step.id === "suggestions") {
                          showInfoToast(
                            "Complete Step 1 by clicking Approve Order before moving to AI Review.",
                          );
                        } else {
                          showInfoToast(
                            "Complete previous steps before opening Test Cases.",
                          );
                        }
                        return;
                      }
                      changeTab(step.id);
                    }}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-on-surface">
                        {step.title}
                      </p>
                      {step.isDone && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {step.helper}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">
                      {isActive
                        ? "Current"
                        : isAccessible
                          ? "Available"
                          : "Locked"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-surface-container-low dark:bg-slate-800/60 p-3 flex flex-wrap items-center gap-3 justify-between">
              <p className="text-sm font-semibold text-on-surface">
                Workflow Progress: Step {activeStepIndex + 1}/3
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                  Pending AI: {pendingSuggestionsCount}
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800">
                  Approved: {approvedSuggestionsCount}
                </span>
                <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800">
                  Rejected: {rejectedSuggestionsCount}
                </span>
              </div>
            </div>
          </div>

          {activeTab === "testcases" && (
            <div className="space-y-4">
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Generated Items
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Open one generation batch at a time
                  </p>
                </div>

                {generationItems.length === 0 ? (
                  <div className="text-sm text-on-surface-variant">
                    No generation item detected yet. Generate and approve
                    suggestions to create executable items.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generationItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-outline-variant/10 dark:border-slate-800 p-3 bg-surface-container-low dark:bg-slate-800/50"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-on-surface">
                              {item.label}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {item.generatedAt
                                ? new Date(item.generatedAt).toLocaleString()
                                : "Unknown generate time"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Suggestions: {item.totalSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                                Approved: {item.approvedSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">
                                Pending: {item.pendingSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-rose-100 text-rose-800">
                                Rejected: {item.rejectedSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-200 text-slate-700">
                                Superseded: {item.supersededSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                                Test cases: {item.testCaseIds.length}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRunGenerationItem(item)}
                            disabled={item.testCaseIds.length === 0}
                            className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4" />
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-sm text-on-surface-variant">
                Detailed test-case listing is hidden on this screen.
              </div>
            </div>
          )}

          {activeTab === "suggestions" && (
            <div className="space-y-4">
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Generate Timeline
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Suggestions grouped by each generation run
                  </p>
                </div>

                {generationItems.length === 0 ? (
                  <div className="text-sm text-on-surface-variant">
                    No generation run detected yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generationItems.map((item, index) => {
                      // Highlight if all suggestions are superseded
                      const isSupersededBatch =
                        item.supersededSuggestions === item.totalSuggestions &&
                        item.totalSuggestions > 0;
                      return (
                        <div
                          key={item.id}
                          className={
                            `rounded-lg border border-outline-variant/10 dark:border-slate-800 p-3 ` +
                            (isSupersededBatch
                              ? "bg-slate-200 dark:bg-slate-700/80 opacity-80"
                              : "bg-surface-container-low dark:bg-slate-800/50")
                          }
                        >
                          {(() => {
                            const isExpanded =
                              expandedGenerationItemId === item.id;
                            return (
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-on-surface">
                                      {item.label}
                                    </p>
                                    {index === generationItems.length - 1 && (
                                      <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase tracking-wider">
                                        Latest
                                      </span>
                                    )}
                                    {isSupersededBatch && (
                                      <span className="px-2 py-0.5 rounded bg-slate-400 text-white text-[10px] font-bold uppercase tracking-wider">
                                        Superseded
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-on-surface-variant">
                                    {item.generatedAt
                                      ? new Date(
                                          item.generatedAt,
                                        ).toLocaleString()
                                      : "Unknown generate time"}
                                  </p>
                                </div>

                                <div className="flex flex-col items-start md:items-end gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                      Total: {item.totalSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">
                                      Pending: {item.pendingSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                                      Approved: {item.approvedSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-rose-100 text-rose-800">
                                      Rejected: {item.rejectedSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-slate-200 text-slate-700">
                                      Superseded: {item.supersededSuggestions}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newId =
                                        expandedGenerationItemId === item.id
                                          ? null
                                          : item.id;
                                      setExpandedGenerationItemId(newId);
                                      // Reset filter về All khi mở generation item để hiện tất cả suggestions
                                      if (newId) {
                                        setSuggestionReviewStatusFilter("");
                                        setSuggestionTestTypeFilter("");
                                        setSuggestionEndpointFilter("");
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-md bg-primary dark:bg-indigo-600 text-on-primary text-xs font-semibold flex items-center gap-1"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                    {isExpanded ? "Hide" : "Open"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {expandedGenerationItem ? (
                <SuggestionReviewPanel
                  suggestions={displayedSuggestions}
                  allSuggestions={allSuggestions}
                  endpoints={endpoints}
                  isLoadingSuggestions={isLoadingSuggestions}
                  isReviewingSuggestion={isReviewingSuggestion}
                  isLoadingSuggestionDetail={isLoadingSuggestionDetail}
                  reviewStatusFilter={suggestionReviewStatusFilter}
                  testTypeFilter={suggestionTestTypeFilter}
                  endpointFilter={suggestionEndpointFilter}
                  onReviewStatusFilterChange={setSuggestionReviewStatusFilter}
                  onTestTypeFilterChange={setSuggestionTestTypeFilter}
                  onEndpointFilterChange={setSuggestionEndpointFilter}
                  onApplyFilters={async (filters) => {
                    setSuggestionReviewStatusFilter(filters.reviewStatus);
                    setSuggestionTestTypeFilter(filters.testType);
                    setSuggestionEndpointFilter(filters.endpointId);
                  }}
                  onClearFilters={clearSuggestionFilters}
                  onLoadDetail={handleOpenSuggestionDetail}
                  onApprove={handleApproveSuggestion}
                  onReject={handleRejectSuggestion}
                  onBulkRestore={handleBulkRestore}
                  isBulkRestoringSuggestions={isBulkRestoringSuggestions}
                  onBulkApprove={handleBulkApprove}
                  isBulkApprovingSuggestions={isBulkApprovingSuggestions}
                />
              ) : (
                <div className="text-sm text-on-surface-variant text-center py-8">
                  Open a generation batch above to review its suggestions.
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
              {!hasAnyTestCases && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    💡 No test cases yet. Continue to "AI Review" after saving
                    this step, then approve suggestions to materialize test
                    cases. You can reorder endpoints below to control the
                    sequence first.
                  </p>
                </div>
              )}

              {/* Endpoints List - Drag & Drop */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">
                        Endpoints ({filteredEndpoints.length}/{endpoints.length}
                        )
                      </h2>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {isFiltering
                          ? "Filtering is active. Clear search/filter to reorder endpoints."
                          : "Drag and drop to reorder execution sequence"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEndpointIdsToAdd([]);
                          setAddEndpointModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface text-xs font-semibold"
                      >
                        Add From Spec
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualEndpointForm({
                            method: "GET",
                            path: "",
                            description: "",
                          });
                          setManualEndpointModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Manual
                      </button>
                    </div>
                  </div>
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
                        onDragStart={() =>
                          !isFiltering && handleDragStart(index)
                        }
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
        </div>
      </MainLayout>
    </>
  );
}
