import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import {
  Code2,
  Play,
  Save,
  Sparkles,
  ChevronRight,
  Terminal,
  Database,
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  FileText,
  Link2,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { useTestCase } from "../hooks/useTestCase";
import testSuiteLlmSuggestionService, {
  SuiteSuggestionModel,
} from "../services/testSuiteLlmSuggestionService";
import { cn } from "../lib/utils";
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";
import { useProject } from "../contexts/ProjectContext";
import { useEnvironments } from "../hooks/useEnvironments";
import ExpectedAuditPanel from "../components/test-runs/ExpectedAuditPanel";

interface Assertion {
  id: string;
  type:
    | "status_code"
    | "response_body"
    | "response_time"
    | "header"
    | "body_contains"
    | "body_not_contains"
    | "json_path";
  field?: string;
  operator: string;
  value: any;
}

export default function TestCaseDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ suiteId?: string; testCaseId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const testSuiteId =
    params.suiteId ||
    searchParams.get("testSuiteId") ||
    searchParams.get("suiteId") ||
    "";
  const testCaseId = params.testCaseId || searchParams.get("testCaseId") || "";
  const hasShownMissingSuiteToastRef = useRef(false);
  const editorRef = useRef<any>(null);
  const editorResizeRef = useRef<any>(null);
  const editorHeightRef = useRef(0);
  const isSyncingEditorRef = useRef(false);

  const {
    testCase,
    loading,
    running,
    runResult,
    updateTestCase,
    runTestCase,
    refetch,
  } = useTestCase(testSuiteId, testCaseId, true);

  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";
  const lastProjectIdRef = useRef<string | null>(null);
  const { environments: executionEnvironments, loading: envLoading } =
    useEnvironments(projectId);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<
    string | undefined
  >(undefined);

  const [suggestion, setSuggestion] = useState<SuiteSuggestionModel | null>(
    null,
  );
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requestBody, setRequestBody] = useState("{\n  \n}");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorHeight, setEditorHeight] = useState(220);
  const canEdit = Boolean(testCase);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      if (testSuiteId || testCaseId) {
        navigate("/test-suites", { replace: true });
      }
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate, testSuiteId, testCaseId]);

  const updateEditorHeight = (editorOverride?: any) => {
    const editor = editorOverride ?? editorRef.current;
    if (!editor) return;
    const contentHeight = editor.getContentHeight();
    if (!contentHeight || contentHeight === editorHeightRef.current) return;
    editorHeightRef.current = contentHeight;
    setEditorHeight(contentHeight);
    editor.layout({
      width: editor.getLayoutInfo().width,
      height: contentHeight,
    });
  };

  const syncEditorValue = (nextValue: string) => {
    isSyncingEditorRef.current = true;
    setRequestBody(nextValue);
    if (editorRef.current) {
      editorRef.current.setValue(nextValue);
    }
    setTimeout(() => {
      isSyncingEditorRef.current = false;
    }, 0);
  };

  useEffect(() => {
    return () => {
      if (editorResizeRef.current) {
        editorResizeRef.current.dispose();
        editorResizeRef.current = null;
      }
    };
  }, []);

  const prettyJson = (raw: string): string => {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      }
    } catch {
      // not valid JSON — return as-is
    }
    return raw;
  };

  const escapeHtml = (raw: string) =>
    raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const renderJsonHighlighted = (input: string | object) => {
    let pretty = "";
    if (input === null || input === undefined) {
      pretty = "";
    } else if (typeof input === "object") {
      try {
        pretty = JSON.stringify(input, null, 2);
      } catch {
        pretty = String(input);
      }
    } else {
      try {
        const trimmed = String(input).trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          pretty = JSON.stringify(JSON.parse(trimmed), null, 2);
        } else {
          pretty = String(input);
        }
      } catch {
        pretty = String(input);
      }
    }

    const escaped = escapeHtml(pretty);

    // Simple token highlighting for readability using inline styles with !important
    let highlighted = escaped
      // Keys: "key":
      .replace(
        /"([^\"]+)"\s*:/g,
        '<span style="color:#22D3EE !important">"$1"</span>:',
      )
      // String values: : "value"
      .replace(
        /:\s*"([^\n\"]*)"/g,
        ': <span style="color:#34D399 !important">"$1"</span>',
      )
      // Numbers
      .replace(
        /:\s*(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
        ': <span style="color:#F59E0B !important">$1</span>',
      )
      // booleans and null
      .replace(
        /\b(true|false|null)\b/g,
        '<span style="color:#D946EF !important">$1</span>',
      );

    return (
      <pre className="whitespace-pre-wrap text-xs font-mono mt-1 bg-surface-container-low p-3 rounded break-words">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    );
  };

  const handleFormatBody = () => {
    setRequestBody((prev) => prettyJson(prev));
    if (canEdit) {
      setIsDirty(true);
    }
  };

  const parseHeadersToObject = (input: unknown): Record<string, string> => {
    if (!input) return {};
    if (typeof input === "object") return input as Record<string, string>;
    if (typeof input !== "string") return {};

    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, string>;
      }
    } catch {
      // Keep fallback empty for non-JSON header payloads.
    }

    return {};
  };

  useEffect(() => {
    if (testCase) {
      const rawRequest = (testCase as any).request || {};

      setName(testCase.name || "");
      setDescription(testCase.description || "");

      const parsedHeaders = parseHeadersToObject(
        rawRequest.headers || testCase.headers,
      );
      setHeaders(parsedHeaders);

      // Build full request JSON (same structure as suggestedRequest) so both views look consistent
      const bodyRaw =
        typeof rawRequest.body === "string"
          ? rawRequest.body
          : testCase.requestBody
            ? JSON.stringify(testCase.requestBody)
            : null;
      const parseJsonSafe = (val: unknown, fallback: unknown = null) => {
        if (!val) return fallback;
        if (typeof val === "object") return val;
        try {
          return JSON.parse(val as string);
        } catch {
          return val;
        }
      };
      const fullRequestDisplay = {
        url: rawRequest.url || testCase.path || "",
        body: bodyRaw || null,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : null,
        timeout: rawRequest.timeout ?? null,
        bodyType: rawRequest.bodyType || "None",
        httpMethod: rawRequest.httpMethod || testCase.method || "GET",
        pathParams: parseJsonSafe(rawRequest.pathParams, {}),
        queryParams: parseJsonSafe(rawRequest.queryParams, {}),
      };
      const fullRequestJson = JSON.stringify(fullRequestDisplay, null, 2);
      syncEditorValue(fullRequestJson);

      if (testCase.assertions && Array.isArray(testCase.assertions)) {
        setAssertions(
          testCase.assertions.map((a: any, idx: number) => ({
            id: `assertion-${idx}`,
            type: a.type || "status_code",
            field: a.field,
            operator: a.operator || "equals",
            value: a.value,
          })),
        );
      } else {
        setAssertions([
          {
            id: "assertion-1",
            type: "status_code",
            operator: "equals",
            value: testCase.expectedStatus || 200,
          },
        ]);
      }

      setIsDirty(false);
    }
  }, [testCase]);

  // Restore persisted selected environment (per-project) or fall back to project default
  useEffect(() => {
    if (
      !envLoading &&
      executionEnvironments &&
      executionEnvironments.length > 0
    ) {
      const key = projectId ? `manualTesting.selectedEnv.${projectId}` : null;
      let persisted: string | null = null;
      try {
        if (key) persisted = localStorage.getItem(key);
      } catch (_e) {
        persisted = null;
      }

      if (persisted) {
        const match = executionEnvironments.find(
          (e: any) => e.id === persisted,
        );
        if (match) {
          setSelectedEnvironmentId(persisted);
          return;
        }
      }

      const def = executionEnvironments.find((e: any) => e.isDefault);
      setSelectedEnvironmentId((prev) => prev ?? def?.id ?? undefined);
    }
  }, [envLoading, executionEnvironments, projectId]);

  // Persist selected environment per project so selection is remembered when returning
  useEffect(() => {
    const key = projectId ? `manualTesting.selectedEnv.${projectId}` : null;
    if (!key) return;
    try {
      if (!selectedEnvironmentId) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, selectedEnvironmentId);
      }
    } catch (_e) {
      // ignore storage errors
    }
  }, [selectedEnvironmentId, projectId]);

  const fetchSuggestionDetail = async () => {
    if (!testSuiteId || !testCaseId) return null;

    try {
      setLoadingSuggestion(true);
      const detail = await testSuiteLlmSuggestionService.detail(
        testSuiteId,
        testCaseId,
      );
      setSuggestion(detail || null);

      if (
        detail?.appliedTestCaseId &&
        detail.appliedTestCaseId !== testCaseId
      ) {
        const params = new URLSearchParams(searchParams);
        const query = params.toString();
        navigate(
          query
            ? `/test-suites/${testSuiteId}/test-cases/${detail.appliedTestCaseId}?${query}`
            : `/test-suites/${testSuiteId}/test-cases/${detail.appliedTestCaseId}`,
          { replace: true },
        );
        return detail;
      }

      if (detail) {
        setName(detail.suggestedName || "");
        setDescription(detail.suggestedDescription || "");
        const suggestionJson = prettyJson(
          detail.suggestedRequest
            ? detail.suggestedRequest
            : detail.suggestedExpectation || "{\n  \n}",
        );
        syncEditorValue(suggestionJson);
        setHeaders({});

        // Parse suggestedExpectation to build full assertion list
        const builtAssertions: Assertion[] = [];
        try {
          const exp = detail.suggestedExpectation
            ? JSON.parse(detail.suggestedExpectation)
            : null;
          const statuses: number[] = Array.isArray(exp?.expectedStatus)
            ? exp.expectedStatus
            : exp?.expectedStatus != null
              ? [Number(exp.expectedStatus)]
              : [200];
          statuses.forEach((code, i) => {
            builtAssertions.push({
              id: `assertion-status-${i}`,
              type: "status_code",
              operator: "equals",
              value: code,
            });
          });
          const bodyContains: string[] = Array.isArray(exp?.bodyContains)
            ? exp.bodyContains
            : [];
          bodyContains.forEach((text, i) => {
            builtAssertions.push({
              id: `assertion-bc-${i}`,
              type: "body_contains",
              operator: "contains",
              value: text,
            });
          });
          const bodyNotContains: string[] = Array.isArray(exp?.bodyNotContains)
            ? exp.bodyNotContains
            : [];
          bodyNotContains.forEach((text, i) => {
            builtAssertions.push({
              id: `assertion-bnc-${i}`,
              type: "body_not_contains",
              operator: "not_contains",
              value: text,
            });
          });
          const jsonPathChecks: Record<string, string> =
            exp?.jsonPathChecks && typeof exp.jsonPathChecks === "object"
              ? exp.jsonPathChecks
              : {};
          Object.entries(jsonPathChecks).forEach(([path, expected], i) => {
            builtAssertions.push({
              id: `assertion-jp-${i}`,
              type: "json_path",
              field: path,
              operator: "equals",
              value: expected,
            });
          });
          if (exp?.maxResponseTime) {
            builtAssertions.push({
              id: "assertion-rt",
              type: "response_time",
              operator: "less_than",
              value: exp.maxResponseTime,
            });
          }
        } catch {
          builtAssertions.push({
            id: "assertion-1",
            type: "status_code",
            operator: "equals",
            value: 200,
          });
        }
        setAssertions(
          builtAssertions.length > 0
            ? builtAssertions
            : [
                {
                  id: "assertion-1",
                  type: "status_code",
                  operator: "equals",
                  value: 200,
                },
              ],
        );
        setIsDirty(false);
      }

      return detail;
    } catch (err) {
      setSuggestion(null);
      return null;
    } finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    if (!loading && !testCase && testCaseId) {
      fetchSuggestionDetail();
    }
  }, [loading, testCase, testCaseId, testSuiteId]);

  useEffect(() => {
    if (!testSuiteId) {
      if (hasShownMissingSuiteToastRef.current) return;
      hasShownMissingSuiteToastRef.current = true;
      showErrorToast("Test Suite ID is required");
      navigate("/test-suites");
    }
  }, [testSuiteId, navigate]);

  const getLogTypeForStatus = (
    status?: string,
  ): "info" | "success" | "error" => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "passed" || normalized === "completed") return "success";
    if (normalized === "failed" || normalized === "error") return "error";
    if (normalized === "skipped") return "error";
    return "info";
  };

  const getRunCaseResult = (result: any) => {
    if (!result?.cases || !Array.isArray(result.cases)) return null;
    return (
      result.cases.find((item: any) => item.testCaseId === testCaseId) ||
      result.cases[0]
    );
  };

  useEffect(() => {
    if (!runResult) return;

    const caseResult = getRunCaseResult(runResult);
    if (caseResult) {
      const statusLabel = caseResult.status || "Unknown";
      const logType = getLogTypeForStatus(statusLabel);
      const method = caseResult.httpMethod || testCase?.method || "REQUEST";
      const url = caseResult.resolvedUrl || testCase?.path || "endpoint";
      const httpStatus = caseResult.httpStatusCode ?? "N/A";
      const duration = caseResult.durationMs ?? 0;

      addConsoleLog(
        `${method} ${url} - ${statusLabel} (${httpStatus}) (${duration}ms)`,
        logType,
      );

      if (caseResult.skippedCause) {
        addConsoleLog(`Skipped: ${caseResult.skippedCause}`, "error");
      }

      if (caseResult.failureReasons && caseResult.failureReasons.length > 0) {
        caseResult.failureReasons.forEach((failure: any) => {
          const message =
            failure?.message || failure?.code || "Validation failed";
          addConsoleLog(`Check failed: ${message}`, "error");
        });
      }

      if (caseResult.warnings && caseResult.warnings.length > 0) {
        caseResult.warnings.forEach((warning: any) => {
          const message = warning?.message || warning?.code || "Warning";
          addConsoleLog(`Warning: ${message}`, "info");
        });
      }

      // Log response headers and body to the Execution Console
      try {
        const respHeaders =
          (caseResult as any).responseHeaders ||
          (caseResult as any).ResponseHeaders ||
          null;
        if (respHeaders && Object.keys(respHeaders).length > 0) {
          try {
            addConsoleLog(
              `Response headers: ${JSON.stringify(respHeaders, null, 2)}`,
              "info",
            );
          } catch {
            addConsoleLog(`Response headers: ${String(respHeaders)}`, "info");
          }
        }

        const respBodyRaw =
          (caseResult as any).responseBodyPreview ||
          (caseResult as any).ResponseBodyPreview ||
          (caseResult as any).requestBody ||
          "";

        if (respBodyRaw) {
          let prettyBody = respBodyRaw;
          try {
            if (typeof prettyBody === "string") {
              const trimmed = prettyBody.trim();
              if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                prettyBody = JSON.stringify(JSON.parse(trimmed), null, 2);
              }
            } else {
              prettyBody = JSON.stringify(prettyBody, null, 2);
            }
          } catch {
            // keep raw
          }

          const MAX_LOG = 4000;
          if (prettyBody && String(prettyBody).length > MAX_LOG) {
            addConsoleLog(
              `Response body (truncated ${String(prettyBody).length} chars): ${String(prettyBody).slice(0, MAX_LOG)}...`,
              "info",
            );
          } else {
            addConsoleLog(`Response body: ${String(prettyBody)}`, "info");
          }
        }
      } catch (_e) {
        // ignore any logging errors
      }

      addConsoleLog("Test execution complete", "info");

      if (statusLabel.toLowerCase() === "passed") {
        showSuccessToast("Test passed successfully!");
      } else {
        showErrorToast("Test failed. Check console for details.");
      }
      return;
    }

    const runStatus = runResult.run?.status || "unknown";
    const runLogType = getLogTypeForStatus(runStatus);
    addConsoleLog(`Test run ${runStatus}`, runLogType);
    addConsoleLog("Test execution complete", "info");

    if (runLogType === "success") {
      showSuccessToast("Test passed successfully!");
    } else {
      showErrorToast("Test failed. Check console for details.");
    }
  }, [runResult, testCase?.method, testCase?.path, testCaseId]);

  const addConsoleLog = (
    message: string,
    type: "info" | "success" | "error" = "info",
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput((prev) => [
      ...prev,
      `[${timestamp}] ${message}|||${type}`,
    ]);
  };

  const addAssertion = () => {
    const newAssertion: Assertion = {
      id: `assertion-${Date.now()}`,
      type: "status_code",
      operator: "equals",
      value: 200,
    };
    setAssertions([...assertions, newAssertion]);
    setIsDirty(true);
  };

  const removeAssertion = (id: string) => {
    setAssertions(assertions.filter((a) => a.id !== id));
    setIsDirty(true);
  };

  const getAssertionIcon = (type: string) => {
    switch (type) {
      case "status_code":
        return ShieldCheck;
      case "response_body":
      case "body_contains":
      case "body_not_contains":
      case "json_path":
        return Database;
      case "response_time":
        return Terminal;
      case "header":
        return Code2;
      default:
        return ShieldCheck;
    }
  };

  const getAssertionLabel = (assertion: Assertion) => {
    switch (assertion.type) {
      case "status_code":
        return `Status ${assertion.operator} ${assertion.value}`;
      case "response_body":
        return `Body.${assertion.field} ${assertion.operator} ${assertion.value}`;
      case "body_contains":
        return `Body contains "${assertion.value}"`;
      case "body_not_contains":
        return `Body NOT contains "${assertion.value}"`;
      case "json_path":
        return `${assertion.field} = ${assertion.value}`;
      case "response_time":
        return `Response time < ${assertion.value}ms`;
      case "header":
        return `Header.${assertion.field} ${assertion.operator} ${assertion.value}`;
      default:
        return "Unknown assertion";
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!testCase) {
      showErrorToast("Cannot save: Not a persistent test case");
      return false;
    }

    try {
      setIsSaving(true);

      const rawTestCase = testCase as any;
      const rawRequest = rawTestCase.request || {};
      const rawExpectation = rawTestCase.expectation || {};

      // Extract actual body from full-request JSON (if user edited the display format)
      let bodyToSave = requestBody;
      try {
        const trimmed = requestBody.trim();
        if (trimmed.startsWith("{")) {
          const parsed = JSON.parse(trimmed);
          // If this looks like a full request object (has url/httpMethod/bodyType), extract body
          if (
            parsed &&
            typeof parsed === "object" &&
            ("url" in parsed || "httpMethod" in parsed || "bodyType" in parsed)
          ) {
            const extractedBody = parsed.body;
            bodyToSave =
              extractedBody != null
                ? typeof extractedBody === "string"
                  ? extractedBody
                  : JSON.stringify(extractedBody, null, 2)
                : "";
          }
        }
      } catch {
        showErrorToast("Invalid JSON in request editor");
        return false;
      }

      const statusAssertion = assertions.find(
        (a) => a.type === "status_code" && a.value !== undefined,
      );

      const expectedStatus = statusAssertion
        ? String(statusAssertion.value)
        : String(
            rawExpectation.expectedStatus || testCase.expectedStatus || 200,
          );

      const payload = {
        endpointId: testCase.endpointId,
        name,
        description,
        testType: rawTestCase.testType || "HappyPath",
        priority: rawTestCase.priority || "Medium",
        isEnabled: rawTestCase.isEnabled ?? true,
        tags: rawTestCase.tags || [],
        request: {
          httpMethod: rawRequest.httpMethod || testCase.method || "GET",
          url: rawRequest.url || testCase.path || "",
          headers: JSON.stringify(headers || {}),
          pathParams: rawRequest.pathParams || null,
          queryParams: rawRequest.queryParams || null,
          bodyType: rawRequest.bodyType || "None",
          body: bodyToSave,
          timeout: rawRequest.timeout || 30000,
        },
        expectation: {
          expectedStatus,
          responseSchema: rawExpectation.responseSchema || null,
          headerChecks: rawExpectation.headerChecks || null,
          bodyContains: rawExpectation.bodyContains || null,
          bodyNotContains: rawExpectation.bodyNotContains || null,
          jsonPathChecks: rawExpectation.jsonPathChecks || null,
          maxResponseTime: rawExpectation.maxResponseTime || null,
        },
        variables: (rawTestCase.variables || []).map((v: any) => ({
          variableName: v.variableName,
          extractFrom: v.extractFrom,
          jsonPath: v.jsonPath,
          headerName: v.headerName,
          regex: v.regex,
          defaultValue: v.defaultValue,
        })),
      };

      const success = await updateTestCase(payload as any);

      if (success) {
        showSuccessToast("Test case saved successfully");
        setIsDirty(false);
        refetch();
      }
      return success;
    } catch (error) {
      console.error("Save error:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!testCase) {
      showErrorToast("Cannot run: Not a persistent test case");
      return;
    }

    setConsoleOutput([]);
    addConsoleLog("Initializing test runner...");
    addConsoleLog(`Connecting to ${testCase?.path || "endpoint"}...`);

    if (selectedEnvironmentId) {
      const env = executionEnvironments.find(
        (e: any) => e.id === selectedEnvironmentId,
      );
      if (env) addConsoleLog(`Using environment: ${env.name}`);
    }

    const result = await runTestCase(selectedEnvironmentId);
    if (!result) {
      addConsoleLog(
        "Test execution failed. Check errors for details.",
        "error",
      );
    }
  };

  const handleExecute = async () => {
    if (!testCase) {
      showErrorToast("Cannot run: Not a persistent test case");
      return;
    }

    if (isDirty) {
      setIsSaveConfirmOpen(true);
      return;
    }

    await handleRun();
  };

  const handleConfirmSaveAndExecute = async () => {
    setIsSaveConfirmOpen(false);
    const saved = await handleSave();
    if (saved) {
      await handleRun();
    }
  };

  if (loading || loadingSuggestion) {
    return (
      <MainLayout
        title={
          suggestion?.suggestedName ||
          testCase?.name ||
          t("testCaseStudio.title")
        }
      >
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!testCase && !suggestion && testCaseId) {
    return (
      <MainLayout title={t("testCaseStudio.title")}>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="w-12 h-12 text-error" />
          <p className="text-on-surface-variant">Test case not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={
        suggestion?.suggestedName || testCase?.name || t("testCaseStudio.title")
      }
    >
      <div className="flex flex-col  pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors "
        >
          <ArrowLeft className="w-4 h-" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <header className="flex justify-between items-center">
          <div className="flex items-start gap-4 mt-10">
            <div className="">
              <h1 className="text-4xl font-bold tracking-tight text-on-surface mb-2">
                {suggestion ? "LLM Suggestion" : t("testCaseStudio.title")}
              </h1>
              {(testCase?.name || suggestion?.suggestedName) && (
                <p className="text-base font-semibold text-on-surface mb-1">
                  {testCase?.name || suggestion?.suggestedName}
                </p>
              )}
              {(testCase?.description || suggestion?.suggestedDescription) && (
                <p className="text-sm text-on-surface-variant">
                  {testCase?.description || suggestion?.suggestedDescription}
                </p>
              )}
              {!testCase?.description && !suggestion?.suggestedDescription && (
                <p className="text-sm text-on-surface-variant">
                  {suggestion
                    ? "Viewing LLM suggestion details"
                    : t("testCaseStudio.subtitle")}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {testCase ? (
              <>
                <select
                  value={selectedEnvironmentId ?? ""}
                  onChange={(e) =>
                    setSelectedEnvironmentId(e.target.value || undefined)
                  }
                  disabled={envLoading}
                  className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-on-surface border-none"
                >
                  <option value="">Use default</option>
                  {executionEnvironments?.map((env: any) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !testCase}
                  className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t("testCaseStudio.saveButton")}
                </button>
                <button
                  onClick={handleExecute}
                  disabled={running || isSaving || !testCase}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {t("testCaseStudio.runButton")}
                </button>
              </>
            ) : (
              <div className="px-3 py-1.5 rounded-md bg-amber-100 text-amber-800 text-sm font-semibold">
                Viewing LLM suggestion
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("testCaseStudio.caseNameLabel")}
                </label>
                <input
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 font-semibold text-on-surface"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  disabled={!canEdit}
                  type="text"
                  placeholder="Test case name"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {t("testCaseStudio.endpointTargetLabel")}
                </label>
                <div className="flex items-center gap-2 p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl">
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-black rounded",
                      (testCase?.method || suggestion?.endpointMethod) ===
                        "GET" &&
                        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                      (testCase?.method || suggestion?.endpointMethod) ===
                        "POST" &&
                        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                      (testCase?.method || suggestion?.endpointMethod) ===
                        "PUT" &&
                        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      (testCase?.method || suggestion?.endpointMethod) ===
                        "DELETE" &&
                        "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {testCase?.method || suggestion?.endpointMethod || "GET"}
                  </span>
                  <span className="text-sm font-mono text-on-surface truncate">
                    {testCase?.path ||
                      suggestion?.endpointPath ||
                      "/api/endpoint"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800">
              <h2 className="text-lg font-bold text-on-error-container ">
                Detail
              </h2>
              <div className="space-y-2 text-sm text-on-surface-variant mt-3">
                {testCase ? (
                  <>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Method:
                      </span>{" "}
                      {(testCase as any).request?.httpMethod || testCase.method}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Path:
                      </span>{" "}
                      {(testCase as any).request?.url || testCase.path}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Body type:
                      </span>{" "}
                      {(testCase as any).request?.bodyType || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Expected status:
                      </span>{" "}
                      {(testCase as any).expectation?.expectedStatus ||
                        testCase.expectedStatus}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Test type:
                      </span>{" "}
                      {(testCase as any).testType || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Priority:
                      </span>{" "}
                      {(testCase as any).priority || "N/A"}
                    </p>
                    {/* SRS context if available */}
                    {(testCase as any).srsDocumentTitle && (
                      <>
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-on-surface">
                            SRS context:
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            SRS-linked
                          </span>
                        </p>
                        <p>
                          <span className="font-semibold text-on-surface">
                            SRS document:
                          </span>{" "}
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            {(testCase as any).srsDocumentTitle}
                          </span>
                        </p>
                      </>
                    )}
                  </>
                ) : suggestion ? (
                  <>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Suggestion type:
                      </span>{" "}
                      {suggestion.testType ||
                        suggestion.suggestionType ||
                        "N/A"}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface">
                        SRS context:
                      </span>{" "}
                      {suggestion.hasSrsContext ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          SRS-linked
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-xs">
                          No SRS
                        </span>
                      )}
                    </p>
                    {suggestion.hasSrsContext &&
                      suggestion.srsDocumentTitle && (
                        <p>
                          <span className="font-semibold text-on-surface">
                            SRS document:
                          </span>{" "}
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            {suggestion.srsDocumentTitle}
                          </span>
                        </p>
                      )}
                    {suggestion.hasSrsContext &&
                      suggestion.coveredRequirements &&
                      suggestion.coveredRequirements.length > 0 && (
                        <div>
                          <span className="font-semibold text-on-surface">
                            Covered requirements:
                          </span>
                          <ul className="mt-1 space-y-1 pl-1">
                            {suggestion.coveredRequirements.map((req) => (
                              <li
                                key={req.id}
                                className="flex items-start gap-2"
                              >
                                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono">
                                  {req.code}
                                </span>
                                <span className="text-xs text-on-surface-variant">
                                  {req.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {suggestion.hasSrsContext &&
                      (!suggestion.coveredRequirements ||
                        suggestion.coveredRequirements.length === 0) &&
                      suggestion.coveredRequirementIds &&
                      suggestion.coveredRequirementIds.length > 0 && (
                        <div>
                          <span className="font-semibold text-on-surface">
                            Covered requirements:
                          </span>
                          <ul className="mt-1 space-y-0.5 pl-1">
                            {suggestion.coveredRequirementIds.map((reqId) => (
                              <li
                                key={reqId}
                                className="text-[10px] font-mono text-on-surface-variant truncate"
                              >
                                {reqId}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    <p>
                      <span className="font-semibold text-on-surface">
                        Review status:
                      </span>{" "}
                      {suggestion.reviewStatus || "N/A"}
                    </p>

                    <p>
                      <span className="font-semibold text-on-surface">
                        Created:
                      </span>{" "}
                      {suggestion.createdDateTime || "N/A"}
                    </p>
                  </>
                ) : (
                  <p>No details available</p>
                )}
              </div>
            </div>

            {/* ── Evidence: Expected Checks card ── */}
            {(() => {
              const parseJsonSafe = <T,>(raw?: string | null): T | null => {
                if (!raw) return null;
                try {
                  return JSON.parse(raw) as T;
                } catch {
                  return null;
                }
              };

              const rawExp = testCase
                ? (testCase as any).expectation
                : suggestion?.suggestedExpectation
                  ? parseJsonSafe<any>(suggestion.suggestedExpectation)
                  : null;

              if (!rawExp) return null;

              // rawExp fields can be either already-parsed values (suggestion mode, where
              // suggestedExpectation is parsed into an object) or JSON strings (test-case
              // mode, where expectation fields are stored as serialized JSON in the DB).
              // parseOrUse handles both transparently.
              const parseOrUseList = (val: any): string[] | null => {
                if (Array.isArray(val)) return val.length > 0 ? val : null;
                if (typeof val === "string")
                  return parseJsonSafe<string[]>(val);
                return null;
              };
              const parseOrUseMap = (
                val: any,
              ): Record<string, string> | null => {
                if (val && typeof val === "object" && !Array.isArray(val))
                  return Object.keys(val).length > 0 ? val : null;
                if (typeof val === "string")
                  return parseJsonSafe<Record<string, string>>(val);
                return null;
              };
              const parseOrUseStatusList = (val: any): number[] | null => {
                if (Array.isArray(val)) return val.length > 0 ? val : null;
                if (typeof val === "string") {
                  // Could be "[200,201]" or plain "200"
                  const parsed = parseJsonSafe<number[]>(val);
                  if (parsed) return parsed;
                  const n = Number(val);
                  return isNaN(n) ? null : [n];
                }
                if (typeof val === "number") return [val];
                return null;
              };

              const expectedStatusList = parseOrUseStatusList(
                rawExp.expectedStatus,
              );
              const bodyContainsList = parseOrUseList(rawExp.bodyContains);
              const bodyNotContainsList = parseOrUseList(
                rawExp.bodyNotContains,
              );
              const headerMap = parseOrUseMap(rawExp.headerChecks);
              const jsonPathMap = parseOrUseMap(rawExp.jsonPathChecks);
              const maxRespTime = rawExp.maxResponseTime;

              const hasAny =
                (expectedStatusList?.length ?? 0) > 0 ||
                (bodyContainsList?.length ?? 0) > 0 ||
                (bodyNotContainsList?.length ?? 0) > 0 ||
                (headerMap && Object.keys(headerMap).length > 0) ||
                (jsonPathMap && Object.keys(jsonPathMap).length > 0) ||
                maxRespTime != null;

              if (!hasAny) return null;

              return (
                <div className="space-y-3">
                <ExpectedAuditPanel
                  expectedStatus={rawExp.expectedStatus}
                  bodyContains={rawExp.bodyContains}
                  bodyNotContains={rawExp.bodyNotContains}
                  jsonPathChecks={rawExp.jsonPathChecks}
                  headerChecks={rawExp.headerChecks}
                  variables={(testCase as any)?.variables}
                  maxResponseTime={rawExp.maxResponseTime}
                  expectedProvenance={rawExp.expectedProvenance}
                  expectationSource={rawExp.expectationSource}
                  requirementCode={rawExp.requirementCode}
                />
                <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800">
                  <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    Legacy Expected Checks
                  </h2>
                  <div className="space-y-2">
                    {expectedStatusList && expectedStatusList.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant mt-0.5">
                          Status
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {expectedStatusList.map((code, i) => (
                            <span
                              key={i}
                              className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                code >= 200 && code < 300
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : code >= 400
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {bodyContainsList && bodyContainsList.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant mt-0.5">
                          Body ∋
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {bodyContainsList.map((s, i) => (
                            <span
                              key={i}
                              className="font-mono bg-violet-500/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded text-[10px] break-all"
                            >
                              &quot;{s}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {bodyNotContainsList && bodyNotContainsList.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant mt-0.5">
                          Body ∌
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {bodyNotContainsList.map((s, i) => (
                            <span
                              key={i}
                              className="font-mono bg-orange-500/10 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded text-[10px] break-all"
                            >
                              &quot;{s}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {jsonPathMap && Object.keys(jsonPathMap).length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant mt-0.5">
                          JSONPath
                        </span>
                        <div className="flex flex-col gap-0.5 flex-1">
                          {Object.entries(jsonPathMap).map(
                            ([path, expected]) => (
                              <div
                                key={path}
                                className="flex items-center gap-1 flex-wrap"
                              >
                                <span className="font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">
                                  {path}
                                </span>
                                <span className="text-on-surface-variant text-[10px]">
                                  =
                                </span>
                                <span className="font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                                  {expected || "*"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {headerMap && Object.keys(headerMap).length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant mt-0.5">
                          Headers
                        </span>
                        <div className="flex flex-col gap-0.5 flex-1">
                          {Object.entries(headerMap).map(([k, v]) => (
                            <span
                              key={k}
                              className="font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px]"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {maxRespTime != null && (
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-on-surface-variant">
                          Resp Time
                        </span>
                        <span className="font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                          max {maxRespTime}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })()}

            {/* ── Variables / Dependencies card ── */}
            {(() => {
              const vars = testCase
                ? (testCase as any).variables
                : suggestion?.suggestedVariables;

              if (!vars || !Array.isArray(vars) || vars.length === 0)
                return null;
            })()}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* ── SRS Evidence card — show for suggestions OR approved test cases linked to SRS */}
            {(suggestion?.hasSrsContext || (testCase as any)?.hasSrsContext) &&
              (() => {
                const isSuggestion = !!suggestion;
                const srsTitle =
                  suggestion?.srsDocumentTitle ||
                  (testCase as any)?.srsDocumentTitle;
                const coveredRequirements =
                  suggestion?.coveredRequirements ||
                  (testCase as any)?.coveredRequirements;
                const coveredRequirementIds =
                  suggestion?.coveredRequirementIds ||
                  (testCase as any)?.coveredRequirementIds;
                const hasReqs =
                  (coveredRequirements && coveredRequirements.length > 0) ||
                  (coveredRequirementIds && coveredRequirementIds.length > 0);
                return (
                  <div className="shrink-0 rounded-2xl border border-emerald-300/50 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-200/60 dark:border-emerald-700/30">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                          SRS Evidence
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/40">
                        {isSuggestion ? "Generated from SRS" : "SRS-linked"}
                      </span>
                    </div>

                    {/* Source document */}
                    <div className="px-5 pt-3 pb-2 flex items-start gap-3">
                      <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-0.5">
                          Source document
                        </p>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 font-mono truncate">
                          {srsTitle || "SRS Document"}
                        </p>
                      </div>
                    </div>

                    {/* Covered requirements */}
                    {hasReqs && (
                      <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                            Requirements this test case covers
                          </p>
                        </div>
                        <div className="space-y-2">
                          {coveredRequirements && coveredRequirements.length > 0
                            ? coveredRequirements.map((req: any) => (
                                <div
                                  key={req.id}
                                  className="flex items-start gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30"
                                >
                                  <span className="shrink-0 mt-0.5 px-2 py-0.5 text-[9px] font-black font-mono rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40">
                                    {req.code}
                                  </span>
                                  <span className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                                    {req.title}
                                  </span>
                                </div>
                              ))
                            : coveredRequirementIds!.map((reqId: any) => (
                                <div
                                  key={reqId}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30"
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 truncate">
                                    {reqId}
                                  </span>
                                </div>
                              ))}
                        </div>
                      </div>
                    )}

                    {/* No requirement data but has SRS context */}
                    {!hasReqs && (
                      <div className="px-5 pb-4">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">
                          This scenario was generated with full SRS context.
                          Specific requirement mapping not available.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Monaco Editor */}
            <div className="shrink-0 bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-slate-700/50">
              {/* Title bar */}
              <div className="bg-slate-800/80 px-5 py-2.5 flex items-center justify-between border-b border-slate-700/60 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "shrink-0 px-1.5 py-0.5 text-[9px] font-black rounded tracking-wider",
                        (testCase?.method || suggestion?.endpointMethod) ===
                          "GET" && "bg-blue-500/20 text-blue-400",
                        (testCase?.method || suggestion?.endpointMethod) ===
                          "POST" && "bg-emerald-500/20 text-emerald-400",
                        (testCase?.method || suggestion?.endpointMethod) ===
                          "PUT" && "bg-amber-500/20 text-amber-400",
                        (testCase?.method || suggestion?.endpointMethod) ===
                          "DELETE" && "bg-rose-500/20 text-rose-400",
                        !(testCase?.method || suggestion?.endpointMethod) &&
                          "bg-slate-500/20 text-slate-400",
                      )}
                    >
                      {testCase?.method || suggestion?.endpointMethod || "JSON"}
                    </span>
                    <span className="text-xs font-mono text-slate-300 truncate">
                      {testCase?.path ||
                        suggestion?.endpointPath ||
                        "request_body.json"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleFormatBody}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-200 uppercase tracking-widest transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                  >
                    {t("testCaseStudio.editor.format")}
                  </button>
                  <Code2 className="w-4 h-4 text-slate-500" />
                </div>
              </div>
              {/* Editor body */}
              <div className="min-h-0">
                <Editor
                  height={editorHeight}
                  defaultLanguage="json"
                  value={requestBody}
                  onMount={(editor) => {
                    editorRef.current = editor;
                    if (editorResizeRef.current) {
                      editorResizeRef.current.dispose();
                    }
                    editorResizeRef.current = editor.onDidContentSizeChange(
                      () => {
                        updateEditorHeight(editor);
                      },
                    );
                    // Set value immediately on mount so we never show stale initial state
                    if (requestBody && requestBody !== "{\n  \n}") {
                      isSyncingEditorRef.current = true;
                      editor.setValue(requestBody);
                      setTimeout(() => {
                        isSyncingEditorRef.current = false;
                      }, 0);
                    }
                    updateEditorHeight(editor);
                  }}
                  onChange={(value) => {
                    if (!canEdit || isSyncingEditorRef.current) return;
                    setRequestBody(value || "");
                    setIsDirty(true);
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    readOnly: !canEdit,
                    padding: { top: 16, bottom: 16 },
                    fontFamily:
                      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontLigatures: true,
                    renderLineHighlight: "gutter",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                  }}
                />
              </div>
            </div>

            {/* Console Output */}
            <div className="h-100 bg-slate-950 rounded-2xl p-6 font-mono text-xs overflow-y-auto no-scrollbar border border-slate-800">
              <div className="flex items-center gap-2 mb-4 text-slate-500 uppercase tracking-widest font-bold">
                <Terminal className="w-3 h-3" />
                <span>{t("testCaseStudio.editor.consoleTitle")}</span>
              </div>
              <div className="space-y-1">
                {consoleOutput.length === 0 ? (
                  <p className="text-slate-600">
                    No execution yet. Run this test case to see request, response, and validation logs here.
                  </p>
                ) : (
                  consoleOutput.map((log, idx) => {
                    const [message = "", type] = log.split("|||");
                    const colorClass = cn(
                      type === "success" && "text-emerald-400",
                      type === "error" && "text-rose-400",
                      type === "info" && "text-indigo-400",
                      !type && "text-slate-400",
                    );

                    // Pretty-render response headers
                    if (
                      typeof message === "string" &&
                      message.startsWith("Response headers:")
                    ) {
                      const payload = message
                        .substring("Response headers:".length)
                        .trim();
                      // try to parse headers as JSON and colorize them
                      try {
                        const parsed = JSON.parse(payload);
                        return (
                          <div key={idx} className={colorClass}>
                            <div className="font-semibold">
                              Response headers
                            </div>
                            {renderJsonHighlighted(parsed)}
                          </div>
                        );
                      } catch {
                        return (
                          <div key={idx} className={colorClass}>
                            <div className="font-semibold">
                              Response headers
                            </div>
                            <pre className="whitespace-pre-wrap text-xs font-mono mt-1 bg-surface-container-low p-3 rounded">
                              {payload}
                            </pre>
                          </div>
                        );
                      }
                    }

                    // Pretty-render response body (handles truncated variant too)
                    if (
                      typeof message === "string" &&
                      message.startsWith("Response body")
                    ) {
                      const idxColon = message.indexOf(":");
                      const title =
                        idxColon >= 0
                          ? message.slice(0, idxColon)
                          : "Response body";
                      const payload =
                        idxColon >= 0 ? message.slice(idxColon + 1).trim() : "";

                      // Attempt to parse/pretty + highlight JSON body, falling back to raw text
                      try {
                        const parsed = JSON.parse(payload);
                        return (
                          <div key={idx} className={colorClass}>
                            <div className="font-semibold">{title}</div>
                            {renderJsonHighlighted(parsed)}
                          </div>
                        );
                      } catch {
                        return (
                          <div key={idx} className={colorClass}>
                            <div className="font-semibold">{title}</div>
                            <pre className="whitespace-pre-wrap text-xs font-mono mt-1 bg-surface-container-low p-3 rounded break-words">
                              {payload}
                            </pre>
                          </div>
                        );
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={cn(colorClass, "whitespace-pre-wrap")}
                      >
                        {message}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        title={t("testCaseStudio.unsaved.title")}
        className="max-w-md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSaveConfirmOpen(false)}
              className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              {t("testCaseStudio.unsaved.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirmSaveAndExecute}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                "bg-indigo-600 hover:bg-indigo-700 text-white",
              )}
            >
              {t("testCaseStudio.unsaved.confirm")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {t("testCaseStudio.unsaved.message")}
        </p>
      </Modal>
    </MainLayout>
  );
}
