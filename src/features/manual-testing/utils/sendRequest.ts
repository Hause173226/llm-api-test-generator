import { RequestConfig, ResponseData } from "../types";
import { API_CONFIG, getAuthToken } from "../../../config/api";

export interface SendRequestOptions {
  resolveVariables?: (s: string) => string;
  proxyUrl?: string;
  signal?: AbortSignal;
  suiteId?: string;
  testCaseId?: string;
  environmentId?: string;
}

interface ExistingExecuteApiCaseResponse {
  testCaseId?: string;
  TestCaseId?: string;
  status?: string;
  Status?: string;
  httpStatusCode?: number;
  HttpStatusCode?: number;
  responseHeaders?: Record<string, string>;
  ResponseHeaders?: Record<string, string>;
  responseBodyPreview?: string;
  ResponseBodyPreview?: string;
  durationMs?: number;
  DurationMs?: number;
  failureReasons?: Array<{ code?: string; message?: string }>;
  FailureReasons?: Array<{ code?: string; message?: string }>;
}

interface ExistingExecuteApiResponse {
  cases?: ExistingExecuteApiCaseResponse[];
  Cases?: ExistingExecuteApiCaseResponse[];
}

const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractErrorMessage(payload: any, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload.title === "string" && payload.title.trim()) {
    return payload.title;
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (payload.errors && typeof payload.errors === "object") {
    for (const value of Object.values(payload.errors)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        return value[0];
      }
    }
  }

  return fallback;
}

function headersArrayToObject(headers: { key: string; value: string; enabled?: boolean }[] = []) {
  const out: Record<string, string> = {};
  headers.forEach((h) => {
    if (!h.key) return;
    if (h.enabled === false) return;
    out[h.key] = h.value;
  });
  return out;
}

function applyAuth(config: RequestConfig, headers: Record<string, string>, url: URL, resolve: (s: string) => string) {
  if (!config.auth) return;

  if (config.auth.type === "bearer") {
    const token = resolve(config.auth.bearer?.token || "").trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return;
  }

  if (config.auth.type === "basic") {
    const username = resolve(config.auth.basic?.username || "");
    const password = resolve(config.auth.basic?.password || "");
    if (username || password) {
      headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
    }
    return;
  }

  if (config.auth.type === "apiKey") {
    const key = resolve(config.auth.apiKey?.key || "").trim();
    const value = resolve(config.auth.apiKey?.value || "");
    if (!key) return;

    if (config.auth.apiKey?.addTo === "query") {
      url.searchParams.set(key, value);
    } else {
      headers[key] = value;
    }
  }
}

function buildHttpRequest(config: RequestConfig, resolve: (s: string) => string) {
  const baseUrl = resolve(config.url || "");
  const url = new URL(baseUrl);

  (config.params || [])
    .filter((p) => p.enabled && p.key)
    .forEach((p) => {
      const key = resolve(p.key || "");
      const value = resolve(p.value || "");
      if (key) {
        url.searchParams.append(key, value);
      }
    });

  const resolvedHeaders = (config.headers || []).map((header) => ({
    ...header,
    key: resolve(header.key || ""),
    value: resolve(header.value || ""),
  }));

  const headers = headersArrayToObject(resolvedHeaders);
  applyAuth(config, headers, url, resolve);

  let body = "";
  if (config.body?.type === "form") {
    const pairs = (config.body.formData || [])
      .filter((f) => f.enabled && f.key)
      .map((f) => `${encodeURIComponent(resolve(f.key || ""))}=${encodeURIComponent(resolve(f.value || ""))}`);
    body = pairs.join("&");
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (config.body?.type === "json") {
    body = resolve(config.body.content || "");
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  } else {
    body = resolve(config.body?.content || "");
  }

  return { url, headers, body };
}

async function sendDirectHttpRequest(
  config: RequestConfig,
  resolve: (s: string) => string,
  signal?: AbortSignal,
): Promise<ResponseData> {
  const { url, headers, body } = buildHttpRequest(config, resolve);
  const start = Date.now();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: config.method,
      headers,
      body: ["GET", "HEAD"].includes(config.method) ? undefined : body,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error("Cannot send HTTP request. Please verify URL/CORS/network and try again.");
  }

  const textBody = await response.text().catch(() => "");
  const time = Date.now() - start;
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText || "",
    headers: responseHeaders,
    body: textBody,
    contentType: responseHeaders["content-type"] || "",
    size: textBody.length,
    time,
    cookies: [],
    timestamp: new Date(),
  };
}

