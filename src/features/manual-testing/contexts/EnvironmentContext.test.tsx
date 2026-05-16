import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  EnvironmentProvider,
  useEnvironment,
  useVariables,
} from "./EnvironmentContext";
import { Environment, EnvironmentVariable } from "../types";

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

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <EnvironmentProvider>{children}</EnvironmentProvider>
);

describe("EnvironmentContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("useEnvironment", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useEnvironment());
      }).toThrow("useEnvironment must be used within EnvironmentProvider");

      consoleSpy.mockRestore();
    });

    it("should initialize with empty environments", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      expect(result.current.environments).toEqual([]);
      expect(result.current.activeEnvironment).toBeNull();
    });

    it("should add a new environment", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
      });

      expect(result.current.environments).toHaveLength(1);
      expect(result.current.environments[0]).toEqual(newEnv);
    });

    it("should set active environment", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
        result.current.setActiveEnvironment(newEnv);
      });

      expect(result.current.activeEnvironment).toEqual(newEnv);
    });

    it("should update an environment", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
      });

      act(() => {
        result.current.updateEnvironment("env-1", { name: "Dev Updated" });
      });

      expect(result.current.environments[0].name).toBe("Dev Updated");
    });

    it("should update active environment when it is updated", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
        result.current.setActiveEnvironment(newEnv);
      });

      act(() => {
        result.current.updateEnvironment("env-1", { name: "Dev Updated" });
      });

      expect(result.current.activeEnvironment?.name).toBe("Dev Updated");
    });

    it("should delete an environment", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
      });

      act(() => {
        result.current.deleteEnvironment("env-1");
      });

      expect(result.current.environments).toHaveLength(0);
    });

    it("should clear active environment when it is deleted", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
        result.current.setActiveEnvironment(newEnv);
      });

      act(() => {
        result.current.deleteEnvironment("env-1");
      });

      expect(result.current.activeEnvironment).toBeNull();
    });

    it("should NOT persist environments to localStorage (environments are BE-only)", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
      });

      const stored = localStorageMock.getItem("manual-testing-environments");
      expect(stored).toBeNull();
    });

    it("should persist active environment to localStorage", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const newEnv: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(newEnv);
        result.current.setActiveEnvironment(newEnv);
      });

      const activeId = localStorageMock.getItem(
        "manual-testing-active-environment",
      );
      expect(activeId).toBe("env-1");
    });
  });

  describe("Variable Resolution", () => {
    it("should resolve single variable", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const variable: EnvironmentVariable = {
        id: "var-1",
        key: "baseUrl",
        value: "https://api.example.com",
        enabled: true,
      };

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [variable],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const resolved = result.current.resolveVariables("{{baseUrl}}/users");
      expect(resolved).toBe("https://api.example.com/users");
    });

    it("should resolve multiple variables", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "baseUrl",
            value: "https://api.example.com",
            enabled: true,
          },
          {
            id: "var-2",
            key: "version",
            value: "v1",
            enabled: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const resolved = result.current.resolveVariables(
        "{{baseUrl}}/{{version}}/users",
      );
      expect(resolved).toBe("https://api.example.com/v1/users");
    });

    it("should handle variables with whitespace", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "baseUrl",
            value: "https://api.example.com",
            enabled: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const resolved = result.current.resolveVariables("{{ baseUrl }}/users");
      expect(resolved).toBe("https://api.example.com/users");
    });

    it("should not resolve disabled variables", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "baseUrl",
            value: "https://api.example.com",
            enabled: false,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const resolved = result.current.resolveVariables("{{baseUrl}}/users");
      expect(resolved).toBe("{{baseUrl}}/users");
    });

    it("should return original text when no active environment", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const resolved = result.current.resolveVariables("{{baseUrl}}/users");
      expect(resolved).toBe("{{baseUrl}}/users");
    });

    it("should return original match when variable not found", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const resolved = result.current.resolveVariables("{{unknownVar}}/users");
      expect(resolved).toBe("{{unknownVar}}/users");
    });

    it("should get variable value by key", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "apiKey",
            value: "secret-key-123",
            enabled: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const value = result.current.getVariableValue("apiKey");
      expect(value).toBe("secret-key-123");
    });

    it("should return undefined for non-existent variable", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const value = result.current.getVariableValue("nonExistent");
      expect(value).toBeUndefined();
    });

    it("should get all enabled variables", () => {
      const { result } = renderHook(() => useEnvironment(), { wrapper });

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "baseUrl",
            value: "https://api.example.com",
            enabled: true,
          },
          {
            id: "var-2",
            key: "apiKey",
            value: "secret",
            enabled: false,
          },
          {
            id: "var-3",
            key: "version",
            value: "v1",
            enabled: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addEnvironment(env);
        result.current.setActiveEnvironment(env);
      });

      const variables = result.current.getAllVariables();
      expect(variables).toHaveLength(2);
      expect(variables.map((v) => v.key)).toEqual(["baseUrl", "version"]);
    });
  });

  describe("useVariables", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useVariables());
      }).toThrow("useVariables must be used within EnvironmentProvider");

      consoleSpy.mockRestore();
    });

    it("should provide variable-related functions", () => {
      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.activeEnvironment).toBeNull();
      expect(typeof result.current.resolveVariables).toBe("function");
      expect(typeof result.current.getVariableValue).toBe("function");
      expect(typeof result.current.getAllVariables).toBe("function");
    });

    it("should resolve variables using useVariables hook", () => {
      const { result } = renderHook(
        () => ({
          env: useEnvironment(),
          vars: useVariables(),
        }),
        { wrapper },
      );

      const env: Environment = {
        id: "env-1",
        name: "Development",
        variables: [
          {
            id: "var-1",
            key: "host",
            value: "localhost",
            enabled: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.env.addEnvironment(env);
        result.current.env.setActiveEnvironment(env);
      });

      const resolved = result.current.vars.resolveVariables(
        "http://{{host}}:3000",
      );
      expect(resolved).toBe("http://localhost:3000");
    });
  });
});
