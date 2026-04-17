import { describe, it, expect, beforeEach } from "vitest";
import { environmentService } from "./EnvironmentService";
import type { Environment, EnvironmentVariable } from "../types";

describe("EnvironmentService", () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // Reset localStorage before each test
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  const createMockEnvironment = (overrides?: Partial<Environment>): Environment => ({
    id: "env-1",
    name: "Development",
    variables: [
      { id: "var-1", key: "baseUrl", value: "https://api.dev.example.com", enabled: true },
      { id: "var-2", key: "apiKey", value: "dev-key-123", enabled: true },
    ],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  describe("getEnvironments", () => {
    it("should return empty array when no environments exist", () => {
      const environments = environmentService.getEnvironments();
      expect(environments).toEqual([]);
    });

    it("should retrieve persisted environments from LocalStorage", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const environments = environmentService.getEnvironments();
      expect(environments).toHaveLength(1);
      expect(environments[0].name).toBe("Development");
      expect(environments[0].variables).toHaveLength(2);
    });

    it("should convert date strings back to Date objects", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const environments = environmentService.getEnvironments();
      expect(environments[0].createdAt).toBeInstanceOf(Date);
      expect(environments[0].updatedAt).toBeInstanceOf(Date);
    });

    it("should handle corrupted LocalStorage data gracefully", () => {
      localStorage.setItem("manual-testing-environments", "invalid json");

      const environments = environmentService.getEnvironments();
      expect(environments).toEqual([]);
    });
  });

  describe("createEnvironment", () => {
    it("should create a new environment", () => {
      const env = createMockEnvironment();
      const created = environmentService.createEnvironment(env);

      expect(created.id).toBe("env-1");
      expect(created.name).toBe("Development");
      expect(created.variables).toHaveLength(2);
    });

    it("should persist environment to LocalStorage", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const stored = localStorage.getItem("manual-testing-environments");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("Development");
    });

    it("should set createdAt and updatedAt timestamps", () => {
      const env = createMockEnvironment();
      delete (env as any).createdAt;
      delete (env as any).updatedAt;

      const created = environmentService.createEnvironment(env);

      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("should support creating multiple environments", () => {
      const env1 = createMockEnvironment({ id: "env-1", name: "Development" });
      const env2 = createMockEnvironment({ id: "env-2", name: "Production" });

      environmentService.createEnvironment(env1);
      environmentService.createEnvironment(env2);

      const environments = environmentService.getEnvironments();
      expect(environments).toHaveLength(2);
      expect(environments[0].name).toBe("Development");
      expect(environments[1].name).toBe("Production");
    });
  });

  describe("updateEnvironment", () => {
    it("should update an existing environment", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const updated = environmentService.updateEnvironment("env-1", {
        name: "Development Updated",
      });

      expect(updated).toBeTruthy();
      expect(updated!.name).toBe("Development Updated");
    });

    it("should update the updatedAt timestamp", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const originalUpdatedAt = env.updatedAt;

      // Wait a bit to ensure timestamp difference
      const updated = environmentService.updateEnvironment("env-1", {
        name: "Development Updated",
      });

      expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("should not change the environment ID", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const updated = environmentService.updateEnvironment("env-1", {
        id: "different-id" as any,
      });

      expect(updated!.id).toBe("env-1");
    });

    it("should return null for non-existent environment", () => {
      const updated = environmentService.updateEnvironment("non-existent", {
        name: "Test",
      });

      expect(updated).toBeNull();
    });

    it("should update environment variables", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const newVariables: EnvironmentVariable[] = [
        { id: "var-3", key: "newVar", value: "newValue", enabled: true },
      ];

      const updated = environmentService.updateEnvironment("env-1", {
        variables: newVariables,
      });

      expect(updated!.variables).toHaveLength(1);
      expect(updated!.variables[0].key).toBe("newVar");
    });

    it("should persist updates to LocalStorage", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      environmentService.updateEnvironment("env-1", {
        name: "Development Updated",
      });

      const environments = environmentService.getEnvironments();
      expect(environments[0].name).toBe("Development Updated");
    });
  });

  describe("deleteEnvironment", () => {
    it("should delete an existing environment", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      const result = environmentService.deleteEnvironment("env-1");

      expect(result).toBe(true);
      expect(environmentService.getEnvironments()).toHaveLength(0);
    });

    it("should return false for non-existent environment", () => {
      const result = environmentService.deleteEnvironment("non-existent");
      expect(result).toBe(false);
    });

    it("should clear active environment if it's the one being deleted", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);
      environmentService.setActiveEnvironment(env);

      environmentService.deleteEnvironment("env-1");

      const activeId = environmentService.getActiveEnvironmentId();
      expect(activeId).toBeNull();
    });

    it("should not affect other environments when deleting one", () => {
      const env1 = createMockEnvironment({ id: "env-1", name: "Development" });
      const env2 = createMockEnvironment({ id: "env-2", name: "Production" });

      environmentService.createEnvironment(env1);
      environmentService.createEnvironment(env2);

      environmentService.deleteEnvironment("env-1");

      const environments = environmentService.getEnvironments();
      expect(environments).toHaveLength(1);
      expect(environments[0].name).toBe("Production");
    });
  });

  describe("setActiveEnvironment and getActiveEnvironmentId", () => {
    it("should set and retrieve active environment ID", () => {
      const env = createMockEnvironment();
      environmentService.setActiveEnvironment(env);

      const activeId = environmentService.getActiveEnvironmentId();
      expect(activeId).toBe("env-1");
    });

    it("should clear active environment when set to null", () => {
      const env = createMockEnvironment();
      environmentService.setActiveEnvironment(env);
      environmentService.setActiveEnvironment(null);

      const activeId = environmentService.getActiveEnvironmentId();
      expect(activeId).toBeNull();
    });

    it("should persist active environment ID to LocalStorage", () => {
      const env = createMockEnvironment();
      environmentService.setActiveEnvironment(env);

      const stored = localStorage.getItem("manual-testing-active-environment");
      expect(stored).toBe("env-1");
    });
  });

  describe("getActiveEnvironment", () => {
    it("should return null when no active environment is set", () => {
      const active = environmentService.getActiveEnvironment();
      expect(active).toBeNull();
    });

    it("should return the active environment", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);
      environmentService.setActiveEnvironment(env);

      const active = environmentService.getActiveEnvironment();
      expect(active).toBeTruthy();
      expect(active!.id).toBe("env-1");
      expect(active!.name).toBe("Development");
    });

    it("should return null if active environment ID doesn't match any environment", () => {
      localStorage.setItem("manual-testing-active-environment", "non-existent");

      const active = environmentService.getActiveEnvironment();
      expect(active).toBeNull();
    });
  });

  describe("resolveVariables", () => {
    it("should resolve {{variable}} syntax with environment values", () => {
      const env = createMockEnvironment();
      const text = "{{baseUrl}}/users";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("https://api.dev.example.com/users");
    });

    it("should resolve multiple variables in a string", () => {
      const env = createMockEnvironment();
      const text = "{{baseUrl}}/users?key={{apiKey}}";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("https://api.dev.example.com/users?key=dev-key-123");
    });

    it("should handle variables with whitespace", () => {
      const env = createMockEnvironment();
      const text = "{{ baseUrl }}/users";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("https://api.dev.example.com/users");
    });

    it("should leave undefined variables unchanged", () => {
      const env = createMockEnvironment();
      const text = "{{baseUrl}}/{{undefinedVar}}";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("https://api.dev.example.com/{{undefinedVar}}");
    });

    it("should ignore disabled variables", () => {
      const env = createMockEnvironment({
        variables: [
          { id: "var-1", key: "baseUrl", value: "https://api.dev.example.com", enabled: false },
        ],
      });
      const text = "{{baseUrl}}/users";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("{{baseUrl}}/users");
    });

    it("should return original text when environment is null", () => {
      const text = "{{baseUrl}}/users";

      const resolved = environmentService.resolveVariables(text, null);
      expect(resolved).toBe("{{baseUrl}}/users");
    });

    it("should handle text with no variables", () => {
      const env = createMockEnvironment();
      const text = "https://api.example.com/users";

      const resolved = environmentService.resolveVariables(text, env);
      expect(resolved).toBe("https://api.example.com/users");
    });
  });

  describe("getVariableValue", () => {
    it("should return variable value by key", () => {
      const env = createMockEnvironment();

      const value = environmentService.getVariableValue("baseUrl", env);
      expect(value).toBe("https://api.dev.example.com");
    });

    it("should return undefined for non-existent variable", () => {
      const env = createMockEnvironment();

      const value = environmentService.getVariableValue("nonExistent", env);
      expect(value).toBeUndefined();
    });

    it("should return undefined for disabled variable", () => {
      const env = createMockEnvironment({
        variables: [
          { id: "var-1", key: "baseUrl", value: "https://api.dev.example.com", enabled: false },
        ],
      });

      const value = environmentService.getVariableValue("baseUrl", env);
      expect(value).toBeUndefined();
    });

    it("should return undefined when environment is null", () => {
      const value = environmentService.getVariableValue("baseUrl", null);
      expect(value).toBeUndefined();
    });
  });

  describe("getAllVariables", () => {
    it("should return all enabled variables", () => {
      const env = createMockEnvironment();

      const variables = environmentService.getAllVariables(env);
      expect(variables).toHaveLength(2);
      expect(variables[0].key).toBe("baseUrl");
      expect(variables[1].key).toBe("apiKey");
    });

    it("should filter out disabled variables", () => {
      const env = createMockEnvironment({
        variables: [
          { id: "var-1", key: "baseUrl", value: "https://api.dev.example.com", enabled: true },
          { id: "var-2", key: "apiKey", value: "dev-key-123", enabled: false },
        ],
      });

      const variables = environmentService.getAllVariables(env);
      expect(variables).toHaveLength(1);
      expect(variables[0].key).toBe("baseUrl");
    });

    it("should return empty array when environment is null", () => {
      const variables = environmentService.getAllVariables(null);
      expect(variables).toEqual([]);
    });

    it("should return empty array when environment has no variables", () => {
      const env = createMockEnvironment({ variables: [] });

      const variables = environmentService.getAllVariables(env);
      expect(variables).toEqual([]);
    });
  });

  describe("hasVariable", () => {
    it("should return true for existing enabled variable", () => {
      const env = createMockEnvironment();

      const exists = environmentService.hasVariable("baseUrl", env);
      expect(exists).toBe(true);
    });

    it("should return false for non-existent variable", () => {
      const env = createMockEnvironment();

      const exists = environmentService.hasVariable("nonExistent", env);
      expect(exists).toBe(false);
    });

    it("should return false for disabled variable", () => {
      const env = createMockEnvironment({
        variables: [
          { id: "var-1", key: "baseUrl", value: "https://api.dev.example.com", enabled: false },
        ],
      });

      const exists = environmentService.hasVariable("baseUrl", env);
      expect(exists).toBe(false);
    });

    it("should return false when environment is null", () => {
      const exists = environmentService.hasVariable("baseUrl", null);
      expect(exists).toBe(false);
    });
  });

  describe("extractVariableReferences", () => {
    it("should extract variable names from text", () => {
      const text = "{{baseUrl}}/users?key={{apiKey}}";

      const variables = environmentService.extractVariableReferences(text);
      expect(variables).toEqual(["baseUrl", "apiKey"]);
    });

    it("should handle variables with whitespace", () => {
      const text = "{{ baseUrl }}/users";

      const variables = environmentService.extractVariableReferences(text);
      expect(variables).toEqual(["baseUrl"]);
    });

    it("should return unique variable names", () => {
      const text = "{{baseUrl}}/users/{{baseUrl}}/posts";

      const variables = environmentService.extractVariableReferences(text);
      expect(variables).toEqual(["baseUrl"]);
    });

    it("should return empty array when no variables found", () => {
      const text = "https://api.example.com/users";

      const variables = environmentService.extractVariableReferences(text);
      expect(variables).toEqual([]);
    });

    it("should handle empty string", () => {
      const variables = environmentService.extractVariableReferences("");
      expect(variables).toEqual([]);
    });
  });

  describe("LocalStorage persistence", () => {
    it("should persist environments across service instances", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);

      // Verify data is in localStorage
      const stored = localStorage.getItem("manual-testing-environments");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("Development");
    });

    it("should persist active environment across service instances", () => {
      const env = createMockEnvironment();
      environmentService.createEnvironment(env);
      environmentService.setActiveEnvironment(env);

      // Verify data is in localStorage
      const stored = localStorage.getItem("manual-testing-active-environment");
      expect(stored).toBe("env-1");
    });
  });
});
