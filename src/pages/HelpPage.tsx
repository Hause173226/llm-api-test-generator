import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  BookOpen, 
  FileText, 
  Terminal, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Mail,
  MessageCircle,
  ExternalLink,
  Sparkles,
  CreditCard
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function HelpPage() {
  const { t } = useTranslation();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const categories = [
    { 
      title: t('help.categories.gettingStarted.title'), 
      icon: BookOpen, 
      description: t('help.categories.gettingStarted.description'),
      color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    },
    { 
      title: t('help.categories.apiTesting.title'), 
      icon: Terminal, 
      description: t('help.categories.apiTesting.description'),
      color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
    },
    { 
      title: t('help.categories.llmIntegration.title'), 
      icon: Sparkles, 
      description: t('help.categories.llmIntegration.description'),
      color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    },
    { 
      title: t('help.categories.billing.title'), 
      icon: CreditCard, 
      description: t('help.categories.billing.description'),
      color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
    }
  ];

  const faqs = [
    {
      question: t('help.faqs.q1.question'),
      answer: t('help.faqs.q1.answer')
    },
    {
      question: t('help.faqs.q2.question'),
      answer: t('help.faqs.q2.answer')
    },
    {
      question: t('help.faqs.q3.question'),
      answer: t('help.faqs.q3.answer')
    },
    {
      question: t('help.faqs.q4.question'),
      answer: t('help.faqs.q4.answer')
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <MainLayout title={t('help.title')}>
      <div className="space-y-12 pb-20">
        {/* Hero Section with Search */}
        <header className="flex flex-col items-center text-center gap-8 mt-10">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">{t('help.title')}</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl">{t('help.subtitle')}</p>
          </div>
          
          <div className="relative w-full max-w-2xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant w-6 h-6 group-focus-within:text-primary transition-colors" />
            <input 
              className="w-full pl-16 pr-6 py-5 bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border-none outline outline-2 outline-outline-variant/20 dark:outline-slate-800 focus:outline-primary focus:ring-8 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-lg shadow-xl shadow-slate-200/50 dark:shadow-none" 
              placeholder={t('help.searchPlaceholder')} 
              type="text"
            />
          </div>
        </header>

        {/* Categories Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, i) => (
            <div 
              key={i} 
              className="bg-surface-container-low dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/10 dark:border-slate-800 hover:border-primary/30 dark:hover:border-indigo-500/30 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", category.color)}>
                <category.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-3">{category.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{category.description}</p>
            </div>
          ))}
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-on-surface">{t('help.faqTitle')}</h2>
            <p className="text-on-surface-variant">{t('help.faqSubtitle')}</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden"
              >
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-bold text-on-surface">{faq.question}</span>
                  {openFaqIndex === i ? (
                    <ChevronUp className="w-5 h-5 text-primary dark:text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                  )}
                </button>
                {openFaqIndex === i && (
                  <div className="px-8 pb-6 text-on-surface-variant leading-relaxed animate-in slide-in-from-top-2 duration-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section className="bg-primary-container/30 dark:bg-indigo-900/20 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 border border-primary/10 dark:border-indigo-500/20">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-bold text-on-primary-container dark:text-indigo-100">{t('help.contactTitle')}</h2>
            <p className="text-on-primary-container/80 dark:text-indigo-200/70 max-w-md">{t('help.contactSubtitle')}</p>
            <div className="space-y-1 text-sm font-bold text-on-primary-container/70 dark:text-indigo-200/50">
              <p>Email: support@testflow.ai</p>
              <p>Hotline: +1 (800) TEST-FLOW</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Mail className="w-5 h-5" />
              {t('help.contactButton')}
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-white dark:bg-slate-800 text-primary dark:text-indigo-400 font-bold rounded-2xl border border-primary/20 dark:border-indigo-500/30 hover:bg-primary-fixed dark:hover:bg-slate-700 transition-all">
              <MessageCircle className="w-5 h-5" />
              {t('help.liveChatButton')}
            </button>
          </div>
        </section>

        {/* Footer Links */}
        <footer className="flex flex-wrap justify-center gap-x-12 gap-y-4 pt-8 border-t border-outline-variant/10 dark:border-slate-800">
          <a href="#" className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 transition-colors">
            {t('help.footer.community')} <ExternalLink className="w-3 h-3" />
          </a>
          <a href="#" className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 transition-colors">
            {t('help.footer.status')} <ExternalLink className="w-3 h-3" />
          </a>
          <a href="#" className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 transition-colors">
            {t('help.footer.notes')} <ExternalLink className="w-3 h-3" />
          </a>
        </footer>
      </div>
    </MainLayout>
  );
}

