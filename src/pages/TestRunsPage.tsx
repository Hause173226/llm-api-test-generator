import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Download, 
  MoreVertical,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function TestRunsPage() {
  const { t } = useTranslation();

  const runs = [
    { id: 'RUN-842', suite: 'Critical Path Regression', env: 'Production', status: 'Passed', duration: '4m 12s', tests: '142/142', date: '12 mins ago', initiator: 'Autonomous Engine' },
    { id: 'RUN-841', suite: 'Payment Flow Validation', env: 'Staging', status: 'Failed', duration: '1m 45s', tests: '10/12', date: '1 hour ago', initiator: 'Alex Rivera' },
    { id: 'RUN-840', suite: 'User Onboarding', env: 'Production', status: 'Passed', duration: '2m 30s', tests: '28/28', date: '3 hours ago', initiator: 'Scheduled Task' },
    { id: 'RUN-839', suite: 'Legacy Auth Prototype', env: 'Dev Sandbox', status: 'Warning', duration: '5m 10s', tests: '15/20', date: 'Yesterday', initiator: 'Manual Trigger' },
  ];

  return (
    <MainLayout title={t('testRuns.title')}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('testRuns.title')}</h1>
            <p className="text-on-surface-variant">{t('testRuns.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all">
              <Download className="w-5 h-5" />
              {t('testRuns.downloadAudit')}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-5 h-5" />
              {t('testRuns.runNew')}
            </button>
          </div>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: t('testRuns.stats.total'), value: '1,242', icon: Zap, color: 'text-primary dark:text-indigo-400' },
            { label: t('testRuns.stats.success'), value: '98.4%', icon: CheckCircle2, color: 'text-emerald-500' },
            { label: t('testRuns.stats.failures'), value: '12', icon: XCircle, color: 'text-error dark:text-rose-400' },
            { label: t('testRuns.stats.duration'), value: '3m 15s', icon: Clock, color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-surface-container-low dark:bg-slate-800", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-on-surface">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface" 
              placeholder={t('testRuns.searchPlaceholder')} 
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-on-surface-variant" />
            <select className="bg-surface-container-low dark:bg-slate-800 border-none text-xs font-bold text-on-surface-variant rounded-lg px-3 py-2 outline-none text-on-surface">
              <option>{t('testRuns.range.last7')}</option>
              <option>{t('testRuns.range.last30')}</option>
              <option>{t('testRuns.range.custom')}</option>
            </select>
          </div>
          <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Filter className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Runs Table */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 dark:bg-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.id')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.suite')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.env')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.status')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.tests')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('testRuns.table.duration')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">{t('testRuns.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">{run.id}</span>
                        <span className="text-[10px] text-on-surface-variant font-medium">{run.date}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface">{run.suite}</span>
                        <span className="text-[10px] text-on-surface-variant font-medium">{t('testRuns.table.by')} {run.initiator}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-on-surface-variant">{run.env}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold",
                        run.status === 'Passed' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" : 
                        run.status === 'Failed' ? "bg-error-container dark:bg-rose-900/30 text-on-error-container dark:text-rose-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          run.status === 'Passed' ? "bg-emerald-500" : 
                          run.status === 'Failed' ? "bg-error" : "bg-amber-500"
                        )}></span>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-mono font-bold text-on-surface">{run.tests}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-medium text-on-surface-variant">{run.duration}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary dark:hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                          {t('testRuns.actions.view')}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/30 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('testRuns.pagination', { current: 4, total: '1,242' })}</p>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50" disabled>
                <ChevronLeft className="w-4 h-4 text-on-surface" />
              </button>
              <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-on-surface" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

