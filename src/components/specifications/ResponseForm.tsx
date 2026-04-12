import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ManualSpecResponse } from "../../types/manualSpec";
import { cn } from "../../lib/utils";

interface ResponseFormProps {
    response: ManualSpecResponse;
    index: number;
    error?: { statusCode?: string; schema?: string };
    onChange: (index: number, updated: ManualSpecResponse) => void;
    onRemove: (index: number) => void;
}

const STATUS_DESCRIPTIONS: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    503: "Service Unavailable",
};

function isValidJson(str: string): boolean {
    if (!str.trim()) return true;
    try { JSON.parse(str); return true; } catch { return false; }
}

export default function ResponseForm({ response, index, error, onChange, onRemove }: ResponseFormProps) {
    const { t } = useTranslation();
    const [userEditedDesc, setUserEditedDesc] = useState(false);
    const [schemaError, setSchemaError] = useState<string>("");

    const update = (field: keyof ManualSpecResponse, value: any) => {
        onChange(index, { ...response, [field]: value });
    };

    const handleStatusCodeChange = (val: string) => {
        const num = val === "" ? "" : parseInt(val, 10);
        const updated: ManualSpecResponse = { ...response, statusCode: num as any };

        // Auto-fill description if not user-edited
        if (!userEditedDesc && typeof num === "number" && STATUS_DESCRIPTIONS[num]) {
            updated.description = STATUS_DESCRIPTIONS[num];
        }
        onChange(index, updated);
    };

    const handleDescriptionChange = (val: string) => {
        setUserEditedDesc(true);
        update("description", val);
    };

    const handleSchemaChange = (val: string) => {
        update("schema", val);
        if (val && !isValidJson(val)) {
            setSchemaError(t("specifications.manualModal.validation.schemaInvalid"));
        } else {
            setSchemaError("");
        }
    };

    return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-12 gap-2 items-start">
                {/* Status Code */}
                <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.statusCodeLabel")}
                    </label>
                    <input
                        type="number"
                        value={response.statusCode}
                        onChange={(e) => handleStatusCodeChange(e.target.value)}
                        min={100}
                        max={599}
                        className={cn(
                            "w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20",
                            error?.statusCode ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                        )}
                        placeholder="200"
                    />
                    {error?.statusCode && <p className="text-[10px] text-red-500">{error.statusCode}</p>}
                </div>

                {/* Description */}
                <div className="col-span-8 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t("specifications.manualModal.responseDescLabel")}
                    </label>
                    <input
                        type="text"
                        value={response.description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="OK"
                    />
                </div>

                {/* Remove */}
                <div className="col-span-1 flex items-end justify-end pb-0.5">
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                        title={t("specifications.manualModal.removeResponse")}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Schema */}
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t("specifications.manualModal.schemaLabel")}
                </label>
                <textarea
                    rows={3}
                    value={response.schema}
                    onChange={(e) => handleSchemaChange(e.target.value)}
                    className={cn(
                        "w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none",
                        (schemaError || error?.schema) ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                    )}
                    placeholder={t("specifications.manualModal.schemaPlaceholder")}
                />
                {(schemaError || error?.schema) && (
                    <p className="text-[10px] text-red-500">{schemaError || error?.schema}</p>
                )}
            </div>
        </div>
    );
}
