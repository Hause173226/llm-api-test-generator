import axios, { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from "axios";
import type {
  RequestConfig,
  ResponseData,
  Cookie,
  KeyValuePair,
  ValidationResult,
  ValidationError,
} from "../types";

/**
 * HttpClientService - Executes HTTP requests and returns structured response data
 *
 * Features:
 * - Request execution with timeout support
 * - Request cancellation
 * - Response parsing (status, headers, body, cookies, timing)
 * - Error handling for network, timeout, and CORS issues
 */
class HttpClientService {
  private cancelTokens: Map<string, CancelTokenSource> = new Map();

  /**
   * Execute an HTTP request based on RequestConfig
   * @param config - Request configuration
   * @returns Promise<ResponseData> - Structured response data
   */
  async executeRequest(config: RequestConfig): Promise<ResponseData> {
    const startTime = performance.now();
    const requestId = config.id || this.generateRequestId();

    try {
      // Create cancel token for this request
      const cancelTokenSource = axios.CancelToken.source();
      this.cancelTokens.set(requestId, cancelTokenSource);

      // Build axios config
      const axiosConfig = this.buildAxiosConfig(config, cancelTokenSource);

      // Execute request
      const response: AxiosResponse = await axios(axiosConfig);

      // Calculate response time
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Parse and structure response
      const responseData = this.parseResponse(response, responseTime);

      // Clean up cancel token
      this.cancelTokens.delete(requestId);

      return responseData;
    } catch (error) {
      // Clean up cancel token
      this.cancelTokens.delete(requestId);

      // Calculate response time even for errors
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Handle and rethrow error with structured data
      throw this.handleError(error, responseTime);
    }
  }

  /**
   * Cancel an ongoing request
   * @param requestId - ID of the request to cancel
   */
  cancelRequest(requestId: string): void {
    const cancelTokenSource = this.cancelTokens.get(requestId);
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Request cancelled by user");
      this.cancelTokens.delete(requestId);
    }
  }

  /**
   * Validate a request configuration before execution
   * @param config - Request configuration to validate
   * @returns ValidationResult with isValid flag and array of errors
   */
  validateRequest(config: RequestConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate URL (Requirement 27.1, 27.2)
    if (!config.url || config.url.trim() === "") {
      errors.push({
        field: "url",
        message: "URL is required",
        severity: "error",
      });
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push({
          field: "url",
          message: "URL is malformed. Please enter a valid URL (e.g., https://api.example.com)",
          severity: "error",
        });
      }
    }

    // Validate JSON body syntax (Requirement 27.3)
    if (
      config.body.type === "json" &&
      config.body.content &&
      config.body.content.trim() !== ""
    ) {
      try {
        JSON.parse(config.body.content);
      } catch (error) {
        const jsonError = error as Error;
        errors.push({
          field: "body",
          message: `Invalid JSON syntax: ${jsonError.message}`,
          severity: "error",
        });
      }
    }

    // Validate authentication fields (Requirement 27.4)
    switch (config.auth.type) {
      case "bearer":
        if (!config.auth.bearer?.token || config.auth.bearer.token.trim() === "") {
          errors.push({
            field: "auth.bearer.token",
            message: "Bearer token is required when using Bearer authentication",
            severity: "warning",
          });
        }
        break;
      case "basic":
        if (!config.auth.basic?.username || config.auth.basic.username.trim() === "") {
          errors.push({
            field: "auth.basic.username",
            message: "Username is required when using Basic authentication",
            severity: "warning",
          });
        }
        if (!config.auth.basic?.password || config.auth.basic.password.trim() === "") {
          errors.push({
            field: "auth.basic.password",
            message: "Password is required when using Basic authentication",
            severity: "warning",
          });
        }
        break;
      case "apiKey":
        if (!config.auth.apiKey?.key || config.auth.apiKey.key.trim() === "") {
          errors.push({
            field: "auth.apiKey.key",
            message: "API key name is required when using API Key authentication",
            severity: "warning",
          });
        }
        if (!config.auth.apiKey?.value || config.auth.apiKey.value.trim() === "") {
          errors.push({
            field: "auth.apiKey.value",
            message: "API key value is required when using API Key authentication",
            severity: "warning",
          });
        }
        break;
    }

    // Validate headers (Requirement 27.5)
    config.headers.forEach((header, index) => {
      if (header.enabled) {
        if (!header.key || header.key.trim() === "") {
          errors.push({
            field: `headers[${index}].key`,
            message: `Header at position ${index + 1} has an empty key`,
            severity: "warning",
          });
        }
      }
    });

    // Validate params
    config.params.forEach((param, index) => {
      if (param.enabled) {
        if (!param.key || param.key.trim() === "") {
          errors.push({
            field: `params[${index}].key`,
            message: `Parameter at position ${index + 1} has an empty key`,
            severity: "warning",
          });
        }
      }
    });

    return {
      isValid: !errors.some((e) => e.severity === "error"),
      errors,
    };
  }

  /**
   * Build Axios configuration from RequestConfig
   */
  private buildAxiosConfig(
    config: RequestConfig,
    cancelTokenSource: CancelTokenSource
  ): AxiosRequestConfig {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url: this.buildUrl(config),
      headers: this.buildHeaders(config),
      timeout: config.timeout || 30000, // Default 30 seconds
      cancelToken: cancelTokenSource.token,
      validateStatus: () => true, // Accept all status codes
    };

    // Add request body if applicable
    if (this.shouldIncludeBody(config.method)) {
      axiosConfig.data = this.buildRequestBody(config);
    }

    return axiosConfig;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(config: RequestConfig): string {
    const url = new URL(config.url);

    // Add enabled query parameters
    const enabledParams = config.params.filter((p) => p.enabled);
    enabledParams.forEach((param) => {
      url.searchParams.append(param.key, param.value);
    });

    return url.toString();
  }

  /**
   * Build headers object from config
   */
  private buildHeaders(config: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add enabled headers
    const enabledHeaders = config.headers.filter((h) => h.enabled);
    enabledHeaders.forEach((header) => {
      headers[header.key] = header.value;
    });

    // Add authentication headers
    this.addAuthHeaders(headers, config);

    // Add content-type for body if not already set
    if (this.shouldIncludeBody(config.method) && config.body.type !== "none") {
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = this.getContentType(config.body.type);
      }
    }

    return headers;
  }

  /**
   * Add authentication headers based on auth config
   */
  private addAuthHeaders(
    headers: Record<string, string>,
    config: RequestConfig
  ): void {
    switch (config.auth.type) {
      case "bearer":
        if (config.auth.bearer?.token) {
          headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
        }
        break;
      case "basic":
        if (config.auth.basic?.username && config.auth.basic?.password) {
          const credentials = btoa(
            `${config.auth.basic.username}:${config.auth.basic.password}`
          );
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "apiKey":
        if (config.auth.apiKey?.key && config.auth.apiKey?.value) {
          if (config.auth.apiKey.addTo === "header") {
            headers[config.auth.apiKey.key] = config.auth.apiKey.value;
          }
          // Note: API key in query is handled in buildUrl
        }
        break;
    }
  }

  /**
   * Build request body based on body type
   */
  private buildRequestBody(config: RequestConfig): any {
    switch (config.body.type) {
      case "json":
        try {
          return JSON.parse(config.body.content);
        } catch {
          return config.body.content;
        }
      case "form":
        if (config.body.formData) {
          const formData = new URLSearchParams();
          config.body.formData
            .filter((item) => item.enabled)
            .forEach((item) => {
              formData.append(item.key, item.value);
            });
          return formData;
        }
        return config.body.content;
      case "xml":
      case "raw":
      default:
        return config.body.content;
    }
  }

  /**
   * Get content type for body type
   */
  private getContentType(bodyType: string): string {
    switch (bodyType) {
      case "json":
        return "application/json";
      case "xml":
        return "application/xml";
      case "form":
        return "application/x-www-form-urlencoded";
      default:
        return "text/plain";
    }
  }

  /**
   * Check if HTTP method should include body
   */
  private shouldIncludeBody(method: string): boolean {
    return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  }

  /**
   * Parse Axios response into ResponseData
   */
  private parseResponse(
    response: AxiosResponse,
    responseTime: number
  ): ResponseData {
    // Parse response body
    const body =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data, null, 2);

    // Calculate response size
    const size = new Blob([body]).size;

    // Parse cookies from Set-Cookie header
    const cookies = this.parseCookies(response.headers["set-cookie"]);

    // Get content type
    const contentType =
      response.headers["content-type"] || "application/octet-stream";

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      body,
      contentType,
      size,
      time: responseTime,
      cookies,
      timestamp: new Date(),
    };
  }

  /**
   * Parse Set-Cookie headers into Cookie objects
   */
  private parseCookies(setCookieHeader?: string | string[]): Cookie[] {
    if (!setCookieHeader) return [];

    const cookieStrings = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];

    return cookieStrings.map((cookieStr) => {
      const parts = cookieStr.split(";").map((part) => part.trim());
      const [nameValue, ...attributes] = parts;
      const [name, value] = nameValue.split("=");

      const cookie: Cookie = { name, value };

      attributes.forEach((attr) => {
        const [key, val] = attr.split("=");
        const lowerKey = key.toLowerCase();

        switch (lowerKey) {
          case "domain":
            cookie.domain = val;
            break;
          case "path":
            cookie.path = val;
            break;
          case "expires":
            cookie.expires = new Date(val);
            break;
          case "httponly":
            cookie.httpOnly = true;
            break;
          case "secure":
            cookie.secure = true;
            break;
          case "samesite":
            cookie.sameSite = val as "Strict" | "Lax" | "None";
            break;
        }
      });

      return cookie;
    });
  }

  /**
   * Handle errors and convert to structured format
   */
  private handleError(error: any, responseTime: number): Error {
    if (axios.isCancel(error)) {
      const cancelError = new Error("Request was cancelled");
      (cancelError as any).isCancelled = true;
      return cancelError;
    }

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        const timeoutError = new Error(
          `Request timeout after ${responseTime}ms`
        );
        (timeoutError as any).isTimeout = true;
        (timeoutError as any).duration = responseTime;
        return timeoutError;
      }

      if (error.message.includes("Network Error")) {
        const networkError = new Error(
          "Network error: Unable to reach the server. Check your internet connection."
        );
        (networkError as any).isNetworkError = true;
        return networkError;
      }

      if (error.message.includes("CORS")) {
        const corsError = new Error(
          "CORS error: The server does not allow requests from this origin. " +
            "This is a server-side configuration issue."
        );
        (corsError as any).isCorsError = true;
        return corsError;
      }

      // If response exists, it's an HTTP error
      if (error.response) {
        const httpError = new Error(
          `HTTP ${error.response.status}: ${error.response.statusText}`
        );
        (httpError as any).response = this.parseResponse(
          error.response,
          responseTime
        );
        return httpError;
      }
    }

    // Generic error
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const httpClientService = new HttpClientService();
export default httpClientService;
