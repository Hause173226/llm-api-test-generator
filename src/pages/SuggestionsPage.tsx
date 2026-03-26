import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  Zap, 
  ShieldAlert, 
  Clock,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function SuggestionsPage() {
  const { t } = useTranslation();

  const suggestions = [
    { 
      title: t('suggestions.items.edgeCase.title'), 
      description: t('suggestions.items.edgeCase.desc'),
      type: t('suggestions.categories.security.title'),
      impact: t('suggestions.impact.high'),
      difficulty: t('suggestions.difficulty.low'),
      icon: ShieldAlert,
      color: 'text-rose-500',
      bg: 'bg-rose-50'
    },
    { 
      title: t('suggestions.items.performance.title'), 
      description: t('suggestions.items.performance.desc'),
      type: t('suggestions.categories.performance.title'),
      impact: t('suggestions.impact.medium'),
      difficulty: t('suggestions.difficulty.medium'),
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    { 
      title: t('suggestions.items.functional.title'), 
      description: t('suggestions.items.functional.desc'),
      type: t('suggestions.categories.reliability.title'),
      impact: t('suggestions.impact.high'),
      difficulty: t('suggestions.difficulty.low'),
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    }
  ];

  return (
    <MainLayout title={t('suggestions.title')}>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2 dark:text-on-surface">{t('suggestions.title')}</h1>
            <p className="text-on-surface-variant dark:text-on-surface-variant max-w-2xl">
              {t('suggestions.subtitle')}
            </p>
          </div>
          <button className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <RefreshCw className="w-5 h-5" />
            {t('suggestions.reAnalyze')}
          </button>
        </header>

        {/* Intelligence Overview Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-3xl text-white shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-primary-container uppercase tracking-widest mb-2">{t('suggestions.metrics.score')}</p>
              <h3 className="text-5xl font-black">92.4</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">{t('suggestions.metrics.scoreTrend')}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest mb-2">{t('suggestions.metrics.gaps')}</p>
              <h3 className="text-5xl font-black text-on-surface dark:text-on-surface">18</h3>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-on-surface-variant font-medium">{t('suggestions.metrics.gapsDesc')}</p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest mb-2">{t('suggestions.metrics.timeSaved')}</p>
              <h3 className="text-5xl font-black text-on-surface dark:text-on-surface">42h</h3>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-on-surface-variant font-medium">{t('suggestions.metrics.timeSavedDesc')}</p>
          </div>
        </div>

        {/* Suggestions List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface dark:text-on-surface tracking-tight">{t('suggestions.active.title')}</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant dark:text-on-surface-variant">
              <Info className="w-4 h-4" />
              <span>{t('suggestions.active.sortBy')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1">
                    <div className={cn("p-4 rounded-2xl", suggestion.bg, "dark:bg-surface-container-high")}>
                      <suggestion.icon className={cn("w-8 h-8", suggestion.color)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-on-surface dark:text-on-surface tracking-tight">{suggestion.title}</h3>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          suggestion.impact === t('suggestions.impact.high') ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        )}>{suggestion.impact} {t('suggestions.item.impact')}</span>
                      </div>
                      <p className="text-on-surface-variant dark:text-on-surface-variant leading-relaxed max-w-3xl">{suggestion.description}</p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant dark:text-on-surface-variant">
                          <Zap className="w-4 h-4" />
                          <span>{t('suggestions.item.difficulty')}: {suggestion.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant dark:text-on-surface-variant">
                          <Clock className="w-4 h-4" />
                          <span>{t('suggestions.item.estTime')}: 15 {t('suggestions.item.mins')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button className="px-6 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      {t('suggestions.item.add')}
                    </button>
                    <button className="px-6 py-3 bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container dark:text-on-secondary-container font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                      {t('suggestions.item.dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Auto-Generation Banner */}
        <div className="bg-surface-container-low dark:bg-surface-container-high p-10 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="relative z-10 space-y-4 max-w-2xl">
            <h3 className="text-3xl font-bold text-on-surface dark:text-on-surface tracking-tight leading-tight">
              {t('suggestions.banner.title')}
            </h3>
            <p className="text-on-surface-variant dark:text-on-surface-variant">
              {t('suggestions.banner.desc')}
            </p>
          </div>
          <button className="relative z-10 px-8 py-4 bg-on-surface dark:bg-on-surface-variant text-surface dark:text-on-surface rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl group">
            {t('suggestions.banner.launch')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

