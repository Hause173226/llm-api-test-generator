import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import GlobalSpinner from "../ui/GlobalSpinner";
import EndpointForm from "./EndpointForm";
import {
    ManualSpecFormData,
    ManualSpecEndpoint,
    ManualSpecificationRequest,
    ManualSpecValidationErrors,
} from "../../types/manualSpec";
import { showSuccessToast, showErrorToast } from "../../utils/errorHandler";

interface ManualSpecModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void;
    createManualSpecification: (projectId: string, data: ManualSpecificationRequest) => Promise<any>;
}

const defaultEndpoint = (): ManualSpecEndpoint => ({
    httpMethod: "GET",
    path: "",
    operationId: "",
    summary: "",
    description: "",
    tags: [],
    isDeprecated: false,
    parameters: [],
    responses: [],
});

const defaultForm = (): ManualSpecFormData => ({
    name: "",
    version: "1.0.0",
    autoActivate: true,
    endpoints: [defaultEndpoint()],
});

function isValidJson(str: string): boolean {
    if (!str.trim()) return true;
    try { JSON.parse(str); return true; } catch { return false; }
}

function validate(form: ManualSpecFormData, t: (k: string) => string): ManualSpecValidationErrors {
    const errors: ManualSpecValidationErrors = {};

    if (!form.name.trim()) {
        errors.name = t("specifications.manualModal.validation.nameRequired");
    } else if (form.name.length > 200) {
        errors.name = t("specifications.manualModal.validation.nameMaxLength");
    }

    if (form.endpoints.length === 0) {
        errors.endpoints = t("specifications.manualModal.validation.endpointsRequired");
    }

    const endpointErrors: ManualSpecValidationErrors["endpointErrors"] = {};

    form.endpoints.forEach((ep, i) => {
        const epErr: NonNullable<ManualSpecValidationErrors["endpointErrors"]>[number] = {};

        if (!ep.httpMethod) epErr.httpMethod = t("specifications.manualModal.validation.methodRequired");
        if (!ep.path.trim()) {
            epErr.path = t("specifications.manualModal.validation.pathRequired");
        } else if (!ep.path.startsWith("/")) {
            epErr.path = t("specifications.manualModal.validation.pathInvalid");
        } else if (ep.path.length > 500) {
            epErr.path = t("specifications.manualModal.validation.pathMaxLength");
        }

        const paramErrors: { [k: number]: { name?: string; schema?: string } } = {};
        ep.parameters.forEach((p, pi) => {
            const pe: { name?: string; schema?: string } = {};
            if (!p.name.trim()) pe.name = t("specifications.manualModal.validation.paramNameRequired");
            if (p.schema && !isValidJson(p.schema)) pe.schema = t("specifications.manualModal.validation.schemaInvalid");
            if (Object.keys(pe).length) paramErrors[pi] = pe;
        });
        if (Object.keys(paramErrors).length) epErr.parameters = paramErrors;

        const respErrors: { [k: number]: { statusCode?: string; schema?: string; headers?: string } } = {};
        ep.responses.forEach((r, ri) => {
            const re: { statusCode?: string; schema?: string; headers?: string } = {};
            if (r.statusCode === "" || r.statusCode === undefined) {
                re.statusCode = t("specifications.manualModal.validation.statusCodeRequired");
            } else {
                const code = Number(r.statusCode);
                if (!Number.isInteger(code) || code < 100 || code > 599) {
                    re.statusCode = t("specifications.manualModal.validation.statusCodeRange");
                }
            }
            if (r.schema && !isValidJson(r.schema)) {
                re.schema = t("specifications.manualModal.validation.schemaInvalid");
            }
            if (r.headers && !isValidJson(r.headers)) {
                re.headers = t("specifications.manualModal.validation.headersInvalid");
            }
            if (Object.keys(re).length) respErrors[ri] = re;
        });
        if (Object.keys(respErrors).length) epErr.responses = respErrors;

        if (Object.keys(epErr).length) endpointErrors[i] = epErr;
    });

    if (Object.keys(endpointErrors).length) errors.endpointErrors = endpointErrors;

    return errors;
}

