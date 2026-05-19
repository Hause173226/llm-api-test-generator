import {
  API_CONFIG,
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
  setUser,
} from "../config/api";
import { ApiError } from "../utils/errorHandler";

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

interface RefreshedSession {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
}

class ApiService {
  private baseUrl: string;
  private inFlightGetRequests: Map<string, Promise<unknown>>;
  private refreshSessionPromise: Promise<void> | null;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.inFlightGetRequests = new Map();
    this.refreshSessionPromise = null;
  }

  private getCanonicalGetKey(fullUrl: string): string {
    try {
      const parsedUrl = new URL(fullUrl);
      const sortedParams = new URLSearchParams(parsedUrl.search);
      const sortedEntries = Array.from(sortedParams.entries()).sort((a, b) => {
        if (a[0] === b[0]) {
          return a[1].localeCompare(b[1]);
        }
        return a[0].localeCompare(b[0]);
      });

      const canonicalParams = new URLSearchParams();
      sortedEntries.forEach(([key, value]) =>
        canonicalParams.append(key, value),
      );
      const canonicalQuery = canonicalParams.toString();

      return `${parsedUrl.origin}${parsedUrl.pathname}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
    } catch {
      return fullUrl;
    }
  }

  private buildRequestConfig(
    requestOptions: RequestInit,
    token: string | null,
  ): RequestInit {
    return {
      ...requestOptions,
      credentials: "include",
      headers: {
        ...API_CONFIG.HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...requestOptions.headers,
      },
    };
  }

  private shouldAttemptRefresh(
    endpoint: string,
    token: string | null,
    hasRetriedAfterRefresh: boolean,
  ): boolean {
    return (
      !hasRetriedAfterRefresh &&
      !!token &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/refresh-token")
    );
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { params, ...requestOptions } = options;
    const queryString = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : "";
    const url = `${this.baseUrl}${endpoint}${queryString ? `${endpoint.includes("?") ? "&" : "?"}${queryString}` : ""}`;
    const method = (requestOptions.method || "GET").toUpperCase();

    const performRequest = async (
      hasRetriedAfterRefresh = false,
    ): Promise<T> => {
      try {
        const token = getAuthToken();
        const response = await fetch(
          url,
          this.buildRequestConfig(requestOptions, token),
        );

        if (
          response.status === 401 &&
          this.shouldAttemptRefresh(endpoint, token, hasRetriedAfterRefresh)
        ) {
          try {
            await this.refreshSession();
            return await performRequest(true);
          } catch {
            this.clearSessionAndRedirect();
            throw new ApiError(401, "Session expired. Please login again.");
          }
        }

        return await this.parseResponse<T>(
          response,
          endpoint,
          token,
          hasRetriedAfterRefresh,
        );
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        if (error instanceof TypeError && error.message.includes("fetch")) {
          console.error("Network Error:", error);
          throw new ApiError(
            0,
            "Cannot connect to server. Please check if the backend is running.",
          );
        }

        console.error("API Error:", error);
        throw new ApiError(500, "Network error or server unavailable");
      }
    };

    if (method === "GET") {
      const requestKey = this.getCanonicalGetKey(url);
      const inFlightRequest = this.inFlightGetRequests.get(requestKey);
      if (inFlightRequest) {
        return inFlightRequest as Promise<T>;
      }

      const requestPromise = performRequest();
      this.inFlightGetRequests.set(
        requestKey,
        requestPromise as Promise<unknown>,
      );

      try {
        return await requestPromise;
      } finally {
        this.inFlightGetRequests.delete(requestKey);
      }
    }

    return performRequest();
  }

  private async parseResponse<T>(
    response: Response,
    endpoint: string,
    token: string | null,
    hasRetriedAfterRefresh: boolean,
  ): Promise<T> {
    if (response.ok) {
      return await this.parseSuccessResponse<T>(response);
    }

    let errorMessage = "API request failed";
    let errorData: any = null;

    try {
      errorData = await response.json();
      if (
        errorData.errors &&
        typeof errorData.errors === "object" &&
        !Array.isArray(errorData.errors)
      ) {
        const fieldErrors = Object.entries(errorData.errors)
          .map(([field, messages]) => {
            const msgs = Array.isArray(messages)
              ? messages.join(", ")
              : String(messages);
            return `${field}: ${msgs}`;
          })
          .join("; ");
        errorMessage = fieldErrors || errorData.title || errorMessage;
      } else {
        errorMessage =
          errorData.message ||
          errorData.title ||
          errorData.error ||
          errorData.detail ||
          (Array.isArray(errorData.errors) && errorData.errors[0]?.message) ||
          errorMessage;
      }

      if (response.status === 401) {
        const isLoginRequest = endpoint.includes("/auth/login");
        if (!isLoginRequest && token && hasRetriedAfterRefresh) {
          this.clearSessionAndRedirect();
          throw new ApiError(401, "Session expired. Please login again.");
        }
        errorMessage =
          errorData.message || errorData.error || "Invalid email or password";
      } else if (response.status === 400) {
        errorMessage =
          errorData.message ||
          "Invalid request. Please check your input.";
      } else if (response.status === 404) {
        errorMessage = errorData.message || "Resource not found";
      } else if (response.status === 500) {
        errorMessage =
          errorData.message || "Server error. Please try again later.";
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      errorMessage = response.statusText || errorMessage;

      if (response.status === 401) {
        const isLoginRequest = endpoint.includes("/auth/login");
        if (!isLoginRequest && token && hasRetriedAfterRefresh) {
          this.clearSessionAndRedirect();
          throw new ApiError(401, "Session expired. Please login again.");
        }
        errorMessage = "Invalid email or password";
      } else if (response.status === 400) {
        errorMessage = "Invalid request. Please check your input.";
      } else if (response.status === 404) {
        errorMessage = "Resource not found";
      } else if (response.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return {} as T;
  }

  async refreshSession(): Promise<void> {
    if (!this.refreshSessionPromise) {
      this.refreshSessionPromise = this.performRefreshSession().finally(() => {
        this.refreshSessionPromise = null;
      });
    }

    return this.refreshSessionPromise;
  }

  private async performRefreshSession(): Promise<void> {
    const refreshToken = getRefreshToken();
    const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: API_CONFIG.HEADERS,
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Unable to refresh session.");
    }

    const refreshedSession =
      await this.parseSuccessResponse<RefreshedSession>(response);

    setAuthToken(refreshedSession.accessToken);
    if (refreshedSession.refreshToken) {
      setRefreshToken(refreshedSession.refreshToken);
    }
    if (refreshedSession.user) {
      setUser(refreshedSession.user);
    }
  }

  private clearSessionAndRedirect(): void {
    clearAuthToken();
    window.location.href = "/login";
  }

  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      let token = getAuthToken();
      let response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (response.status === 401 && token) {
        await this.refreshSession();
        token = getAuthToken();
        response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });
      }

      if (!response.ok) {
        if (response.status === 401 && token) {
          this.clearSessionAndRedirect();
          throw new ApiError(401, "Session expired. Please login again.");
        }

        const error = await response.json();
        throw new ApiError(
          response.status,
          error.message || "File upload failed",
          error,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "File upload failed");
    }
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      let token = getAuthToken();
      let response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 401 && token) {
        await this.refreshSession();
        token = getAuthToken();
        response = await fetch(url, {
          credentials: "include",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      }

      if (!response.ok) {
        if (response.status === 401 && token) {
          this.clearSessionAndRedirect();
          throw new ApiError(401, "Session expired. Please login again.");
        }

        throw new ApiError(response.status, "File download failed");
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "File download failed");
    }
  }

  async downloadFileWithMeta(
    endpoint: string,
  ): Promise<{ blob: Blob; filename?: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      let token = getAuthToken();
      let response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 401 && token) {
        await this.refreshSession();
        token = getAuthToken();
        response = await fetch(url, {
          credentials: "include",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      }

      if (!response.ok) {
        if (response.status === 401 && token) {
          this.clearSessionAndRedirect();
          throw new ApiError(401, "Session expired. Please login again.");
        }
        throw new ApiError(response.status, "File download failed");
      }

      let filename: string | undefined;
      const disposition = response.headers.get("content-disposition");
      if (disposition) {
        const match = disposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (match?.[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      const blob = await response.blob();
      return { blob, filename };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "File download failed");
    }
  }
}

export const apiService = new ApiService();

export default apiService;
