import { useState, useEffect } from "react";
import environmentService, {
  ExecutionEnvironment,
  ExecutionAuthConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  getConflictReasonCode,
} from "../services/environmentService";
import { handleError } from "../utils/errorHandler";

const MASKED = "******";

/**
 * Strip masked sentinel values from authConfig before passing to the service.
 * The BE `sanitizeAuthConfig` also does this, but we need to do it here too
 * when the authConfig comes from an API response (e.g. setDefaultEnvironment, cloneEnvironment)
 * to avoid sending { authType: "BearerToken", token: null } which would trigger
 * BE validation error "Token là bắt buộc" or silently clear secrets.
 * Masked secrets (******) cannot be round-tripped — pass null so BE
 * treats the field as "not provided" (auth will be cleared if secrets were required).
 */
function clearMaskedSecrets(
  auth?: ExecutionAuthConfig | null,
): ExecutionAuthConfig | null | undefined {
  if (!auth) return auth;
  return {
    ...auth,
    token: auth.token === MASKED ? null : auth.token,
    password: auth.password === MASKED ? null : auth.password,
    apiKeyValue: auth.apiKeyValue === MASKED ? null : auth.apiKeyValue,
    clientSecret: auth.clientSecret === MASKED ? null : auth.clientSecret,
  };
}

export const useEnvironments = (projectId: string) => {
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironments = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await environmentService.getEnvironments(projectId);
      setEnvironments(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, [projectId]);

  const createEnvironment = async (
    data: CreateEnvironmentRequest,
  ): Promise<boolean> => {
    try {
      const newEnv = await environmentService.createEnvironment(
        projectId,
        data,
      );
      setEnvironments((prev) => {
        const updated = newEnv.isDefault
          ? prev.map((env) => ({ ...env, isDefault: false }))
          : prev;
        return [...updated, newEnv];
      });
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const updateEnvironment = async (
    environmentId: string,
    data: Partial<UpdateEnvironmentRequest>,
  ): Promise<boolean> => {
    try {
      const current = environments.find((env) => env.id === environmentId);
      if (!current) throw new Error("Environment not found");

      const payload: UpdateEnvironmentRequest = {
        rowVersion: data.rowVersion ?? current.rowVersion,
        name: data.name ?? current.name,
        baseUrl: data.baseUrl ?? current.baseUrl,
        variables: data.variables ?? current.variables,
        headers: data.headers ?? current.headers,
        authConfig:
          data.authConfig !== undefined ? data.authConfig : current.authConfig,
        isDefault: data.isDefault ?? current.isDefault,
      };

      const updated = await environmentService.updateEnvironment(
        projectId,
        environmentId,
        payload,
      );
      setEnvironments((prev) =>
        prev.map((env) => (env.id === environmentId ? updated : env)),
      );
      return true;
    } catch (err) {
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === "CONCURRENCY_CONFLICT") {
        try {
          // Fetch latest environment to obtain fresh rowVersion and retry once
          const latest = await environmentService.getEnvironmentById(
            projectId,
            environmentId,
          );
          const retryPayload: UpdateEnvironmentRequest = {
            rowVersion: latest.rowVersion,
            name: data.name ?? latest.name,
            baseUrl: data.baseUrl ?? latest.baseUrl,
            variables: data.variables ?? latest.variables,
            headers: data.headers ?? latest.headers,
            authConfig:
              data.authConfig !== undefined
                ? data.authConfig
                : latest.authConfig,
            isDefault: data.isDefault ?? latest.isDefault,
          };

          const retried = await environmentService.updateEnvironment(
            projectId,
            environmentId,
            retryPayload,
          );
          setEnvironments((prev) =>
            prev.map((env) => (env.id === environmentId ? retried : env)),
          );
          return true;
        } catch (retryErr) {
          // If retry also fails, surface a clear message
          handleError(
            new Error(
              "Dữ liệu đã thay đổi bởi thao tác khác. Vui lòng tải lại trang và thử lại.",
            ),
          );
          return false;
        }
      } else {
        handleError(err);
        return false;
      }
    }
  };

  const deleteEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      let current = environments.find((env) => env.id === environmentId);

      // If rowVersion is missing in local state, fetch latest to get a fresh copy.
      // Rows created before rowVersion column was populated will still have null —
      // that is handled on the BE side (skip concurrency check when DB row has no version).
      if (!current?.rowVersion) {
        current = await environmentService.getEnvironmentById(
          projectId,
          environmentId,
        );
      }

      await environmentService.deleteEnvironment(
        projectId,
        environmentId,
        current?.rowVersion ?? null,
      );
      setEnvironments((prev) => prev.filter((env) => env.id !== environmentId));
      return true;
    } catch (err) {
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === "CONCURRENCY_CONFLICT") {
        handleError(
          new Error(
            "Dữ liệu đã thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.",
          ),
        );
      } else {
        handleError(err);
      }
      return false;
    }
  };

  const setDefaultEnvironment = async (
    environmentId: string,
  ): Promise<boolean> => {
    try {
      const target = environments.find((env) => env.id === environmentId);
      if (!target) throw new Error("Environment not found");

      const updated = await environmentService.updateEnvironment(
        projectId,
        environmentId,
        {
          rowVersion: target.rowVersion,
          name: target.name,
          baseUrl: target.baseUrl,
          variables: target.variables,
          headers: target.headers,
          // Clear masked secrets — cannot round-trip "******" back to BE
          authConfig: clearMaskedSecrets(target.authConfig),
          isDefault: true,
        },
      );

      setEnvironments((prev) =>
        prev.map((env) =>
          env.id === environmentId ? updated : { ...env, isDefault: false },
        ),
      );
      return true;
    } catch (err) {
      const reasonCode = getConflictReasonCode(err);
      if (reasonCode === "CONCURRENCY_CONFLICT") {
        handleError(
          new Error(
            "Dữ liệu đã thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.",
          ),
        );
      } else {
        handleError(err);
      }
      return false;
    }
  };

  const cloneEnvironment = async (
    environmentId: string,
    newName: string,
  ): Promise<boolean> => {
    try {
      const target = environments.find((env) => env.id === environmentId);
      if (!target) throw new Error("Environment not found");

      const cloned = await environmentService.createEnvironment(projectId, {
        name: newName,
        baseUrl: target.baseUrl,
        variables: target.variables ?? {},
        headers: target.headers ?? {},
        // authConfig không clone vì chứa secret đã bị mask
        isDefault: false,
      });
      setEnvironments((prev) => [...prev, cloned]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const testEnvironment = async (environmentId: string): Promise<boolean> => {
    try {
      const target = environments.find((env) => env.id === environmentId);
      if (!target) {
        throw new Error("Environment not found");
      }

      // No backend test endpoint yet; return a lightweight local validation result.
      return /^https?:\/\//i.test(target.baseUrl || "");
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  return {
    environments,
    loading,
    error,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setDefaultEnvironment,
    cloneEnvironment,
    testEnvironment,
    refetch: fetchEnvironments,
  };
};
