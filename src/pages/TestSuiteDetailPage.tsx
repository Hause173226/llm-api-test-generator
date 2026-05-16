import React, { useState, useEffect } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
  Link,
} from "react-router-dom";
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
  ShieldCheck,
  FileText,
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
import srsService, { type SrsDocument } from "../services/srsService";
import { useProject } from "../contexts/ProjectContext";
import testCaseService, { TestCase } from "../services/testCaseService";
import testSuiteLlmSuggestionService, {
  GenerationJobStatus,
  SuiteSuggestionModel,
  SuiteSuggestionQuery,
} from "../services/testSuiteLlmSuggestionService";
import SuggestionReviewPanel from "../components/test-runs/SuggestionReviewPanel";
import Modal from "../components/ui/Modal";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
type ProposalApiResponse = {
  proposalId?: string;
  ProposalId?: string;
  rowVersion?: string;
  RowVersion?: string;
  status?: number | string;
  Status?: number | string;
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
  suggestionIds?: string[];
  completedAt?: string;
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();
  const { t } = useTranslation();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";
  const tabFromQuery = (searchParams.get("tab") || "details").toLowerCase();

  useEffect(() => {
    isRouteActiveRef.current =
      location.pathname === `/test-suites/${suiteId}`;
  }, [location.pathname, suiteId]);

  const SUPPRESS_NOT_FOUND_WINDOW_MS = 8000;
  const suppressNotFoundToastUntilRef = React.useRef(0);
  const lastProjectIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      suppressNotFoundToastUntilRef.current =
        Date.now() + SUPPRESS_NOT_FOUND_WINDOW_MS;
      if (suiteId) {
        navigate("/test-suites", { replace: true });
      }
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate, suiteId]);

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
  const [suggestionGenerationStatus, setSuggestionGenerationStatus] =
    useState<GenerationJobStatus | null>(null);
  const isGeneratingSuggestionsRef = React.useRef(false);
  const isRouteActiveRef = React.useRef(true);
  const [isReviewingSuggestion, setIsReviewingSuggestion] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [forceOpenSuggestions, setForceOpenSuggestions] = useState(false);
  const [isBulkReviewingSuggestions, setIsBulkReviewingSuggestions] =
    useState(false);
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    title: "",
    message: "",
    stepLabel: "",
  });
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
  // Track the last-saved endpoint order to detect real changes after drag-and-drop
  const savedOrderRef = React.useRef<string[]>([]);
  const [hasApprovedOrderOnce, setHasApprovedOrderOnce] = useState(false);
  const [srsDocuments, setSrsDocuments] = useState<SrsDocument[]>([]);
  const [linkedSrsDocId, setLinkedSrsDocId] = useState<string>("");
  const [isLinkingSrsDoc, setIsLinkingSrsDoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [testCaseSearchTerm, setTestCaseSearchTerm] = useState("");
  const [testCaseFilterMethod, setTestCaseFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState<SuiteTab>("details");
  const [isTabPinned, setIsTabPinned] = useState<boolean>(false);
  const [hasRestoredUiState, setHasRestoredUiState] = useState<boolean>(false);
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

  // True when the suite now has an SRS linked but existing pending suggestions
  // were generated before the SRS was linked (hasSrsContext === false).
  // Signals user to regenerate so the LLM actually uses the SRS requirements.
  const hasStaleNoSrsSuggestions =
    !!linkedSrsDocId &&
    allSuggestions.some(
      (s) => s.reviewStatus === "Pending" && !s.hasSrsContext,
    );

  const breadcrumbs = useProjectBreadcrumbs(
    t("testSuites.title"),
    suite?.name || undefined,
  );

  const generationStorageKey = suiteId
    ? `suite-generation-runs:${suiteId}`
    : "suite-generation-runs:unknown";

  const uiStateStorageKey = suiteId
    ? `suite-ui-state:${suiteId}`
    : "suite-ui-state:unknown";

  useEffect(() => {
    if (!suiteId) {
      setGenerationRuns([]);
      return;
    }

    try {
      const raw = localStorage.getItem(generationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const items: LocalGenerationRun[] = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.generatedAt === "string",
          )
        : [];

      // Cleanup strategy:
      // - Always keep completed runs.
      // - Keep the newest pending run if it is recent so the loading
      //   state survives navigation (e.g. user switches tabs).
      // - Otherwise, keep only recent pending runs to avoid stale
      //   "Generating..." markers.
      const PENDING_CLEANUP_MS = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      const isCompletedRun = (run: LocalGenerationRun) =>
        !!run.completedAt ||
        (Array.isArray((run as any).suggestionIds) &&
          (run as any).suggestionIds.length > 0);

      const isRecentPendingRun = (run: LocalGenerationRun) => {
        const time = new Date(run.generatedAt).getTime();
        if (!Number.isFinite(time)) return false;
        return now - time <= PENDING_CLEANUP_MS;
      };

      const completedRuns = items.filter(isCompletedRun);
      const pendingRuns = items.filter((r) => !isCompletedRun(r));

      let cleaned: LocalGenerationRun[] = [];
      if (completedRuns.length > 0) {
        const latestPending = [...pendingRuns]
          .sort(
            (a, b) =>
              new Date(a.generatedAt).getTime() -
              new Date(b.generatedAt).getTime(),
          )
          .pop();

        cleaned =
          latestPending && isRecentPendingRun(latestPending)
            ? [...completedRuns, latestPending]
            : [...completedRuns];
      } else {
        cleaned = pendingRuns.filter(isRecentPendingRun);
      }

      const sorted = cleaned.sort(
        (a: LocalGenerationRun, b: LocalGenerationRun) =>
          new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
      );

      setGenerationRuns(sorted);
    } catch {
      setGenerationRuns([]);
    }
  }, [suiteId, generationStorageKey]);

  // Restore UI state (active tab, expanded generation item, pinned flag)
  // from localStorage. If the URL does not specify a `tab`, restore the
  // saved tab; also set activeTab directly when restoring so the page
  // immediately reflects the user's last sub-screen.
  useEffect(() => {
    if (!suiteId) return;

    try {
      const raw = localStorage.getItem(uiStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw || "{}");

      const storedTab = parsed?.activeTab;
      const storedExpanded = parsed?.expandedGenerationItemId;
      const storedPinned = Boolean(parsed?.isTabPinned);

      setIsTabPinned(storedPinned);

      // If URL already specifies a tab, honor it. Otherwise restore.
      if (!searchParams.get("tab") && storedTab) {
        const params = new URLSearchParams(searchParams);
        params.set("tab", storedTab);
        setSearchParams(params, { replace: true });
      }

      if (storedTab) {
        setActiveTab(storedTab as SuiteTab);
        setHasRestoredUiState(true);
      } else {
        setHasRestoredUiState(false);
      }

      if (storedExpanded) {
        setExpandedGenerationItemId(storedExpanded);
      }
    } catch (e) {
      // ignore
    }
  }, [suiteId]);

  // Remember the last visited test suite so sidebar can reopen it
  useEffect(() => {
    if (!suiteId) return;
    try {
      localStorage.setItem("lastVisitedTestSuite", suiteId);
    } catch (e) {
      // ignore
    }
  }, [suiteId]);

  // Persist UI state when active tab or expanded generation item changes
  useEffect(() => {
    if (!suiteId) return;
    try {
      const payload = {
        activeTab,
        expandedGenerationItemId,
        isTabPinned,
      };
      localStorage.setItem(uiStateStorageKey, JSON.stringify(payload));
    } catch (e) {
      // ignore
    }
  }, [suiteId, activeTab, expandedGenerationItemId, isTabPinned]);

  // Clear the "restored" flag when suiteId changes so subsequent navigation
  // can re-evaluate auto-tab behavior for the new suite.
  useEffect(() => {
    setHasRestoredUiState(false);
  }, [suiteId]);

  const persistGenerationRuns = (nextRuns: LocalGenerationRun[]) => {
    if (!suiteId) return;
    localStorage.setItem(generationStorageKey, JSON.stringify(nextRuns));
    setGenerationRuns(nextRuns);
  };

  const getCurrentGenerationRuns = (): LocalGenerationRun[] => {
    if (!suiteId) return [];
    try {
      const raw = localStorage.getItem(generationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return generationRuns || [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.generatedAt === "string",
      ) as LocalGenerationRun[];
    } catch {
      return generationRuns || [];
    }
  };

  const updateGenerationRun = (
    runId: string,
    patch: Partial<LocalGenerationRun>,
  ) => {
    if (!suiteId) return;
    const nextRuns = getCurrentGenerationRuns().map((r) =>
      r.id === runId ? { ...r, ...patch } : r,
    );
    persistGenerationRuns(nextRuns);
  };

  const appendGenerationRun = (
    generatedAt: string,
  ): LocalGenerationRun | undefined => {
    if (!suiteId) return undefined;

    const run: LocalGenerationRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      generatedAt,
    };

    // Remove older runs that are still pending (no suggestionIds) because
    // a newly started generation supersedes them. Keeping old pending
    // runs causes confusing "Generating..." entries for earlier runs.
    const retainedRuns = getCurrentGenerationRuns().filter(
      (r) =>
        !!r.completedAt ||
        (Array.isArray(r.suggestionIds) && (r.suggestionIds || []).length > 0),
    );

    const nextRuns = [...retainedRuns, run].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    persistGenerationRuns(nextRuns);
    return run;
  };

  const removeGenerationRun = (runId: string) => {
    if (!suiteId) return;
    const nextRuns = getCurrentGenerationRuns().filter((r) => r.id !== runId);
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
    // If the user has pinned a tab, or we just restored the UI state from
    // localStorage, avoid automatic tab changes.
    if (isTabPinned || hasRestoredUiState) return;

    if (
      tabFromQuery === "testcases" ||
      tabFromQuery === "details" ||
      tabFromQuery === "suggestions"
    ) {
      // Allow staying on Suggestions tab if there's an active pending generation.
      if (
        tabFromQuery === "suggestions" &&
        !isStep1Completed &&
        !forceOpenSuggestions &&
        !pendingGeneration
      ) {
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
  }, [
    tabFromQuery,
    hasAnyTestCases,
    isStep1Completed,
    isLoading,
    forceOpenSuggestions,
    pendingGeneration,
  ]);

  // Auto-navigate to Step 3 whenever the user is on the suggestions tab,
  // all suggestions are reviewed (0 pending), and test cases exist.
  // This covers: (a) last approval just happened, (b) user re-opens the tab
  // when everything is already approved.
  useEffect(() => {
    if (activeTab !== "suggestions") return;
    if (isLoading || isLoadingSuggestions) return;
    if (overlayState.isVisible) return; // already transitioning

    const hasPending = allSuggestions.some(
      (s) => String(s.reviewStatus || "").toLowerCase() === "pending",
    );
    const hasCases =
      testCases.length > 0 || Number(suite?.testCaseCount ?? 0) > 0;

    if (!hasPending && hasCases && allSuggestions.length > 0) {
      // All suggestions are reviewed — release the pin so navigation proceeds,
      // even if the user had previously pinned this tab manually.
      setIsTabPinned(false);
      setOverlayState({
        isVisible: true,
        title: "Moving to Step 3: Test Cases",
        message: "All suggestions reviewed. Preparing your test cases...",
        stepLabel: "Step 2 → Step 3",
      });
      const timer = setTimeout(() => {
        setActiveTab("testcases");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "testcases");
        setSearchParams(params, { replace: true });
        setOverlayState({
          isVisible: false,
          title: "",
          message: "",
          stepLabel: "",
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    isLoading,
    isLoadingSuggestions,
    allSuggestions,
    testCases,
    suite,
  ]);

  const changeTab = (tab: SuiteTab) => {
    const nextTab = tab === "testcases" && !hasAnyTestCases ? "details" : tab;

    if (tab === "testcases" && !hasAnyTestCases) {
      showInfoToast(
        "Chua co test case. Vui long tao test case trong tab Details.",
      );
    }

    // User-initiated tab change: pin this tab so auto-navigation won't override it.
    setIsTabPinned(true);
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

  // Keep pending generation visible based on persisted generation runs.
  // This ensures the "Generating…" card remains visible across tab changes
  // or other UI interactions until the server produces suggestionIds for the run.
  useEffect(() => {
    if (!generationRuns || generationRuns.length === 0) {
      setPendingGeneration(null);
      return;
    }

    const sorted = [...generationRuns].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    // Prefer the latest run that does not yet have suggestionIds attached
    const pendingRun = [...sorted]
      .reverse()
      .find(
        (r) =>
          !r.completedAt && (!r.suggestionIds || r.suggestionIds.length === 0),
      );

    if (!pendingRun) {
      setPendingGeneration(null);
      return;
    }

    const idx = sorted.findIndex((r) => r.id === pendingRun.id);
    setPendingGeneration({ id: pendingRun.id, label: `Generate #${idx + 1}` });
  }, [generationRuns]);

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
    if (!isRouteActiveRef.current) return;

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

      // Load SRS documents for this project to allow linking
      try {
        const docs = await srsService.listDocuments(projectId);
        setSrsDocuments(docs);
        const linked = docs.find((d) => d.testSuiteId === suiteId);
        setLinkedSrsDocId(linked?.id ?? "");
      } catch {
        // non-critical
      }

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
        savedOrderRef.current = orderedEndpoints.map((ep: any) => ep.id);
      } else {
        setAllSpecEndpoints([]);
        setEndpoints([]);
      }

      setHasApprovedOrderOnce(approvedOrderDetected || hasLoadedSuggestions);
    } catch (err) {
      const statusCode =
        (err as any)?.status ||
        (err as any)?.response?.status ||
        (err as any)?.statusCode;
      const isNotFound = statusCode === 404;
      const isActivePath =
        window.location.pathname === `/test-suites/${suiteId}`;
      const suppressNotFoundToast =
        Date.now() < suppressNotFoundToastUntilRef.current;
      const suppressToast =
        !isActivePath || (isNotFound && suppressNotFoundToast);
      setError(handleError(err, undefined, suppressToast));
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
    // Only mark dirty when the current order actually differs from the saved order
    const newOrder = newEndpoints.map((ep: any) => ep.id);
    const saved = savedOrderRef.current;
    const isDifferent =
      newOrder.length !== saved.length ||
      newOrder.some((id, i) => id !== saved[i]);
    setHasChanges(isDifferent);
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
      // Update savedOrder to reflect the newly committed order
      savedOrderRef.current = endpoints.map((ep) => ep.id);

      // Create and approve the order proposal
      try {
        // Step 1: Create a new proposal with the ordered endpoints
        const newProposal = await apiService.post<ProposalApiResponse>(
          `/test-suites/${suite.id}/order-proposals`,
          {
            specificationId: suite.apiSpecId,
            selectedEndpointIds: orderedIds,
            source: "User",
            reasoningNote: "Order updated by user",
          },
        );

        console.log("Created proposal:", newProposal);

        const proposalId = newProposal?.proposalId || newProposal?.ProposalId;
        const proposalRowVersion =
          newProposal?.rowVersion || newProposal?.RowVersion;

        if (proposalId && proposalRowVersion) {
          // Step 2: Reorder to enforce the user-defined order
          const reordered = await apiService.put<ProposalApiResponse>(
            `/test-suites/${suite.id}/order-proposals/${proposalId}/reorder`,
            {
              orderedEndpointIds: orderedIds,
              rowVersion: proposalRowVersion,
              reviewNotes: "Reordered after suite save",
            },
          );

          const reorderedRowVersion =
            reordered?.rowVersion || reordered?.RowVersion;

          if (!reorderedRowVersion) {
            throw new Error("Missing rowVersion after reorder.");
          }

          // Step 3: Approve the reordered proposal
          await apiService.post(
            `/test-suites/${suite.id}/order-proposals/${proposalId}/approve`,
            {
              rowVersion: reorderedRowVersion,
              reviewNotes: "Auto-approved after order save",
            },
          );
          setHasApprovedOrderOnce(true);
          showSuccessToast("Order approved successfully");

          // Launch generation in background so the form submit spinner can clear
          const launchGeneration = async () => {
            if (!beginSuggestionGeneration("auto")) return;
            const nextIndex = (generationRuns?.length || 0) + 1;
            let run: LocalGenerationRun | undefined;
            try {
              setForceOpenSuggestions(true);
              setActiveTab("suggestions");
              const params = new URLSearchParams(searchParams);
              params.set("tab", "suggestions");
              setSearchParams(params, { replace: true });

              // create a run marker before generation so suggestions can be grouped
              run = appendGenerationRun(new Date().toISOString());
              const runId = run?.id ?? `pending-${Date.now()}`;
              setPendingGeneration({
                id: runId,
                label: `Generate #${nextIndex}`,
              });
              setExpandedGenerationItemId(runId);
              setIsGeneratingSuggestions(true);

              try {
                const accepted = await testSuiteLlmSuggestionService.generate(
                  suite.id,
                  {
                    specificationId: suite.apiSpecId,
                    forceRefresh: true,
                  },
                );

                const terminalStatus = await pollSuggestionGeneration(
                  accepted.jobId,
                );

                if (terminalStatus === "Completed") {
                  await finalizeSuggestionGeneration(run);
                  if (run && run.id) {
                    updateGenerationRun(run.id, {
                      completedAt: new Date().toISOString(),
                    });
                  }
                  showSuccessToast("AI preview regenerated after approval.");
                } else if (terminalStatus === "Cancelled") {
                  if (run && run.id) removeGenerationRun(run.id);
                  showInfoToast("LLM suggestion generation was cancelled.");
                } else {
                  throw new Error("LLM suggestion generation failed.");
                }
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

                // Remove run marker when generation did not actually produce a new run
                if (run && run.id) removeGenerationRun(run.id);

                if (alreadyHasPendingSuggestions) {
                  // fetch existing suggestions so UI reflects current state
                  await refreshSuggestions();
                  await refreshAllSuggestions();
                } else {
                  console.error(
                    "Failed to auto-generate LLM suggestions after approval:",
                    suggestionErr,
                  );
                  showErrorToast(
                    "Order approved but AI preview generation failed.",
                  );
                }
              }
            } finally {
              setIsGeneratingSuggestions(false);
              setSuggestionGenerationStatus(null);
              setForceOpenSuggestions(false);
              endSuggestionGeneration();
            }
          };

          // Fire-and-forget so that isSubmitting can clear
          setTimeout(() => {
            launchGeneration().catch((e) =>
              console.error("Background generation failed", e),
            );
          }, 0);
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

  const handleLinkSrsDoc = async (newDocId: string) => {
    if (!projectId) return;
    setIsLinkingSrsDoc(true);
    try {
      // Unlink old document if switching
      if (linkedSrsDocId && linkedSrsDocId !== newDocId) {
        await srsService.linkTestSuite(projectId, linkedSrsDocId, null);
      }
      if (newDocId) {
        await srsService.linkTestSuite(projectId, newDocId, suiteId!);
      }
      setLinkedSrsDocId(newDocId);
      showSuccessToast(
        newDocId ? "Đã liên kết tài liệu SRS." : "Đã hủy liên kết.",
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsLinkingSrsDoc(false);
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
      handleError(err, undefined, !isRouteActiveRef.current);
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
      handleError(err, undefined, !isRouteActiveRef.current);
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
      handleError(err, undefined, !isRouteActiveRef.current);
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

  const beginSuggestionGeneration = (source: "manual" | "auto") => {
    if (isGeneratingSuggestionsRef.current) {
      if (source === "manual") {
        showInfoToast("LLM suggestions are already generating.");
      }
      return false;
    }
    isGeneratingSuggestionsRef.current = true;
    return true;
  };

  const endSuggestionGeneration = () => {
    isGeneratingSuggestionsRef.current = false;
  };

  const pollSuggestionGeneration = async (
    jobId: string,
  ): Promise<GenerationJobStatus> => {
    if (!suiteId) {
      throw new Error("Missing test suite id for suggestion polling.");
    }

    const timeoutAt = Date.now() + 300000;

    while (Date.now() < timeoutAt) {
      const job = await testSuiteLlmSuggestionService.getGenerationStatus(
        suiteId,
        jobId,
      );
      setSuggestionGenerationStatus(job.status);

      if (
        job.status === "Completed" ||
        job.status === "Failed" ||
        job.status === "Cancelled"
      ) {
        return job.status;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, job.status === "WaitingForCallback" ? 5000 : 2500),
      );
    }

    throw new Error("LLM suggestion generation timed out.");
  };

  const finalizeSuggestionGeneration = async (
    run?: LocalGenerationRun,
  ): Promise<SuiteSuggestionModel[]> => {
    // Backend can report Completed slightly before freshly generated suggestions
    // are visible in list API. Retry briefly so Step 2 can render immediately.
    const previousCount = allSuggestions.length;
    const runStartedAt = run?.generatedAt ? new Date(run.generatedAt).getTime() : 0;
    const hasFreshItems = (items: SuiteSuggestionModel[]) =>
      items.some((item) => {
        const value = item.createdDateTime || item.updatedDateTime;
        if (!value) return false;
        const time = new Date(value).getTime();
        return Number.isFinite(time) && time >= runStartedAt;
      });

    let nextSuggestions = await refreshSuggestions();
    const deadline = Date.now() + 20000;
    while (
      Date.now() < deadline &&
      nextSuggestions.length <= previousCount &&
      !hasFreshItems(nextSuggestions)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      nextSuggestions = await refreshSuggestions();
    }
    await refreshArchivedSuggestions();

    const pendingSuggestionIds = nextSuggestions
      .filter(
        (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
      )
      .map((item) => item.id);

    if (run?.id && pendingSuggestionIds.length > 0) {
      updateGenerationRun(run.id, { suggestionIds: pendingSuggestionIds });
    }

    return nextSuggestions;
  };

  const handleGenerateSuggestions = async (forceRefresh = false) => {
    if (!suite || !suiteId || !suite.apiSpecId) {
      showErrorToast("Selected test suite does not have an API specification.");
      return;
    }

    if (!beginSuggestionGeneration("manual")) return;

    const nextIndex = (generationRuns?.length || 0) + 1;
    let run: LocalGenerationRun | undefined;

    try {
      setForceOpenSuggestions(true);
      setActiveTab("suggestions");
      const params = new URLSearchParams(searchParams);
      params.set("tab", "suggestions");
      setSearchParams(params, { replace: true });

      // create run marker before starting generation so suggestions can be grouped
      run = appendGenerationRun(new Date().toISOString());
      const runId = run?.id ?? `pending-${Date.now()}`;
      setPendingGeneration({ id: runId, label: `Generate #${nextIndex}` });
      setExpandedGenerationItemId(runId);
      setIsGeneratingSuggestions(true);

      // H-01: Check order gate status before generation/suggestion
      try {
        const gateStatus = await testSuiteService.getOrderGateStatus(suiteId);
        if (!gateStatus.isGatePassed) {
          showErrorToast(
            gateStatus.message ||
              "Order gate not passed. Please approve the API order proposal first.",
          );
          // remove the provisional run because generation did not start
          if (run && run.id) removeGenerationRun(run.id);
          return;
        }
      } catch (gateErr: any) {
        console.warn("Could not check order gate status:", gateErr);
        // Continue anyway; BE will reject if gate not passed
      }

      try {
        const accepted = await testSuiteLlmSuggestionService.generate(suiteId, {
          specificationId: suite.apiSpecId,
          forceRefresh,
        });

        const terminalStatus = await pollSuggestionGeneration(accepted.jobId);

        if (terminalStatus === "Completed") {
          await finalizeSuggestionGeneration(run);
          if (run && run.id) {
            updateGenerationRun(run.id, {
              completedAt: new Date().toISOString(),
            });
          }
        } else if (terminalStatus === "Cancelled") {
          if (run && run.id) removeGenerationRun(run.id);
          showInfoToast("LLM suggestion generation was cancelled.");
        } else {
          throw new Error("LLM suggestion generation failed.");
        }
      } catch (err: any) {
        const statusCode = err?.status ?? err?.response?.status;
        const message = String(
          err?.message || err?.response?.data?.message || "",
        );
        const alreadyHasPendingSuggestions =
          statusCode === 400 &&
          (message.includes("ForceRefresh=true") ||
            message.includes("suggestion preview"));

        // remove provisional run because no new run was produced
        if (run && run.id) removeGenerationRun(run.id);

        if (alreadyHasPendingSuggestions) {
          await refreshSuggestions();
          await refreshAllSuggestions();
          showSuccessToast("LLM suggestions are ready.");
        } else {
          throw err;
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsGeneratingSuggestions(false);
      setSuggestionGenerationStatus(null);
      setForceOpenSuggestions(false);
      endSuggestionGeneration();
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
    // If the user pinned a tab, do not auto-navigate away from it.
    if (isTabPinned) return;

    const hasPending = nextSuggestions.some(
      (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
    );
    const hasCases =
      nextTestCases.length > 0 || Number(suite?.testCaseCount ?? 0) > 0;

    if (!hasPending && hasCases) {
      setOverlayState({
        isVisible: true,
        title: "Moving to Step 3: Test Cases",
        message: "All suggestions reviewed. Preparing your test cases...",
        stepLabel: "Step 2 → Step 3",
      });
      setTimeout(() => {
        setActiveTab("testcases");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "testcases");
        setSearchParams(params, { replace: true });
        setOverlayState({
          isVisible: false,
          title: "",
          message: "",
          stepLabel: "",
        });
      }, 1200);
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

  const handleBulkReject = async (
    suggestionIds: string[],
    reviewNotes: string,
  ) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast("No suggestions selected for reject.");
      return;
    }

    try {
      setIsBulkReviewingSuggestions(true);

      // If selection equals all pending suggestions under current filters, prefer server bulk-review
      const currentPendingIds = displayedSuggestions
        .filter((s) => String(s.reviewStatus || "").toLowerCase() === "pending")
        .map((s) => s.id);

      const isAllPendingSelected =
        currentPendingIds.length > 0 &&
        suggestionIds.length === currentPendingIds.length &&
        suggestionIds.every((id) => currentPendingIds.includes(id));

      if (isAllPendingSelected) {
        try {
          const payload: any = {
            action: "Reject",
            reviewNotes: reviewNotes || undefined,
            filterByTestType: suggestionTestTypeFilter || undefined,
            filterByEndpointId: suggestionEndpointFilter || undefined,
          };

          const result = await testSuiteLlmSuggestionService.bulkReview(
            suiteId,
            payload,
          );
          showSuccessToast(
            `Reject processed. Rejected ${result?.processedCount ?? 0} suggestion(s).`,
          );

          const [nextSuggestions, , nextTestCases] = await Promise.all([
            refreshSuggestions(),
            refreshAllSuggestions(),
            refreshTestCases(),
          ]);
          maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
          return;
        } catch (err) {
          console.warn(
            "bulk-review reject failed, falling back to per-item reject",
            err,
          );
        }
      }

      // Fallback: reject items individually
      let processed = 0;
      for (const id of suggestionIds) {
        try {
          const suggestion = allSuggestions.find((s) => s.id === id);
          const latest = suggestion?.rowVersion
            ? suggestion
            : suggestion
              ? await getLatestSuggestion(suggestion)
              : null;
          if (!latest || !latest.rowVersion) continue;

          const ok = await handleRejectSuggestion(latest, reviewNotes);
          if (ok) processed++;
        } catch (e) {
          console.warn("single reject failed", e);
        }
      }

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);

      if (processed > 0) {
        showSuccessToast(
          `Reject processed. Rejected ${processed} suggestion(s).`,
        );
      } else {
        showErrorToast(
          "No suggestions were rejected. Check for errors and try again.",
        );
      }

      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkReviewingSuggestions(false);
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
      // If the selection corresponds exactly to "all pending suggestions" under current filters,
      // prefer the server-side bulk-review API (atomic) to avoid rowVersion conflicts.
      const currentPendingIds = displayedSuggestions
        .filter((s) => String(s.reviewStatus || "").toLowerCase() === "pending")
        .map((s) => s.id);

      const isAllPendingSelected =
        currentPendingIds.length > 0 &&
        suggestionIds.length === currentPendingIds.length &&
        suggestionIds.every((id) => currentPendingIds.includes(id));

      if (isAllPendingSelected) {
        // Build payload using current FE filters so server applies the same scope
        const payload: any = { action: "Approve" };
        if (suggestionTestTypeFilter)
          payload.filterByTestType = suggestionTestTypeFilter;
        if (suggestionEndpointFilter)
          payload.filterByEndpointId = suggestionEndpointFilter;
        // Note: FilterBySuggestionType not exposed in UI currently

        try {
          const result = await testSuiteLlmSuggestionService.bulkReview(
            suiteId,
            payload,
          );
          showSuccessToast(
            `Approve processed. Approved ${result?.processedCount ?? 0} suggestion(s).`,
          );

          const [nextSuggestions, , nextTestCases] = await Promise.all([
            refreshSuggestions(),
            refreshAllSuggestions(),
            refreshTestCases(),
          ]);

          maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
          return;
        } catch (err) {
          // If bulk-review fails for any reason, fall back to per-item approves below
          console.warn(
            "bulk-review failed, falling back to per-item review",
            err,
          );
        }
      }

      // Fallback: approve items individually (parallel) and show one summary toast
      const approvePromises = suggestionIds.map(async (id) => {
        try {
          const suggestion = allSuggestions.find((s) => s.id === id);
          const latest = suggestion?.rowVersion
            ? suggestion
            : suggestion
              ? await getLatestSuggestion(suggestion)
              : null;
          if (!latest || !latest.rowVersion) {
            return { id, ok: false, reason: "missing-rowVersion" } as const;
          }

          await testSuiteLlmSuggestionService.review(suiteId, id, {
            action: "Approve",
            rowVersion: latest.rowVersion,
          });

          return { id, ok: true } as const;
        } catch (e) {
          return { id, ok: false, reason: e } as const;
        }
      });

      const results = await Promise.all(approvePromises);
      const processed = results.filter((r) => r.ok).length;

      const [nextSuggestions, , nextTestCases] = await Promise.all([
        refreshSuggestions(),
        refreshAllSuggestions(),
        refreshTestCases(),
      ]);

      if (processed > 0) {
        showSuccessToast(
          `Approve processed. Approved ${processed} suggestion(s).`,
        );
      } else {
        showErrorToast(
          "No suggestions were approved. Check for errors and try again.",
        );
      }

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
                .filter((item) => {
                  const status = String(item.reviewStatus || "").toLowerCase();
                  return (
                    status === "approved" || status === "modifiedandapproved"
                  );
                })
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
        let items: SuiteSuggestionModel[] = [];

        if (run.suggestionIds && run.suggestionIds.length > 0) {
          items = run.suggestionIds
            .map((id) => combinedForTimeline.find((s) => s.id === id))
            .filter((s): s is SuiteSuggestionModel => Boolean(s));
        } else {
          items = groups.get(run.id) || [];
        }

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
                .filter((item) => {
                  const status = String(item.reviewStatus || "").toLowerCase();
                  return (
                    status === "approved" || status === "modifiedandapproved"
                  );
                })
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

    setOverlayState({
      isVisible: true,
      title: "Preparing Execution Run",
      message: "Loading test cases for execution...",
      stepLabel: "Step 3 → Execute",
    });

    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("batchLabel", item.label);
    if (item.generatedAt) {
      params.set("generatedAt", item.generatedAt);
    }
    params.set("testCaseIds", item.testCaseIds.join(","));

    setTimeout(() => {
      navigate(`/test-suites/${suiteId}/generation-run?${params.toString()}`);
    }, 800);
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

      <StepTransitionOverlay
        isVisible={overlayState.isVisible}
        title={overlayState.title}
        message={overlayState.message}
        stepLabel={overlayState.stepLabel}
      />
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4">
            <div className="space-y-2 ">
             
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
              {/* Stale-suggestions warning: SRS was linked AFTER generation */}
              {hasStaleNoSrsSuggestions && !isGeneratingSuggestions && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Pending suggestions were generated without SRS context
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      The SRS document &ldquo;
                      {srsDocuments.find((d) => d.id === linkedSrsDocId)
                        ?.title ?? linkedSrsDocId}
                      &rdquo; was linked after these suggestions were generated.
                      Regenerate so the LLM aligns scenarios with your
                      requirements.
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerateSuggestions(true)}
                    className="flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate with SRS
                  </button>
                </div>
              )}

              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Generate Timeline
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Suggestions grouped by each generation run
                  </p>
                </div>

                {generationItems.length === 0 && !pendingGeneration ? (
                  <div className="text-sm text-on-surface-variant">
                    No generation run detected yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingGeneration && (
                      <div
                        key={pendingGeneration.id}
                        className="rounded-lg border-2 bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              {suggestionGenerationStatus === "Queued" &&
                                "Starting refinement..."}
                              {suggestionGenerationStatus === "Triggering" &&
                                "Sending to n8n..."}
                              {suggestionGenerationStatus ===
                                "WaitingForCallback" && "Refining suggestions..."}
                              {!suggestionGenerationStatus &&
                                "Generating suggestions..."}
                            </p>
                            <p className="text-xs text-indigo-500 dark:text-indigo-400">
                              Suggestions will appear here when complete.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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
                  onBulkReject={handleBulkReject}
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
              {/* SRS Document Link */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Tài liệu SRS liên kết
                  </p>
                  <p className="text-sm text-on-surface">
                    {linkedSrsDocId
                      ? (srsDocuments.find((d) => d.id === linkedSrsDocId)
                          ?.title ?? linkedSrsDocId)
                      : "Chưa liên kết"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!linkedSrsDocId && (
                    <Link
                      to="/srs-documents"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200/60 dark:border-amber-700/30"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      SRS Documents
                    </Link>
                  )}
                  {linkedSrsDocId && suiteId && (
                    <Link
                      to={`/traceability?suiteId=${suiteId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200/60 dark:border-emerald-700/30"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Traceability
                    </Link>
                  )}
                  <select
                    value={linkedSrsDocId}
                    onChange={(e) => handleLinkSrsDoc(e.target.value)}
                    disabled={isLinkingSrsDoc}
                    className="px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface disabled:opacity-60"
                  >
                    <option value="">— Bỏ liên kết —</option>
                    {srsDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                  {isLinkingSrsDoc && (
                    <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                  )}
                </div>
              </div>

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
