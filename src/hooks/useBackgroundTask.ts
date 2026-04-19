import { useState, useRef, useCallback, useEffect } from 'react';

interface UseBackgroundTaskOptions {
  onCompleted?: () => void;
  onFailed?: (error: any) => void;
}

/**
 * Fire-and-forget hook for long-running async operations.
 * Calls `run(fn)` to start a background task — the UI unblocks immediately.
 * The component shows progress via `isRunning`, and callbacks fire on completion.
 * Safe on unmount: callbacks are skipped if the component is already gone.
 */
export function useBackgroundTask(options: UseBackgroundTaskOptions = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const onCompletedRef = useRef(options.onCompleted);
  const onFailedRef = useRef(options.onFailed);

  useEffect(() => { onCompletedRef.current = options.onCompleted; }, [options.onCompleted]);
  useEffect(() => { onFailedRef.current = options.onFailed; }, [options.onFailed]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback((fn: () => Promise<any>) => {
    setIsRunning(true);
    setError(null);

    // Fire and forget — do NOT return the promise to the caller
    fn()
      .then(() => {
        if (mountedRef.current) {
          setIsRunning(false);
          onCompletedRef.current?.();
        }
      })
      .catch((err: any) => {
        if (mountedRef.current) {
          const msg = err?.message || 'Background task failed';
          setIsRunning(false);
          setError(msg);
          onFailedRef.current?.(err);
        }
      });
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setError(null);
  }, []);

  return { isRunning, error, run, reset };
}
