import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, LoginResponse } from "../services/authService";
import {
  getAuthToken,
  getRefreshToken,
  getUser,
  clearAuthToken,
} from "../config/api";

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      const storedUser = getUser();
      const token = getAuthToken();
      const refreshToken = getRefreshToken();

      // BE stores refresh token in HttpOnly cookie (ca_refresh_token).
      // On reload, localStorage may not have refreshToken but cookie is still valid.
      // Always attempt refresh when we have any prior auth footprint.
      if (refreshToken || token || storedUser) {
        try {
          const refreshed = await authService.refreshToken();
          setUser(refreshed.user);
        } catch {
          clearAuthToken();
          setUser(null);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (storedUser && token) {
        setUser(storedUser);
      } else {
        clearAuthToken();
        setUser(null);
      }

      setIsLoading(false);
    };

    bootstrapSession();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response: LoginResponse = await authService.login(email, password);
      setUser(response.user);
    } catch (error) {
      // Don't call handleApiError here, let the calling component handle it
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout API (optional, can fail silently)
      await authService.logout();
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with local logout even if API fails
    } finally {
      // Always clear local state
      setUser(null);
      clearAuthToken();
      // Clear project selection
      localStorage.removeItem("selectedProjectId");
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<void> => {
    try {
      await authService.register({
        fullName,
        email,
        password,
        confirmPassword,
      });
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<void> => {
    try {
      const response = await authService.loginWithGoogle(idToken);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!getAuthToken(),
    isLoading,
    login,
    loginWithGoogle,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
