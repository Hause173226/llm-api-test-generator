import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Environment, EnvironmentVariable } from "../types";
import environmentService from "../../../services/environmentService";

interface EnvironmentState {
  environments: Environment[];
  activeEnvironment: Environment | null;
}

interface EnvironmentContextValue extends EnvironmentState {
  setEnvironments: (environments: Environment[]) => void;
  setActiveEnvironment: (environment: Environment | null) => void;
  addEnvironment: (environment: Environment) => void;
  updateEnvironment: (id: string, updates: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  resolveVariables: (text: string) => string;
  getVariableValue: (key: string) => string | undefined;
  getAllVariables: () => EnvironmentVariable[];
}

const EnvironmentContext = createContext<EnvironmentContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "manual-testing-environments";
const ACTIVE_ENV_KEY = "manual-testing-active-environment";
const PROJECT_ACTIVE_ENV_KEY_PREFIX = "manual-testing-active-environment:";

interface EnvironmentProviderProps {
  children: ReactNode;
  projectId?: string;
}

const toVariableRecord = (variables: EnvironmentVariable[]) => {
  const output: Record<string, string> = {};

  variables.forEach((item) => {
    const key = item.key?.trim();
    if (!key) return;
    if (item.enabled === false) return;
    output[key] = item.value ?? "";
  });

  return output;
};

const mapApiEnvironmentToContext = (
  projectId: string,
  apiEnvironment: any,
): Environment => {
  const variableEntries = Object.entries(apiEnvironment?.variables || {});

  return {
    id: apiEnvironment.id,
    projectId,
    name: apiEnvironment.name,
    variables: variableEntries.map(([key, value], index) => ({
      id: `${apiEnvironment.id}-var-${index}`,
      key,
      value: value == null ? "" : String(value),
      enabled: true,
    })),
    baseUrl: apiEnvironment.baseUrl || "",
    isDefault: apiEnvironment.isDefault === true,
    rowVersion: apiEnvironment.rowVersion,
    isActive: apiEnvironment.isActive ?? true,
    createdAt: apiEnvironment.createdDateTime
      ? new Date(apiEnvironment.createdDateTime)
      : new Date(),
    updatedAt: apiEnvironment.updatedDateTime
      ? new Date(apiEnvironment.updatedDateTime)
      : new Date(),
  };
};

export const EnvironmentProvider: React.FC<EnvironmentProviderProps> = ({
  children,
  projectId,
}) => {
  const getActiveEnvStorageKey = useCallback((projectId: string) => {
    if (!projectId) return ACTIVE_ENV_KEY;
    return `${PROJECT_ACTIVE_ENV_KEY_PREFIX}${projectId}`;
  }, []);

  const [environments, setEnvironmentsState] = useState<Environment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load environments from localStorage:", error);
      return [];
    }
  });

  const [activeEnvironment, setActiveEnvironmentState] =
    useState<Environment | null>(() => {
      try {
        const activeId = localStorage.getItem(ACTIVE_ENV_KEY);
        if (activeId) {
          const stored = localStorage.getItem(STORAGE_KEY);
          const envs: Environment[] = stored ? JSON.parse(stored) : [];
          return envs.find((env) => env.id === activeId) || null;
        }
      } catch (error) {
        console.error(
          "Failed to load active environment from localStorage:",
          error,
        );
      }
      return null;
    });

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const run = async () => {
      try {
        const response = await environmentService.getEnvironments(projectId);
        const mapped = response.map((item) =>
          mapApiEnvironmentToContext(projectId, item),
        );
        setEnvironmentsState(mapped);

        const activeKey = getActiveEnvStorageKey(projectId);
        const savedActiveId = localStorage.getItem(activeKey);
        const active =
          mapped.find((env) => env.id === savedActiveId) ||
          mapped.find((env) => env.isDefault) ||
          mapped[0] ||
          null;
        setActiveEnvironmentState(active);
      } catch (error) {
        console.error("Failed to load environments from backend:", error);
      }
    };

    void run();
  }, [getActiveEnvStorageKey, projectId]);

  // Persist environments to localStorage whenever they change
  useEffect(() => {
    try {
      if (projectId) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(environments));
    } catch (error) {
      console.error("Failed to save environments to localStorage:", error);
    }
  }, [environments, projectId]);

  // Persist active environment to localStorage whenever it changes
  useEffect(() => {
    try {
      const activeKey = getActiveEnvStorageKey(projectId || "");
      if (activeEnvironment) {
        localStorage.setItem(activeKey, activeEnvironment.id);
      } else {
        localStorage.removeItem(activeKey);
      }
    } catch (error) {
      console.error(
        "Failed to save active environment to localStorage:",
        error,
      );
    }
  }, [activeEnvironment, getActiveEnvStorageKey, projectId]);

  const setEnvironments = useCallback((envs: Environment[]) => {
    setEnvironmentsState(envs);
  }, []);

  const setActiveEnvironment = useCallback(
    (environment: Environment | null) => {
      setActiveEnvironmentState(environment);
    },
    [],
  );

  const addEnvironment = useCallback(
    (environment: Environment) => {
      if (!projectId) {
        setEnvironmentsState((prev) => [...prev, environment]);
        return;
      }

      const baseUrl =
        environment.baseUrl ||
        environment.variables.find((item) => item.key.trim() === "baseUrl")
          ?.value ||
        "";

      void environmentService
        .createEnvironment({
          projectId,
          name: environment.name,
          description: "Created from Manual Testing",
          baseUrl,
          variables: toVariableRecord(environment.variables),
          isDefault: environment.isDefault || false,
        })
        .then((created) => {
          const mapped = mapApiEnvironmentToContext(projectId, created);
          setEnvironmentsState((prev) => [...prev, mapped]);
          setActiveEnvironmentState(mapped);
        })
        .catch((error) => {
          console.error("Failed to create environment in backend:", error);
        });
    },
    [projectId],
  );

  const updateEnvironment = useCallback(
    (id: string, updates: Partial<Environment>) => {
      if (!projectId) {
        setEnvironmentsState((prev) =>
          prev.map((env) =>
            env.id === id ? { ...env, ...updates, updatedAt: new Date() } : env,
          ),
        );

        setActiveEnvironmentState((prev) => {
          if (prev && prev.id === id) {
            return { ...prev, ...updates, updatedAt: new Date() };
          }
          return prev;
        });
        return;
      }

      const current = environments.find((env) => env.id === id);
      if (!current) return;

      const merged = { ...current, ...updates };
      const baseUrl =
        merged.baseUrl ||
        merged.variables.find((item) => item.key.trim() === "baseUrl")
          ?.value ||
        "";

      void environmentService
        .updateEnvironment(projectId, id, {
          rowVersion: current.rowVersion,
          name: merged.name,
          baseUrl,
          variables: toVariableRecord(merged.variables),
          isDefault: merged.isDefault || false,
        })
        .then((updated) => {
          const mapped = mapApiEnvironmentToContext(projectId, updated);

          setEnvironmentsState((prev) =>
            prev.map((env) => (env.id === id ? mapped : env)),
          );

          setActiveEnvironmentState((prev) => {
            if (prev && prev.id === id) {
              return mapped;
            }
            return prev;
          });
        })
        .catch((error) => {
          console.error("Failed to update environment in backend:", error);
        });
    },
    [environments, projectId],
  );

  const deleteEnvironment = useCallback(
    (id: string) => {
      if (!projectId) {
        setEnvironmentsState((prev) => prev.filter((env) => env.id !== id));

        setActiveEnvironmentState((prev) => {
          if (prev && prev.id === id) {
            return null;
          }
          return prev;
        });
        return;
      }

      const current = environments.find((env) => env.id === id);
      if (!current?.rowVersion) {
        console.error("Cannot delete environment: missing rowVersion");
        return;
      }

      void environmentService
        .deleteEnvironment(projectId, id, current.rowVersion)
        .then(() => {
          setEnvironmentsState((prev) => prev.filter((env) => env.id !== id));

          setActiveEnvironmentState((prev) => {
            if (prev && prev.id === id) {
              return null;
            }
            return prev;
          });
        })
        .catch((error) => {
          console.error("Failed to delete environment in backend:", error);
        });
    },
    [environments, projectId],
  );

  /**
   * Resolves {{variable}} syntax in a string using the active environment's variables
   * @param text - The text containing variable references
   * @returns The text with all variable references replaced with their values
   */
  const resolveVariables = useCallback(
    (text: string): string => {
      if (!activeEnvironment) {
        return text;
      }

      // Match {{variableName}} pattern
      const variablePattern = /\{\{([^}]+)\}\}/g;

      return text.replace(variablePattern, (match, variableName) => {
        const trimmedName = variableName.trim();
        const variable = activeEnvironment.variables.find(
          (v) => v.key === trimmedName && v.enabled,
        );

        if (variable) {
          return variable.value;
        }

        // Return the original match if variable not found
        return match;
      });
    },
    [activeEnvironment],
  );

  /**
   * Gets the value of a specific variable from the active environment
   * @param key - The variable key to look up
   * @returns The variable value or undefined if not found
   */
  const getVariableValue = useCallback(
    (key: string): string | undefined => {
      if (!activeEnvironment) {
        return undefined;
      }

      const variable = activeEnvironment.variables.find(
        (v) => v.key === key && v.enabled,
      );

      return variable?.value;
    },
    [activeEnvironment],
  );

  /**
   * Gets all enabled variables from the active environment
   * @returns Array of enabled variables
   */
  const getAllVariables = useCallback((): EnvironmentVariable[] => {
    if (!activeEnvironment) {
      return [];
    }

    return activeEnvironment.variables.filter((v) => v.enabled);
  }, [activeEnvironment]);

  const value: EnvironmentContextValue = {
    environments,
    activeEnvironment,
    setEnvironments,
    setActiveEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    resolveVariables,
    getVariableValue,
    getAllVariables,
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

/**
 * Main hook - provides full environment context
 */
export const useEnvironment = (): EnvironmentContextValue => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useEnvironment must be used within EnvironmentProvider");
  }
  return context;
};

/**
 * Specialized hook for working with variables
 */
export const useVariables = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useVariables must be used within EnvironmentProvider");
  }
  return {
    activeEnvironment: context.activeEnvironment,
    resolveVariables: context.resolveVariables,
    getVariableValue: context.getVariableValue,
    getAllVariables: context.getAllVariables,
  };
};
