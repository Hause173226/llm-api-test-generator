import React from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  Code2, 
  Terminal, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldAlert, 
  Globe,
  MessageSquare
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';
import { useTranslation, Trans } from 'react-i18next';

export default function FailureExplanationPage() {
  const { t } = useTranslation();

  return (
    <MainLayout title={t('failureExplanation.title')}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('failureExplanation.title')}</h1>
            <p className="text-on-surface-variant">{t('failureExplanation.subtitle')}</p>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <RefreshCw className="w-5 h-5" />
            {t('failureExplanation.reAnalyze')}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Analysis Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Failure Card */}
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border-2 border-error/20 shadow-xl shadow-error/5">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-error-container rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-error" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-on-surface tracking-tight">POST /v1/payments/verify</h3>
                    <p className="text-sm font-mono text-on-surface-variant mt-1">Run ID: RUN-841 • Payment Gateway • Staging</p>
                  </div>
                </div>
                <span className="px-4 py-1.5 bg-error-container text-on-error-container text-xs font-black rounded-full uppercase tracking-widest">500 Internal Server Error</span>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('failureExplanation.analysis.title')}
                  </h4>
                  <p className="text-lg text-on-surface leading-relaxed font-medium">
                    The server failed to process the transaction because the <span className="text-primary font-bold">idempotency_key</span> header was missing from the request payload. This caused a race condition in the database layer when attempting to lock the transaction record.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                    <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{t('failureExplanation.analysis.expected')}</h5>
                    <p className="text-sm text-on-surface leading-relaxed">The API should return a 400 Bad Request if the idempotency key is missing, rather than a 500 Internal Server Error.</p>
                  </div>
                  <div className="p-6 bg-surface-container-low dark:bg-surface-container-high rounded-2xl border border-outline-variant/10">
                    <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{t('failureExplanation.analysis.suggested')}</h5>
                    <p className="text-sm text-on-surface leading-relaxed">Update the client-side test case to include a unique UUID in the header and implement a validation check in the backend controller.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Comparison */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-mono text-slate-400">{t('failureExplanation.analysis.payloadComparison')}</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
                <div className="space-y-4">
                  <p className="text-slate-500 font-bold uppercase tracking-widest">{t('failureExplanation.analysis.actual')}</p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-rose-400">
                    <pre>
{`{
  "amount": 1500,
  "currency": "USD",
  "source": "tok_visa",
  // MISSING: idempotency_key
}`}
                    </pre>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-slate-500 font-bold uppercase tracking-widest">{t('failureExplanation.analysis.expectedRequest')}</p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400">
                    <pre>
{`{
  "amount": 1500,
  "currency": "USD",
  "source": "tok_visa",
  "idempotency_key": "uuid-v4-..."
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t('failureExplanation.impact.title')}
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('failureExplanation.impact.risk')}</p>
                    <p className="text-lg font-black text-rose-600">{t('failureExplanation.impact.critical')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('failureExplanation.impact.affected')}</p>
                    <p className="text-lg font-black text-on-surface">~1,200/hr</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-outline-variant/10">
                <button className="w-full py-4 bg-on-surface dark:bg-on-surface-variant text-surface dark:text-on-surface rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all">
                  {t('failureExplanation.impact.generatePr')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-bold text-on-surface mb-4">{t('failureExplanation.similar.title')}</h3>
              <div className="space-y-4">
                {[
                  { id: 'RUN-832', date: '2 days ago', similarity: '94%' },
                  { id: 'RUN-798', date: '1 week ago', similarity: '88%' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-surface-container-high rounded-2xl cursor-pointer hover:bg-surface-container-high transition-colors">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{item.id}</p>
                      <p className="text-[10px] text-on-surface-variant">{item.date}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{item.similarity} {t('failureExplanation.similar.match')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{t('failureExplanation.selfHealing.title')}</span>
              </div>
              <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                <Trans i18nKey="failureExplanation.selfHealing.tip">
                  Enable <span className="font-bold">Auto-Fix</span> for this suite to allow the LLM to automatically update test cases when API schemas change.
                </Trans>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

