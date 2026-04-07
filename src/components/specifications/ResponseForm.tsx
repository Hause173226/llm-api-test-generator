import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ManualSpecResponse } from '../../types/manualSpec';

// Common HTTP status code descriptions
const STATUS_CODE_HINTS: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
};

interface ResponseFormProps {
    response: ManualSpecResponse;
    onChange: (response: ManualSpecResponse) => void;
    onRemove: () => void;
    error?: {
        statusCode?: string;
        schema?: string;
    };
}

export default function ResponseForm({ response, onChange, onRemove, error }: ResponseFormProps) {
    const { t } = useTranslation();
    const [schemaError, setSchemaError] = useState<string>('');

    const handleStatusCodeChange = (value: string) => {
        const code = parseInt(value);
        const hint = STATUS_CODE_HINTS[code];
        onChange({
            ...response,
            statusCode: isNaN(code) ? 0 : code,
            // Auto-fill description only if it's empty or was previously auto-filled
            description: (!response.description || Object.values(STATUS_CODE_HINTS).includes(response.description))
                ? (hint || response.description)
                : response.description,
        });
    };

    const handleSchemaChange = (value: string) => {
        onChange({ ...response, schema: value });
        // Validate JSON if non-empty
        if (value.trim()) {
            try {
                JSON.parse(value);
                setSchemaError('');
            } catch {
                setSchemaError(t('specifications.manualModal.validation.schemaInvalid'));
            }
        } else {
            setSchemaError('');
        }
    };

    const statusHint = STATUS_CODE_HINTS[response.statusCode];
    const activeSchemaError = error?.schema || schemaError;

    return (
        <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-lg border border-outline-variant/10 dark:border-slate-700">
            <div className="grid grid-cols-1 gap-4">
                {/* Status Code and Remove Button Row */}
                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t('specifications.manualModal.statusCodeLabel')} *
                        </label>
                        <input
                            type="number"
                            value={response.statusCode || ''}
                            onChange={(e) => handleStatusCodeChange(e.target.value)}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface ${error?.statusCode
                                ? 'border-error dark:border-rose-500'
                                : 'border-slate-200 dark:border-slate-600'
                                }`}
                            placeholder="200"
                        />

                        {error?.statusCode && (
                            <p className="text-sm text-error dark:text-rose-400 mt-1">{error.statusCode}</p>
                        )}
                    </div>
                    <div className="flex items-end pb-1">
                        <button
                            type="button"
                            onClick={onRemove}
                            className="p-2 text-error dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title={t('specifications.manualModal.removeResponse')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Description (optional) */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('specifications.manualModal.responseDescLabel')}
                    </label>
                    <input
                        type="text"
                        value={response.description}
                        onChange={(e) => onChange({ ...response, description: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                        placeholder={statusHint || 'Success'}
                    />
                </div>

                {/* Schema (optional, must be valid JSON if provided) */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('specifications.manualModal.schemaLabel')}
                    </label>
                    <textarea
                        rows={4}
                        value={response.schema}
                        onChange={(e) => handleSchemaChange(e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface font-mono text-sm ${activeSchemaError
                            ? 'border-error dark:border-rose-500'
                            : 'border-slate-200 dark:border-slate-600'
                            }`}
                        placeholder={'{\n  "type": "object",\n  "properties": {\n    "id": { "type": "string" }\n  }\n}'}
                    />
                    {activeSchemaError && (
                        <p className="text-sm text-error dark:text-rose-400 mt-1">{activeSchemaError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
