import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UploadCloud, 
  Plus, 
  Edit3, 
  Keyboard, 
  FileText, 
  FileCode, 
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function SpecificationPage() {
  const { t } = useTranslation();

  const specs = [
    { 
      name: 'Cloud Infrastructure Services', 
      modified: '2 hours ago', 
      type: 'OpenAPI 3.1', 
      version: 'v1.4.2', 
      status: 'Success', 
      icon: FileText 
    },
    { 
      name: 'Payment Gateway Connector', 
      modified: '5 hours ago', 
      type: 'Swagger 2.0', 
      version: 'v2.0.0', 
      status: 'Parsing', 
      icon: FileCode 
    },
    { 
      name: 'Legacy Auth Prototype', 
      modified: 'Yesterday', 
      type: 'Postman v2.1', 
      version: 'v0.9-alpha', 
      status: 'Failed', 
      icon: FlaskConical 
    }
  ];

  return (
    <MainLayout title={t('specifications.title')}>
      <div className="space-y-12">
        <header className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
            {t('specifications.title')}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
            {t('specifications.subtitle')}
          </p>
        </header>

        {/* Asymmetric Grid for Upload and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          {/* Upload Zone */}
          <div className="lg:col-span-8 group">
            <div className="relative overflow-hidden bg-surface-container-low dark:bg-slate-900 rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-surface-container-high dark:hover:bg-slate-800 min-h-[400px] border-2 border-dashed border-outline-variant/20 dark:border-slate-800">
              <div className="relative z-10">
                <div className="mb-8 p-6 bg-surface-container-lowest dark:bg-slate-800 rounded-full shadow-sm inline-block">
                  <UploadCloud className="w-12 h-12 text-primary dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-semibold text-on-surface mb-4">
                  {t('specifications.upload.title')}
                </h2>
                <p className="text-on-surface-variant font-medium mb-8">
                  {t('specifications.upload.formats')} <span className="text-primary dark:text-indigo-400">OpenAPI</span>, <span className="text-primary dark:text-indigo-400">Swagger</span>, <span className="text-primary dark:text-indigo-400">Postman</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {t('specifications.upload.button')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Action / Manual Entry */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col h-full justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Edit3 className="w-5 h-5 text-secondary dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('specifications.manual.label')}</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 leading-snug text-on-surface">
                  {t('specifications.manual.title')}
                </h3>
                <p className="text-on-surface-variant text-sm mb-8">
                  {t('specifications.manual.description')}
                </p>
              </div>
              <button className="w-full py-4 px-6 bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-bold rounded-xl hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors text-center flex items-center justify-center gap-2">
                <Keyboard className="w-5 h-5" />
                {t('specifications.manual.button')}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Specifications Table */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-on-surface">{t('specifications.recent.title')}</h2>
              <p className="text-on-surface-variant text-sm">{t('specifications.recent.subtitle')}</p>
            </div>
            <div className="hidden md:block">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
                {t('specifications.recent.activeCount', { count: 6 })}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <table className="min-w-full text-left">
              <thead className="bg-surface-container-low/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('specifications.recent.table.name')}</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('specifications.recent.table.type')}</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">{t('specifications.recent.table.version')}</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('specifications.recent.table.parseStatus')}</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">{t('specifications.recent.table.status')}</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">{t('specifications.recent.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low dark:divide-slate-800">
                {specs.map((spec, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          i === 0 ? "bg-primary-fixed dark:bg-indigo-900/50 text-on-primary-fixed-variant dark:text-indigo-300" : "bg-surface-container dark:bg-slate-800 text-on-surface-variant"
                        )}>
                          <spec.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-on-surface text-sm">{spec.name}</div>
                          <div className="text-[10px] text-on-surface-variant">Modified {spec.modified}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="px-3 py-1 bg-surface-container dark:bg-slate-800 text-on-secondary-container dark:text-slate-300 text-[10px] font-bold rounded-full">{spec.type}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-xs font-medium text-on-surface-variant">{spec.version}</span>
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full",
                        spec.status === 'Success' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
                        spec.status === 'Parsing' && "bg-tertiary-fixed dark:bg-amber-900/30 text-on-tertiary-fixed-variant dark:text-amber-400",
                        spec.status === 'Failed' && "bg-error-container dark:bg-rose-900/30 text-on-error-container dark:text-rose-400"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          spec.status === 'Success' && "bg-emerald-500",
                          spec.status === 'Parsing' && "bg-tertiary animate-pulse",
                          spec.status === 'Failed' && "bg-error"
                        )}></span>
                        {spec.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex justify-center">
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={i === 0} />
                          <div className="w-11 h-6 bg-surface-container-highest dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-indigo-600"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right space-x-3">
                      <button className="text-primary dark:text-indigo-400 hover:text-on-primary-fixed-variant dark:hover:text-indigo-300 font-bold text-[10px] uppercase tracking-widest">{t('specifications.recent.actions.view')}</button>
                      <button className="text-error dark:text-rose-400 hover:opacity-80 font-bold text-[10px] uppercase tracking-widest">{t('specifications.recent.actions.delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-surface-container-low dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {t('specifications.recent.pagination', { current: 3, total: 12 })}
            </p>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-on-surface" />
              </button>
              <button className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-on-surface" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

