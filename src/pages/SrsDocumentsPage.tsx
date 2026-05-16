import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const sourceTypeLabel: Record<number, string> = {
  0: "TextInput",
  1: "FileUpload",
  2: "Url",
};

const analysisJobStatusLabel: Record<number, string> = {
  0: "Queued",
  1: "Triggering",
  2: "Processing",
  3: "Completed",
  4: "Failed",
};

const analysisJobTypeLabel: Record<number, string> = {
  0: "InitialAnalysis",
  1: "ClarificationRefinement",
};

const analysisStatusLabel: Record<number, string> = {
  0: "Pending",
  1: "Processing",
  2: "Completed",
  3: "Failed",
};

const analysisStatusTone: Record<number, string> = {
  0: "bg-amber-100 text-amber-800",
  1: "bg-blue-100 text-blue-800",
  2: "bg-emerald-100 text-emerald-800",
  3: "bg-rose-100 text-rose-800",
};

const requirementTypeLabel: Record<number, string> = {
  0: "Functional",
  1: "NonFunctional",
  2: "Security",
  3: "Performance",
  4: "Constraint",
};

export default function SrsDocumentsPage() {
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";
  const navigate = useNavigate();
  const breadcrumbs = useProjectBreadcrumbs("SRS Documents");

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
    let pollCount = 0;
    const MAX_POLLS = 100; // ~5 minutes at 3s interval
    const timer = window.setInterval(async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        window.clearInterval(timer);
        setIsAnalyzing(false);
        showErrorToast(
          "Analysis timed out after 5 minutes. The job may have failed on the n8n side.",
        );
        return;
      }
      try {
        const job = await srsService.getAnalysisJob(
          projectId,
          selectedDocument.id,
          analysisJobId,
        );
        setAnalysisJobs((prev) => ({ ...prev, [job.id]: job }));
        if (job.status === 3 || job.status === 4) {
          window.clearInterval(timer);
          if (job.status === 3) {
            await loadDocumentDetail(selectedDocument.id);
          }
          setIsAnalyzing(false);
          if (job.status === 4) {
            showErrorToast(
              job.errorMessage || "Analysis failed. Please try again.",
            );
          }
        }
      } catch {
        window.clearInterval(timer);
        setIsAnalyzing(false);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [analysisJobId, projectId, selectedDocument?.id]);

  const createDocument = async () => {
    if (!projectId) return;
    if (!createForm.title.trim()) {
      showErrorToast("SRS title is required.");
      return;
    }
    if (createForm.sourceType === 0 && !createForm.rawContent.trim()) {
      showErrorToast("Please paste SRS content for TextInput.");
      return;
    }
    if (createForm.sourceType === 1 && !createForm.storageFileId.trim()) {
      showErrorToast("Vui lòng chọn và tải file lên trước.");
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
      showSuccessToast("SRS document created successfully.");
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
    try {
      setIsAnalyzing(true);
      const response = await srsService.analyzeDocument(
        projectId,
        selectedDocument.id,
      );
      setAnalysisJobId(response.jobId);
      showSuccessToast("Analysis job queued. Polling status now.");
    } catch (err) {
      setIsAnalyzing(false);
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
      showSuccessToast("Requirement updated.");
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

  const answerClarification = async (clarificationId: string) => {
    if (!selectedDocument || !selectedRequirement || !projectId) return;
    if (!clarificationAnswer.trim()) {
      showInfoToast("Please enter an answer first.");
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
      showSuccessToast("Clarification answered.");
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
      showSuccessToast("Refinement job queued.");
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
      showSuccessToast("SRS document deleted.");
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
        linkSuiteId ? "Đã liên kết với bộ kịch bản." : "Đã hủy liên kết.",
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
      showErrorToast("Title is required.");
      return;
    }
    setIsAddingReq(true);
    try {
      const created = await srsService.addRequirement(projectId, selectedDocument.id, {
        title: addReqForm.title.trim(),
        description: addReqForm.description.trim() || null,
        requirementType: addReqForm.requirementType,
        testableConstraints: addReqForm.testableConstraints.trim() || null,
        endpointId: addReqForm.endpointId.trim() || null,
      });
      setRequirements((prev) => [...prev, created]);
      showSuccessToast("Requirement added.");
      setIsAddReqOpen(false);
      setAddReqForm({ title: "", description: "", requirementType: 0, testableConstraints: "", endpointId: "" });
    } catch (err) {
      handleError(err);
    } finally {
      setIsAddingReq(false);
    }
  };

  const handleDeleteRequirement = (req: SrsRequirement) => {
    if (!projectId || !selectedDocument) return;
    showConfirm({
      title: "Delete requirement",
      message: `Delete "${req.requirementCode ?? req.title}"? All traceability links for this requirement will also be removed.`,
      confirmLabel: "Delete",
      confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
      onConfirm: async () => {
        try {
          await srsService.deleteRequirement(projectId, selectedDocument.id, req.id);
          setRequirements((prev) => prev.filter((r) => r.id !== req.id));
          if (selectedRequirement?.id === req.id) setSelectedRequirement(null);
          showSuccessToast("Requirement deleted.");
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

  return (
    <MainLayout title="SRS Documents" breadcrumbs={breadcrumbs}>
      <div className="space-y-8 pb-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              SRS Documents
            </h1>
            <p className="text-on-surface-variant">
              Manage SRS documents, run analysis, and review requirements.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => loadDocuments(true)}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              New SRS
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              Documents
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {documents.length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              Requirements
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {requirements.length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              Reviewed
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {requirements.filter((item) => item.isReviewed).length}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              Critical Qs
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
                  SRS Library
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Select a document to continue
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
                  No SRS documents yet. Create one to start the workflow.
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
                              "bg-slate-100 text-slate-700",
                          )}
                        >
                          {analysisStatusLabel[doc.analysisStatus] || "Unknown"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 font-semibold">
                          {sourceTypeLabel[doc.sourceType] ??
                            `Source ${doc.sourceType}`}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 font-semibold">
                          {doc.requirements?.length || 0} reqs
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
              <h3 className="font-bold text-on-surface">Workflow Checklist</h3>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Create document", documents.length > 0],
                [
                  "Analyze with LLM",
                  Boolean(
                    selectedDocument &&
                    (analysisJobId || selectedDocument.analysisStatus === 2),
                  ),
                ],
                ["Review requirements", requirements.some((r) => r.isReviewed)],
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
              Select a document or create a new SRS to start.
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                      <BookOpen className="w-4 h-4" />
                      Document details
                    </div>
                    <h2 className="text-2xl font-black text-on-surface">
                      {selectedDocument.title}
                    </h2>
              
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 font-semibold",
                          analysisStatusTone[selectedDocument.analysisStatus] ||
                            "bg-slate-100 text-slate-700",
                        )}
                      >
                        {analysisStatusLabel[selectedDocument.analysisStatus] ||
                          "Unknown"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        {selectedDocument.sourceType === 0
                          ? "TextInput"
                          : selectedDocument.sourceType === 1
                            ? "FileUpload"
                            : "Url"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        {requirements.filter((item) => item.isReviewed).length}/
                        {requirements.length} reviewed
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
                          ? "Processing…"
                          : "Analyze"}
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
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm({
                          title: "Delete document",
                          message: `Are you sure you want to delete "${selectedDocument.title}"? This action cannot be undone.`,
                          confirmLabel: "Delete",
                          confirmClass:
                            "bg-rose-600 hover:bg-rose-700 text-white",
                          onConfirm: () => deleteDocument(selectedDocument),
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-white font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      Project
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedProject?.name || projectId}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      Analysis job
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {analysisJobId || "Not triggered"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low p-4">
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      Requirements
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {requirements.length}
                    </p>
                  </div>
                </div>

                {/* Link to Test Suite */}
                <div className="mt-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-3">
                    Liên kết bộ kịch bản kiểm thử
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={linkSuiteId}
                        onChange={(e) => setLinkSuiteId(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">— Bỏ liên kết —</option>
                        {testSuites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedDocument.testSuiteId && (
                      <p className="text-xs text-on-surface-variant">
                        Hiện tại:{" "}
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
                      {linkSuiteId ? "Lưu liên kết" : "Hủy liên kết"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-lg font-bold text-on-surface">
                    Analysis Job Status
                  </h3>
                </div>
                {!analysisJobId ? (
                  <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                    No analysis job queued yet. Trigger analysis after reviewing
                    the document.
                  </div>
                ) : selectedJob ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Status
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {analysisJobStatusLabel[selectedJob.status] ??
                          String(selectedJob.status)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Job Type
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {analysisJobTypeLabel[selectedJob.jobType] ??
                          String(selectedJob.jobType)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Queued At
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {new Date(selectedJob.queuedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Extracted
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedJob.requirementsExtracted ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Error
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedJob.errorMessage || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Loader2 className="w-4 h-4 animate-spin" /> Polling
                    analysis job...
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-lg font-bold text-on-surface">
                        Requirements Review
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Search, filter, edit, mark reviewed, and inspect
                      clarifications.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search requirement..."
                        className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-2.5 text-sm"
                    >
                      <option value="all">All statuses</option>
                      <option value="true">Reviewed</option>
                      <option value="false">Not reviewed</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-2.5 text-sm"
                    >
                      <option value="all">All types</option>
                      <option value="0">Functional</option>
                      <option value="1">NonFunctional</option>
                      <option value="2">Security</option>
                      <option value="3">Performance</option>
                      <option value="4">Constraint</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddReqOpen(true)}
                      className="rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                {filteredRequirements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
                    No requirements found for current filters.
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

                      return (
                        <article
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
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    {req.requirementCode ||
                                      `REQ-${req.id.slice(0, 4)}`}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    {requirementTypeLabel[
                                      req.requirementType
                                    ] ?? `Type ${req.requirementType}`}
                                  </span>
                                  {req.isReviewed ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                      Reviewed
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                      Pending review
                                    </span>
                                  )}
                                  {hasOpenCritical && (
                                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                      Critical clarifications
                                    </span>
                                  )}
                                </div>
                                <h4 className="mt-3 font-bold text-on-surface">
                                  {req.title}
                                </h4>
                                <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                                  {req.description}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0 mt-1" />
                            </div>
                          </button>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {/* Edit requirement — always visible */}
                            <button
                              type="button"
                              onClick={() => {
                                openRequirement(req);
                                setIsClarifyModalOpen(true);
                              }}
                              title="Edit this requirement"
                              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>

                            {/* Clarifications shortcut — only when unanswered critical exist */}
                            {hasOpenCritical && (
                              <button
                                type="button"
                                onClick={() => {
                                  openRequirement(req);
                                  setIsClarifyModalOpen(true);
                                }}
                                title="View and answer clarification questions"
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                              >
                                <MessagesSquare className="w-4 h-4" />
                                Clarify
                                <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
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
                                    ? `Answer all ${criticalCount} critical clarifications before refining (${answeredCritical}/${criticalCount} done)`
                                    : "Refine this requirement with AI using your answers"
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                              >
                                {refineBusyRequirementId === req.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wand2 className="w-4 h-4" />
                                )}
                                Refine with AI
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
                                title="Click to unmark as reviewed"
                                onClick={() => {
                                  showConfirm({
                                    title: "Unmark as reviewed",
                                    message: `Remove the "Reviewed" status from "${req.title}"? This requirement will return to pending review.`,
                                    confirmLabel: "Unmark",
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
                                          "Marked as pending review.",
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
                                Reviewed
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
                                        "Requirement marked reviewed.",
                                      );
                                    } catch (err) {
                                      handleError(err);
                                    }
                                  };
                                  if (hasOpenCritical) {
                                    showConfirm({
                                      title: "Unresolved clarifications",
                                      message: `This requirement still has ${criticalCount - answeredCritical} unanswered critical clarification(s). Marking as reviewed without resolving them may lead to incomplete or inaccurate test generation.`,
                                      confirmLabel: "Mark reviewed anyway",
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
                                Mark reviewed
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRequirement(req);
                              }}
                              title="Delete requirement"
                              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="uppercase tracking-widest text-on-surface-variant">
                                Confidence
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
                                Endpoint
                              </p>
                              <p className="mt-1 font-semibold text-on-surface">
                                {req.mappedEndpointPath ||
                                  req.endpointId ||
                                  "Not mapped"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="uppercase tracking-widest text-on-surface-variant">
                                Clarifications
                              </p>
                              <p className="mt-1 font-semibold text-on-surface">
                                {answeredCritical}/{criticalCount} critical
                                answered
                              </p>
                            </div>
                            {(req.refinedConstraints ||
                              (req.refinementRound ?? 0) > 0) && (
                              <div className="md:col-span-3 rounded-xl bg-indigo-50 border border-indigo-200/60 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  <p className="uppercase tracking-widest text-indigo-600 text-[10px] font-bold">
                                    Refined × {req.refinementRound ?? 1}
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
                    Traceability shortcut
                  </h3>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-on-surface">
                      Open matrix for this suite
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      Use the dedicated traceability dashboard to inspect
                      coverage.
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
                    Open traceability
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
        title="Clarification & Refinement"
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
                    ? "Answer all critical clarifications first"
                    : "Refine this requirement with AI"
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {refineBusyRequirementId === selectedRequirement!.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Refine with AI
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
                Save requirement
              </button>
              <button
                type="button"
                onClick={() => setIsClarifyModalOpen(false)}
                className="ml-auto rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          ) : null
        }
      >
        {selectedRequirement && (
          <div className="space-y-5">
            {/* Requirement header */}
            <div className="rounded-2xl bg-slate-50 p-4 flex items-start gap-3">
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
                Clarification questions
              </p>
              {(clarifications[selectedRequirement.id] || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  No clarification questions for this requirement.
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
                            ? "border-emerald-200 bg-emerald-50/50"
                            : item.isCritical
                              ? "border-rose-200 bg-rose-50/40"
                              : "border-outline-variant/10 bg-surface-container-low",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  item.isCritical
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {item.isCritical ? "Critical" : "Optional"}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  item.isAnswered
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {item.isAnswered ? "Answered" : "Open"}
                              </span>
                            </div>
                            <p className="mt-2 font-medium text-on-surface text-sm">
                              {item.question}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              Source: {item.ambiguitySource}
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
                            Answer
                          </button>
                        </div>
                        <div className="rounded-xl bg-white border border-outline-variant/10 px-3 py-2 text-sm text-on-surface-variant">
                          {item.userAnswer || "No answer yet."}
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
                Edit requirement
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
                  placeholder="Title"
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
                  placeholder="Endpoint ID"
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
                  placeholder="Testable constraints JSON"
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
                  Mark this requirement reviewed
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddReqOpen}
        onClose={() => setIsAddReqOpen(false)}
        title="Add Requirement"
        footer={
          <>
            <button
              onClick={() => setIsAddReqOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRequirement}
              disabled={isAddingReq}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white inline-flex items-center gap-2"
            >
              {isAddingReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            value={addReqForm.title}
            onChange={(e) => setAddReqForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title *"
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
          <input
            value={addReqForm.description}
            onChange={(e) => setAddReqForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
          <select
            value={addReqForm.requirementType}
            onChange={(e) => setAddReqForm((prev) => ({ ...prev, requirementType: Number(e.target.value) }))}
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          >
            <option value={0}>Functional</option>
            <option value={1}>NonFunctional</option>
            <option value={2}>Security</option>
            <option value={3}>Performance</option>
            <option value={4}>Constraint</option>
          </select>
          <textarea
            rows={3}
            value={addReqForm.testableConstraints}
            onChange={(e) => setAddReqForm((prev) => ({ ...prev, testableConstraints: e.target.value }))}
            placeholder="Testable constraints (optional)"
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm font-mono"
          />
          <input
            value={addReqForm.endpointId}
            onChange={(e) => setAddReqForm((prev) => ({ ...prev, endpointId: e.target.value }))}
            placeholder="Endpoint ID (optional)"
            className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create SRS Document"
        footer={
          <>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              Cancel
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
              Create
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
            placeholder="Document title"
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
            <option value={0}>TextInput</option>
            <option value={1}>FileUpload</option>
            <option value={2}>Url</option>
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
                placeholder="Paste SRS content"
              />
              <label className="flex items-center gap-3 cursor-pointer rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
                {isFileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Or load from .txt / .md file
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
                  Content loaded:{" "}
                  {createForm.rawContent.length.toLocaleString()} characters
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
                      Đang tải lên…
                    </span>
                  </>
                ) : createForm.storageFileId ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-semibold text-emerald-700">
                      File đã tải lên thành công
                    </span>
                    <span className="text-xs text-on-surface-variant break-all">
                      {createForm.storageFileId}
                    </span>
                    <span className="text-xs underline text-indigo-600">
                      Nhấn để chọn file khác
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">
                      Nhấn để chọn file PDF / DOCX / TXT / MD
                    </span>
                    <span className="text-xs">Tối đa 20 MB</span>
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
                      fd.append("description", "SRS document");
                      const result = await (
                        await import("../services/apiService")
                      ).apiService.uploadFile<{ id: string }>("/files", fd);
                      setCreateForm((prev) => ({
                        ...prev,
                        storageFileId: result.id,
                      }));
                      showSuccessToast("File tải lên thành công.");
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
              placeholder="https://example.com/srs-document"
            />
          )}
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              Follow the contract flow: create document, analyze asynchronously,
              review requirements, answer critical clarifications, then refine.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(activeClarificationRequirementId)}
        onClose={() => setActiveClarificationRequirementId(null)}
        title="Answer Clarification"
        footer={
          <>
            <button
              onClick={() => setActiveClarificationRequirementId(null)}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold"
            >
              Cancel
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
              Save answer
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
            placeholder="Type the clarification answer"
          />
          <p className="text-xs text-on-surface-variant">
            Answers are saved via PATCH to the clarification endpoint.
          </p>
        </div>
      </Modal>

      {/* ── Confirm Dialog ── */}
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
              Cancel
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
              {confirmDialog.confirmLabel || "Confirm"}
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
