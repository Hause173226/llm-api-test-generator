import React, { useEffect, useRef, useState } from "react";
import { useCollections } from "../contexts/CollectionsContext";
import { sendRequest } from "../utils/sendRequest";
import { useVariables } from "../contexts/EnvironmentContext";
import { SavedRequest } from "../types";

interface RunnerProps {
  collectionId: string | null;
  suiteId?: string | null;
  onClose?: () => void;
}

type ItemState = {
  request: SavedRequest;
  status: "pending" | "running" | "success" | "failed";
  response?: any;
  error?: string;
};

export default function CollectionRunner({
  collectionId,
  suiteId,
  onClose,
}: RunnerProps) {
  const { getCollectionById } = useCollections();
  const { resolveVariables } = useVariables();
  const abortRef = useRef<AbortController | null>(null);

  const collection = collectionId ? getCollectionById(collectionId) : undefined;
  const requests = collection ? collection.requests : [];

  const [items, setItems] = useState<ItemState[]>(() =>
    (requests || []).map(
      (r) => ({ request: r, status: "pending" }) as ItemState,
    ),
  );
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems((requests || []).map((r) => ({ request: r, status: "pending" })));
  }, [collectionId]);

  const runAll = async () => {
    if (!requests || requests.length === 0) return;
    setRunning(true);
    abortRef.current = new AbortController();
    for (let i = 0; i < requests.length; i++) {
      if (!running) break; // stop if state changed
      setCurrentIndex(i);
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "running" } : it)),
      );
      try {
        const res = await sendRequest(requests[i].config, {
          resolveVariables,
          suiteId: suiteId || undefined,
          signal: abortRef.current.signal,
        });
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "success", response: res } : it,
          ),
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: "failed", error: err?.message || String(err) }
              : it,
          ),
        );
      }
    }
    setRunning(false);
    setCurrentIndex(null);
  };

  const stop = () => {
    setRunning(false);
    if (abortRef.current) abortRef.current.abort();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!running) onClose?.();
        }}
      />
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            Run Collection: {collection?.name || "(no collection)"}
          </h3>
          <div className="flex gap-2">
            {!running ? (
              <button
                onClick={runAll}
                className="px-3 py-1 rounded bg-indigo-600 text-white"
              >
                Run All
              </button>
            ) : (
              <button
                onClick={stop}
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => {
                if (!running) onClose?.();
              }}
              className="px-3 py-1 rounded border"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="text-sm text-on-surface-variant">
              No requests in this collection.
            </div>
          )}
          {items.map((it) => (
            <div
              key={it.request.id}
              className="p-2 rounded border flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{it.request.name}</div>
                <div className="text-xs text-on-surface-variant">
                  {it.request.config.method} {it.request.config.url}
                </div>
                {it.status === "failed" && (
                  <div className="text-xs text-red-500">{it.error}</div>
                )}
              </div>
              <div className="text-sm">
                {it.status === "pending" && (
                  <span className="text-slate-500">Pending</span>
                )}
                {it.status === "running" && (
                  <span className="text-indigo-600">Running...</span>
                )}
                {it.status === "success" && (
                  <span className="text-green-600">Success</span>
                )}
                {it.status === "failed" && (
                  <span className="text-red-600">Failed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
