import React from "react";
import { KeyValuePair } from "../types";

interface Props {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  allowToggle?: boolean;
}

export default function KeyValueEditor({ items, onChange, placeholderKey = "Key", placeholderValue = "Value", allowToggle = true }: Props) {
  const handleChange = (idx: number, field: "key" | "value", value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    onChange(next);
  };

  const handleToggle = (idx: number) => {
    const next = items.map((it, i) => (i === idx ? { ...it, enabled: !it.enabled } : it));
    onChange(next);
  };

  const handleAdd = () => {
    const id = `kv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange([...items, { id, key: "", value: "", enabled: true }]);
  };

  const handleRemove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={it.id} className="grid grid-cols-1 sm:grid-cols-[auto_minmax(120px,1fr)_minmax(170px,1.4fr)_auto] gap-2 items-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
            {allowToggle && (
              <input type="checkbox" checked={!!it.enabled} onChange={() => handleToggle(idx)} className="w-4 h-4 accent-indigo-600" />
            )}
            <input
              value={it.key}
              onChange={(e) => handleChange(idx, "key", e.target.value)}
              placeholder={placeholderKey}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              value={it.value}
              onChange={(e) => handleChange(idx, "value", e.target.value)}
              placeholder={placeholderValue}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              onClick={() => handleRemove(idx)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <button
          onClick={handleAdd}
          className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
