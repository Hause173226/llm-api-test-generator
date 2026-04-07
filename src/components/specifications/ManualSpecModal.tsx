import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import EndpointForm from './EndpointForm';
import { ManualSpecFormData, ManualSpecValidationErrors, ManualSpecificationRequest } from '../../types/manualSpec';
import { handleError, showSuccessToast, showErrorToast } from '../../utils/errorHandler';

interface ManualSpecModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void;
    createManualSpecification: (data: ManualSpecificationRequest) => Promise<any>;
}

const DEFAULT_FORM_DATA: ManualSpecFormData = {
    name: '',
    version: '1.0.0',
    autoActivate: true,
    endpoints: [
        {
            httpMethod: 'GET',
            path: '',
            operationId: '',
            summary: '',
            description: '',
            tags: [],
            isDeprecated: false,
            parameters: [],
            responses: []
        }
    ]
};

export default function ManualSpecModal({
    isOpen,
    onClose,
    projectId,
    onSuccess,
    createManualSpecification
}: ManualSpecModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<ManualSpecFormData>(DEFAULT_FORM_DATA);
    const [validationErrors, setValidationErrors] = useState<ManualSpecValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(DEFAULT_FORM_DATA);
            setValidationErrors({});
            setIsDirty(false);
        }
    }, [isOpen]);

    // Validation function
    const validateForm = (data: ManualSpecFormData): ManualSpecValidationErrors => {
        const errors: ManualSpecValidationErrors = {};

        // Validate name
        if (!data.name.trim()) {
            errors.name = t('specifications.manualModal.validation.nameRequired');
        }

        // Validate endpoints
        if (data.endpoints.length === 0) {
            errors.endpoints = t('specifications.manualModal.validation.endpointsRequired');
        }

        // Validate each endpoint
        const endpointErrors: ManualSpecValidationErrors['endpointErrors'] = {};
        data.endpoints.forEach((endpoint, index) => {
            const endpointError: any = {};

            if (!endpoint.httpMethod) {
                endpointError.httpMethod = t('specifications.manualModal.validation.methodRequired');
            }

            if (!endpoint.path.trim()) {
                endpointError.path = t('specifications.manualModal.validation.pathRequired');
            } else if (!endpoint.path.startsWith('/')) {
                endpointError.path = t('specifications.manualModal.validation.pathInvalid');
            }

            // Validate parameters
            if (endpoint.parameters.length > 0) {
                const paramErrors: any = {};
                endpoint.parameters.forEach((param, paramIndex) => {
                    if (!param.name.trim()) {
                        paramErrors[paramIndex] = { name: t('specifications.manualModal.validation.paramNameRequired') };
                    }
                });
                if (Object.keys(paramErrors).length > 0) {
                    endpointError.parameters = paramErrors;
                }
            }

            // Validate responses
            if (endpoint.responses.length > 0) {
                const respErrors: any = {};
                endpoint.responses.forEach((resp, respIndex) => {
                    const respError: any = {};
                    // statusCode is required if response item exists
                    if (!resp.statusCode || resp.statusCode === 0) {
                        respError.statusCode = t('specifications.manualModal.validation.statusCodeRequired');
                    } else if (!Number.isInteger(resp.statusCode) || resp.statusCode < 100 || resp.statusCode > 599) {
                        respError.statusCode = t('specifications.manualModal.validation.statusCodeRange');
                    }
                    // schema is optional but must be valid JSON if provided
                    if (resp.schema && resp.schema.trim()) {
                        try {
                            JSON.parse(resp.schema);
                        } catch {
                            respError.schema = t('specifications.manualModal.validation.schemaInvalid');
                        }
                    }
                    if (Object.keys(respError).length > 0) {
                        respErrors[respIndex] = respError;
                    }
                });
                if (Object.keys(respErrors).length > 0) {
                    endpointError.responses = respErrors;
                }
            }

            if (Object.keys(endpointError).length > 0) {
                endpointErrors[index] = endpointError;
            }
        });

        if (Object.keys(endpointErrors).length > 0) {
            errors.endpointErrors = endpointErrors;
        }

        return errors;
    };

    const handleAddEndpoint = () => {
        setFormData({
            ...formData,
            endpoints: [
                ...formData.endpoints,
                {
                    httpMethod: 'GET',
                    path: '',
                    operationId: '',
                    summary: '',
                    description: '',
                    tags: [],
                    isDeprecated: false,
                    parameters: [],
                    responses: []
                }
            ]
        });
        setIsDirty(true);
    };

    const handleRemoveEndpoint = (index: number) => {
        if (formData.endpoints.length > 1) {
            setFormData({
                ...formData,
                endpoints: formData.endpoints.filter((_, i) => i !== index)
            });
            setIsDirty(true);
        }
    };

    const handleEndpointChange = (index: number, endpoint: typeof formData.endpoints[0]) => {
        const newEndpoints = [...formData.endpoints];
        newEndpoints[index] = endpoint;
        setFormData({ ...formData, endpoints: newEndpoints });
        setIsDirty(true);

        // Clear validation errors for this endpoint when user makes changes
        if (validationErrors.endpointErrors?.[index]) {
            const newErrors = { ...validationErrors };
            if (newErrors.endpointErrors) {
                const { [index]: removed, ...rest } = newErrors.endpointErrors;
                newErrors.endpointErrors = rest;
                if (Object.keys(newErrors.endpointErrors).length === 0) {
                    delete newErrors.endpointErrors;
                }
            }
            setValidationErrors(newErrors);
        }
    };

    const handleSubmit = async () => {
        // Validate form
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            showErrorToast(t('specifications.manualModal.validation.endpointsRequired'));
            return;
        }

        try {
            setIsSubmitting(true);
            setValidationErrors({});

            // Prepare request data
            const requestData: ManualSpecificationRequest = {
                name: formData.name,
                version: formData.version,
                autoActivate: formData.autoActivate,
                endpoints: formData.endpoints
            };

            await createManualSpecification(requestData);

            // Show success toast
            showSuccessToast(t('specifications.manualModal.success'));

            // Reset form and close modal
            setIsDirty(false);
            onSuccess();
            onClose();
        } catch (err) {
            // Show error toast with specific message
            const errorMessage = err instanceof Error ? err.message : t('common.error');
            showErrorToast(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isDirty) {
            // Show confirmation modal instead of toast
            setShowDiscardModal(true);
            return;
        }
        onClose();
    };

    const handleDiscardChanges = () => {
        setShowDiscardModal(false);
        setIsDirty(false);
        onClose();
    };

    const handleKeepEditing = () => {
        setShowDiscardModal(false);
    };

    const hasErrors = Object.keys(validationErrors).length > 0;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={t('specifications.manualModal.title')}
                maxWidth="4xl"
                footer={
                    <>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || hasErrors}
                            className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary dark:text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('common.create')}
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Specification Metadata */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t('specifications.manualModal.nameLabel')}
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    setIsDirty(true);
                                    // Clear name validation error when user types
                                    if (validationErrors.name) {
                                        const newErrors = { ...validationErrors };
                                        delete newErrors.name;
                                        setValidationErrors(newErrors);
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                                placeholder={t('specifications.manualModal.namePlaceholder')}
                                disabled={isSubmitting}
                            />
                            {validationErrors.name && (
                                <p className="text-sm text-error dark:text-rose-400 mt-1">{validationErrors.name}</p>
                            )}
                        </div>

                        {/* Version */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t('specifications.manualModal.versionLabel')}
                            </label>
                            <input
                                type="text"
                                value={formData.version}
                                onChange={(e) => {
                                    setFormData({ ...formData, version: e.target.value });
                                    setIsDirty(true);
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                                placeholder={t('specifications.manualModal.versionPlaceholder')}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Auto Activate */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autoActivate"
                                checked={formData.autoActivate}
                                onChange={(e) => {
                                    setFormData({ ...formData, autoActivate: e.target.checked });
                                    setIsDirty(true);
                                }}
                                className="w-4 h-4 text-primary bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary dark:focus:ring-indigo-500"
                                disabled={isSubmitting}
                            />
                            <label htmlFor="autoActivate" className="text-sm text-on-surface">
                                {t('specifications.manualModal.autoActivateLabel')}
                            </label>
                        </div>
                    </div>

                    {/* Endpoints Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-on-surface">
                                {t('specifications.manualModal.endpointsTitle')}
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddEndpoint}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary dark:text-indigo-400 hover:bg-primary/10 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                {t('specifications.manualModal.addEndpoint')}
                            </button>
                        </div>

                        {validationErrors.endpoints && (
                            <p className="text-sm text-error dark:text-rose-400">{validationErrors.endpoints}</p>
                        )}

                        <div className="space-y-4">
                            {formData.endpoints.map((endpoint, index) => (
                                <EndpointForm
                                    key={index}
                                    endpoint={endpoint}
                                    onChange={(e) => handleEndpointChange(index, e)}
                                    onRemove={() => handleRemoveEndpoint(index)}
                                    canRemove={formData.endpoints.length > 1}
                                    index={index}
                                    error={validationErrors.endpointErrors?.[index]}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Discard Changes Confirmation Modal */}
            <Modal
                isOpen={showDiscardModal}
                onClose={handleKeepEditing}
                title={t('specifications.manualModal.discardTitle')}
                maxWidth="md"
                footer={
                    <>
                        <button
                            onClick={handleKeepEditing}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            {t('specifications.manualModal.keepEditing')}
                        </button>
                        <button
                            onClick={handleDiscardChanges}
                            className="px-6 py-3 bg-error dark:bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 dark:hover:bg-rose-700 transition-colors"
                        >
                            {t('specifications.manualModal.discard')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-on-surface">
                        {t('specifications.manualModal.unsavedChanges')}
                    </p>

                </div>
            </Modal>
        </>
    );
}