import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: 'Đỗ Trần Phúc Hậu',
    email: 'dotranphuchau@gmail.com'
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReports: true,
    securityAlerts: true,
    marketingEmails: false
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <MainLayout title={t('settings.title')}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('settings.title')}</h1>
            <p className="text-on-surface-variant font-medium max-w-2xl">
              {t('settings.subtitle')}
            </p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t('settings.save')}
          </button>
        </div>

        {showSuccess && (
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary text-sm font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5" />
            {t('settings.success')}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'profile', label: t('settings.tabs.profile'), icon: User },
              { id: 'security', label: t('settings.tabs.security'), icon: Lock },
              { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all text-left",
                  activeTab === tab.id 
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/10" 
                    : "text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container-low"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {activeTab === 'profile' && (
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[32px] border border-outline-variant/10 p-8 space-y-8 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">{t('settings.profile.title')}</h3>
                  <p className="text-sm text-on-surface-variant font-medium">{t('settings.profile.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{t('settings.profile.name')}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{t('settings.profile.email')}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input 
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                  <AlertCircle className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    {t('settings.profile.emailWarning')}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[32px] border border-outline-variant/10 p-8 space-y-8 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">{t('settings.security.title')}</h3>
                  <p className="text-sm text-on-surface-variant font-medium">{t('settings.security.subtitle')}</p>
                </div>

                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{t('settings.security.current')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input 
                        type="password"
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{t('settings.security.new')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input 
                        type="password"
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{t('settings.security.confirm')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      <input 
                        type="password"
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed transition-all text-on-surface font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[32px] border border-outline-variant/10 p-8 space-y-8 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">{t('settings.notifications.title')}</h3>
                  <p className="text-sm text-on-surface-variant font-medium">{t('settings.notifications.subtitle')}</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'emailAlerts', label: t('settings.notifications.critical.label'), desc: t('settings.notifications.critical.desc') },
                    { id: 'weeklyReports', label: t('settings.notifications.weekly.label'), desc: t('settings.notifications.weekly.desc') },
                    { id: 'securityAlerts', label: t('settings.notifications.security.label'), desc: t('settings.notifications.security.desc') },
                    { id: 'marketingEmails', label: t('settings.notifications.marketing.label'), desc: t('settings.notifications.marketing.desc') }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-6 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/5">
                      <div className="space-y-1 pr-8">
                        <p className="font-bold text-on-surface">{item.label}</p>
                        <p className="text-xs text-on-surface-variant font-medium">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => setNotifications({...notifications, [item.id]: !notifications[item.id as keyof typeof notifications]})}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          notifications[item.id as keyof typeof notifications] ? "bg-primary" : "bg-surface-container-highest dark:bg-surface-container-high"
                        )}
                      >
                        <span 
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            notifications[item.id as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

