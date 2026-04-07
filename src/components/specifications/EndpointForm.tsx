import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ManualSpecEndpoint } from '../../types/manualSpec';
import ParameterForm from './ParameterForm';
import ResponseForm from './ResponseForm';

interface EndpointFormProps {
    endpoint: ManualSpecEndpoint;
    onChange: (endpoint: ManualSpecEndpoint) => void;
    onRemove: () => void;
    canRemove: boolean;
    index: number;
    error?: {
        httpMethod?: string;
        path?: string;
        parameters?: {
            [paramIndex: number]: {
                name?: string;
            };
        };
        responses?: {
            [respIndex: number]: {
                statusCode?: string;
            };
        };
    };
}

export default function EndpointForm({ endpoint, onChange, onRemove, canRemove, index, error }: EndpointFormProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(true);

    const handleAddParameter = () => {
        onChange({
            ...endpoint,
            parameters: [
                ...endpoint.parameters,
                { name: '', location: 'Query', dataType: 'string', isRequired: false }
            ]
        });
    };

    const handleRemoveParameter = (paramIndex: number) => {
        onChange({
            ...endpoint,
            parameters: endpoint.parameters.filter((_, i) => i !== paramIndex)
        });
    };

    const handleParameterChange = (paramIndex: number, parameter: typeof endpoint.parameters[0]) => {
        const newParameters = [...endpoint.parameters];
        newParameters[paramIndex] = parameter;
        onChange({ ...endpoint, parameters: newParameters });
    };

    const handleAddResponse = () => {
        onChange({
            ...endpoint,
            responses: [
                ...endpoint.responses,
                { statusCode: 200, description: '', schema: '' }
            ]
        });
    };

    const handleRemoveResponse = (respIndex: number) => {
        onChange({
            ...endpoint,
            responses: endpoint.responses.filter((_, i) => i !== respIndex)
        });
    };

    const handleResponseChange = (respIndex: number, response: typeof endpoint.responses[0]) => {
        const newResponses = [...endpoint.responses];
        newResponses[respIndex] = response;
        onChange({ ...endpoint, responses: newResponses });
    };

    const handleTagsChange = (tagsString: string) => {
        const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
        onChange({ ...endpoint, tags });
    };

    return (
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-surface-container-low/50 dark:bg-slate-800/50 flex items-center justify-between border-b border-outline-variant/10 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-3 flex-1 text-left"
                >
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-on-surface-variant" /> : <ChevronDown className="w-5 h-5 text-on-surface-variant" />}
                    <span className="text-sm font-bold text-on-surface">
                        Endpoint {index + 1}: {endpoint.httpMethod || 'GET'} {endpoint.path || '/path'}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={!canRemove}
                    className="p-2 text-error dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('specifications.manualModal.removeEndpoint')}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="p-6 space-y-6">
                    {/* Basic Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* HTTP Method */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t('specifications.manualModal.httpMethodLabel')}
                            </label>
                            <select
                                value={endpoint.httpMethod}
                                onChange={(e) => onChange({ ...endpoint, httpMethod: e.target.value as ManualSpecEndpoint['httpMethod'] })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                            {error?.httpMethod && (
                                <p className="text-sm text-error dark:text-rose-400 mt-1">{error.httpMethod}</p>
                            )}
                        </div>

                        {/* Path */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                {t('specifications.manualModal.pathLabel')}
                            </label>
                            <input
                                type="text"
                                value={endpoint.path}
                                onChange={(e) => onChange({ ...endpoint, path: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                                placeholder={t('specifications.manualModal.pathPlaceholder')}
                            />
                            {error?.path && (
                                <p className="text-sm text-error dark:text-rose-400 mt-1">{error.path}</p>
                            )}
                        </div>
                    </div>

                    {/* Operation ID */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t('specifications.manualModal.operationIdLabel')}
                        </label>
                        <input
                            type="text"
                            value={endpoint.operationId || ''}
                            onChange={(e) => onChange({ ...endpoint, operationId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                            placeholder="getUsers"
                        />
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t('specifications.manualModal.summaryLabel')}
                        </label>
                        <input
                            type="text"
                            value={endpoint.summary || ''}
                            onChange={(e) => onChange({ ...endpoint, summary: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                            placeholder="Get all users"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t('specifications.manualModal.descriptionLabel')}
                        </label>
                        <textarea
                            rows={3}
                            value={endpoint.description || ''}
                            onChange={(e) => onChange({ ...endpoint, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                            placeholder="Retrieves a list of all users"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            {t('specifications.manualModal.tagsLabel')}
                        </label>
                        <input
                            type="text"
                            value={endpoint.tags.join(', ')}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
                            placeholder={t('specifications.manualModal.tagsPlaceholder')}
                        />
                    </div>

                    {/* Deprecated Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`endpoint-deprecated-${index}`}
                            checked={endpoint.isDeprecated}
                            onChange={(e) => onChange({ ...endpoint, isDeprecated: e.target.checked })}
                            className="w-4 h-4 text-primary bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary dark:focus:ring-indigo-500"
                        />
                        <label htmlFor={`endpoint-deprecated-${index}`} className="text-sm text-on-surface">
                            {t('specifications.manualModal.deprecatedLabel')}
                        </label>
                    </div>

                    {/* Parameters Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                                {t('specifications.manualModal.parametersTitle')}
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddParameter}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary dark:text-indigo-400 hover:bg-primary/10 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('specifications.manualModal.addParameter')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {endpoint.parameters.map((param, paramIndex) => (
                                <ParameterForm
                                    key={paramIndex}
                                    parameter={param}
                                    onChange={(p) => handleParameterChange(paramIndex, p)}
                                    onRemove={() => handleRemoveParameter(paramIndex)}
                                    error={error?.parameters?.[paramIndex]}
                                />
                            ))}
                            {endpoint.parameters.length === 0 && (
                                <p className="text-sm text-on-surface-variant italic">No parameters defined</p>
                            )}
                        </div>
                    </div>

                    {/* Responses Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                                {t('specifications.manualModal.responsesTitle')}
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddResponse}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary dark:text-indigo-400 hover:bg-primary/10 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('specifications.manualModal.addResponse')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {endpoint.responses.map((resp, respIndex) => (
                                <ResponseForm
                                    key={respIndex}
                                    response={resp}
                                    onChange={(r) => handleResponseChange(respIndex, r)}
                                    onRemove={() => handleRemoveResponse(respIndex)}
                                    error={error?.responses?.[respIndex]}
                                />
                            ))}
                            {endpoint.responses.length === 0 && (
                                <p className="text-sm text-on-surface-variant italic">No responses defined</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
