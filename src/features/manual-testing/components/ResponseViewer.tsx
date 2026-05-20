import React, { useState } from "react";
import { useResponseData } from "../contexts/ManualTestingContext";
import { useTranslation } from "react-i18next";

function tryPrettyJson(text: string) {
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return null;
  }
}

const ResponseViewer: React.FC = () => {
  const { t } = useTranslation();
  const { responseData, isLoading, error } = useResponseData();
  const [tab, setTab] = useState<"body" | "headers" | "raw" | "timeline">("body");

  const startNewTestCase = () => {
    window.dispatchEvent(new CustomEvent("manual-testing-new-test-case"));
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-surface-container-low dark:bg-slate-800/40 text-on-surface-variant dark:text-slate-300 border border-outline-variant/20 dark:border-slate-700">
        {t("manualTesting.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error.message}
      </div>
    );
  }

  if (!responseData) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-outline-variant/30 dark:border-slate-700 text-on-surface-variant dark:text-slate-400 text-sm bg-surface-container-low/30 dark:bg-slate-900/40">
        <div className="space-y-3">
          <div>{t("manualTesting.noResponse")}</div>
          <button
            onClick={startNewTestCase}
            className="px-3 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:brightness-110 transition-colors"
          >
            {t("manualTesting.newTestCase")}
          </button>
        </div>
      </div>
    );
  }

  const tone =
    responseData.status >= 500
      ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
      : responseData.status >= 400
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
        : responseData.status >= 300
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";

  const pretty = tryPrettyJson(responseData.body);
  const rawHeaders = JSON.stringify(responseData.headers, null, 2);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op fallback for unsupported contexts
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-lg font-semibold text-on-surface dark:text-slate-100">
            {t("manualTesting.response")}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${tone}`}>
            {responseData.status} {responseData.statusText}
          </div>
          <div className="text-sm text-on-surface-variant dark:text-slate-300">
            {responseData.time} ms
          </div>
          <div className="text-sm text-on-surface-variant dark:text-slate-300">
            {responseData.size} bytes
          </div>
          {responseData.contentType && (
              <div className="text-sm text-on-surface-variant dark:text-slate-300">
              {responseData.contentType}
            </div>
          )}
        </div>
        <button
          onClick={() => copyToClipboard(responseData.body || "")}
          className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-outline-variant/20 dark:border-slate-700 text-sm bg-surface-container-lowest text-on-surface"
        >
          {t("manualTesting.copyBody")}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={startNewTestCase}
          className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-colors"
        >
          {t("manualTesting.newTestCase")}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setTab("body")} className={`px-3 py-1 rounded-lg border ${tab === "body" ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline-variant/20 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>{t("manualTesting.body")}</button>
        <button onClick={() => setTab("headers")} className={`px-3 py-1 rounded-lg border ${tab === "headers" ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline-variant/20 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>{t("manualTesting.headers")}</button>
        <button onClick={() => setTab("raw")} className={`px-3 py-1 rounded-lg border ${tab === "raw" ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline-variant/20 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>{t("manualTesting.rawBody")}</button>
        <button onClick={() => setTab("timeline")} className={`px-3 py-1 rounded-lg border ${tab === "timeline" ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline-variant/20 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>{t("manualTesting.timeline")}</button>
      </div>

      {tab === "headers" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{t("manualTesting.headers")}</div>
            <button
              onClick={() => copyToClipboard(rawHeaders)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs"
            >
              {t("manualTesting.copyHeaders")}
            </button>
          </div>
          <pre className="p-3 bg-surface-container-low dark:bg-slate-900 rounded-lg border border-outline-variant/20 dark:border-slate-700 max-h-72 overflow-auto font-mono text-sm">{rawHeaders}</pre>
        </div>
      )}

      {tab === "body" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("manualTesting.body")}</div>
          <pre className="p-3 bg-surface-container-low dark:bg-slate-900 rounded-lg border border-outline-variant/20 dark:border-slate-700 max-h-96 overflow-auto font-mono text-sm">{pretty ?? responseData.body}</pre>
        </div>
      )}

      {tab === "raw" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("manualTesting.rawBody")}</div>
          <pre className="p-3 bg-surface-container-low dark:bg-slate-900 rounded-lg border border-outline-variant/20 dark:border-slate-700 max-h-96 overflow-auto font-mono text-sm">{responseData.body}</pre>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("manualTesting.timeline")}</div>
          <div className="p-3 bg-surface-container-low dark:bg-slate-900 rounded-lg border border-outline-variant/20 dark:border-slate-700 space-y-1">
            <div className="text-sm">
              {t("manualTesting.timestamp")}: {new Date(responseData.timestamp).toLocaleString()}
            </div>
            <div className="text-sm">
              {t("manualTesting.duration")}: {responseData.time} ms
            </div>
            <div className="text-sm">
              {t("manualTesting.size")}: {responseData.size} bytes
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseViewer;