export async function sendRequest(config: RequestConfig, opts: SendRequestOptions = {}): Promise<ResponseData> {
  const resolve = opts.resolveVariables ?? ((s: string) => s);
  const token = getAuthToken();
  const suiteId = opts.suiteId?.trim();
  const testCaseId = opts.testCaseId?.trim();
  const environmentId = opts.environmentId?.trim();
  const hasBackendEnvironmentId = !!environmentId && guidRegex.test(environmentId);

  if (!suiteId || !testCaseId) {
    return sendDirectHttpRequest(config, resolve, opts.signal);
  }

  const executeEndpoint =
    opts.proxyUrl || `${API_CONFIG.BASE_URL}/test-suites/${suiteId}/test-runs`;

  // Resolve URL/auth/headers early so variable errors surface before execution.
  buildHttpRequest(config, resolve);

  const start = Date.now();
  let response: Response;
  try {
    response = await fetch(executeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...(hasBackendEnvironmentId ? { environmentId } : {}),
        selectedTestCaseIds: [testCaseId],
      }),
      signal: opts.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error("Cannot connect to execute API. Please make sure backend is running.");
  }

  const payload: ExistingExecuteApiResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = extractErrorMessage(payload, "Execute API request failed");

    // If selected environment is local-only (not backend execution environment),
    // fallback to direct HTTP execution so environment selection works immediately.
    if (
      !hasBackendEnvironmentId
      && /execution environment mặc định|default execution environment|execution environment/i.test(message)
    ) {
      return sendDirectHttpRequest(config, resolve, opts.signal);
    }

    throw new Error(extractErrorMessage(payload, "Execute API request failed"));
  }

  const rawCases = Array.isArray(payload.cases)
    ? payload.cases
    : Array.isArray(payload.Cases)
      ? payload.Cases
      : [];

  const selectedCase = rawCases.find((x) => {
    const id = x.testCaseId || x.TestCaseId;
    return id === testCaseId;
  }) || rawCases[0];

  if (!selectedCase) {
    throw new Error("Execute API returned no test case results.");
  }

  const caseStatus = (selectedCase.status || selectedCase.Status || "").toLowerCase();
  const failureReasons = selectedCase.failureReasons || selectedCase.FailureReasons || [];
  const firstFailureMessage = failureReasons.find((x) => x?.message)?.message;

  if (caseStatus === "failed" && firstFailureMessage) {
    throw new Error(firstFailureMessage);
  }

  const time = Date.now() - start;
  const responseHeaders = selectedCase.responseHeaders || selectedCase.ResponseHeaders || {};
  const responseBody = selectedCase.responseBodyPreview || selectedCase.ResponseBodyPreview || "";
  const latencyMs = selectedCase.durationMs ?? selectedCase.DurationMs ?? time;
  const statusCode = selectedCase.httpStatusCode ?? selectedCase.HttpStatusCode ?? 0;
  const contentType =
    responseHeaders["content-type"] ||
    responseHeaders["Content-Type"] ||
    "";

  return {
    status: statusCode,
    statusText: response.statusText || "",
    headers: responseHeaders,
    body: responseBody,
    contentType,
    size: responseBody.length,
    time: latencyMs,
    cookies: [],
    timestamp: new Date(),
  };
}
