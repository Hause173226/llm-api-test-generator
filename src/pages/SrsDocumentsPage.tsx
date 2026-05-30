import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  BadgeInfo,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  FileText,
  Loader2,
  MessagesSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { useProject } from "../contexts/ProjectContext";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import {
  handleError,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/errorHandler";
import {
  srsService,
  type SrsAnalysisJob,
  type SrsClarification,
  type SrsDocument,
  type SrsRequirement,
} from "../services/srsService";
import { cn } from "../lib/utils";
import { useTestSuites } from "../hooks/useTestSuites";

const analysisStatusTone: Record<number, string> = {
  0: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  2: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  3: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
};

type TestableConstraint = {
  constraint?: string;
  field?: string;
  operator?: string;
  value?: unknown;
  expectedStatus?: unknown;
  testType?: string;
  priority?: string;
  sourceText?: string;
};

export default function SrsDocumentsPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";
  const navigate = useNavigate();
  const breadcrumbs = useProjectBreadcrumbs(
    t("pages.SrsDocumentsPage.srs_documents"),
  );

  const [documents, setDocuments] = useState<SrsDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SrsDocument | null>(
    null,
  );
  const [requirements, setRequirements] = useState<SrsRequirement[]>([]);
  const [clarifications, setClarifications] = useState<
    Record<string, SrsClarification[]>
  >({});
  const [analysisJobs, setAnalysisJobs] = useState<
    Record<string, SrsAnalysisJob>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedRequirement, setSelectedRequirement] =
    useState<SrsRequirement | null>(null);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [
    activeClarificationRequirementId,
    setActiveClarificationRequirementId,
  ] = useState<string | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [isClarifyModalOpen, setIsClarifyModalOpen] = useState(false);
  const [isBulkReviewing, setIsBulkReviewing] = useState(false);
  const [reviewWarningOpen, setReviewWarningOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmClass?: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmClass?: string;
    onConfirm: () => void;
  }) => setConfirmDialog({ open: true, ...opts });
  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  const [refineBusyRequirementId, setRefineBusyRequirementId] = useState<
    string | null
  >(null);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    testableConstraints: "",
    endpointId: "",
    isReviewed: false,
  });
  const [createForm, setCreateForm] = useState({
    title: "",
    sourceType: 0 as 0 | 1 | 2,
    rawContent: "",
    storageFileId: "",
  });

  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [showFullSrsContent, setShowFullSrsContent] = useState(false);
  const [expandedRequirementIds, setExpandedRequirementIds] = useState<
    Record<string, boolean>
  >({});
  const [addReqForm, setAddReqForm] = useState({
    title: "",
    description: "",
    requirementType: 0,
    testableConstraints: "",
    endpointId: "",
  });
  const [isAddingReq, setIsAddingReq] = useState(false);

  const { testSuites } = useTestSuites(projectId);
  const [linkSuiteId, setLinkSuiteId] = useState<string>("");
  const [isLinkingSuite, setIsLinkingSuite] = useState(false);

  const loadDocuments = async (keepSelected = true) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const items = await srsService.listDocuments(projectId);
      setDocuments(items);
      if (items.length > 0) {
        const nextSelected = keepSelected
          ? items.find((item) => item.id === selectedDocument?.id) || items[0]
          : items[0];
        setSelectedDocument(nextSelected);
      } else {
        setSelectedDocument(null);
        setRequirements([]);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentDetail = async (docId: string) => {
    if (!projectId) return;
    try {
      const detail = await srsService.getDocument(projectId, docId);
      setSelectedDocument(detail);

      // Auto-resume polling if the document is stuck in Processing and we have a job to poll
      if (detail.analysisStatus === 1 && detail.latestJobId) {
        setAnalysisJobId(detail.latestJobId);
        setIsAnalyzing(true);
      }

      const reqs = await srsService.listRequirements(projectId, docId);
      setRequirements(reqs);
      // Keep library card in sync with latest requirement count/status for this document
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                analysisStatus: detail.analysisStatus,
                requirements: reqs,
                latestJobId: detail.latestJobId ?? doc.latestJobId ?? null,
              }
            : doc,
        ),
      );

      const clarificationMap: Record<string, SrsClarification[]> = {};
      await Promise.all(
        reqs.slice(0, 20).map(async (req) => {
          try {
            const items = await srsService.listClarifications(
              projectId,
              docId,
              req.id,
            );
            clarificationMap[req.id] = items;
          } catch {
            clarificationMap[req.id] = [];
          }
        }),
      );
      setClarifications(clarificationMap);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    loadDocuments(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!selectedDocument) return;
    loadDocumentDetail(selectedDocument.id);
    setLinkSuiteId(selectedDocument.testSuiteId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocument?.id]);

  useEffect(() => {
    if (!analysisJobId || !selectedDocument || !projectId) return;
    let stopped = false;
    let consecutivePollErrors = 0;
    let pollCount = 0;
    const MAX_POLLS = 2400; // ~2 hours at 3s interval; large SRS analysis can be slow in n8n.
    const timer = window.setInterval(async () => {
      if (stopped) return;
      pollCount++;
      if (pollCount > MAX_POLLS) {
        window.clearInterval(timer);
        stopped = true;
        setIsAnalyzing(false);
        showErrorToast(t("pages.SrsDocumentsPage.analysis_timeout"));
        return;
      }
      try {
        const job = await srsService.getAnalysisJob(
          projectId,
          selectedDocument.id,
          analysisJobId,
        );
        consecutivePollErrors = 0;
        setAnalysisJobs((prev) => ({ ...prev, [job.id]: job }));
        const isTerminal =
          job.status === 3 ||
          job.status === 4 ||
          (typeof job.completedAt === "string" && !!job.completedAt);
        if (isTerminal) {
          window.clearInterval(timer);
          stopped = true;
          await loadDocumentDetail(selectedDocument.id);
          await loadDocuments(true);
          setIsAnalyzing(false);
          if (job.status === 4) {
            showErrorToast(
              job.errorMessage ||
                t("pages.SrsDocumentsPage.analysis_failed_try_again"),
            );
          }
        }
      } catch {
        consecutivePollErrors++;
        if (consecutivePollErrors >= 3) {
          window.clearInterval(timer);
          stopped = true;
          setIsAnalyzing(false);
          await loadDocumentDetail(selectedDocument.id);
        }
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [analysisJobId, projectId, selectedDocument?.id]);

  const createDocument = async () => {
    if (!projectId) return;
    if (!createForm.title.trim()) {
      showErrorToast(t("pages.SrsDocumentsPage.srs_title_required"));
      return;
    }
    if (createForm.sourceType === 0 && !createForm.rawContent.trim()) {
      showErrorToast(t("pages.SrsDocumentsPage.paste_srs_content"));
      return;
    }
    if (createForm.sourceType === 1 && !createForm.storageFileId.trim()) {
      showErrorToast(t("pages.SrsDocumentsPage.upload_file_first"));
      return;
    }

    setIsSaving(true);
    try {
      const created = await srsService.createDocument(projectId, {
        title: createForm.title.trim(),
        sourceType: createForm.sourceType,
        rawContent: createForm.sourceType === 0 ? createForm.rawContent : null,
        storageFileId:
          createForm.sourceType === 1 ? createForm.storageFileId.trim() : null,
      });
      showSuccessToast(
        t("pages.SrsDocumentsPage.srs_document_created_success"),
      );
      setDocuments((prev) => [created, ...prev]);
      setSelectedDocument(created);
      setIsCreateOpen(false);
      setCreateForm({
        title: "",
        sourceType: 0,
        rawContent: "",
        storageFileId: "",
      });
    } catch (err) {
      handleError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeDocument = async () => {
    if (!selectedDocument || !projectId) return;
    const docId = selectedDocument.id;
    try {
      setIsAnalyzing(true);
      const response = await srsService.analyzeDocument(
        projectId,
        docId,
      );
      setAnalysisJobId(response.jobId);
      setSelectedDocument((prev) =>
        prev && prev.id === docId
          ? { ...prev, analysisStatus: 1, latestJobId: response.jobId }
          : prev,
      );
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? { ...doc, analysisStatus: 1, latestJobId: response.jobId }
            : doc,
        ),
      );
      showSuccessToast(t("pages.SrsDocumentsPage.analysis_job_queued"));
    } catch (err) {
      setIsAnalyzing(false);
      // Even when trigger call times out on FE, BE may still have created/updated the job.
      // Refresh detail immediately so UI picks latest status/job and resumes polling.
      await loadDocumentDetail(docId);
      await loadDocuments(true);
      handleError(err);
    }
  };

  const updateRequirement = async (req: SrsRequirement) => {
    if (!selectedDocument || !projectId) return;
    try {
      const trimmedEndpointId = updateForm.endpointId.trim();
      const hadEndpoint = !!req.endpointId;
      const clearEndpointId = hadEndpoint && !trimmedEndpointId;
      const updated = await srsService.updateRequirement(
        projectId,
        selectedDocument.id,
        req.id,
        {
          title: updateForm.title.trim() || undefined,
          testableConstraints:
            updateForm.testableConstraints.trim() || undefined,
          ...(clearEndpointId
            ? { clearEndpointId: true }
            : trimmedEndpointId
              ? { endpointId: trimmedEndpointId }
              : {}),
          isReviewed: updateForm.isReviewed,
        },
      );
      setRequirements((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedRequirement(updated);
      showSuccessToast(t("pages.SrsDocumentsPage.requirement_updated"));
    } catch (err) {
      handleError(err);
    }
  };

  const openRequirement = async (req: SrsRequirement) => {
    setSelectedRequirement(req);
    setUpdateForm({
      title: req.title || "",
      testableConstraints: req.testableConstraints || "",
      endpointId: req.endpointId || "",
      isReviewed: Boolean(req.isReviewed),
    });
    setActiveClarificationRequirementId(null);
    setClarificationAnswer("");
    if (!selectedDocument || !projectId) return;
    try {
      const items = await srsService.listClarifications(
        projectId,
        selectedDocument.id,
        req.id,
      );
      setClarifications((prev) => ({ ...prev, [req.id]: items }));
    } catch {
      setClarifications((prev) => ({ ...prev, [req.id]: [] }));
    }
  };

  const jumpToRequirement = async (req: SrsRequirement) => {
    setReviewWarningOpen(false);
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setExpandedRequirementIds((prev) => ({ ...prev, [req.id]: true }));
    await openRequirement(req);
    window.setTimeout(() => {
      document
        .getElementById(`srs-req-${req.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const markAllReviewed = async (skipWarning = false) => {
    if (!selectedDocument || !projectId || requirements.length === 0) return;
    if (!skipWarning && unresolvedCriticalReviewItems.length > 0) {
      setReviewWarningOpen(true);
      return;
    }

    try {
      setIsBulkReviewing(true);
      const pending = requirements.filter((req) => !req.isReviewed);
      const updatedRequirements: SrsRequirement[] = [];
      for (let i = 0; i < pending.length; i += 10) {
        const batch = pending.slice(i, i + 10);
        const updated = await Promise.all(
          batch.map((req) =>
            srsService.updateRequirement(projectId, selectedDocument.id, req.id, {
              isReviewed: true,
            }),
          ),
        );
        updatedRequirements.push(...updated);
      }

      const updatedById = new Map(
        updatedRequirements.map((item) => [item.id, item]),
      );
      setRequirements((prev) =>
        prev.map((item) =>
          updatedById.get(item.id) || { ...item, isReviewed: true },
        ),
      );
      if (selectedRequirement) {
        setSelectedRequirement((prev) =>
          prev ? updatedById.get(prev.id) || { ...prev, isReviewed: true } : prev,
        );
      }
      showSuccessToast("All requirements marked reviewed.");
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkReviewing(false);
      setReviewWarningOpen(false);
    }
  };

  const answerClarification = async (clarificationId: string) => {
    if (!selectedDocument || !selectedRequirement || !projectId) return;
    if (!clarificationAnswer.trim()) {
      showInfoToast(t("pages.SrsDocumentsPage.enter_answer_first"));
      return;
    }
    try {
      const updated = await srsService.answerClarification(
        projectId,
        selectedDocument.id,
        selectedRequirement.id,
        clarificationId,
        clarificationAnswer.trim(),
      );
      setClarifications((prev) => ({
        ...prev,
        [selectedRequirement.id]: (prev[selectedRequirement.id] || []).map(
          (item) => (item.id === updated.id ? updated : item),
        ),
      }));
      setClarificationAnswer("");
      showSuccessToast(t("pages.SrsDocumentsPage.clarification_answered"));
    } catch (err) {
      handleError(err);
    }
  };

  const refineRequirement = async (req: SrsRequirement) => {
    if (!selectedDocument || !projectId) return;
    try {
      setRefineBusyRequirementId(req.id);
      const job = await srsService.refineRequirement(
        projectId,
        selectedDocument.id,
        req.id,
      );
      setAnalysisJobId(job.jobId);
      setIsAnalyzing(true);
      showSuccessToast(t("pages.SrsDocumentsPage.refinement_job_queued"));
    } catch (err) {
      handleError(err);
    } finally {
      setRefineBusyRequirementId(null);
    }
  };

  const deleteDocument = async (doc: SrsDocument) => {
    if (!projectId) return;
    try {
      await srsService.deleteDocument(projectId, doc.id);
      showSuccessToast(t("pages.SrsDocumentsPage.srs_document_deleted"));
      await loadDocuments(false);
    } catch (err) {
      handleError(err);
    }
  };

  const handleLinkSuite = async () => {
    if (!projectId || !selectedDocument) return;
    setIsLinkingSuite(true);
    try {
      const updated = await srsService.linkTestSuite(
        projectId,
        selectedDocument.id,
        linkSuiteId || null,
      );
      setSelectedDocument(updated);
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      showSuccessToast(
        linkSuiteId
          ? t("pages.SrsDocumentsPage.suite_linked")
          : t("pages.SrsDocumentsPage.suite_unlinked"),
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsLinkingSuite(false);
    }
  };

  const handleAddRequirement = async () => {
    if (!projectId || !selectedDocument) return;
    if (!addReqForm.title.trim()) {
      showErrorToast(t("pages.SrsDocumentsPage.title_required"));
      return;
    }
    setIsAddingReq(true);
    try {
      const created = await srsService.addRequirement(
        projectId,
        selectedDocument.id,
        {
          title: addReqForm.title.trim(),
          description: addReqForm.description.trim() || null,
          requirementType: addReqForm.requirementType,
          testableConstraints: addReqForm.testableConstraints.trim() || null,
          endpointId: addReqForm.endpointId.trim() || null,
        },
      );
      setRequirements((prev) => [...prev, created]);
      showSuccessToast(t("pages.SrsDocumentsPage.requirement_added"));
      setIsAddReqOpen(false);
      setAddReqForm({
        title: "",
        description: "",
        requirementType: 0,
        testableConstraints: "",
        endpointId: "",
      });
    } catch (err) {
      handleError(err);
    } finally {
      setIsAddingReq(false);
    }
  };

  const handleDeleteRequirement = (req: SrsRequirement) => {
    if (!projectId || !selectedDocument) return;
    showConfirm({
      title: t("pages.SrsDocumentsPage.delete_requirement_title"),
      message: t("pages.SrsDocumentsPage.delete_requirement_message", {
        name: req.requirementCode ?? req.title,
      }),
      confirmLabel: t("pages.SrsDocumentsPage.delete"),
      confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
      onConfirm: async () => {
        try {
          await srsService.deleteRequirement(
            projectId,
            selectedDocument.id,
            req.id,
          );
          setRequirements((prev) => prev.filter((r) => r.id !== req.id));
          if (selectedRequirement?.id === req.id) setSelectedRequirement(null);
          showSuccessToast(t("pages.SrsDocumentsPage.requirement_deleted"));
        } catch (err) {
          handleError(err);
        }
      },
    });
  };

  const filteredRequirements = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return requirements.filter((req) => {
      const matchesSearch =
        !keyword ||
        req.requirementCode?.toLowerCase().includes(keyword) ||
        req.title?.toLowerCase().includes(keyword) ||
        req.description?.toLowerCase().includes(keyword) ||
        req.testableConstraints?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        String(req.isReviewed || false).toLowerCase() === statusFilter;

      const typeValue = String(req.requirementType ?? "");
      const matchesType = typeFilter === "all" || typeValue === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requirements, search, statusFilter, typeFilter]);

  const selectedJob = analysisJobId ? analysisJobs[analysisJobId] : null;

  const criticalClarifications = selectedRequirement
    ? (clarifications[selectedRequirement.id] || []).filter(
        (item) => item.isCritical,
      )
    : [];

  const answeredCriticalCount = criticalClarifications.filter(
    (item) => item.isAnswered,
  ).length;

  const canRefineCurrentRequirement =
    !!selectedRequirement &&
    criticalClarifications.length > 0 &&
    answeredCriticalCount === criticalClarifications.length;

  const prettyJson = (raw?: string | null) => {
    if (!raw || !String(raw).trim()) return null;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return String(raw);
    }
  };

  const parseConstraintItems = (
    raw?: string | null,
  ): { items: TestableConstraint[]; fallbackText: string | null } => {
    if (!raw || !String(raw).trim()) {
      return { items: [], fallbackText: null };
    }

    try {
      const parsed = JSON.parse(raw);
      const source = Array.isArray(parsed) ? parsed : [parsed];
      const items = source
        .map((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            return item as TestableConstraint;
          }

          return { constraint: String(item ?? "") };
        })
        .filter((item) =>
          [
            item.constraint,
            item.field,
            item.operator,
            item.expectedStatus,
            item.testType,
            item.priority,
            item.sourceText,
          ].some((value) => String(value ?? "").trim()),
        );

      return { items, fallbackText: null };
    } catch {
      return { items: [], fallbackText: String(raw) };
    }
  };

  const formatConstraintValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  };

  const srsAnalysisSummary = useMemo(() => {
    const mappedRequirements = requirements.filter(
      (req) => !!(req.mappedEndpointPath || req.endpointId),
    ).length;
    const globalRequirements = requirements.length - mappedRequirements;
    const constraints = requirements.reduce((sum, req) => {
      const parsed = parseConstraintItems(
        req.refinedConstraints || req.testableConstraints,
      );
      return sum + parsed.items.length + (parsed.fallbackText ? 1 : 0);
    }, 0);
    const unresolvedCriticalClarifications = Object.values(clarifications)
      .flat()
      .filter((item) => item.isCritical && !item.isAnswered).length;

    return {
      totalRequirements: requirements.length,
      mappedRequirements,
      globalRequirements,
      constraints,
      unresolvedCriticalClarifications,
    };
  }, [requirements, clarifications]);

  const unresolvedCriticalReviewItems = useMemo(
    () =>
      requirements
        .map((req) => {
          const unresolved = (clarifications[req.id] || []).filter(
            (item) => item.isCritical && !item.isAnswered,
          );

          return { req, unresolved };
        })
        .filter((item) => item.unresolved.length > 0),
    [requirements, clarifications],
  );

  const selectedSrsContent = useMemo(() => {
    const raw =
      (selectedDocument as any)?.parsedMarkdown ||
      selectedDocument?.rawContent ||
      "";
    return String(raw || "").trim();
  }, [selectedDocument]);

  const analysisStatusLabel: Record<number, string> = {
    0: t("pages.SrsDocumentsPage.status_pending"),
    1: t("pages.SrsDocumentsPage.status_processing"),
    2: t("pages.SrsDocumentsPage.status_completed"),
    3: t("pages.SrsDocumentsPage.status_failed"),
  };

  const sourceTypeLabel: Record<number, string> = {
    0: t("pages.SrsDocumentsPage.textinput"),
    1: t("pages.SrsDocumentsPage.fileupload"),
    2: t("pages.SrsDocumentsPage.url"),
  };

  const analysisJobStatusLabel: Record<number, string> = {
    0: t("pages.SrsDocumentsPage.job_status_queued"),
    1: t("pages.SrsDocumentsPage.job_status_triggering"),
    2: t("pages.SrsDocumentsPage.job_status_processing"),
    3: t("pages.SrsDocumentsPage.job_status_completed"),
    4: t("pages.SrsDocumentsPage.job_status_failed"),
  };

  const analysisJobTypeLabel: Record<number, string> = {
    0: t("pages.SrsDocumentsPage.job_type_initial_analysis"),
    1: t("pages.SrsDocumentsPage.job_type_clarification_refinement"),
  };

  const requirementTypeLabel: Record<number, string> = {
    0: t("pages.SrsDocumentsPage.functional"),
    1: t("pages.SrsDocumentsPage.nonfunctional"),
    2: t("pages.SrsDocumentsPage.security"),
    3: t("pages.SrsDocumentsPage.performance"),
    4: t("pages.SrsDocumentsPage.constraint"),
  };

  const buildRequirementEvidence = (req: SrsRequirement) => {
    const content = selectedSrsContent;
    if (!content) return null;

    const paragraphs = content
      .split(/\r?\n\r?\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const titleTokens = (req.title || "")
      .toLowerCase()
      .split(/[^a-z0-9_]+/i)
      .filter((t) => t.length >= 4);
    const descTokens = (req.description || "")
      .toLowerCase()
      .split(/[^a-z0-9_]+/i)
      .filter((t) => t.length >= 5)
      .slice(0, 6);
    const codeToken = (req.requirementCode || "").toLowerCase();
    const tokens = [
      ...new Set([codeToken, ...titleTokens, ...descTokens].filter(Boolean)),
    ];
    if (tokens.length === 0) return null;

    let best: { text: string; score: number } | null = null;
    for (const p of paragraphs) {
      const lower = p.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (lower.includes(t)) score++;
      }
      if (!best || score > best.score) {
        best = { text: p, score };
      }
    }

    if (!best || best.score === 0) return null;
    return best.text.length > 420 ? `${best.text.slice(0, 420)}...` : best.text;
  };

  return (
    <MainLayout
      title={t("pages.SrsDocumentsPage.srs_documents")}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8 pb-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              {t("pages.SrsDocumentsPage.srs_documents")}
            </h1>
            <p className="text-on-surface-variant">
              {t(
                "pages.SrsDocumentsPage.manage_srs_documents_run_analysis_and_re",
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => loadDocuments(true)}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              {t("pages.SrsDocumentsPage.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("pages.SrsDocumentsPage.new_srs")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.SrsDocumentsPage.documents")}
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {documents.length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.SrsDocumentsPage.requirements")}
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {requirements.length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.SrsDocumentsPage.reviewed")}
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {requirements.filter((item) => item.isReviewed).length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("pages.SrsDocumentsPage.critical_qs")}
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {
                Object.values(clarifications)
                  .flat()
                  .filter((item) => item.isCritical).length
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">
                  {t("pages.SrsDocumentsPage.srs_library")}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  {t("pages.SrsDocumentsPage.select_a_document_to_continue")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-6 text-sm text-on-surface-variant text-center">
                  {t(
                    "pages.SrsDocumentsPage.no_srs_documents_yet_create_one_to_start",
                  )}
                </div>
              ) : (
                documents.map((doc) => {
                  const active = selectedDocument?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        active
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <p className="font-semibold text-on-surface truncate">
                              {doc.title}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {new Date(doc.createdDateTime).toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0 mt-1" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 font-semibold",
                            analysisStatusTone[doc.analysisStatus] ||
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {analysisStatusLabel[doc.analysisStatus] ||
                            t("pages.SrsDocumentsPage.unknown")}
                        </span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300 font-semibold">
                          {sourceTypeLabel[doc.sourceType] ??
                            t("pages.SrsDocumentsPage.source_with_index", {
                              sourceType: doc.sourceType,
                            })}
                        </span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300 font-semibold">
                          {t("pages.SrsDocumentsPage.requirement_count", {
                            count: doc.requirements?.length || 0,
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-on-surface">
                {t("pages.SrsDocumentsPage.workflow_checklist")}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              {[
                [
                  t("pages.SrsDocumentsPage.workflow_create_document"),
                  documents.length > 0,
                ],
                [
                  t("pages.SrsDocumentsPage.workflow_analyze_with_llm"),
                  selectedDocument?.analysisStatus === 2,
                ],
                [
                  t("pages.SrsDocumentsPage.review_requirements"),
                  requirements.some((r) => r.isReviewed),
                ],
              ].map(([label, done], index) => (
                <div key={index} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-slate-400" />
                  )}
                  {index === 4 && done ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/test-order-gate${selectedDocument?.testSuiteId ? `?suiteId=${selectedDocument.testSuiteId}` : ""}`,
                        )
                      }
                      className="text-indigo-600 font-semibold underline underline-offset-2"
                    >
                      {label as string}
                    </button>
                  ) : (
                    <span
                      className={
                        done ? "text-on-surface" : "text-on-surface-variant"
                      }
                    >
                      {label as string}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!selectedDocument ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
              {t(
                "pages.SrsDocumentsPage.select_a_document_or_create_a_new_srs_to",
              )}
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                      <BookOpen className="w-4 h-4" />
                      {t("pages.SrsDocumentsPage.document_details")}
                    </div>
                    <h2 className="text-2xl font-black text-on-surface">
                      {selectedDocument.title}
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 font-semibold",
                          analysisStatusTone[selectedDocument.analysisStatus] ||
                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                        )}
                      >
                        {analysisStatusLabel[selectedDocument.analysisStatus] ||
                          t("pages.SrsDocumentsPage.unknown")}
                      </span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
                        {sourceTypeLabel[selectedDocument.sourceType] ??
                          t("pages.SrsDocumentsPage.source_with_index", {
                            sourceType: selectedDocument.sourceType,
                          })}
                      </span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
                        {t("pages.SrsDocumentsPage.reviewed_count", {
                          reviewed: requirements.filter(
                            (item) => item.isReviewed,
                          ).length,
                          total: requirements.length,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedDocument.analysisStatus !== 2 && (
                      <button
                        type="button"
                        onClick={analyzeDocument}
                        disabled={
                          isAnalyzing || selectedDocument.analysisStatus === 1
                        }
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-white font-semibold disabled:opacity-50"
                      >
                        {isAnalyzing ||
                        selectedDocument.analysisStatus === 1 ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        {selectedDocument.analysisStatus === 1 && !isAnalyzing
                          ? t("pages.SrsDocumentsPage.processing")
                          : t("pages.SrsDocumentsPage.analyze")}
                      </button>
                    )}
                    {selectedDocument.analysisStatus === 3 && (
                      <button
                        type="button"
                        onClick={analyzeDocument}
                        disabled={isAnalyzing}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-white font-semibold disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t("pages.SrsDocumentsPage.retry")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm({
                          title: t(
                            "pages.SrsDocumentsPage.delete_document_title",
                          ),
                          message: t(
                            "pages.SrsDocumentsPage.delete_document_message",
                            {
                              title: selectedDocument.title,
                            },
                          ),
                          confirmLabel: t("pages.SrsDocumentsPage.delete"),
                          confirmClass:
                            "bg-rose-600 hover:bg-rose-700 text-white",
                          onConfirm: () => deleteDocument(selectedDocument),
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-white font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("pages.SrsDocumentsPage.delete")}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.project")}
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedProject?.name || projectId}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.analysis_job")}
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {analysisJobId ||
                        t("pages.SrsDocumentsPage.not_triggered")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.requirements")}
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {requirements.length}
                    </p>
                  </div>
                </div>

                {/* Link to Test Suite */}
                <div className="mt-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-3">
                    {t("pages.SrsDocumentsPage.link_test_suite")}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={linkSuiteId}
                        onChange={(e) => setLinkSuiteId(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">
                          {t("pages.SrsDocumentsPage.unlink_option")}
                        </option>
                        {testSuites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedDocument.testSuiteId && (
                      <p className="text-xs text-on-surface-variant">
                        {t("pages.SrsDocumentsPage.current_label")}{" "}
                        <span className="font-medium text-primary">
                          {testSuites.find(
                            (s) => s.id === selectedDocument.testSuiteId,
                          )?.name ?? selectedDocument.testSuiteId}
                        </span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleLinkSuite}
                      disabled={
                        isLinkingSuite ||
                        linkSuiteId === (selectedDocument.testSuiteId ?? "")
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {isLinkingSuite ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      {linkSuiteId
                        ? t("pages.SrsDocumentsPage.save_link")
                        : t("pages.SrsDocumentsPage.remove_link")}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.n_i_dung_srs_upload")}
                    </p>
                    {selectedSrsContent && (
                      <button
                        type="button"
                        onClick={() => setShowFullSrsContent((v) => !v)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {showFullSrsContent
                          ? t("pages.SrsDocumentsPage.collapse")
                          : t("pages.SrsDocumentsPage.view_full")}
                      </button>
                    )}
                  </div>
                  {!selectedSrsContent ? (
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.ch_a_c_raw_content_hi_n_th")}
                    </p>
                  ) : (
                    <pre
                      className={cn(
                        "mt-2 rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2 text-xs text-on-surface-variant whitespace-pre-wrap break-words",
                        showFullSrsContent
                          ? "max-h-[420px] overflow-auto"
                          : "max-h-32 overflow-hidden",
                      )}
                    >
                      {selectedSrsContent}
                    </pre>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-lg font-bold text-on-surface">
                    {t("pages.SrsDocumentsPage.analysis_job_status")}
                  </h3>
                </div>
                {!analysisJobId ? (
                  <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                    {t("pages.SrsDocumentsPage.no_analysis_job")}
                  </div>
                ) : selectedJob ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        {t("pages.SrsDocumentsPage.status")}
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {analysisJobStatusLabel[selectedJob.status] ??
                          String(selectedJob.status)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        {t("pages.SrsDocumentsPage.job_type")}
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {analysisJobTypeLabel[selectedJob.jobType] ??
                          String(selectedJob.jobType)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        {t("pages.SrsDocumentsPage.queued_at")}
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {new Date(selectedJob.queuedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        {t("pages.SrsDocumentsPage.extracted")}
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedJob.requirementsExtracted ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        {t("pages.SrsDocumentsPage.error")}
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedJob.errorMessage || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                    {t("pages.SrsDocumentsPage.polling_analysis_job")}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-lg font-bold text-on-surface">
                        {t("pages.SrsDocumentsPage.requirements_review")}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.requirements_review_desc")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t(
                          "pages.SrsDocumentsPage.search_requirement",
                        )}
                        className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-2.5 text-sm"
                    >
                      <option value="all">
                        {t("pages.SrsDocumentsPage.all_statuses")}
                      </option>
                      <option value="true">
                        {t("pages.SrsDocumentsPage.reviewed")}
                      </option>
                      <option value="false">
                        {t("pages.SrsDocumentsPage.not_reviewed")}
                      </option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-2.5 text-sm"
                    >
                      <option value="all">
                        {t("pages.SrsDocumentsPage.all_types")}
                      </option>
                      <option value="0">
                        {t("pages.SrsDocumentsPage.functional")}
                      </option>
                      <option value="1">
                        {t("pages.SrsDocumentsPage.nonfunctional")}
                      </option>
                      <option value="2">
                        {t("pages.SrsDocumentsPage.security")}
                      </option>
                      <option value="3">
                        {t("pages.SrsDocumentsPage.performance")}
                      </option>
                      <option value="4">
                        {t("pages.SrsDocumentsPage.constraint")}
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() => markAllReviewed(false)}
                      disabled={
                        isBulkReviewing ||
                        requirements.length === 0 ||
                        requirements.every((req) => req.isReviewed)
                      }
                      className="rounded-2xl border border-emerald-300/60 bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
                    >
                      {isBulkReviewing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Mark all reviewed
                    </button>
                   
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Requirements
                    </p>
                    <p className="mt-1 text-2xl font-black text-on-surface">
                      {srsAnalysisSummary.totalRequirements}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/50 bg-cyan-50/60 p-4 dark:border-cyan-800/40 dark:bg-cyan-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                      Mapped endpoint
                    </p>
                    <p className="mt-1 text-2xl font-black text-cyan-900 dark:text-cyan-100">
                      {srsAnalysisSummary.mappedRequirements}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-slate-800/50 dark:bg-slate-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Global requirements
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                      {srsAnalysisSummary.globalRequirements}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/70 p-4 dark:border-indigo-800/50 dark:bg-indigo-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                      Test constraints
                    </p>
                    <p className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">
                      {srsAnalysisSummary.constraints}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl border p-4",
                      srsAnalysisSummary.unresolvedCriticalClarifications > 0
                        ? "border-rose-200 bg-rose-50/70 dark:border-rose-800/50 dark:bg-rose-950/20"
                        : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/20",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        srsAnalysisSummary.unresolvedCriticalClarifications > 0
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      Unresolved critical
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-black",
                        srsAnalysisSummary.unresolvedCriticalClarifications > 0
                          ? "text-rose-900 dark:text-rose-100"
                          : "text-emerald-900 dark:text-emerald-100",
                      )}
                    >
                      {srsAnalysisSummary.unresolvedCriticalClarifications}
                    </p>
                  </div>
                </div>

                {filteredRequirements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
                    {t(
                      "pages.SrsDocumentsPage.no_requirements_found_for_current_filter",
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequirements.map((req) => {
                      const reqClars = clarifications[req.id] || [];
                      const criticalCount = reqClars.filter(
                        (item) => item.isCritical,
                      ).length;
                      const answeredCritical = reqClars.filter(
                        (item) => item.isCritical && item.isAnswered,
                      ).length;
                      const hasOpenCritical = criticalCount > answeredCritical;
                      const isSelected = selectedRequirement?.id === req.id;
                      const isExpanded = !!expandedRequirementIds[req.id];
                      const constraintView = parseConstraintItems(
                        req.refinedConstraints || req.testableConstraints,
                      );
                      const parsedAssumptions = prettyJson(req.assumptions);
                      const parsedAmbiguities = prettyJson(req.ambiguities);

                      return (
                        <article
                          id={`srs-req-${req.id}`}
                          key={req.id}
                          className={cn(
                            "rounded-2xl border p-4 transition-all",
                            isSelected
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                              : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => openRequirement(req)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {req.requirementCode ||
                                      `REQ-${req.id.slice(0, 4)}`}
                                  </span>
                                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {requirementTypeLabel[
                                      req.requirementType
                                    ] ??
                                      t(
                                        "pages.SrsDocumentsPage.type_with_index",
                                        {
                                          type: req.requirementType,
                                        },
                                      )}
                                  </span>
                                  {req.isReviewed ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                      {t("pages.SrsDocumentsPage.reviewed")}
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                      {t(
                                        "pages.SrsDocumentsPage.pending_review",
                                      )}
                                    </span>
                                  )}
                                  {hasOpenCritical && (
                                    <span className="rounded-full bg-rose-100 dark:bg-rose-900/30 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                      {t(
                                        "pages.SrsDocumentsPage.critical_clarifications",
                                      )}
                                    </span>
                                  )}
                                </div>
                                <h4 className="mt-3 font-bold text-on-surface">
                                  {req.title}
                                </h4>
                                <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                                  {req.description}
                                </p>
                                {(() => {
                                  const evidence =
                                    buildRequirementEvidence(req);
                                  if (!evidence) return null;
                                  return (
                                    <div className="mt-2 rounded-lg border border-cyan-200/60 dark:border-cyan-700/40 bg-cyan-50/50 dark:bg-cyan-950/20 px-2.5 py-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                                        {t(
                                          "pages.SrsDocumentsPage.evidence_from_srs",
                                        )}
                                      </p>
                                      <p className="mt-1 text-xs text-cyan-800 dark:text-cyan-200 whitespace-pre-wrap">
                                        {evidence}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                              <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0 mt-1" />
                            </div>
                          </button>

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRequirementIds((prev) => ({
                                  ...prev,
                                  [req.id]: !prev[req.id],
                                }))
                              }
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              {isExpanded
                                ? t(
                                    "pages.SrsDocumentsPage.hide_requirement_details",
                                  )
                                : t(
                                    "pages.SrsDocumentsPage.show_requirement_details",
                                  )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                  {t("pages.SrsDocumentsPage.full_description")}
                                </p>
                                <p className="mt-1 text-sm text-on-surface whitespace-pre-wrap">
                                  {req.description ||
                                    t("pages.SrsDocumentsPage.no_description")}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                  {t(
                                    "pages.SrsDocumentsPage.constraints_for_test_generation",
                                  )}
                                </p>
                                {constraintView.items.length > 0 ? (
                                  <div className="mt-2 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container">
                                    <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-outline-variant/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant md:grid">
                                      <span>Rule</span>
                                      <span>Field</span>
                                      <span>Operator</span>
                                      <span>Expected</span>
                                      <span>Type</span>
                                      <span>Priority</span>
                                    </div>
                                    <div className="divide-y divide-outline-variant/10">
                                      {constraintView.items.map(
                                        (constraint, index) => (
                                          <div
                                            key={`${req.id}-constraint-${index}`}
                                            className="grid grid-cols-1 gap-2 px-3 py-3 text-xs md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]"
                                          >
                                            <div>
                                              <p className="font-semibold text-on-surface">
                                                {constraint.constraint || "-"}
                                              </p>
                                              {constraint.sourceText && (
                                                <p className="mt-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200">
                                                  {constraint.sourceText}
                                                </p>
                                              )}
                                            </div>
                                            <p className="text-on-surface-variant">
                                              <span className="md:hidden font-bold">
                                                Field:{" "}
                                              </span>
                                              {constraint.field || "-"}
                                            </p>
                                            <p className="font-mono text-on-surface-variant">
                                              <span className="md:hidden font-sans font-bold">
                                                Operator:{" "}
                                              </span>
                                              {constraint.operator || "-"}
                                            </p>
                                            <p className="font-semibold text-on-surface">
                                              <span className="md:hidden font-bold">
                                                Expected:{" "}
                                              </span>
                                              {formatConstraintValue(
                                                constraint.expectedStatus,
                                              )}
                                            </p>
                                            <p className="text-on-surface-variant">
                                              <span className="md:hidden font-bold">
                                                Type:{" "}
                                              </span>
                                              {constraint.testType || "-"}
                                            </p>
                                            <p className="text-on-surface-variant">
                                              <span className="md:hidden font-bold">
                                                Priority:{" "}
                                              </span>
                                              {constraint.priority || "-"}
                                            </p>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                ) : constraintView.fallbackText ? (
                                  <pre className="mt-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-2 text-xs text-on-surface-variant whitespace-pre-wrap break-words">
                                    {constraintView.fallbackText}
                                  </pre>
                                ) : (
                                  <div className="mt-1 rounded-lg border border-dashed border-outline-variant/20 bg-surface-container px-2 py-2 text-xs text-on-surface-variant">
                                    {t("pages.SrsDocumentsPage.no_constraints")}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                    {t("pages.SrsDocumentsPage.assumptions")}
                                  </p>
                                  <pre className="mt-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-2 text-xs text-on-surface-variant whitespace-pre-wrap break-words">
                                    {parsedAssumptions ||
                                      t(
                                        "pages.SrsDocumentsPage.no_assumptions",
                                      )}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                    {t(
                                      "pages.SrsDocumentsPage.ambiguities_clarification_hints",
                                    )}
                                  </p>
                                  <pre className="mt-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-2 text-xs text-on-surface-variant whitespace-pre-wrap break-words">
                                    {parsedAmbiguities ||
                                      t(
                                        "pages.SrsDocumentsPage.no_ambiguities",
                                      )}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {/* Edit requirement — always visible */}
                            <button
                              type="button"
                              onClick={() => {
                                openRequirement(req);
                                setIsClarifyModalOpen(true);
                              }}
                              title={t(
                                "pages.SrsDocumentsPage.edit_this_requirement",
                              )}
                              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              {t("pages.SrsDocumentsPage.edit")}
                            </button>

                            {/* Clarifications shortcut — only when unanswered critical exist */}
                            {hasOpenCritical && (
                              <button
                                type="button"
                                onClick={() => {
                                  openRequirement(req);
                                  setIsClarifyModalOpen(true);
                                }}
                                title={t(
                                  "pages.SrsDocumentsPage.view_answer_clarifications",
                                )}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                              >
                                <MessagesSquare className="w-4 h-4" />
                                {t("pages.SrsDocumentsPage.clarify")}
                                <span className="rounded-full bg-amber-200 dark:bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                                  {criticalCount - answeredCritical}
                                </span>
                              </button>
                            )}

                            {/* Refine — only when there are critical clarifications */}
                            {criticalCount > 0 && (
                              <button
                                type="button"
                                onClick={() => refineRequirement(req)}
                                disabled={
                                  refineBusyRequirementId === req.id ||
                                  answeredCritical < criticalCount
                                }
                                title={
                                  answeredCritical < criticalCount
                                    ? t(
                                        "pages.SrsDocumentsPage.answer_all_critical_before_refining",
                                        {
                                          total: criticalCount,
                                          answered: answeredCritical,
                                        },
                                      )
                                    : t(
                                        "pages.SrsDocumentsPage.refine_with_ai_using_answers",
                                      )
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                              >
                                {refineBusyRequirementId === req.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wand2 className="w-4 h-4" />
                                )}
                                {t("pages.SrsDocumentsPage.refine_with_ai")}
                                {answeredCritical < criticalCount && (
                                  <span className="text-[10px] opacity-70 font-normal">
                                    {answeredCritical}/{criticalCount}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Mark reviewed / Reviewed toggle */}
                            {req.isReviewed ? (
                              <button
                                type="button"
                                title={t(
                                  "pages.SrsDocumentsPage.click_to_unmark_reviewed",
                                )}
                                onClick={() => {
                                  showConfirm({
                                    title: t(
                                      "pages.SrsDocumentsPage.unmark_reviewed_title",
                                    ),
                                    message: t(
                                      "pages.SrsDocumentsPage.unmark_reviewed_message",
                                      {
                                        title: req.title,
                                      },
                                    ),
                                    confirmLabel: t(
                                      "pages.SrsDocumentsPage.unmark",
                                    ),
                                    confirmClass:
                                      "bg-rose-600 hover:bg-rose-700 text-white",
                                    onConfirm: async () => {
                                      try {
                                        const updated =
                                          await srsService.updateRequirement(
                                            projectId,
                                            selectedDocument.id,
                                            req.id,
                                            { isReviewed: false },
                                          );
                                        setRequirements((prev) =>
                                          prev.map((item) =>
                                            item.id === updated.id
                                              ? updated
                                              : item,
                                          ),
                                        );
                                        showSuccessToast(
                                          t(
                                            "pages.SrsDocumentsPage.marked_pending_review",
                                          ),
                                        );
                                      } catch (err) {
                                        handleError(err);
                                      }
                                    },
                                  });
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {t("pages.SrsDocumentsPage.reviewed")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  const doMark = async () => {
                                    try {
                                      const updated =
                                        await srsService.updateRequirement(
                                          projectId,
                                          selectedDocument.id,
                                          req.id,
                                          { isReviewed: true },
                                        );
                                      setRequirements((prev) =>
                                        prev.map((item) =>
                                          item.id === updated.id
                                            ? updated
                                            : item,
                                        ),
                                      );
                                      showSuccessToast(
                                        t(
                                          "pages.SrsDocumentsPage.requirement_marked_reviewed",
                                        ),
                                      );
                                    } catch (err) {
                                      handleError(err);
                                    }
                                  };
                                  if (hasOpenCritical) {
                                    showConfirm({
                                      title: t(
                                        "pages.SrsDocumentsPage.unresolved_clarifications_title",
                                      ),
                                      message: t(
                                        "pages.SrsDocumentsPage.unresolved_clarifications_message",
                                        {
                                          remaining:
                                            criticalCount - answeredCritical,
                                        },
                                      ),
                                      confirmLabel: t(
                                        "pages.SrsDocumentsPage.mark_reviewed_anyway",
                                      ),
                                      confirmClass:
                                        "bg-amber-500 hover:bg-amber-600 text-white",
                                      onConfirm: doMark,
                                    });
                                  } else {
                                    await doMark();
                                  }
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {t("pages.SrsDocumentsPage.mark_reviewed")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRequirement(req);
                              }}
                              title={t(
                                "pages.SrsDocumentsPage.delete_requirement_button_title",
                              )}
                              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t("pages.SrsDocumentsPage.delete")}
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="uppercase tracking-widest text-on-surface-variant">
                                {t("pages.SrsDocumentsPage.confidence")}
                              </p>
                              <p className="mt-1 font-semibold text-on-surface">
                                {req.refinedConfidenceScore != null ? (
                                  <>
                                    <span className="line-through text-on-surface-variant mr-1">
                                      {req.confidenceScore ?? "-"}
                                    </span>
                                    <span className="text-indigo-700">
                                      {req.refinedConfidenceScore}
                                    </span>
                                  </>
                                ) : (
                                  (req.confidenceScore ?? "-")
                                )}
                              </p>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="uppercase tracking-widest text-on-surface-variant">
                                {t("pages.SrsDocumentsPage.endpoint")}
                              </p>
                              <p className="mt-1 font-semibold text-on-surface">
                                {req.mappedEndpointPath ||
                                  req.endpointId ||
                                  t("pages.SrsDocumentsPage.not_mapped")}
                              </p>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="uppercase tracking-widest text-on-surface-variant">
                                {t("pages.SrsDocumentsPage.clarifications")}
                              </p>
                              <p className="mt-1 font-semibold text-on-surface">
                                {t("pages.SrsDocumentsPage.critical_answered", {
                                  answered: answeredCritical,
                                  total: criticalCount,
                                })}
                              </p>
                            </div>
                            {(req.refinedConstraints ||
                              (req.refinementRound ?? 0) > 0) && (
                              <div className="md:col-span-3 rounded-xl bg-indigo-50 border border-indigo-200/60 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  <p className="uppercase tracking-widest text-indigo-600 text-[10px] font-bold">
                                    {t("pages.SrsDocumentsPage.refined_round", {
                                      count: req.refinementRound ?? 1,
                                    })}
                                  </p>
                                </div>
                                {req.refinedConstraints && (
                                  <p className="text-xs text-indigo-800 font-mono break-all">
                                    {req.refinedConstraints}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-lg font-bold text-on-surface">
                    {t("pages.SrsDocumentsPage.traceability_shortcut")}
                  </h3>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-on-surface">
                      {t("pages.SrsDocumentsPage.open_matrix_for_this_suite")}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {t("pages.SrsDocumentsPage.use_traceability_dashboard")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/traceability?suiteId=${selectedDocument.testSuiteId || ""}`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-white font-semibold"
                  >
                    {t("pages.SrsDocumentsPage.open_traceability")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* ── Clarification & Refinement Modal ── */}
      <Modal
        isOpen={isClarifyModalOpen && !!selectedRequirement}
        onClose={() => setIsClarifyModalOpen(false)}
        title={t("pages.SrsDocumentsPage.clarification_and_refinement")}
        className="max-w-2xl"
        footer={
          selectedRequirement ? (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => refineRequirement(selectedRequirement!)}
                disabled={
                  !canRefineCurrentRequirement ||
                  refineBusyRequirementId === selectedRequirement!.id
                }
                title={
                  !canRefineCurrentRequirement
                    ? t("pages.SrsDocumentsPage.answer_all_critical_first")
                    : t(
                        "pages.SrsDocumentsPage.refine_this_requirement_with_ai",
                      )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {refineBusyRequirementId === selectedRequirement!.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {t("pages.SrsDocumentsPage.refine_with_ai")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateRequirement(selectedRequirement!);
                  setIsClarifyModalOpen(false);
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t("pages.SrsDocumentsPage.save_requirement")}
              </button>
              <button
                type="button"
                onClick={() => setIsClarifyModalOpen(false)}
                className="ml-auto rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold"
              >
                {t("pages.SrsDocumentsPage.close")}
              </button>
            </div>
          ) : null
        }
      >
        {selectedRequirement && (
          <div className="space-y-5">
            {/* Requirement header */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 flex items-start gap-3">
              <MessagesSquare className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                  {selectedRequirement.requirementCode}
                </p>
                <p className="mt-0.5 font-semibold text-on-surface">
                  {selectedRequirement.title}
                </p>
              </div>
            </div>

            {/* Clarification questions */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                {t("pages.SrsDocumentsPage.clarification_questions")}
              </p>
              {(clarifications[selectedRequirement.id] || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  {t(
                    "pages.SrsDocumentsPage.no_clarification_questions_for_this_requ",
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(clarifications[selectedRequirement.id] || []).map(
                    (item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-2xl border p-4 space-y-3",
                          item.isAnswered
                            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : item.isCritical
                              ? "border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                              : "border-outline-variant/10 dark:border-slate-800 bg-surface-container-low dark:bg-slate-800/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  item.isCritical
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                )}
                              >
                                {item.isCritical
                                  ? t("pages.SrsDocumentsPage.critical")
                                  : t("pages.SrsDocumentsPage.optional")}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  item.isAnswered
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                                )}
                              >
                                {item.isAnswered
                                  ? t("pages.SrsDocumentsPage.answered")
                                  : t("pages.SrsDocumentsPage.open")}
                              </span>
                            </div>
                            <p className="mt-2 font-medium text-on-surface text-sm">
                              {item.question}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {t("pages.SrsDocumentsPage.source_label", {
                                source: item.ambiguitySource,
                              })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveClarificationRequirementId(item.id);
                              setClarificationAnswer(item.userAnswer || "");
                            }}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {t("pages.SrsDocumentsPage.answer")}
                          </button>
                        </div>
                        <div className="rounded-xl bg-white dark:bg-slate-900 border border-outline-variant/10 dark:border-slate-800 px-3 py-2 text-sm text-on-surface-variant">
                          {item.userAnswer ||
                            t("pages.SrsDocumentsPage.no_answer_yet")}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Edit requirement form */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                {t("pages.SrsDocumentsPage.edit_requirement")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={updateForm.title}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder={t("pages.SrsDocumentsPage.title")}
                  className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
                />
                <input
                  value={updateForm.endpointId}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      endpointId: e.target.value,
                    }))
                  }
                  placeholder={t("pages.SrsDocumentsPage.endpoint_id")}
                  className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
                />
                <textarea
                  value={updateForm.testableConstraints}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      testableConstraints: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder={t(
                    "pages.SrsDocumentsPage.testable_constraints_json",
                  )}
                  className="md:col-span-2 w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm font-mono"
                />
                <label className="md:col-span-2 flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateForm.isReviewed}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({
                        ...prev,
                        isReviewed: e.target.checked,
                      }))
                    }
                  />
                  {t("pages.SrsDocumentsPage.mark_this_requirement_reviewed")}
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddReqOpen}
        onClose={() => setIsAddReqOpen(false)}
        title={t("pages.SrsDocumentsPage.add_requirement")}
        footer={
          <>
            <button
              onClick={() => setIsAddReqOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              {t("pages.SrsDocumentsPage.cancel")}
            </button>
            <button
              onClick={handleAddRequirement}
              disabled={isAddingReq}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white inline-flex items-center gap-2"
            >
              {isAddingReq ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {t("pages.SrsDocumentsPage.add")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            value={addReqForm.title}
            onChange={(e) =>
              setAddReqForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder={t("pages.SrsDocumentsPage.title_required_placeholder")}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
          <input
            value={addReqForm.description}
            onChange={(e) =>
              setAddReqForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder={t("pages.SrsDocumentsPage.description_optional")}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
          <select
            value={addReqForm.requirementType}
            onChange={(e) =>
              setAddReqForm((prev) => ({
                ...prev,
                requirementType: Number(e.target.value),
              }))
            }
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          >
            <option value={0}>{t("pages.SrsDocumentsPage.functional")}</option>
            <option value={1}>
              {t("pages.SrsDocumentsPage.nonfunctional")}
            </option>
            <option value={2}>{t("pages.SrsDocumentsPage.security")}</option>
            <option value={3}>{t("pages.SrsDocumentsPage.performance")}</option>
            <option value={4}>{t("pages.SrsDocumentsPage.constraint")}</option>
          </select>
          <textarea
            rows={3}
            value={addReqForm.testableConstraints}
            onChange={(e) =>
              setAddReqForm((prev) => ({
                ...prev,
                testableConstraints: e.target.value,
              }))
            }
            placeholder={t(
              "pages.SrsDocumentsPage.testable_constraints_optional",
            )}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm font-mono"
          />
          <input
            value={addReqForm.endpointId}
            onChange={(e) =>
              setAddReqForm((prev) => ({ ...prev, endpointId: e.target.value }))
            }
            placeholder={t("pages.SrsDocumentsPage.endpoint_id_optional")}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t("pages.SrsDocumentsPage.create_srs_document")}
        footer={
          <>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              {t("pages.SrsDocumentsPage.cancel")}
            </button>
            <button
              onClick={createDocument}
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white inline-flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {t("pages.SrsDocumentsPage.create")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <input
            value={createForm.title}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3"
            placeholder={t("pages.SrsDocumentsPage.document_title")}
          />
          <select
            value={createForm.sourceType}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                sourceType: Number(e.target.value) as 0 | 1 | 2,
              }))
            }
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3"
          >
            <option value={0}>{t("pages.SrsDocumentsPage.textinput")}</option>
            <option value={1}>{t("pages.SrsDocumentsPage.fileupload")}</option>
            <option value={2}>{t("pages.SrsDocumentsPage.url")}</option>
          </select>
          {createForm.sourceType === 0 && (
            <>
              <textarea
                rows={8}
                value={createForm.rawContent}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    rawContent: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3"
                placeholder={t(
                  "pages.SrsDocumentsPage.paste_srs_content_placeholder",
                )}
              />
              <label className="flex items-center gap-3 cursor-pointer rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
                {isFileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {t("pages.SrsDocumentsPage.load_from_txt_md")}
                <input
                  type="file"
                  accept=".txt,.md,.srs"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsFileLoading(true);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setCreateForm((prev) => ({
                        ...prev,
                        rawContent: (event.target?.result as string) || "",
                      }));
                      setIsFileLoading(false);
                    };
                    reader.onerror = () => setIsFileLoading(false);
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {createForm.rawContent && (
                <p className="text-xs text-emerald-700 font-medium">
                  {t("pages.SrsDocumentsPage.content_loaded", {
                    count: createForm.rawContent.length.toLocaleString(),
                  })}
                </p>
              )}
            </>
          )}
          {createForm.sourceType === 1 && (
            <div className="space-y-2">
              <label className="flex flex-col items-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
                {isFileLoading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="font-medium text-indigo-600">
                      {t("pages.SrsDocumentsPage.uploading")}
                    </span>
                  </>
                ) : createForm.storageFileId ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-semibold text-emerald-700">
                      {t("pages.SrsDocumentsPage.file_t_i_l_n_th_nh_c_ng")}
                    </span>
                    <span className="text-xs text-on-surface-variant break-all">
                      {createForm.storageFileId}
                    </span>
                    <span className="text-xs underline text-indigo-600">
                      {t("pages.SrsDocumentsPage.nh_n_ch_n_file_kh_c")}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">
                      {t(
                        "pages.SrsDocumentsPage.nh_n_ch_n_file_pdf_docx_txt_md",
                      )}
                    </span>
                    <span className="text-xs">
                      {t("pages.SrsDocumentsPage.max_file_size")}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                  disabled={isFileLoading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsFileLoading(true);
                    try {
                      const fd = new FormData();
                      fd.append("formFile", file);
                      fd.append("name", file.name);
                      fd.append(
                        "description",
                        t("pages.SrsDocumentsPage.srs_documents"),
                      );
                      const result = await (
                        await import("../services/apiService")
                      ).apiService.uploadFile<{ id: string }>("/files", fd);
                      setCreateForm((prev) => ({
                        ...prev,
                        storageFileId: result.id,
                      }));
                      showSuccessToast(
                        t("pages.SrsDocumentsPage.file_upload_success_toast"),
                      );
                    } catch (err) {
                      handleError(err);
                    } finally {
                      setIsFileLoading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          )}
          {createForm.sourceType === 2 && (
            <input
              value={createForm.rawContent}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  rawContent: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3"
              placeholder={t("pages.SrsDocumentsPage.url_placeholder")}
            />
          )}
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>{t("pages.SrsDocumentsPage.contract_flow_hint")}</div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(activeClarificationRequirementId)}
        onClose={() => setActiveClarificationRequirementId(null)}
        title={t("pages.SrsDocumentsPage.answer_clarification")}
        footer={
          <>
            <button
              onClick={() => setActiveClarificationRequirementId(null)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              {t("pages.SrsDocumentsPage.cancel")}
            </button>
            <button
              onClick={async () => {
                const req = selectedRequirement;
                const clarification = req
                  ? (clarifications[req.id] || []).find(
                      (item) => item.id === activeClarificationRequirementId,
                    )
                  : null;
                if (clarification) {
                  await answerClarification(clarification.id);
                }
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t("pages.SrsDocumentsPage.save_answer")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <textarea
            rows={5}
            value={clarificationAnswer}
            onChange={(e) => setClarificationAnswer(e.target.value)}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3"
            placeholder={t("pages.SrsDocumentsPage.type_clarification_answer")}
          />
          <p className="text-xs text-on-surface-variant">
            {t(
              "pages.SrsDocumentsPage.answers_are_saved_via_patch_to_the_clari",
            )}
          </p>
        </div>
      </Modal>

      {/* ── Confirm Dialog ── */}
      <Modal
        isOpen={reviewWarningOpen}
        onClose={() => setReviewWarningOpen(false)}
        title="Unresolved critical clarifications"
        className="max-w-2xl"
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setReviewWarningOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Review first
            </button>
            <button
              type="button"
              onClick={() => markAllReviewed(true)}
              disabled={isBulkReviewing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isBulkReviewing && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Continue to mark reviewed
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Some requirements still have unresolved critical clarification
            questions. Click an item to jump to the requirement, or continue if
            you intentionally want to mark everything reviewed.
          </p>
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {unresolvedCriticalReviewItems.map(({ req, unresolved }) => (
              <button
                key={req.id}
                type="button"
                onClick={() => jumpToRequirement(req)}
                className="w-full rounded-2xl border border-amber-300/60 bg-amber-50/70 p-3 text-left transition-colors hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                    {req.requirementCode || `REQ-${req.id.slice(0, 4)}`}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                    {unresolved.length} critical unresolved
                  </span>
                </div>
                <p className="mt-2 font-semibold text-on-surface">
                  {req.title}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
                  {unresolved.slice(0, 3).map((item) => (
                    <li key={item.id} className="line-clamp-2">
                      - {item.question}
                    </li>
                  ))}
                  {unresolved.length > 3 && (
                    <li>+ {unresolved.length - 3} more questions</li>
                  )}
                </ul>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmDialog.open}
        onClose={closeConfirm}
        title={confirmDialog.title}
        className="max-w-md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeConfirm}
              className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              {t("pages.SrsDocumentsPage.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                closeConfirm();
                confirmDialog.onConfirm();
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                confirmDialog.confirmClass ||
                  "bg-indigo-600 hover:bg-indigo-700 text-white",
              )}
            >
              {confirmDialog.confirmLabel ||
                t("pages.SrsDocumentsPage.confirm")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {confirmDialog.message}
        </p>
      </Modal>
    </MainLayout>
  );
}
