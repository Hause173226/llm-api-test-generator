import apiService from "./apiService";

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

const avatarObjectUrlCache = new Map<string, string>();
const avatarPreviewStoragePrefix = "user-avatar-preview:";

const getAvatarPreviewStorageKey = (avatarPath: string): string =>
  `${avatarPreviewStoragePrefix}${avatarPath}`;

const persistAvatarPreview = (avatarPath: string, previewUrl: string): void => {
  avatarObjectUrlCache.set(avatarPath, previewUrl);

  if (!previewUrl.startsWith("data:")) {
    return;
  }

  try {
    window.localStorage.setItem(
      getAvatarPreviewStorageKey(avatarPath),
      previewUrl,
    );
  } catch {
    // Ignore storage failures and keep in-memory cache only.
  }
};

const getPersistedAvatarPreview = (avatarPath: string): string | undefined => {
  const cached = avatarObjectUrlCache.get(avatarPath);
  if (cached) return cached;

  try {
    const persisted = window.localStorage.getItem(
      getAvatarPreviewStorageKey(avatarPath),
    );
    if (persisted) {
      avatarObjectUrlCache.set(avatarPath, persisted);
      return persisted;
    }
  } catch {
    // Ignore storage failures and continue with API fallback.
  }

  return undefined;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getAuthenticatedAvatarUrl = async (
  avatarPath?: string | null,
): Promise<string | undefined> => {
  if (!avatarPath) return undefined;
  if (/^https?:\/\//i.test(avatarPath) || avatarPath.startsWith("blob:")) {
    return avatarPath;
  }

  const cached = getPersistedAvatarPreview(avatarPath);
  if (cached) return cached;

  try {
    const blob = await apiService.downloadFile("/auth/me/avatar");
    const objectUrl = URL.createObjectURL(blob);
    persistAvatarPreview(avatarPath, objectUrl);
    return objectUrl;
  } catch {
    return getPersistedAvatarPreview(avatarPath);
  }
};

const normalizeProfile = async (profile: UserProfile): Promise<UserProfile> => ({
  ...profile,
  avatarUrl: await getAuthenticatedAvatarUrl(profile.avatarUrl),
});

const userService = {
  // Get current user profile
  // Backend API: GET /api/auth/me/profile
  getCurrentUser: async (): Promise<UserProfile> => {
    const profile = await apiService.get<UserProfile>("/auth/me/profile");
    return await normalizeProfile(profile);
  },

  // Update user profile
  // Backend API: PUT /api/auth/me/profile
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const profile = await apiService.put<UserProfile>("/auth/me/profile", data);
    return await normalizeProfile(profile);
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
    formData.append("file", file); // Backend expects "file" not "avatar"
    const result = await apiService.uploadFile<{ avatarUrl: string }>(
      "/auth/me/avatar",
      formData,
    );
    const localPreviewUrl = await readFileAsDataUrl(file);
    persistAvatarPreview(result.avatarUrl, localPreviewUrl);
    const objectUrl = await getAuthenticatedAvatarUrl(result.avatarUrl);
    return {
      avatarUrl: objectUrl || localPreviewUrl || result.avatarUrl,
    };
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
