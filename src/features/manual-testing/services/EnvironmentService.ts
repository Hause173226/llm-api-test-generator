import type { Environment, EnvironmentVariable } from "../types";

/**
 * EnvironmentService - Manages environment persistence using LocalStorage
 *
 * Features:
 * - Persistent storage of environments across browser sessions
 * - CRUD operations for environments
 * - Variable resolution with {{variable}} syntax
 * - Active environment tracking
 *
 * Requirements: 19.5, 20.1, 20.2, 20.3
 */
class EnvironmentService {
  private readonly STORAGE_KEY = "manual-testing-environments";
  private readonly ACTIVE_ENV_KEY = "manual-testing-active-environment";

  /**
   * Get all environments from LocalStorage
   * Requirement 19.5: Persist environments to LocalStorage
   *
   * @returns Array of environments
   */
  getEnvironments(): Environment[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      // Convert date strings back to Date objects
      return parsed.map((env: any) => ({
        ...env,
        createdAt: new Date(env.createdAt),
        updatedAt: new Date(env.updatedAt),
      }));
    } catch (error) {
      console.error("Failed to load environments from LocalStorage:", error);
      return [];
    }
  }

  /**
   * Get the active environment ID from LocalStorage
   * Requirement 21.5: Persist active environment selection
   *
   * @returns Active environment ID or null
   */
  getActiveEnvironmentId(): string | null {
    try {
      return localStorage.getItem(this.ACTIVE_ENV_KEY);
    } catch (error) {
      console.error("Failed to load active environment ID from LocalStorage:", error);
      return null;
    }
  }

  /**
   * Get the active environment from LocalStorage
   * Requirement 21.5: Persist active environment selection
   *
   * @returns Active environment or null
   */
  getActiveEnvironment(): Environment | null {
    const activeId = this.getActiveEnvironmentId();
    if (!activeId) {
      return null;
    }

    const environments = this.getEnvironments();
    return environments.find((env) => env.id === activeId) || null;
  }

  /**
   * Create a new environment
   * Requirement 19.2: Support creating multiple named environments
   *
   * @param environment - Environment to create
   * @returns Created environment
   */
  createEnvironment(environment: Environment): Environment {
    const environments = this.getEnvironments();

    // Ensure timestamps are set
    const newEnvironment: Environment = {
      ...environment,
      createdAt: environment.createdAt || new Date(),
      updatedAt: environment.updatedAt || new Date(),
    };

    environments.push(newEnvironment);
    this.saveEnvironments(environments);

    return newEnvironment;
  }

  /**
   * Update an existing environment
   * Requirement 19.4: Support editing variables within an environment
   *
   * @param id - Environment ID
   * @param updates - Partial environment updates
   * @returns Updated environment or null if not found
   */
  updateEnvironment(id: string, updates: Partial<Environment>): Environment | null {
    const environments = this.getEnvironments();
    const index = environments.findIndex((env) => env.id === id);

    if (index === -1) {
      return null;
    }

    // Update environment with new data and timestamp
    const updatedEnvironment: Environment = {
      ...environments[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    environments[index] = updatedEnvironment;
    this.saveEnvironments(environments);

    // Update active environment if it's the one being updated
    const activeId = this.getActiveEnvironmentId();
    if (activeId === id) {
      // Active environment data is stored in the environments array
      // No need to update separately
    }

    return updatedEnvironment;
  }

  /**
   * Delete an environment
   * Requirement 19.2: Support deleting environments
   *
   * @param id - Environment ID to delete
   * @returns True if deleted, false if not found
   */
  deleteEnvironment(id: string): boolean {
    const environments = this.getEnvironments();
    const filtered = environments.filter((env) => env.id !== id);

    if (filtered.length === environments.length) {
      return false; // Environment not found
    }

    this.saveEnvironments(filtered);

    // Clear active environment if it's the one being deleted
    const activeId = this.getActiveEnvironmentId();
    if (activeId === id) {
      this.setActiveEnvironment(null);
    }

    return true;
  }

  /**
   * Set the active environment
   * Requirement 21.3: Support environment switching
   * Requirement 21.5: Persist active environment selection
   *
   * @param environment - Environment to set as active, or null to clear
   */
  setActiveEnvironment(environment: Environment | null): void {
    try {
      if (environment) {
        localStorage.setItem(this.ACTIVE_ENV_KEY, environment.id);
      } else {
        localStorage.removeItem(this.ACTIVE_ENV_KEY);
      }
    } catch (error) {
      console.error("Failed to save active environment to LocalStorage:", error);
    }
  }

  /**
   * Resolve {{variable}} syntax in a string using the provided environment's variables
   * Requirement 20.1: Support Variable_Syntax ({{variableName}})
   * Requirement 20.2: Replace variable references with values from active environment
   *
   * @param text - Text containing variable references
   * @param environment - Environment to resolve variables from
   * @returns Text with all variable references replaced
   */
  resolveVariables(text: string, environment: Environment | null): string {
    if (!environment) {
      return text;
    }

    // Match {{variableName}} pattern
    const variablePattern = /\{\{([^}]+)\}\}/g;

    return text.replace(variablePattern, (match, variableName) => {
      const trimmedName = variableName.trim();
      const variable = environment.variables.find(
        (v) => v.key === trimmedName && v.enabled,
      );

      if (variable) {
        return variable.value;
      }

      // Return the original match if variable not found
      return match;
    });
  }

  /**
   * Get the value of a specific variable from an environment
   * Requirement 20.1: Support variable resolution
   *
   * @param key - Variable key to look up
   * @param environment - Environment to search in
   * @returns Variable value or undefined if not found
   */
  getVariableValue(key: string, environment: Environment | null): string | undefined {
    if (!environment) {
      return undefined;
    }

    const variable = environment.variables.find(
      (v) => v.key === key && v.enabled,
    );

    return variable?.value;
  }

  /**
   * Get all enabled variables from an environment
   * Requirement 19.3: Support defining key-value variable pairs
   *
   * @param environment - Environment to get variables from
   * @returns Array of enabled variables
   */
  getAllVariables(environment: Environment | null): EnvironmentVariable[] {
    if (!environment) {
      return [];
    }

    return environment.variables.filter((v) => v.enabled);
  }

  /**
   * Check if a variable exists in an environment
   * Requirement 20.4: Display warning for undefined variables
   *
   * @param key - Variable key to check
   * @param environment - Environment to search in
   * @returns True if variable exists and is enabled
   */
  hasVariable(key: string, environment: Environment | null): boolean {
    if (!environment) {
      return false;
    }

    return environment.variables.some((v) => v.key === key && v.enabled);
  }

  /**
   * Extract all variable references from a text string
   * Requirement 20.3: Highlight variable syntax
   *
   * @param text - Text to extract variables from
   * @returns Array of variable names found in the text
   */
  extractVariableReferences(text: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = variablePattern.exec(text)) !== null) {
      const variableName = match[1].trim();
      if (!matches.includes(variableName)) {
        matches.push(variableName);
      }
    }

    return matches;
  }

  /**
   * Save environments to LocalStorage
   * @param environments - Array of environments to save
   */
  private saveEnvironments(environments: Environment[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(environments));
    } catch (error) {
      console.error("Failed to save environments to LocalStorage:", error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.error("LocalStorage quota exceeded. Unable to save environments.");
      }
    }
  }
}

// Export singleton instance
export const environmentService = new EnvironmentService();
export default environmentService;
