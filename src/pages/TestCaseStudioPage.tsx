import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTestCase } from "../hooks/useTestCase";
import toast from "react-hot-toast";

interface Assertion {
  id: string;
  type: "status_code" | "response_body" | "response_time" | "header";
  field?: string;
  operator: string;
  value: any;
}

export default function TestCaseStudioPage() {
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
  } = useTestCase(testSuiteId, testCaseId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requestBody, setRequestBody] = useState("{\n  \n}");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setDescription(testCase.description || "");
      setRequestBody(
        testCase.requestBody
          ? JSON.stringify(testCase.requestBody, null, 2)
          : "{\n  \n}",
      );
      setHeaders(testCase.headers || {});

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

  useEffect(() => {
    if (!testSuiteId) {
      if (hasShownMissingSuiteToastRef.current) {
        return;
      }

      hasShownMissingSuiteToastRef.current = true;
      toast.error("Test Suite ID is required");
      navigate("/test-suites");
    }
  }, [testSuiteId, navigate]);

  const handleSave = async () => {
    if (!testCaseId) {
      toast.error("Cannot save: Test Case ID is missing");
      return;
    }

    try {
      setIsSaving(true);

      let parsedBody;
      try {
        parsedBody = requestBody.trim() ? JSON.parse(requestBody) : undefined;
      } catch (e) {
        toast.error("Invalid JSON in request body");
        return;
      }

      const success = await updateTestCase({
        name,
        description,
        requestBody: parsedBody,
        headers,
        assertions: assertions.map((a) => ({
          type: a.type,
          field: a.field,
          operator: a.operator,
          value: a.value,
        })),
      });

      if (success) {
        toast.success("Test case saved successfully");
        refetch();
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!testCaseId) {
      toast.error("Cannot run: Test Case ID is missing");
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
        toast.success("Test passed successfully!");
      } else {
        toast.error("Test failed. Check console for details.");
      }
    }
  };

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

  if (loading) {
    return (
      <MainLayout title={t("testCaseStudio.title")}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!testCase && testCaseId) {
    return (
      <MainLayout title={t("testCaseStudio.title")}>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="w-12 h-12 text-error" />
          <p className="text-on-surface-variant">{t("common.testCaseNotFound")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testCaseStudio.title")}>
      <div className="flex flex-col gap-6 pb-12">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testCaseStudio.title")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t("testCaseStudio.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !testCaseId}
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
              onClick={handleRun}
              disabled={running || !testCaseId}
              className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {t("testCaseStudio.runButton")}
            </button>
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
                      testCase?.method === "GET" &&
                      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                      testCase?.method === "POST" &&
                      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                      testCase?.method === "PUT" &&
                      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      testCase?.method === "DELETE" &&
                      "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {testCase?.method || "GET"}
                  </span>
                  <span className="text-sm font-mono text-on-surface truncate">
                    {testCase?.path || "/api/endpoint"}
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

            {/* AI Assistant Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
              <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  <h3 className="font-bold tracking-tight">
                    {t("testCaseStudio.aiAssistant.title")}
                  </h3>
                </div>
                <p className="text-sm text-indigo-100 leading-relaxed mb-6 break-words">
                  {t("testCaseStudio.aiAssistant.description")}
                </p>
                <button className="w-full py-3 bg-white text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                  {t("testCaseStudio.aiAssistant.button")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* Monaco Editor */}
            <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="bg-slate-800 px-6 py-3 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    request_body.json
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest">
                    {t("testCaseStudio.editor.format")}
                  </button>
                  <Code2 className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={requestBody}
                  onChange={(value) => setRequestBody(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
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
