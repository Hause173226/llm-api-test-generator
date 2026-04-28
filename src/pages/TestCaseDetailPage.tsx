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
import { useTestCase } from "../hooks/useTestCase";
import testSuiteLlmSuggestionService, {
  SuiteSuggestionModel,
} from "../services/testSuiteLlmSuggestionService";
import { cn } from "../lib/utils";
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";

interface Assertion {
  id: string;
  type: "status_code" | "response_body" | "response_time" | "header";
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

  const {
    testCase,
    loading,
    running,
    runResult,
    updateTestCase,
    runTestCase,
    refetch,
  } = useTestCase(testSuiteId, testCaseId, true);

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
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = Boolean(testCase);

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

  const handleFormatBody = () => {
    setRequestBody((prev) => prettyJson(prev));
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
      setRequestBody(
        typeof rawRequest.body === "string"
          ? rawRequest.body
          : testCase.requestBody
            ? JSON.stringify(testCase.requestBody, null, 2)
            : "{\n  \n}",
      );
      setHeaders(parseHeadersToObject(rawRequest.headers || testCase.headers));

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
    }
  }, [testCase]);

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
        setRequestBody(
          prettyJson(
            detail.suggestedRequest
              ? detail.suggestedRequest
              : detail.suggestedExpectation || "{\n  \n}",
          ),
        );
        setHeaders({});

        setAssertions([
          {
            id: "assertion-1",
            type: "status_code",
            operator: "equals",
            value: 200,
          },
        ]);
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

  useEffect(() => {
    if (runResult) {
      addConsoleLog(
        `${testCase?.method || "REQUEST"} ${testCase?.path || "endpoint"} - ${runResult.status || "N/A"} (${runResult.duration || 0}ms)`,
        runResult.success ? "success" : "error",
      );
      if (runResult.assertions) {
        runResult.assertions.forEach((assertion: any) => {
          addConsoleLog(
            `Assertion ${assertion.passed ? "Passed" : "Failed"}: ${assertion.message}`,
            assertion.passed ? "success" : "error",
          );
        });
      }
    }
  }, [runResult]);

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
  };

  const removeAssertion = (id: string) => {
    setAssertions(assertions.filter((a) => a.id !== id));
  };

  const getAssertionIcon = (type: string) => {
    switch (type) {
      case "status_code":
        return ShieldCheck;
      case "response_body":
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
      case "response_time":
        return `Response time < ${assertion.value}ms`;
      case "header":
        return `Header.${assertion.field} ${assertion.operator} ${assertion.value}`;
      default:
        return "Unknown assertion";
    }
  };

  const handleSave = async () => {
    if (!testCase) {
      showErrorToast("Cannot save: Not a persistent test case");
      return;
    }

    try {
      setIsSaving(true);

      const rawTestCase = testCase as any;
      const rawRequest = rawTestCase.request || {};
      const rawExpectation = rawTestCase.expectation || {};

      // Validate JSON-like body while still allowing plain text content.
      try {
        const trimmed = requestBody.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          JSON.parse(trimmed);
        }
      } catch {
        showErrorToast("Invalid JSON in request body");
        return;
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
          body: requestBody,
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
        refetch();
      }
    } catch (error) {
      console.error("Save error:", error);
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

    const success = await runTestCase();

    if (success && runResult) {
      addConsoleLog(
        `${testCase?.method} ${testCase?.path} - ${runResult.status || "N/A"} (${runResult.duration || 0}ms)`,
        runResult.success ? "success" : "error",
      );

      if (runResult.assertions) {
        runResult.assertions.forEach((assertion: any) => {
          addConsoleLog(
            `Assertion ${assertion.passed ? "Passed" : "Failed"}: ${assertion.message}`,
            assertion.passed ? "success" : "error",
          );
        });
      }

      addConsoleLog("Test execution complete", "info");

      if (runResult.success) {
        showSuccessToast("Test passed successfully!");
      } else {
        showErrorToast("Test failed. Check console for details.");
      }
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
              <p className="text-sm text-on-surface-variant">
                {suggestion
                  ? "Viewing LLM suggestion details"
                  : t("testCaseStudio.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {testCase ? (
              <>
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
                {/* <button
                  onClick={handleRun}
                  disabled={running || !testCase}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {t("testCaseStudio.runButton")}
                </button> */}
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
                  onChange={(e) => setName(e.target.value)}
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

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("testCaseStudio.assertionsLabel")}
                  </label>
                  <button
                    onClick={addAssertion}
                    disabled={!canEdit}
                    className="text-primary dark:text-indigo-400 hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />{" "}
                    {t("testCaseStudio.addNewAssertion")}
                  </button>
                </div>
                <div className="space-y-2">
                  {assertions.map((assertion) => {
                    const Icon = getAssertionIcon(assertion.type);
                    return (
                      <div
                        key={assertion.id}
                        className="flex items-center justify-between p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl group"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-primary dark:text-indigo-400" />
                          <div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                              {assertion.type.replace("_", " ")}
                            </p>
                            <p className="text-xs font-bold text-on-surface">
                              {getAssertionLabel(assertion)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-on-surface-variant">
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeAssertion(assertion.id)}
                            disabled={!canEdit}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-error dark:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                      {testCase.method}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Path:
                      </span>{" "}
                      {testCase.path}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Status:
                      </span>{" "}
                      {testCase.expectedStatus}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Test type:
                      </span>{" "}
                      {testCase.testType || "N/A"}
                    </p>
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
                    <p>
                      <span className="font-semibold text-on-surface">
                        Endpoint ID:
                      </span>{" "}
                      {suggestion.endpointId || "N/A"}
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
                        LLM model:
                      </span>{" "}
                      {suggestion.llmModel || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Applied test case ID:
                      </span>{" "}
                      {suggestion.appliedTestCaseId || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Created:
                      </span>{" "}
                      {suggestion.createdDateTime || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-on-surface">
                        Updated:
                      </span>{" "}
                      {suggestion.updatedDateTime || "N/A"}
                    </p>
                    {suggestion.rowVersion && (
                      <p>
                        <span className="font-semibold text-on-surface">
                          RowVersion:
                        </span>{" "}
                        {suggestion.rowVersion}
                      </p>
                    )}
                    {suggestion.tokensUsed !== undefined && (
                      <p>
                        <span className="font-semibold text-on-surface">
                          Tokens used:
                        </span>{" "}
                        {suggestion.tokensUsed}
                      </p>
                    )}
                  </>
                ) : (
                  <p>No details available</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">

            {/* ── SRS Evidence card ── shown only for SRS-backed suggestions */}
            {suggestion?.hasSrsContext && (
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
                    Generated from SRS
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
                      {suggestion.srsDocumentTitle || "SRS Document"}
                    </p>
                  </div>
                </div>

                {/* Covered requirements */}
                {((suggestion.coveredRequirements && suggestion.coveredRequirements.length > 0) ||
                  (suggestion.coveredRequirementIds && suggestion.coveredRequirementIds.length > 0)) && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                        Requirements this test case covers
                      </p>
                    </div>
                    <div className="space-y-2">
                      {suggestion.coveredRequirements && suggestion.coveredRequirements.length > 0
                        ? suggestion.coveredRequirements.map((req) => (
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
                        : suggestion.coveredRequirementIds!.map((reqId) => (
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
                {suggestion.hasSrsContext &&
                  (!suggestion.coveredRequirements || suggestion.coveredRequirements.length === 0) &&
                  (!suggestion.coveredRequirementIds || suggestion.coveredRequirementIds.length === 0) && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">
                      This scenario was generated with full SRS context. Specific requirement mapping not available.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-slate-700/50">
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
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={requestBody}
                  onChange={(value) => canEdit && setRequestBody(value || "")}
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
            <div className="h-48 bg-slate-950 rounded-2xl p-6 font-mono text-xs overflow-y-auto no-scrollbar border border-slate-800">
              <div className="flex items-center gap-2 mb-4 text-slate-500 uppercase tracking-widest font-bold">
                <Terminal className="w-3 h-3" />
                <span>{t("testCaseStudio.editor.consoleTitle")}</span>
              </div>
              <div className="space-y-1">
                {consoleOutput.length === 0 ? (
                  <p className="text-slate-600">
                    Waiting for test execution...
                  </p>
                ) : (
                  consoleOutput.map((log, idx) => {
                    const [message, type] = log.split("|||");
                    return (
                      <p
                        key={idx}
                        className={cn(
                          type === "success" && "text-emerald-400",
                          type === "error" && "text-rose-400",
                          type === "info" && "text-indigo-400",
                          !type && "text-slate-400",
                        )}
                      >
                        {message}
                      </p>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
