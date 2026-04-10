import { API_CONFIG, getAuthToken } from '../config/api';
import { ApiError } from '../utils/errorHandler';

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

class ApiService {
  private baseUrl: string;
  private inFlightGetRequests: Map<string, Promise<unknown>>;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.inFlightGetRequests = new Map();
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { params, ...requestOptions } = options;
    const queryString = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : '';
    const url = `${this.baseUrl}${endpoint}${queryString ? `${endpoint.includes('?') ? '&' : '?'}${queryString}` : ''}`;
    const token = getAuthToken();

    const config: RequestInit = {
      ...requestOptions,
      headers: {
        ...API_CONFIG.HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...requestOptions.headers,
      },
    };

    const method = (config.method || 'GET').toUpperCase();

    const performRequest = async (): Promise<T> => {
      try {
        const response = await fetch(url, config);

        // Handle different status codes
        if (!response.ok) {
          let errorMessage = 'API request failed';
          let errorData = null;

          try {
            errorData = await response.json();
            // Try multiple possible error message fields from backend
            errorMessage = errorData.message 
              || errorData.title 
              || errorData.error 
              || errorData.errors?.[0]?.message
              || errorData.detail
              || errorMessage;
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
              // If this is NOT a login request and we have a token, it means token expired
              const isLoginRequest = endpoint.includes('/auth/login');
              if (!isLoginRequest && token) {
                // Token expired - clear auth and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new ApiError(401, 'Session expired. Please login again.');
              }
              // For login requests, use the error message from backend
              errorMessage = errorData.message || 'Invalid email or password';
            } else if (response.status === 400) {
              errorMessage = errorData.message || 'Invalid request. Please check your input.';
            } else if (response.status === 404) {
              errorMessage = errorData.message || 'Resource not found';
            } else if (response.status === 500) {
              errorMessage = errorData.message || 'Server error. Please try again later.';
            }
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
            
            // Handle 401 without JSON response
            if (response.status === 401) {
              const isLoginRequest = endpoint.includes('/auth/login');
              if (!isLoginRequest && token) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new ApiError(401, 'Session expired. Please login again.');
              }
              errorMessage = 'Invalid email or password';
            } else if (response.status === 400) {
              errorMessage = 'Invalid request. Please check your input.';
            } else if (response.status === 404) {
              errorMessage = 'Resource not found';
            } else if (response.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            }
          }

          throw new ApiError(response.status, errorMessage, errorData);
        }

        // Handle 204 No Content or empty response
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return {} as T;
        }

        // Check if response has content before parsing JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }

        // If no JSON content, return empty object
        return {} as T;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network Error:', error);
          throw new ApiError(0, 'Cannot connect to server. Please check if the backend is running.');
        }
        
        console.error('API Error:', error);
        throw new ApiError(500, 'Network error or server unavailable');
      }
    };

    if (method === 'GET') {
      const inFlightRequest = this.inFlightGetRequests.get(url);
      if (inFlightRequest) {
        return inFlightRequest as Promise<T>;
      }

      const requestPromise = performRequest();
      this.inFlightGetRequests.set(url, requestPromise as Promise<unknown>);

      try {
        return await requestPromise;
      } finally {
        this.inFlightGetRequests.delete(url);
      }
    }

    return performRequest();
  }

  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Don't set Content-Type, browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401 && token) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new ApiError(401, 'Session expired. Please login again.');
        }

        const error = await response.json();
        throw new ApiError(
          response.status,
          error.message || 'File upload failed',
          error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'File upload failed');
    }
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    try {
      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401 && token) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new ApiError(401, 'Session expired. Please login again.');
        }

        throw new ApiError(response.status, 'File download failed');
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'File download failed');
    }
  }
}

export const apiService = new ApiService();

// Default export for backward compatibility
export default apiService;
