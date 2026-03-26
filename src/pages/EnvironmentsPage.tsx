import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Settings2, 
  ShieldCheck, 
  Globe, 
  Lock, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function EnvironmentsPage() {
  const { t } = useTranslation();

  const environments = [
    { name: 'Production Cluster', url: 'https://api.testflow.io/v1', status: 'Operational', auth: 'Bearer Token', region: 'US-East-1', isDefault: true },
    { name: 'Staging Environment', url: 'https://staging-api.testflow.io/v1', status: 'Operational', auth: 'OAuth 2.0', region: 'EU-West-1', isDefault: false },
    { name: 'Dev Sandbox', url: 'https://dev-api.testflow.io/v1', status: 'Degraded', auth: 'API Key', region: 'Local', isDefault: false },
  ];

  return (
    <MainLayout title={t('environments.title')}>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('environments.title')}</h1>
            <p className="text-on-surface-variant max-w-2xl">
              {t('environments.subtitle')}
            </p>
          </div>
          <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800 text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus className="w-5 h-5" />
            {t('environments.add')}
          </button>
        </header>

        {/* Environment Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {environments.map((env, i) => (
            <div key={i} className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 dark:hover:border-indigo-500/30 transition-all">
              <div className="p-8 space-y-8 flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                      env.isDefault ? "bg-primary-fixed dark:bg-indigo-900/40 text-on-primary-fixed-variant dark:text-indigo-300" : "bg-surface-container dark:bg-slate-800 text-on-surface-variant"
                    )}>
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-on-surface tracking-tight">{env.name}</h3>
                        {env.isDefault && (
                          <span className="bg-primary/10 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{t('environments.status.default')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          env.status === 'Operational' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                        )}></span>
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                          {env.status === 'Operational' ? t('environments.status.operational') : t('environments.status.degraded')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-slate-800/50 rounded-2xl group/url cursor-pointer">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <ExternalLink className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                      <span className="text-sm font-mono text-on-surface truncate">{env.url}</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary dark:text-indigo-400 opacity-0 group-hover/url:opacity-100 transition-opacity uppercase tracking-widest">{t('environments.details.copyUrl')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                      <Lock className="w-5 h-5 text-on-surface-variant" />
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('environments.details.authMethod')}</p>
                        <p className="text-sm font-bold text-on-surface">{env.auth}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-surface-container-low dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                      <Settings2 className="w-5 h-5 text-on-surface-variant" />
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('environments.details.region')}</p>
                        <p className="text-sm font-bold text-on-surface">{env.region}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-surface-container-low/50 dark:bg-slate-800/30 border-t border-outline-variant/10 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-on-surface">{t('environments.details.sslVerified')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary dark:text-indigo-400" />
                    <span className="text-xs font-bold text-on-surface">{t('environments.details.autoSync')}</span>
                  </div>
                </div>
                <button className="text-sm font-bold text-primary dark:text-indigo-400 hover:underline flex items-center gap-2">
                  {t('environments.details.configureVariables')}
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          <div className="bg-surface-container-low/30 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-outline-variant/20 dark:border-slate-800 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all min-h-[340px]">
            <div className="w-16 h-16 rounded-full bg-surface-container dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-on-surface-variant" />
            </div>
            <h4 className="text-xl font-bold text-on-surface">{t('environments.register.title')}</h4>
            <p className="text-sm text-on-surface-variant mt-2 max-w-xs">{t('environments.register.subtitle')}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

