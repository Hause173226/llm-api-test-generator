import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ManualSpecEndpoint, ManualSpecParameter, ManualSpecResponse } from "../../types/manualSpec";
import ParameterForm from "./ParameterForm";
import ResponseForm from "./ResponseForm";
import { cn } from "../../lib/utils";

interface EndpointFormProps {
    endpoint: ManualSpecEndpoint;
    index: number;
    totalCount: number;
    errors?: {
        httpMethod?: string;
        path?: string;
        parameters?: { [i: number]: { name?: string } };
        responses?: { [i: number]: { statusCode?: string; schema?: string } };
    };
    onChange: (index: number, updated: ManualSpecEndpoint) => void;
    onRemove: (index: number) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const METHOD_COLORS: Record<string, string> = {
    GET: "text-emerald-600 dark:text-emerald-400",
    POST: "text-blue-600 dark:text-blue-400",
    PUT: "text-amber-600 dark:text-amber-400",
    PATCH: "text-purple-600 dark:text-purple-400",
    DELETE: "text-red-600 dark:text-red-400",
    HEAD: "text-cyan-600 dark:text-cyan-400",
    OPTIONS: "text-slate-600 dark:text-slate-400",
};

const defaultParam = (): ManualSpecParameter => ({
    name: "", location: "Query", dataType: "string", isRequired: false,
});

const defaultResponse = (): ManualSpecResponse => ({
    statusCode: "", description: "", schema: "",
});

export default function EndpointForm({ endpoint, index, totalCount, errors, onChange, onRemove }: EndpointFormProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(true);

    const update = (field: keyof ManualSpecEndpoint, value: any) => {
        onChange(index, { ...endpoint, [field]: value });
    };

    const handleTagsChange = (val: string) => {
        update("tags", val.split(",").map((t) => t.trim()).filter(Boolean));
    };

    const addParam = () => update("parameters", [...endpoint.parameters, defaultParam()]);
    const removeParam = (i: number) => update("parameters", endpoint.parameters.filter((_, idx) => idx !== i));
    const updateParam = (i: number, p: ManualSpecParameter) => {
        const next = [...endpoint.parameters];
        next[i] = p;
        update("parameters", next);
    };

    const addResponse = () => update("responses", [...endpoint.responses, defaultResponse()]);
    const removeResponse = (i: number) => update("responses", endpoint.responses.filter((_, idx) => idx !== i));
    const updateResponse = (i: number, r: ManualSpecResponse) => {
        const next = [...endpoint.responses];
        next[i] = r;
        update("responses", next);
    };

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-black uppercase tracking-wider min-w-[52px]", METHOD_COLORS[endpoint.httpMethod])}>
                        {endpoint.httpMethod}
                    </span>
                    <span className="text-sm font-mono text-on-surface">
                        {endpoint.path || t("specifications.manualModal.pathPlaceholder")}
                    </span>
                    <span className="text-xs text-slate-400">#{index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                        disabled={totalCount <= 1}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {/* Body */}
            {expanded && (
                <div className="px-4 py-4 space-y-4 bg-white dark:bg-slate-900">
                    {/* Method + Path */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {t("specifications.manualModal.httpMethodLabel")}
                            </label>
                            <select
                                value={endpoint.httpMethod}
                                onChange={(e) => update("httpMethod", e.target.value)}
                                className={cn(
                                    "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none",
                                    errors?.httpMethod ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                                )}
                            >
                                {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {errors?.httpMethod && <p className="text-[10px] text-red-500">{errors.httpMethod}</p>}
                        </div>
                        <div className="col-span-9 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {t("specifications.manualModal.pathLabel")}
                            </label>
                            <input
                                type="text"
                                value={endpoint.path}
                                onChange={(e) => update("path", e.target.value)}
                                className={cn(
                                    "w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20",
                                    errors?.path ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                                )}
                                placeholder={t("specifications.manualModal.pathPlaceholder")}
                            />
                            {errors?.path && <p className="text-[10px] text-red-500">{errors.path}</p>}
                        </div>
                    </div>

                    {/* operationId + summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {t("specifications.manualModal.operationIdLabel")}
                            </label>
                            <input
                                type="text"
                                value={endpoint.operationId || ""}
                                onChange={(e) => update("operationId", e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="getUser"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {t("specifications.manualModal.summaryLabel")}
                            </label>
                            <input
                                type="text"
                                value={endpoint.summary || ""}
                                onChange={(e) => update("summary", e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Get user by ID"
                            />
                        </div>
                    </div>

                    {/* description */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {t("specifications.manualModal.descriptionLabel")}
                        </label>
                        <textarea
                            rows={2}
                            value={endpoint.description || ""}
                            onChange={(e) => update("description", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                    </div>

                    {/* tags + deprecated */}
                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {t("specifications.manualModal.tagsLabel")}
                            </label>
                            <input
                                type="text"
                                value={endpoint.tags.join(", ")}
                                onChange={(e) => handleTagsChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t("specifications.manualModal.tagsPlaceholder")}
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                            <input
                                type="checkbox"
                                checked={endpoint.isDeprecated}
                                onChange={(e) => update("isDeprecated", e.target.checked)}
                                className="w-4 h-4 rounded text-primary"
                            />
                            <span className="text-sm text-on-surface">{t("specifications.manualModal.deprecatedLabel")}</span>
                        </label>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                {t("specifications.manualModal.parametersTitle")}
                            </span>
                            <button
                                type="button"
                                onClick={addParam}
                                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t("specifications.manualModal.addParameter")}
                            </button>
                        </div>
                        {endpoint.parameters.map((p, i) => (
                            <ParameterForm
                                key={i}
                                param={p}
                                index={i}
                                error={errors?.parameters?.[i]}
                                onChange={updateParam}
                                onRemove={removeParam}
                            />
                        ))}
                    </div>

                    {/* Responses */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                {t("specifications.manualModal.responsesTitle")}
                            </span>
                            <button
                                type="button"
                                onClick={addResponse}
                                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t("specifications.manualModal.addResponse")}
                            </button>
                        </div>
                        {endpoint.responses.map((r, i) => (
                            <ResponseForm
                                key={i}
                                response={r}
                                index={i}
                                error={errors?.responses?.[i]}
                                onChange={updateResponse}
                                onRemove={removeResponse}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
