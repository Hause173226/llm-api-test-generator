import React, { useState, useRef } from "react";
import MainLayout from "../components/layout/MainLayout";
import {
  User,
  Mail,
  Lock,
  Save,
  AlertCircle,
  Camera,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useUserProfile } from "../hooks/useUserProfile";
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";
import Skeleton from "../components/ui/Skeleton";

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const { profile, loading, updateProfile, changePassword, uploadAvatar } =
    useUserProfile();

  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    displayName: "",
    timezone: "",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update local state when profile loads
  React.useEffect(() => {
    if (profile) {
      setProfileData({
        displayName: profile.displayName || "",
        timezone: profile.timezone || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const success = await updateProfile(profileData);
      if (success) {
        showSuccessToast(t("settings.profile.updateSuccess"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      showErrorToast(t("settings.security.passwordMismatch"));
      return;
    }

    if (securityData.newPassword.length < 8) {
      showErrorToast(t("settings.security.passwordTooShort"));
      return;
    }

    setIsSaving(true);
    try {
      const success = await changePassword(securityData);
      if (success) {
        showSuccessToast(t("settings.security.passwordChanged"));
        setSecurityData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (activeTab === "profile") {
      handleSaveProfile();
    } else if (activeTab === "security") {
      handleChangePassword();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorToast(t("settings.profile.invalidFileType"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast(t("settings.profile.fileTooLarge"));
      return;
    }

    const success = await uploadAvatar(file);
    if (success) {
      showSuccessToast(t("settings.profile.avatarUploaded"));
    }
  };

  const handleDeleteAvatar = async () => {
    // NOTE: Backend API not available yet (DELETE /users/me/avatar)
    showErrorToast(
      "Delete avatar feature is not available yet. Backend API not implemented.",
    );
  };

  if (loading) {
    return (
      <MainLayout title={t("settings.title")}>
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="lg:col-span-9">
              <Skeleton className="h-96 w-full rounded-[32px]" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("settings.title")}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("settings.title")}
            </h1>
            <p className="text-on-surface-variant font-medium max-w-2xl">
              {t("settings.subtitle")}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t("settings.save")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: "profile", label: t("settings.tabs.profile"), icon: User },
              {
                id: "security",
                label: t("settings.tabs.security"),
                icon: Lock,
              },
              // NOTE: Notifications tab removed - Backend API not available
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all text-left cursor-pointer",
                  activeTab === tab.id
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
                    : "text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container-low",
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {activeTab === "profile" && (
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[32px] border border-outline-variant/10 p-8 space-y-8 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">
                    {t("settings.profile.title")}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">
                    {t("settings.profile.subtitle")}
                  </p>
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-surface-container-high dark:bg-surface-container-highest flex items-center justify-center overflow-hidden">
                      {profile?.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-on-surface-variant" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-on-surface">
                      {profile?.displayName || profile?.userName}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {profile?.email}
                    </p>
                    {profile?.avatarUrl && (
                      <button
                        onClick={handleDeleteAvatar}
                        className="flex items-center gap-2 text-xs text-error hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t("settings.profile.deleteAvatar")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                      {t("settings.profile.displayName") || "Display Name"}
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            displayName: e.target.value,
                          })
                        }
                        placeholder={t(
                          "settings.profile.displayNamePlaceholder",
                        )}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                      {t("settings.profile.timezone")}
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={profileData.timezone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            timezone: e.target.value,
                          })
                        }
                        placeholder={t("settings.profile.timezonePlaceholder")}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    {t("settings.profile.email")}
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none text-on-surface-variant font-bold text-sm opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                  <AlertCircle className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    {t("settings.profile.emailWarning")}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[32px] border border-outline-variant/10 p-8 space-y-8 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">
                    {t("settings.security.title")}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">
                    {t("settings.security.subtitle")}
                  </p>
                </div>

                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                      {t("settings.security.current")}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input
                        type="password"
                        value={securityData.currentPassword}
                        onChange={(e) =>
                          setSecurityData({
                            ...securityData,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                      {t("settings.security.new")}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input
                        type="password"
                        value={securityData.newPassword}
                        onChange={(e) =>
                          setSecurityData({
                            ...securityData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                      {t("settings.security.confirm")}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={(e) =>
                          setSecurityData({
                            ...securityData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                    <AlertCircle className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                      {t("settings.security.passwordRequirements")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
