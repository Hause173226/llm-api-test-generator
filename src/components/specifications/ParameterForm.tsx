import React from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ManualSpecParameter } from "../../types/manualSpec";
import { cn } from "../../lib/utils";

interface ParameterFormProps {
    param: ManualSpecParameter;
    index: number;
    error?: { name?: string };
    onChange: (index: number, updated: ManualSpecParameter) => void;
    onRemove: (index: number) => void;
}

const LOCATIONS = ["Path", "Query", "Header", "Body"] as const;
const DATA_TYPES = ["string", "integer", "number", "boolean", "array", "object"];

export default function ParameterForm({ param, index, error, onChange, onRemove }: ParameterFormProps) {
    const { t } = useTranslation();

    const update = (field: keyof ManualSpecParameter, value: any) => {
        onChange(index, { ...param, [field]: value });
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Name */}
            <div className="col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t("specifications.manualModal.paramNameLabel")}
                </label>
                <input
                    type="text"
                    value={param.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={cn(
                        "w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20",
                        error?.name ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                    )}
                    placeholder="id"
                />
                {error?.name && <p className="text-[10px] text-red-500">{error.name}</p>}
            </div>

            {/* Location */}
            <div className="col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t("specifications.manualModal.paramLocationLabel")}
                </label>
                <select
                    value={param.location}
                    onChange={(e) => update("location", e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                    {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>
            </div>

            {/* Data Type */}
            <div className="col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t("specifications.manualModal.paramTypeLabel")}
                </label>
                <select
                    value={param.dataType}
                    onChange={(e) => update("dataType", e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                    {DATA_TYPES.map((dt) => (
                        <option key={dt} value={dt}>{dt}</option>
                    ))}
                </select>
            </div>

            {/* Required + Remove */}
            <div className="col-span-3 flex items-end justify-between pb-0.5">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramRequiredLabel")}
                    </label>
                    <div className="flex items-center h-[30px]">
                        <input
                            type="checkbox"
                            checked={param.isRequired}
                            onChange={(e) => update("isRequired", e.target.checked)}
                            className="w-4 h-4 rounded text-primary"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                    title={t("specifications.manualModal.removeParameter")}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
