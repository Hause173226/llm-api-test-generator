import { apiService } from './apiService';
import {
  setAuthToken,
  setRefreshToken,
  setUser,
  clearAuthToken,
  getRefreshToken,
} from '../config/api';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  userId: string;
  message: string;
  requiresEmailVerification: boolean;
}

// Auth Service
class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // Store tokens and user info
    setAuthToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);

    return response;
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return await apiService.post<RegisterResponse>('/auth/register', data);
  }

  async confirmEmail(email: string, token: string): Promise<{ message: string }> {
    return await apiService.post<{ message: string }>('/auth/confirm-email', { email, token });
  }

  async resendConfirmationEmail(email: string): Promise<void> {
    await apiService.post('/auth/resend-confirmation-email', { email });
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } finally {
      clearAuthToken();
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await apiService.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiService.post('/auth/reset-password', { token, newPassword });
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<LoginResponse>(
      '/auth/refresh-token',
      { refreshToken }
    );

    setAuthToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);

    return response;
  }

  async verifyEmail(token: string): Promise<void> {
    await apiService.post('/auth/verify-email', { token });
  }

  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login/google', { idToken });
    setAuthToken(response.accessToken);
    if (response.refreshToken) setRefreshToken(response.refreshToken);
    setUser(response.user);
    return response;
  }
}

export const authService = new AuthService();
