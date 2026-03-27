import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

interface CustomToastProps {
  type: "success" | "error" | "info" | "loading";
  message: string;
  toastId: string;
}

export const CustomToast: React.FC<CustomToastProps> = ({
  type,
  message,
  toastId,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        );
      case "error":
        return (
          <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
        );
      case "info":
        return (
          <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        );
      case "loading":
        return (
          <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin flex-shrink-0" />
        );
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-100";
      case "error":
        return "bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-100";
      case "info":
        return "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-900 dark:text-blue-100";
      case "loading":
        return "bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-900 dark:text-indigo-100";
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border-2 shadow-2xl min-w-[320px] max-w-[500px] ${getStyles()}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-relaxed break-words">
          {message}
        </p>
      </div>
      {type !== "loading" && (
        <button
          onClick={() => toast.dismiss(toastId)}
          className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
