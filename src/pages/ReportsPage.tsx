import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Filter, 
  PieChart, 
  Activity, 
  ShieldCheck, 
  Zap,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function ReportsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout title={t('reports.title')}>
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('reports.title')}</h1>
            <p className="text-on-surface-variant">{t('reports.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center px-4 py-2.5 bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 cursor-pointer hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors">
              <Calendar className="w-4 h-4 text-on-surface-variant mr-3" />
              <span className="text-sm font-bold text-on-surface">Last 30 Days</span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant ml-3" />
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Download className="w-5 h-5" />
              {t('reports.exportPdf')}
            </button>
          </div>
        </header>

        {/* High Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: t('reports.metrics.passRate'), value: '98.4%', trend: '+2.1%', up: true, icon: ShieldCheck, color: 'text-emerald-500' },
            { label: t('reports.metrics.responseTime'), value: '142ms', trend: '-12ms', up: true, icon: Zap, color: 'text-amber-500' },
            { label: t('reports.metrics.testCoverage'), value: '86.5%', trend: '+5.4%', up: true, icon: Activity, color: 'text-primary dark:text-indigo-400' },
            { label: t('reports.metrics.totalExecutions'), value: '12.5k', trend: '+1.2k', up: true, icon: BarChart3, color: 'text-indigo-500 dark:text-indigo-300' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  stat.up ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                )}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-on-surface">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Reliability Chart */}
          <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-bold text-on-surface tracking-tight">{t('reports.reliability.title')}</h3>
                <p className="text-sm text-on-surface-variant">{t('reports.reliability.subtitle')}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary dark:bg-indigo-500"></span>
                  <span className="text-xs font-bold text-on-surface-variant">{t('reports.reliability.production')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                  <span className="text-xs font-bold text-on-surface-variant">{t('reports.reliability.staging')}</span>
                </div>
              </div>
            </div>
            <div className="h-80 flex items-end justify-between gap-4">
              {Array.from({ length: 15 }).map((_, i) => {
                const h = 60 + Math.random() * 40;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-primary/10 dark:bg-indigo-500/10 rounded-t-lg relative overflow-hidden" style={{ height: `${h}%` }}>
                      <div className="absolute bottom-0 w-full bg-primary dark:bg-indigo-600 transition-all duration-500 group-hover:opacity-80" style={{ height: `${h * 0.8}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{t('reports.reliability.day')} {i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution Pie Chart Placeholder */}
          <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-on-surface tracking-tight mb-2">{t('reports.distribution.title')}</h3>
            <p className="text-sm text-on-surface-variant mb-10">{t('reports.distribution.subtitle')}</p>
            
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-48 h-48 rounded-full border-[24px] border-primary dark:border-indigo-600 relative">
                <div className="absolute inset-[-24px] rounded-full border-[24px] border-amber-500" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 50%)' }}></div>
                <div className="absolute inset-[-24px] rounded-full border-[24px] border-rose-500" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 50%)' }}></div>
              </div>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-on-surface">12</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('reports.distribution.totalFailures')}</span>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { label: t('reports.distribution.auth'), value: 6, color: 'bg-primary dark:bg-indigo-500' },
                { label: t('reports.distribution.timeout'), value: 4, color: 'bg-amber-500' },
                { label: t('reports.distribution.validation'), value: 2, color: 'bg-rose-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", item.color)}></div>
                    <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface-variant">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performing Suites */}
        <section className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-on-surface tracking-tight">{t('reports.topPerforming.title')}</h3>
            <button className="text-primary dark:text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              {t('reports.topPerforming.fullLeaderboard')} <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Auth Regression', score: 99.8, runs: 450 },
              { name: 'Payment Core', score: 98.2, runs: 320 },
              { name: 'User Profile', score: 97.5, runs: 280 },
            ].map((suite, i) => (
              <div key={i} className="p-6 bg-surface-container-low dark:bg-slate-800 rounded-2xl flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-indigo-500/5 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-bold text-on-surface group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">{suite.name}</h4>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">{suite.runs} {t('reports.topPerforming.executions')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-on-surface">{suite.score}%</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">{t('reports.topPerforming.reliable')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