export default function ManualSpecModal({
    isOpen, onClose, projectId, onSuccess, createManualSpecification,
}: ManualSpecModalProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState<ManualSpecFormData>(defaultForm());
    const [errors, setErrors] = useState<ManualSpecValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showDiscard, setShowDiscard] = useState(false);

    const resetAndClose = () => {
        setForm(defaultForm());
        setErrors({});
        setIsDirty(false);
        setShowDiscard(false);
        onClose();
    };

    const handleClose = () => {
        if (isDirty) {
            setShowDiscard(true);
        } else {
            resetAndClose();
        }
    };

    const markDirty = useCallback(() => setIsDirty(true), []);

    const updateField = (field: keyof ManualSpecFormData, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        markDirty();
        // Clear field error
        if (field === "name") setErrors((e) => ({ ...e, name: undefined }));
    };

    const addEndpoint = () => {
        setForm((prev) => ({ ...prev, endpoints: [...prev.endpoints, defaultEndpoint()] }));
        markDirty();
        setErrors((e) => ({ ...e, endpoints: undefined }));
    };

    const removeEndpoint = (i: number) => {
        setForm((prev) => ({ ...prev, endpoints: prev.endpoints.filter((_, idx) => idx !== i) }));
        markDirty();
    };

    const updateEndpoint = (i: number, ep: ManualSpecEndpoint) => {
        setForm((prev) => {
            const next = [...prev.endpoints];
            next[i] = ep;
            return { ...prev, endpoints: next };
        });
        markDirty();
        // Clear endpoint errors for changed fields
        setErrors((e) => {
            if (!e.endpointErrors?.[i]) return e;
            const { [i]: _, ...rest } = e.endpointErrors;
            return { ...e, endpointErrors: Object.keys(rest).length ? rest : undefined };
        });
    };

    const handleSubmit = async () => {
        const validationErrors = validate(form, t);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            setIsSubmitting(true);
            const payload: ManualSpecificationRequest = {
                name: form.name.trim(),
                version: form.version.trim() || "1.0.0",
                autoActivate: form.autoActivate,
                endpoints: form.endpoints.map((ep) => ({
                    ...ep,
                    responses: ep.responses.map((r) => ({
                        ...r,
                        statusCode: Number(r.statusCode),
                    })),
                })),
            };
            await createManualSpecification(projectId, payload);
            showSuccessToast(t("specifications.manualModal.success"));
            onSuccess();
            resetAndClose();
        } catch (err: any) {
            showErrorToast(err?.message || t("auth.validation.genericError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {isSubmitting && <GlobalSpinner label={t("specifications.manualModal.title")} />}

            {/* Discard confirmation */}
            <Modal
                isOpen={showDiscard}
                onClose={() => setShowDiscard(false)}
                title={t("specifications.manualModal.discardTitle")}
                footer={
                    <>
                        <button
                            onClick={() => setShowDiscard(false)}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            {t("specifications.manualModal.keepEditing")}
                        </button>
                        <button
                            onClick={resetAndClose}
                            className="px-6 py-3 bg-red-600 dark:bg-red-500 text-white font-bold rounded-xl hover:bg-red-700 dark:hover:bg-red-400 transition-colors cursor-pointer"
                        >
                            {t("specifications.manualModal.discard")}
                        </button>
                    </>
                }
            >
                <p className="text-sm text-on-surface-variant">
                    {t("specifications.manualModal.discardWarning")}
                </p>
            </Modal>

            {/* Main modal */}
            <Modal
                isOpen={isOpen && !showDiscard}
                onClose={handleClose}
                title={t("specifications.manualModal.title")}
                footer={
                    <>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {t("common.create")}
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t("specifications.manualModal.nameLabel")} *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}
                            placeholder={t("specifications.manualModal.namePlaceholder")}
                        />
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>

                    {/* Version + AutoActivate */}
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t("specifications.manualModal.versionLabel")}
                            </label>
                            <input
                                type="text"
                                value={form.version}
                                onChange={(e) => updateField("version", e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t("specifications.manualModal.versionPlaceholder")}
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer pb-3">
                            <input
                                type="checkbox"
                                checked={form.autoActivate}
                                onChange={(e) => updateField("autoActivate", e.target.checked)}
                                className="w-5 h-5 rounded text-primary"
                            />
                            <span className="text-sm font-medium text-on-surface">
                                {t("specifications.manualModal.autoActivateLabel")}
                            </span>
                        </label>
                    </div>

                    {/* Endpoints */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t("specifications.manualModal.endpointsTitle")}
                            </span>
                            <button
                                type="button"
                                onClick={addEndpoint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t("specifications.manualModal.addEndpoint")}
                            </button>
                        </div>

                        {errors.endpoints && (
                            <p className="text-xs text-red-500">{errors.endpoints}</p>
                        )}

                        <div className="space-y-3">
                            {form.endpoints.map((ep, i) => (
                                <EndpointForm
                                    key={i}
                                    endpoint={ep}
                                    index={i}
                                    totalCount={form.endpoints.length}
                                    errors={errors.endpointErrors?.[i]}
                                    onChange={updateEndpoint}
                                    onRemove={removeEndpoint}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
