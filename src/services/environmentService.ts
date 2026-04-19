import apiService from './apiService';
import { ApiError } from '../utils/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthType =
  | 'None'
  | 'BearerToken'
  | 'Basic'
  | 'ApiKey'
  | 'OAuth2ClientCredentials';

export type ApiKeyLocation = 'Header' | 'Query';

export interface ExecutionAuthConfig {
  authType: AuthType;
  headerName?: string | null;
  token?: string | null;
  username?: string | null;
  password?: string | null;
  apiKeyName?: string | null;
  apiKeyValue?: string | null;
  apiKeyLocation?: ApiKeyLocation;
  tokenUrl?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  scopes?: string[] | null;
}

export interface ExecutionEnvironment {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  headers: Record<string, string>;
  authConfig?: ExecutionAuthConfig | null;
  isDefault: boolean;
  createdDateTime: string;
  updatedDateTime?: string | null;
  rowVersion: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  baseUrl: string;
  variables?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  authConfig?: ExecutionAuthConfig | null;
  isDefault?: boolean;
}

export interface UpdateEnvironmentRequest {
  rowVersion: string;
  name: string;
  baseUrl: string;
  variables?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  authConfig?: ExecutionAuthConfig | null;
  isDefault?: boolean;
}

// reasonCode từ backend khi 409
export type ConflictReasonCode =
  | 'CONCURRENCY_CONFLICT'
  | 'DEFAULT_ENVIRONMENT_CONFLICT';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lọc bỏ các giá trị masked "******" khỏi authConfig trước khi submit.
 * FE phải giữ secret gốc trong state riêng và truyền vào đây.
 */
export function sanitizeAuthConfig(
  authConfig?: ExecutionAuthConfig | null
): ExecutionAuthConfig | null | undefined {
  if (!authConfig) return authConfig;
  const MASKED = '******';
  return {
    ...authConfig,
    token: authConfig.token === MASKED ? null : authConfig.token,
    password: authConfig.password === MASKED ? null : authConfig.password,
    apiKeyValue: authConfig.apiKeyValue === MASKED ? null : authConfig.apiKeyValue,
    clientSecret: authConfig.clientSecret === MASKED ? null : authConfig.clientSecret,
  };
}

/**
 * Kiểm tra lỗi 409 và trả về reasonCode nếu có.
 */
export function getConflictReasonCode(error: unknown): ConflictReasonCode | null {
  if (error instanceof ApiError && error.status === 409) {
    return (error.data?.reasonCode as ConflictReasonCode) ?? null;
  }
  return null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const environmentService = {
  /**
   * GET /api/projects/{projectId}/execution-environments
   * Permission: Permission:GetExecutionEnvironments
   */
  getEnvironments: async (projectId: string): Promise<ExecutionEnvironment[]> => {
    const data = await apiService.get<ExecutionEnvironment[]>(
      `/projects/${projectId}/execution-environments`
    );
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET /api/projects/{projectId}/execution-environments/{environmentId}
   * Permission: Permission:GetExecutionEnvironments
   */
  getEnvironmentById: async (
    projectId: string,
    environmentId: string
  ): Promise<ExecutionEnvironment> => {
    return apiService.get<ExecutionEnvironment>(
      `/projects/${projectId}/execution-environments/${environmentId}`
    );
  },

  /**
   * POST /api/projects/{projectId}/execution-environments
   * Permission: Permission:AddExecutionEnvironment
   * Response 201 + Location header + body ExecutionEnvironment
   */
  createEnvironment: async (
    projectId: string,
    data: CreateEnvironmentRequest
  ): Promise<ExecutionEnvironment> => {
    const payload: CreateEnvironmentRequest = {
      name: data.name,
      baseUrl: data.baseUrl,
      variables: data.variables !== undefined ? data.variables : null,
      headers: data.headers !== undefined ? data.headers : null,
      authConfig: sanitizeAuthConfig(data.authConfig),
      isDefault: data.isDefault ?? false,
    };
    return apiService.post<ExecutionEnvironment>(
      `/projects/${projectId}/execution-environments`,
      payload
    );
  },

  /**
   * PUT /api/projects/{projectId}/execution-environments/{environmentId}
   * Permission: Permission:UpdateExecutionEnvironment
   * Bắt buộc rowVersion mới nhất. Response 200 + ExecutionEnvironment mới.
   */
  updateEnvironment: async (
    projectId: string,
    environmentId: string,
    data: UpdateEnvironmentRequest
  ): Promise<ExecutionEnvironment> => {
    const payload: UpdateEnvironmentRequest = {
      rowVersion: data.rowVersion,
      name: data.name,
      baseUrl: data.baseUrl,
      variables: data.variables !== undefined ? data.variables : null,
      headers: data.headers !== undefined ? data.headers : null,
      authConfig: sanitizeAuthConfig(data.authConfig),
      isDefault: data.isDefault ?? false,
    };
    return apiService.put<ExecutionEnvironment>(
      `/projects/${projectId}/execution-environments/${environmentId}`,
      payload
    );
  },

  /**
   * DELETE /api/projects/{projectId}/execution-environments/{environmentId}?rowVersion={base64}
   * Permission: Permission:DeleteExecutionEnvironment
   * rowVersion phải được encodeURIComponent trước khi đưa vào query string.
   * Response 204 No Content.
   */
  deleteEnvironment: async (
    projectId: string,
    environmentId: string,
    rowVersion: string
  ): Promise<void> => {
    await apiService.delete<void>(
      `/projects/${projectId}/execution-environments/${environmentId}`,
      { params: { rowVersion } }
    );
  },
};

export default environmentService;
