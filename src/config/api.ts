// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5099/api',
  SIGNALR_HUB_URL: import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5099/hubs/notification',
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

export const getUser = (): { id: string; email: string; fullName: string; roles: string[] } | null => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return parsed;
    }
    return null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const setUser = (user: { id: string; email: string; fullName: string; roles: string[] }): void => {
  localStorage.setItem('user', JSON.stringify(user));
};
