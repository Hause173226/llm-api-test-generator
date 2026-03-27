import apiService from './apiService';

export interface UserProfile {
  userId: string;
  email: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  timezone?: string;
  phoneNumber?: string;
  emailConfirmed: boolean;
  phoneNumberConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnabled: boolean;
  lockoutEnd?: string;
  isLockedOut: boolean;
  accessFailedCount: number;
  createdDateTime: string;
  updatedDateTime?: string;
  profileCreatedDateTime?: string;
  profileUpdatedDateTime?: string;
  roles: string[];
}

export interface UpdateProfileRequest {
  displayName?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

const userService = {
  // Get current user profile
  // Backend API: GET /api/auth/me/profile
  getCurrentUser: async (): Promise<UserProfile> => {
    return await apiService.get<UserProfile>('/auth/me/profile');
  },

  // Update user profile
  // Backend API: PUT /api/auth/me/profile
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    return await apiService.put<UserProfile>('/auth/me/profile', data);
  },

  // Change password
  // Backend API: POST /api/auth/change-password
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiService.post('/auth/change-password', data);
  },

  // Upload avatar
  // Backend API: POST /api/auth/me/avatar
  // Backend expects form field name: "file"
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file); // Backend expects "file" not "avatar"
    return await apiService.uploadFile<{ avatarUrl: string }>('/auth/me/avatar', formData);
  },

  // NOTE: The following APIs are NOT available in Backend yet:
  // - DELETE /users/me/avatar (deleteAvatar)
  // - GET /users/me/preferences (getPreferences)
  // - PUT /users/me/preferences (updatePreferences)
  // - GET /users/me/activity (getActivityLog)
  // - POST /users/me/delete-account (deleteAccount)
  // - GET /users/me/export (exportUserData)
  
  // These methods have been removed because the Backend endpoints don't exist.
  // If you need these features, please implement them in the Backend first.
};

export default userService;
