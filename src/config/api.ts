// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:44312/api',
  SIGNALR_HUB_URL: import.meta.env.VITE_SIGNALR_HUB_URL || 'https://localhost:44312/hubs/notifications',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem('refreshToken', token);
};

export const getUser = (): any | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
};
