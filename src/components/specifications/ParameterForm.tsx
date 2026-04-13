import React from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ManualSpecParameter } from "../../types/manualSpec";
import { cn } from "../../lib/utils";

interface ParameterFormProps {
    param: ManualSpecParameter;
    index: number;
    error?: { name?: string; schema?: string };
    onChange: (index: number, updated: ManualSpecParameter) => void;
    onRemove: (index: number) => void;
}

const LOCATIONS = ["Path", "Query", "Header", "Body", "Cookie"] as const;
const DATA_TYPES = ["string", "integer", "number", "boolean", "array", "object", "uuid"];

function isValidJson(str: string): boolean {
    if (!str.trim()) return true;
    try { JSON.parse(str); return true; } catch { return false; }
}

export default function ParameterForm({ param, index, error, onChange, onRemove }: ParameterFormProps) {
    const { t } = useTranslation();

    const update = (field: keyof ManualSpecParameter, value: any) => {
        onChange(index, { ...param, [field]: value });
    };

    const schemaError = param.schema && !isValidJson(param.schema)
        ? t("specifications.manualModal.validation.schemaInvalid")
        : undefined;

    return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            {/* Row 1: Name + Location + DataType + Remove */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1 min-w-0">
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

                <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramLocationLabel")}
                    </label>
                    <select
                        value={param.location}
                        onChange={(e) => update("location", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                        {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramTypeLabel")}
                    </label>
                    <select
                        value={param.dataType}
                        onChange={(e) => update("dataType", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                        {DATA_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
                    </select>
                </div>

                <div className="pb-0.5">
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

            {/* Row 2: Format + Required */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramFormatLabel")}
                    </label>
                    <input
                        type="text"
                        value={param.format || ""}
                        onChange={(e) => update("format", e.target.value || undefined)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="uuid"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {t("specifications.manualModal.paramRequiredLabel")}
                    </label>
                    <div className="flex items-center h-[34px]">
                        <input
                            type="checkbox"
                            checked={param.isRequired}
                            onChange={(e) => update("isRequired", e.target.checked)}
                            className="w-4 h-4 rounded text-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Row 3: Default + Examples */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramDefaultLabel")}
                    </label>
                    <input
                        type="text"
                        value={param.defaultValue || ""}
                        onChange={(e) => update("defaultValue", e.target.value || undefined)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="default value"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.paramExamplesLabel")}
                    </label>
                    <input
                        type="text"
                        value={param.examples || ""}
                        onChange={(e) => update("examples", e.target.value || undefined)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="example value"
                    />
                </div>
            </div>

            {/* Row 4: Schema (JSON) */}
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t("specifications.manualModal.paramSchemaLabel")}
                </label>
                <textarea
                    rows={2}
                    value={param.schema || ""}
                    onChange={(e) => update("schema", e.target.value || undefined)}
                    className={cn(
                        "w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none",
                        (schemaError || error?.schema) ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                    )}
                    placeholder='{"type": "string"}'
                />
                {(schemaError || error?.schema) && (
                    <p className="text-[10px] text-red-500">{schemaError || error?.schema}</p>
                )}
            </div>
        </div>
    );
}

