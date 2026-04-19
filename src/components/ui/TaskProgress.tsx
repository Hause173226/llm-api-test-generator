import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTaskPolling, TaskStatus } from '../../hooks/useTaskPolling';
import { showSuccessToast, showErrorToast } from '../../utils/errorHandler';

interface TaskProgressProps {
  /** Polling mode: pass a taskId to poll GET /api/tasks/{id}/status */
  taskId?: string | null;
  /** Promise mode: pass true while a background promise is running */
  isRunning?: boolean;
  taskLabel?: string;
  onCompleted?: (data?: TaskStatus) => void;
  onDismiss?: () => void;
}

export default function TaskProgress({
  taskId = null,
  isRunning = false,
  taskLabel = 'Processing',
  onCompleted,
  onDismiss,
}: TaskProgressProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Polling mode (when taskId is provided) ---
  const { taskStatus, isPolling } = useTaskPolling(taskId, {
    onCompleted: (data) => {
      showSuccessToast(`${taskLabel} completed successfully!`);
      onCompleted?.(data);
    },
    onFailed: (data) => {
      showErrorToast(data.error || `${taskLabel} failed.`);
    },
  });

  // Update countdown from estimated_time_remaining (polling mode)
  useEffect(() => {
    if (taskStatus?.estimated_time_remaining != null) {
      setCountdown(Math.ceil(taskStatus.estimated_time_remaining));
    }
  }, [taskStatus?.estimated_time_remaining]);

  // Tick countdown every second (polling mode)
  useEffect(() => {
    if (countdown == null || countdown <= 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev == null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  // --- Promise mode: elapsed timer ---
  useEffect(() => {
    if (isRunning) {
      setElapsed(0);
      setDismissed(false);
      elapsedRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    }

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isRunning]);

  // Reset dismissed state when taskId or isRunning changes
  useEffect(() => {
    setDismissed(false);
  }, [taskId, isRunning]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Determine if the widget should be visible
  const isActive = isRunning || (taskId && isPolling);
  if (!isActive || dismissed) return null;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Polling mode: use real progress. Promise mode: indeterminate animation.
  const hasPollingData = taskId && taskStatus;
  const progress = hasPollingData ? (taskStatus.progress ?? 0) : null;
  const statusText = hasPollingData
    ? (taskStatus.status === 'in_progress' ? 'In progress' : 'Pending')
    : 'In progress';

  return (
    <div className="fixed bottom-6 right-6 z-[9998] w-80 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {taskLabel}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          {progress != null ? (
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          ) : (
            /* Indeterminate animated bar for promise mode */
            <div className="h-full w-1/3 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          )}
        </div>
      </div>

      {/* Status info */}
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {statusText}
          {progress != null && progress > 0 && ` · ${progress}%`}
        </span>
        {/* Polling mode: countdown. Promise mode: elapsed time */}
        {countdown != null && countdown > 0 ? (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            ~{formatTime(countdown)} remaining
          </span>
        ) : isRunning ? (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {formatTime(elapsed)} elapsed
          </span>
        ) : null}
      </div>

      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
