import { useState, useEffect } from 'react';
import userService, { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '../services/userService';
import { handleError } from '../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

// NOTE: NotificationSettings removed because Backend API not available
// If you need notification settings, implement the Backend API first

export const useUserProfile = () => {
  const { refreshUser, syncUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getCurrentUser();
      setProfile(data);
      syncUserProfile(data);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    try {
      const updated = await userService.updateProfile(data);
      setProfile(updated);
      syncUserProfile(updated);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const changePassword = async (data: ChangePasswordRequest): Promise<boolean> => {
    try {
      await userService.changePassword(data);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const uploadAvatar = async (file: File): Promise<boolean> => {
    try {
      const result = await userService.uploadAvatar(file);
      if (profile) {
        const updatedProfile = { ...profile, avatarUrl: result.avatarUrl };
        setProfile(updatedProfile);
        syncUserProfile(updatedProfile);
      }
      await refreshUser();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  // NOTE: deleteAvatar removed because Backend API not available (DELETE /users/me/avatar)

  return {
    profile,
    loading,
    error,
    updateProfile,
    changePassword,
    uploadAvatar,
    refetch: fetchProfile,
  };
};
