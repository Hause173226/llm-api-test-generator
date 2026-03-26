import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  MoreVertical
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function EndpointsPage() {
  const { t } = useTranslation();

  const endpoints = [
    { path: '/api/v1/users', method: 'GET', description: 'Retrieve a list of all registered users.', status: 'Active', latency: '24ms', coverage: 92 },
    { path: '/api/v1/users', method: 'POST', description: 'Register a new user account.', status: 'Active', latency: '142ms', coverage: 85 },
    { path: '/api/v1/users/{id}', method: 'GET', description: 'Get detailed information for a specific user.', status: 'Active', latency: '18ms', coverage: 100 },
    { path: '/api/v1/auth/login', method: 'POST', description: 'Authenticate user and return access tokens.', status: 'Warning', latency: '256ms', coverage: 70 },
    { path: '/api/v1/payments/verify', method: 'POST', description: 'Verify payment transaction status.', status: 'Error', latency: '--', coverage: 0 },
  ];

  return (
    <MainLayout title={t('endpoints.title')}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('endpoints.title')}</h1>
            <p className="text-on-surface-variant">{t('endpoints.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all">
              <Download className="w-5 h-5" />
              {t('endpoints.exportButton')}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <RefreshCw className="w-5 h-5" />
              {t('endpoints.syncButton')}
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface" 
              placeholder={t('endpoints.searchPlaceholder')} 
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">{t('endpoints.methodLabel')}</span>
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <button key={m} className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                m === 'ALL' ? "bg-primary dark:bg-indigo-600 text-on-primary" : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700"
              )}>
                {m}
              </button>
            ))}
          </div>
          <button className="ml-auto p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Filter className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Endpoints List */}
        <div className="grid grid-cols-1 gap-4">
          {endpoints.map((endpoint, i) => (
            <div key={i} className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter min-w-[60px] text-center",
                    endpoint.method === 'GET' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : 
                    endpoint.method === 'POST' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  )}>
                    {endpoint.method}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-on-surface tracking-tight">{endpoint.path}</h3>
                      <ExternalLink className="w-4 h-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{endpoint.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('endpoints.table.status')}</p>
                    <div className="flex items-center gap-1.5">
                      {endpoint.status === 'Active' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : endpoint.status === 'Warning' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error" />
                      )}
                      <span className={cn(
                        "text-xs font-bold",
                        endpoint.status === 'Active' ? "text-emerald-700 dark:text-emerald-400" : 
                        endpoint.status === 'Warning' ? "text-amber-700 dark:text-amber-400" : "text-error dark:text-rose-400"
                      )}>{endpoint.status}</span>
                    </div>
                  </div>

                  <div className="text-center min-w-[80px]">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('endpoints.table.latency')}</p>
                    <p className="text-sm font-mono font-bold text-on-surface">{endpoint.latency}</p>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('endpoints.table.coverage')}</p>
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-black text-on-surface">{endpoint.coverage}%</span>
                      <div className="w-16 h-1.5 bg-surface-container dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            endpoint.coverage > 80 ? "bg-emerald-500" : endpoint.coverage > 40 ? "bg-amber-500" : "bg-error"
                          )} 
                          style={{ width: `${endpoint.coverage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <button className="text-sm font-bold text-primary dark:text-indigo-400 hover:underline">{t('endpoints.loadMore')}</button>
        </div>
      </div>
    </MainLayout>
  );
}

