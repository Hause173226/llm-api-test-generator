import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, LoginResponse } from "../services/authService";
import { getUser, clearAuthToken } from "../config/api";

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
  logout: () => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
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
  ): Promise<void> => {
    try {
      await authService.register({ fullName, email, password });
    } catch (error) {
      // Don't call handleApiError here, let the calling component handle it
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
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
