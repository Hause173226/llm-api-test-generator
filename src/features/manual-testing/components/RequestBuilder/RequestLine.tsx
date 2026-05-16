import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useRequestConfig } from "../../contexts/ManualTestingContext";
import { HttpMethod } from "../../types";

interface RequestLineProps {
  onSend: () => void;
  isLoading: boolean;
}

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
];

/**
 * RequestLine Component
 *
 * The top bar of the RequestBuilder that contains:
 * - HTTP method dropdown selector
 * - URL input field with variable syntax support ({{variable}})
 * - Send button with loading state
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 8.1, 8.3
 */
const RequestLine: React.FC<RequestLineProps> = ({ onSend, isLoading }) => {
  const { t } = useTranslation();
  const { requestConfig, updateRequestConfig } = useRequestConfig();

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateRequestConfig({ method: e.target.value as HttpMethod });
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRequestConfig({ url: e.target.value });
  };

  const handleSend = () => {
    if (!isLoading) {
      onSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Support Ctrl+Enter / Cmd+Enter to send request
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-3 items-center">
      {/* HTTP Method Dropdown */}
      <select
        value={requestConfig.method}
        onChange={handleMethodChange}
        disabled={isLoading}
        className="px-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 text-on-surface dark:text-slate-200 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-label={t("manualTesting.httpMethod") || "HTTP Method"}
      >
        {HTTP_METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>

      {/* URL Input Field */}
      <input
        type="text"
        value={requestConfig.url}
        onChange={handleUrlChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={
          t("manualTesting.urlPlaceholder") ||
          "https://api.example.com/{{endpoint}}"
        }
        className="flex-1 px-4 py-2 rounded-lg border border-outline-variant/20 dark:border-slate-700 bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-slate-200 placeholder:text-on-surface-variant/50 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
        aria-label={t("manualTesting.url") || "Request URL"}
      />

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isLoading || !requestConfig.url.trim()}
        className="px-6 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 cursor-pointer"
        aria-label={t("manualTesting.send") || "Send Request"}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("manualTesting.sending") || "Sending..."}
          </>
        ) : (
          t("manualTesting.send") || "Send"
        )}
      </button>
    </div>
  );
};

export default RequestLine;
