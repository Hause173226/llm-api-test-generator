import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { Environment, EnvironmentVariable, KeyValuePair } from "../types";
import KeyValueEditor from "./KeyValueEditor";

function createEnvironment(name: string): Environment {
  const now = new Date();
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    variables: [],
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

const EnvironmentPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    environments,
    activeEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironment();

  const [newEnvironmentName, setNewEnvironmentName] = useState("");

  useEffect(() => {
    if (!activeEnvironment && environments.length > 0) {
      setActiveEnvironment(environments[0]);
    }
  }, [activeEnvironment, environments, setActiveEnvironment]);

  const activeVariables = useMemo(
    () => activeEnvironment?.variables || [],
    [activeEnvironment],
  );
  const editorItems = useMemo<KeyValuePair[]>(
    () =>
      activeVariables.map((item) => ({
        id: item.id,
        key: item.key,
        value: item.value,
        enabled: item.enabled,
        description: item.description,
      })),
    [activeVariables],
  );

  const handleCreateEnvironment = () => {
    const name = newEnvironmentName.trim();
    if (!name) return;

    const created = createEnvironment(name);
    addEnvironment(created);
    setActiveEnvironment(created);
    setNewEnvironmentName("");
  };

  const handleDeleteEnvironment = () => {
    if (!activeEnvironment) return;
    if (!confirm(t("manualTesting.deleteEnvironmentConfirm"))) return;
    deleteEnvironment(activeEnvironment.id);
  };

  const handleVariablesChange = (variables: EnvironmentVariable[]) => {
    if (!activeEnvironment) return;
    updateEnvironment(activeEnvironment.id, { variables });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("manualTesting.activeEnvironment")}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {activeVariables.filter((item) => item.enabled).length} {t("manualTesting.variables")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
        <input
          value={newEnvironmentName}
          onChange={(e) => setNewEnvironmentName(e.target.value)}
          placeholder={t("manualTesting.environmentNamePlaceholder")}
          className="min-w-0 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
        <button
          onClick={handleCreateEnvironment}
          className="w-full sm:w-auto shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {t("manualTesting.createEnvironment")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
        <select
          value={activeEnvironment?.id || ""}
          onChange={(e) => {
            const found = environments.find((item) => item.id === e.target.value) || null;
            setActiveEnvironment(found);
          }}
          className="min-w-0 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <option value="">{t("manualTesting.noEnvironment")}</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleDeleteEnvironment}
          disabled={!activeEnvironment}
          className="w-full sm:w-auto shrink-0 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {t("manualTesting.deleteEnvironment")}
        </button>
      </div>

      {!activeEnvironment ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t("manualTesting.noEnvironment")}
        </div>
      ) : (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {t("manualTesting.variables")}
          </div>
          <KeyValueEditor
            items={editorItems}
            onChange={(items) =>
              handleVariablesChange(
                items.map((item) => ({
                  id: item.id,
                  key: item.key,
                  value: item.value,
                  enabled: item.enabled,
                  description: item.description,
                })) as EnvironmentVariable[],
              )
            }
            placeholderKey="baseUrl"
            placeholderValue="https://api.example.com"
          />
        </div>
      )}
    </div>
  );
};

export default EnvironmentPanel;