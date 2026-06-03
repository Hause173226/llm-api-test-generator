import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, LoginResponse } from "../services/authService";
import {
  getAuthToken,
  getUser,
  clearAuthToken,
} from "../config/api";
import apiService from "../services/apiService";
import userService, { UserProfile } from "../services/userService";

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
  refreshUser: () => Promise<void>;
  syncUserProfile: (profile: UserProfile | null) => void;
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

  const syncUserProfile = (profile: UserProfile | null): void => {
    if (!profile) {
      setUser(null);
      return;
    }

    setUser({
      id: profile.userId,
      email: profile.email,
      fullName: profile.displayName || profile.userName || profile.email,
      roles: profile.roles || [],
      avatarUrl: profile.avatarUrl,
    });
  };

  const refreshUser = async (): Promise<void> => {
    const profile = await userService.getCurrentUser();
    syncUserProfile(profile);
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const storedUser = getUser();
      const token = getAuthToken();

      if (token || storedUser) {
        try {
          // Prefer using current access token first.
          // Only refresh when the token is actually invalid/expired.
          await refreshUser();
        } catch {
          try {
            // Token likely expired; refresh via cookie with apiService lock.
            await apiService.refreshSession();
            await refreshUser();
          } catch {
            clearAuthToken();
            setUser(null);
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }
      clearAuthToken();
      setUser(null);
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
    refreshUser,
    syncUserProfile,
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
