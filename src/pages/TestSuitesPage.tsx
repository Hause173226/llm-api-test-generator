import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Layers, 
  Play, 
  Settings, 
  Copy, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

export default function TestSuitesPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const suites = [
    { id: 'TS-001', name: 'Critical Path Regression', spec: 'Core API v1.4', type: 'automated', endpoints: 42, status: 'Stable', lastRun: '1 hour ago' },
    { id: 'TS-002', name: 'Payment Flow Validation', spec: 'Payment Gateway', type: 'llm-assisted', endpoints: 12, status: 'Degraded', lastRun: '3 hours ago' },
    { id: 'TS-003', name: 'User Onboarding Edge Cases', spec: 'Auth Service', type: 'manual', endpoints: 28, status: 'Stable', lastRun: 'Yesterday' },
    { id: 'TS-004', name: 'High-Load Stress Suite', spec: 'Infrastructure', type: 'automated', endpoints: 5, status: 'Stable', lastRun: '2 days ago' },
  ];

  return (
    <MainLayout title={t('testSuites.title')}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('testSuites.title')}</h1>
            <p className="text-on-surface-variant">{t('testSuites.subtitle')}</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800 text-on-primary font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('testSuites.createButton')}
          </button>
        </header>

        {/* Suite Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {suites.map((suite) => (
            <div key={suite.id} className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all">
              <div className="p-6 space-y-4 flex-1">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary-fixed/30 dark:bg-indigo-900/30 rounded-lg">
                    <Layers className="w-6 h-6 text-primary dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {suite.status === 'Stable' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      suite.status === 'Stable' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )}>{suite.status}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface tracking-tight group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">{suite.name}</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">{t('testSuites.suiteId')} {suite.id} • {suite.spec}</p>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('testSuites.endpoints')}</p>
                    <p className="text-lg font-black text-on-surface">{suite.endpoints}</p>
                  </div>
                  <div className="flex-1 bg-surface-container-low dark:bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('testSuites.generation')}</p>
                    <div className="flex items-center justify-center gap-1">
                      {suite.type === 'llm-assisted' && <Sparkles className="w-3 h-3 text-primary dark:text-indigo-400" />}
                      <p className="text-xs font-bold text-on-surface capitalize">{suite.type.replace('-', ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-surface-container-low/50 dark:bg-slate-800/50 border-t border-outline-variant/10 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-on-surface-variant hover:text-primary dark:hover:text-indigo-400">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-on-surface-variant hover:text-primary dark:hover:text-indigo-400">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-on-surface-variant hover:text-error dark:hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-4 py-2 bg-white dark:bg-slate-700 text-primary dark:text-indigo-400 font-bold text-xs rounded-lg shadow-sm border border-primary/10 dark:border-indigo-900/30 flex items-center gap-2 hover:bg-primary dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all">
                  <Play className="w-3 h-3 fill-current" />
                  {t('testSuites.runButton')}
                </button>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          <div 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-surface-container-low/30 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-outline-variant/20 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-on-surface-variant" />
            </div>
            <h4 className="font-bold text-on-surface">{t('testSuites.addNew.title')}</h4>
            <p className="text-xs text-on-surface-variant mt-1">{t('testSuites.addNew.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Create Suite Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('testSuites.modal.title')}
        footer={
          <>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t('testSuites.modal.cancel')}
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {t('testSuites.modal.confirm')}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('testSuites.modal.nameLabel')}</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t('testSuites.modal.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('testSuites.modal.envLabel')}</label>
            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface">
              <option value="">{t('testSuites.modal.envPlaceholder')}</option>
              <option value="development">{t('testSuites.modal.envDev')}</option>
              <option value="staging">{t('testSuites.modal.envStaging')}</option>
              <option value="production">{t('testSuites.modal.envProd')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('testSuites.modal.endpointsLabel')}</label>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-h-40 overflow-y-auto space-y-2">
              {['GET /api/v1/users', 'POST /api/v1/auth/login', 'GET /api/v1/products', 'PUT /api/v1/orders'].map((endpoint, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary dark:text-indigo-600 focus:ring-primary/20" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">{endpoint}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

