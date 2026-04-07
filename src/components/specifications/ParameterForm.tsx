import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ManualSpecParameter } from '../../types/manualSpec';

interface ParameterFormProps {
    parameter: ManualSpecParameter;
    onChange: (parameter: ManualSpecParameter) => void;
    onRemove: () => void;
    error?: {
        name?: string;
    };
}

export default function ParameterForm({ parameter, onChange, onRemove, error }: ParameterFormProps) {
    const { t } = useTranslation();

    return (
        <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-lg border border-outline-variant/10 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parameter Name */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('specifications.manualModal.paramNameLabel')}
                    </label>
                    <input
                        type="text"
                        value={parameter.name}
                        onChange={(e) => onChange({ ...parameter, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                        placeholder="page"
                    />
                    {error?.name && (
                        <p className="text-sm text-error dark:text-rose-400 mt-1">{error.name}</p>
                    )}
                </div>

                {/* Parameter Location */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('specifications.manualModal.paramLocationLabel')}
                    </label>
                    <select
                        value={parameter.location}
                        onChange={(e) => onChange({ ...parameter, location: e.target.value as ManualSpecParameter['location'] })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
                    >
                        <option value="Path">Path</option>
                        <option value="Query">Query</option>
                        <option value="Header">Header</option>
                        <option value="Body">Body</option>
                    </select>
                </div>

                {/* Data Type */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('specifications.manualModal.paramTypeLabel')}
                    </label>
                    <input
                        type="text"
                        value={parameter.dataType}
                        onChange={(e) => onChange({ ...parameter, dataType: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                        placeholder="string"
                    />
                </div>

                {/* Is Required Checkbox + Remove Button */}
                <div className="space-y-2 flex items-end gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="checkbox"
                            id={`param-required-${parameter.name}`}
                            checked={parameter.isRequired}
                            onChange={(e) => onChange({ ...parameter, isRequired: e.target.checked })}
                            className="w-4 h-4 text-primary bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded focus:ring-primary dark:focus:ring-indigo-500"
                        />
                        <label htmlFor={`param-required-${parameter.name}`} className="text-sm text-on-surface">
                            {t('specifications.manualModal.paramRequiredLabel')}
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-2 text-error dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        title={t('specifications.manualModal.removeParameter')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
