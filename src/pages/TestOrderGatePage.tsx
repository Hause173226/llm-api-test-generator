import React, { useState } from "react";
import {
  Network,
  ArrowRight,
  Sparkles,
  Play,
  Save,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation, Trans } from "react-i18next";
import { useTestCases } from "../hooks/useTestCases";
import { useTestSuites } from "../hooks/useTestSuites";
import toast from "react-hot-toast";
import Skeleton from "../components/ui/Skeleton";

export default function TestOrderGatePage() {
  const { t } = useTranslation();
  const { testSuites } = useTestSuites();
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Use first test suite by default
  React.useEffect(() => {
    if (testSuites.length > 0 && !selectedSuiteId) {
      setSelectedSuiteId(testSuites[0].id);
    }
  }, [testSuites]);

  const { testCases, loading, reorderTestCases } =
    useTestCases(selectedSuiteId);

  const [localOrder, setLocalOrder] = useState<string[]>([]);

  // Update local order when test cases change
  React.useEffect(() => {
    if (testCases.length > 0) {
      setLocalOrder(testCases.map((tc) => tc.id));
    }
  }, [testCases]);

  const handleSaveOrder = async () => {
    const success = await reorderTestCases(localOrder);
    if (success) {
      toast.success(t("testOrderGate.success.saved"));
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...localOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setLocalOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";
      case "POST":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
      case "PUT":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
      case "DELETE":
        return "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300";
      default:
        return "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300";
    }
  };

  if (loading) {
    return (
      <MainLayout title={t("testOrderGate.title")}>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <div className="lg:col-span-3">
              <Skeleton className="h-[600px] rounded-3xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const orderedTestCases = localOrder
    .map((id) => testCases.find((tc) => tc.id === id))
    .filter(Boolean) as typeof testCases;

  return (
    <MainLayout title={t("testOrderGate.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testOrderGate.title")}
            </h1>
            <p className="text-on-surface-variant">
              {t("testOrderGate.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-bold text-sm focus:ring-4 focus:ring-primary-fixed"
            >
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveOrder}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container font-semibold flex items-center gap-2 hover:bg-surface-container-highest transition-all"
            >
              <Save className="w-5 h-5" />
              {t("testOrderGate.save")}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-5 h-5" />
              {t("testOrderGate.execute")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface">
                  {t("testOrderGate.llm.title")}
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                <Trans
                  i18nKey="testOrderGate.llm.desc"
                  count={testCases.length}
                >
                  The LLM has analyzed your specification and identified{" "}
                  <span className="text-primary font-bold">
                    {{ count: testCases.length }} test cases
                  </span>
                  .
                </Trans>
              </p>
              <button className="w-full py-3 bg-primary-fixed text-on-primary-fixed-variant font-bold text-xs rounded-xl hover:bg-primary-fixed/80 transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {t("testOrderGate.llm.regenerate")}
              </button>
            </div>

            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-4">
                {t("testOrderGate.stats.title")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.totalSteps")}
                  </span>
                  <span className="text-sm font-bold text-on-surface">
                    {testCases.length} Steps
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.activeTests")}
                  </span>
                  <span className="text-sm font-bold text-on-surface">
                    {testCases.filter((tc) => tc.isActive).length} Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.stats.complexity")}
                  </span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    {testCases.length < 5
                      ? t("testOrderGate.stats.low")
                      : testCases.length < 10
                        ? t("testOrderGate.stats.medium")
                        : t("testOrderGate.stats.high")}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {t("testOrderGate.proTip.title")}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("testOrderGate.proTip.desc")}
              </p>
            </div>
          </div>

          {/* Test Cases List with Drag & Drop */}
          <div className="lg:col-span-3 bg-surface-container-low dark:bg-surface-container-high rounded-3xl border border-outline-variant/10 shadow-inner min-h-[600px] p-8">
            {orderedTestCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Network className="w-16 h-16 text-on-surface-variant mb-4" />
                <h3 className="text-xl font-bold text-on-surface mb-2">
                  {t("testOrderGate.empty.title")}
                </h3>
                <p className="text-on-surface-variant">
                  {t("testOrderGate.empty.desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-on-surface">
                    {t("testOrderGate.list.title")}
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    {t("testOrderGate.list.dragToReorder")}
                  </span>
                </div>

                {orderedTestCases.map((testCase, index) => (
                  <div
                    key={testCase.id}
                    draggable
                    onDragStart={() => handleDragStart(testCase.id)}
                    onDragOver={(e) => handleDragOver(e, testCase.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-sm border-2 transition-all cursor-move group",
                      draggedId === testCase.id
                        ? "border-primary opacity-50"
                        : "border-outline-variant/20 hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={cn(
                              "px-2 py-1 text-[10px] font-black rounded",
                              getMethodColor(testCase.method),
                            )}
                          >
                            {testCase.method}
                          </span>
                          <h4 className="font-bold text-on-surface">
                            {testCase.name}
                          </h4>
                        </div>
                        <p className="text-xs font-mono text-on-surface-variant">
                          {testCase.path}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {testCase.isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-on-surface-variant" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
