import React from 'react';
import { CreditCard, Check, Zap, Shield, ArrowRight } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function BillingPage() {
  const { t } = useTranslation();

  const plans = [
    {
      name: t('billing.plans.starter.name'),
      price: '$0',
      description: t('billing.plans.starter.desc'),
      features: t('billing.plans.starter.features', { returnObjects: true }) as string[],
      buttonText: t('billing.plans.starter.button'),
      current: true
    },
    {
      name: t('billing.plans.professional.name'),
      price: '$49',
      description: t('billing.plans.professional.desc'),
      features: t('billing.plans.professional.features', { returnObjects: true }) as string[],
      buttonText: t('billing.plans.professional.button'),
      current: false,
      popular: true
    },
    {
      name: t('billing.plans.enterprise.name'),
      price: t('billing.plans.custom'),
      description: t('billing.plans.enterprise.desc'),
      features: t('billing.plans.enterprise.features', { returnObjects: true }) as string[],
      buttonText: t('billing.plans.enterprise.button'),
      current: false
    }
  ];

  return (
    <MainLayout title={t('billing.title')}>
      <div className="space-y-10 pb-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2 dark:text-on-surface">{t('billing.title')}</h1>
          <p className="text-lg text-on-surface-variant dark:text-on-surface-variant max-w-2xl">
            {t('billing.subtitle')}
          </p>
        </header>

        {/* Usage Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest mb-1">{t('billing.usage.testRuns')}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface dark:text-on-surface">842</h3>
              <span className="text-on-surface-variant dark:text-on-surface-variant text-sm">/ 1,000</span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[84.2%]"></div>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant dark:text-on-surface-variant">{t('billing.usage.testRunsDesc', { percent: 84 })}</p>
          </div>

          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest mb-1">{t('billing.usage.projects')}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface dark:text-on-surface">3</h3>
              <span className="text-on-surface-variant dark:text-on-surface-variant text-sm">/ 3</span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-full"></div>
            </div>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">{t('billing.usage.projectsLimit')}</p>
          </div>

          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest mb-1">{t('billing.usage.aiTokens')}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface dark:text-on-surface">12.4k</h3>
              <span className="text-on-surface-variant dark:text-on-surface-variant text-sm">/ 25k</span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[50%]"></div>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant dark:text-on-surface-variant">{t('billing.usage.aiTokensReset', { days: 12 })}</p>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface dark:text-on-surface">{t('billing.plans.title')}</h2>
            <div className="flex bg-surface-container-high dark:bg-surface-container-highest p-1 rounded-xl">
              <button className="px-4 py-1.5 text-sm font-bold bg-white dark:bg-surface-container-low rounded-lg shadow-sm text-primary">{t('billing.plans.monthly')}</button>
              <button className="px-4 py-1.5 text-sm font-bold text-on-surface-variant dark:text-on-surface-variant">{t('billing.plans.yearly')}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.name} 
                className={cn(
                  "relative flex flex-col p-8 rounded-3xl border transition-all duration-300",
                  plan.popular 
                    ? "bg-white dark:bg-surface-container-low border-primary shadow-xl shadow-primary/5 scale-105 z-10" 
                    : "bg-surface-container-lowest dark:bg-surface-container-low border-outline-variant/20 hover:border-primary/30"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {t('billing.plans.mostPopular')}
                  </span>
                )}
                
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-on-surface dark:text-on-surface mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-on-surface dark:text-on-surface">{plan.price}</span>
                    {plan.price !== t('billing.plans.custom') && <span className="text-on-surface-variant dark:text-on-surface-variant font-medium">{t('billing.plans.perMonth')}</span>}
                  </div>
                  <p className="text-sm text-on-surface-variant dark:text-on-surface-variant leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-on-surface-variant dark:text-on-surface-variant">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                    plan.current 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default" 
                      : plan.popular
                        ? "bg-primary text-white hover:bg-primary-container shadow-lg shadow-primary/20 active:scale-[0.98]"
                        : "bg-surface-container-high dark:bg-surface-container-highest text-on-surface dark:text-on-surface hover:bg-surface-container-highest active:scale-[0.98]"
                  )}
                >
                  {plan.buttonText}
                  {!plan.current && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Billing History */}
        <section className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
          <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface dark:text-on-surface">{t('billing.history.title')}</h2>
            <button className="text-primary text-sm font-bold hover:underline">{t('billing.history.downloadAll')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-on-surface-variant dark:text-on-surface-variant uppercase tracking-widest bg-surface-container-low/50 dark:bg-surface-container-high/50">
                  <th className="px-8 py-4">{t('billing.history.table.invoice')}</th>
                  <th className="px-8 py-4">{t('billing.history.table.date')}</th>
                  <th className="px-8 py-4">{t('billing.history.table.amount')}</th>
                  <th className="px-8 py-4">{t('billing.history.table.status')}</th>
                  <th className="px-8 py-4 text-right">{t('billing.history.table.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {[
                  { id: 'INV-2024-003', date: 'Mar 01, 2024', amount: '$49.00', status: t('billing.history.paid') },
                  { id: 'INV-2024-002', date: 'Feb 01, 2024', amount: '$49.00', status: t('billing.history.paid') },
                  { id: 'INV-2024-001', date: 'Jan 01, 2024', amount: '$49.00', status: t('billing.history.paid') },
                ].map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-surface-container-low/30 dark:hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-on-surface dark:text-on-surface">{invoice.id}</td>
                    <td className="px-8 py-5 text-sm text-on-surface-variant dark:text-on-surface-variant">{invoice.date}</td>
                    <td className="px-8 py-5 text-sm font-medium text-on-surface dark:text-on-surface">{invoice.amount}</td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary transition-colors">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

