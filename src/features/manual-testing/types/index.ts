// Core types for Manual Testing Tab feature

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  type: "none" | "json" | "xml" | "form" | "raw";
  content: string;
  formData?: KeyValuePair[];
}

export interface AuthConfig {
  type: "none" | "apiKey" | "bearer" | "basic";
  apiKey?: { key: string; value: string; addTo: "header" | "query" };
  bearer?: { token: string };
  basic?: { username: string; password: string };
}

export interface RequestConfig {
  id?: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  timeout?: number;
  testCaseName?: string;
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  size: number;
  time: number;
  cookies: Cookie[];
  timestamp: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: SavedRequest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedRequest {
  id: string;
  name: string;
  description?: string;
  config: RequestConfig;
  collectionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestHistoryEntry {
  id: string;
  config: RequestConfig;
  response: {
    status: number;
    statusText: string;
    time: number;
  };
  timestamp: Date;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  projectId?: string;
  baseUrl?: string;
  isDefault?: boolean;
  rowVersion?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
