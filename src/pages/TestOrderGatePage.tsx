import React from 'react';
import { 
  Network, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Save, 
  RefreshCw, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';
import { useTranslation, Trans } from 'react-i18next';

const executionNodes = [
  { id: '1', label: 'Authenticate User', method: 'POST', url: '/v1/auth/login', step: 1, type: 'root' },
  { id: '2', label: 'Get User Profile', method: 'GET', url: '/v1/user/profile', step: 2, type: 'child' },
  { id: '3', label: 'Update Preferences', method: 'PUT', url: '/v1/user/settings', step: 3, type: 'child' },
  { id: '4', label: 'Verify Payment Method', method: 'POST', url: '/v1/payments/verify', step: 2, type: 'child' },
  { id: '5', label: 'Process Checkout', method: 'POST', url: '/v1/checkout', step: 3, type: 'leaf' },
];

export default function TestOrderGatePage() {
  const { t } = useTranslation();

  return (
    <MainLayout title={t('testOrderGate.title')}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('testOrderGate.title')}</h1>
            <p className="text-on-surface-variant">{t('testOrderGate.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container font-semibold flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <Save className="w-5 h-5" />
              {t('testOrderGate.save')}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-5 h-5" />
              {t('testOrderGate.execute')}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface">{t('testOrderGate.llm.title')}</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                <Trans i18nKey="testOrderGate.llm.desc" count={3}>
                  The LLM has analyzed your specification and identified <span className="text-primary font-bold">3 critical dependency chains</span>.
                </Trans>
              </p>
              <button className="w-full py-3 bg-primary-fixed text-on-primary-fixed-variant font-bold text-xs rounded-xl hover:bg-primary-fixed/80 transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {t('testOrderGate.llm.regenerate')}
              </button>
            </div>

            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-4">{t('testOrderGate.stats.title')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">{t('testOrderGate.stats.totalSteps')}</span>
                  <span className="text-sm font-bold text-on-surface">8 Steps</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">{t('testOrderGate.stats.parallelPaths')}</span>
                  <span className="text-sm font-bold text-on-surface">2 Paths</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">{t('testOrderGate.stats.complexity')}</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{t('testOrderGate.stats.medium')}</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('testOrderGate.proTip.title')}</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('testOrderGate.proTip.desc')}
              </p>
            </div>
          </div>

          {/* Visualization Canvas */}
          <div className="lg:col-span-3 bg-surface-container-low dark:bg-surface-container-high rounded-3xl border border-outline-variant/10 shadow-inner min-h-[600px] relative overflow-hidden p-8">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative z-10 flex flex-col gap-12 items-center">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testOrderGate.steps.entry')}</div>
                <div className="bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-xl border-2 border-primary w-72 group hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded">POST</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-on-surface text-sm mb-1">Authenticate User</h4>
                  <p className="text-[10px] font-mono text-on-surface-variant truncate">/v1/auth/login</p>
                </div>
              </div>

              <ArrowRight className="w-6 h-6 text-outline-variant rotate-90" />

              {/* Step 2 (Parallel) */}
              <div className="flex flex-col md:flex-row gap-12 items-start">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testOrderGate.steps.dataFetch')}</div>
                  <div className="bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-lg border border-outline-variant/20 w-72 group hover:border-primary transition-all cursor-grab">
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded">GET</span>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <h4 className="font-bold text-on-surface text-sm mb-1">Get User Profile</h4>
                    <p className="text-[10px] font-mono text-on-surface-variant truncate">/v1/user/profile</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testOrderGate.steps.verification')}</div>
                  <div className="bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-lg border border-outline-variant/20 w-72 group hover:border-primary transition-all cursor-grab">
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded">POST</span>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <h4 className="font-bold text-on-surface text-sm mb-1">Verify Payment Method</h4>
                    <p className="text-[10px] font-mono text-on-surface-variant truncate">/v1/payments/verify</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-48">
                <ArrowRight className="w-6 h-6 text-outline-variant rotate-90" />
                <ArrowRight className="w-6 h-6 text-outline-variant rotate-90" />
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testOrderGate.steps.finalization')}</div>
                <div className="bg-surface-container-lowest dark:bg-surface-container-low p-5 rounded-2xl shadow-lg border border-outline-variant/20 w-72 group hover:border-primary transition-all cursor-grab">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded">POST</span>
                    <AlertCircle className="w-4 h-4 text-error" />
                  </div>
                  <h4 className="font-bold text-on-surface text-sm mb-1">Process Checkout</h4>
                  <p className="text-[10px] font-mono text-on-surface-variant truncate">/v1/checkout</p>
                </div>
              </div>
            </div>

            {/* Canvas Controls */}
            <div className="absolute bottom-6 right-6 flex gap-2">
              <button className="w-10 h-10 bg-surface-container-lowest dark:bg-surface-container-low rounded-lg shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">+</button>
              <button className="w-10 h-10 bg-surface-container-lowest dark:bg-surface-container-low rounded-lg shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">-</button>
              <button className="w-10 h-10 bg-surface-container-lowest dark:bg-surface-container-low rounded-lg shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                <Network className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

