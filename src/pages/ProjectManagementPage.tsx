import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  FileText, 
  Database, 
  Edit2, 
  Eye, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Network,
  X
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

export default function ProjectManagementPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const projects = [
    { 
      id: '1',
      name: 'Cloud Genesis Infrastructure', 
      description: 'Infrastructure as Code Layer', 
      spec: 'OpenAPI Specification v3.1.0', 
      icon: FileText,
      lastRun: '24 Minutes Ago',
      status: 'Active'
    },
    { 
      id: '2',
      name: 'Global Checkout Engine', 
      description: 'Payment Processing Core', 
      spec: 'GraphQL Schema Definition', 
      icon: Network,
      lastRun: '2 Hours Ago',
      status: 'Active'
    },
    { 
      id: '3',
      name: 'Legacy Authentication Service', 
      description: 'Internal User Management', 
      spec: 'Swagger JSON Specification v2.0', 
      icon: Database,
      lastRun: '6 Months Ago',
      status: 'Archived'
    }
  ];

  return (
    <MainLayout title={t('projects.title')}>
      <div className="space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('projects.title')}</h1>
          <p className="text-lg text-on-surface-variant font-medium">{t('projects.subtitle')}</p>
        </header>

        {/* Control Bar */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest dark:bg-slate-900 rounded-xl border-none outline outline-2 outline-outline-variant/20 dark:outline-slate-800 focus:outline-primary focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60" 
              placeholder={t('projects.searchPlaceholder')} 
              type="text"
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors active:scale-95">
              <Filter className="w-5 h-5" />
              {t('projects.filterButton')}
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              {t('projects.createButton')}
            </button>
          </div>
        </section>

        {/* Table Container */}
        <section className="flex-grow flex flex-col bg-surface-container-low dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 dark:bg-slate-800/50">
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('projects.table.name')}</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('projects.table.spec')}</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('projects.table.lastRun')}</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('projects.table.status')}</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">{t('projects.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {projects.map((project, i) => (
                  <tr key={i} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-8">
                      <Link 
                        to={`/project/${project.id}`}
                        className="text-base font-semibold text-on-surface block hover:text-primary dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        {project.name}
                      </Link>
                      <span className="text-xs text-on-surface-variant">{project.description}</span>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-2">
                        <project.icon className="w-4 h-4 text-primary dark:text-indigo-400" />
                        <span className="text-on-surface-variant font-medium text-sm">{project.spec}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <span className="text-on-surface-variant text-sm">{project.lastRun}</span>
                    </td>
                    <td className="px-8 py-8">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                        project.status === 'Active' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 hover:bg-primary-fixed/30 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Edit Project">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/project/${project.id}`)}
                          className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 hover:bg-primary-fixed/30 dark:hover:bg-indigo-900/30 rounded-lg transition-all" 
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-on-surface-variant hover:text-error dark:hover:text-rose-400 hover:bg-error-container/30 dark:hover:bg-rose-900/30 rounded-lg transition-all" title="Delete Project">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <footer className="px-8 py-6 border-t border-outline-variant/20 dark:border-slate-800 flex items-center justify-between bg-surface-container-low dark:bg-slate-900">
            <p className="text-sm font-medium text-on-surface-variant">Showing 1 to 10 of 50 projects</p>
            <div className="flex items-center gap-3">
              <button className="px-6 py-2 bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold rounded-lg hover:bg-primary-fixed dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="px-6 py-2 bg-primary dark:bg-indigo-600 text-on-primary font-semibold rounded-lg hover:bg-primary-container dark:hover:bg-indigo-500 shadow-md transition-all active:scale-95">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('projects.modal.title')}
        footer={
          <>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t('projects.modal.cancel')}
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {t('projects.modal.confirm')}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('projects.modal.nameLabel')}</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t('projects.modal.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('projects.modal.descriptionLabel')}</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface"
              placeholder={t('projects.modal.descriptionPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('projects.modal.sourceLabel')}</label>
            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface">
              <option value="">{t('projects.modal.sourcePlaceholder')}</option>
              <option value="openapi">OpenAPI Specification</option>
              <option value="postman">Postman Collection</option>
            </select>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

