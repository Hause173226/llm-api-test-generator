import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Layers, 
  Activity, 
  Database, 
  FileText, 
  Network, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

const projects = [
  { 
    id: '1',
    name: 'Cloud Genesis Infrastructure', 
    description: 'Infrastructure as Code Layer', 
    spec: 'OpenAPI Specification v3.1.0', 
    icon: FileText,
    lastRun: '24 Minutes Ago',
    status: 'Active',
    metrics: {
      totalSuites: 12,
      successRate: '98.5%',
      endpoints: 142
    },
    dataSource: {
      type: 'OpenAPI Specification',
      fileName: 'genesis-v3.1.0.json',
      uploadedAt: 'March 15, 2026'
    },
    timeline: [
      { action: 'Test Suite Execution Completed', time: '24 Minutes Ago', status: 'success' },
      { action: 'New Test Suite "Security Audit" Created', time: '2 Hours Ago', status: 'info' },
      { action: 'Data Source Updated to v3.1.0', time: 'Yesterday', status: 'info' },
      { action: 'Critical Failure in "Auth Flow" Suite', time: '2 Days Ago', status: 'error' }
    ]
  },
  { 
    id: '2',
    name: 'Global Checkout Engine', 
    description: 'Payment Processing Core', 
    spec: 'GraphQL Schema Definition', 
    icon: Network,
    lastRun: '2 Hours Ago',
    status: 'Active',
    metrics: {
      totalSuites: 8,
      successRate: '94.2%',
      endpoints: 64
    },
    dataSource: {
      type: 'Postman Collection',
      fileName: 'checkout-v2.postman_collection',
      uploadedAt: 'March 10, 2026'
    },
    timeline: [
      { action: 'Test Suite Execution Completed', time: '2 Hours Ago', status: 'success' },
      { action: 'New Test Suite "Payment Gateway" Created', time: '5 Hours Ago', status: 'info' }
    ]
  }
];

export default function ProjectDetailedViewPage() {
  const { id } = useParams<{ id: string }>();
  const project = projects.find(p => p.id === id) || projects[0];
  const { t } = useTranslation();

  return (
    <MainLayout title={t('projectDetail.title')}>
      <div className="space-y-8">
        <header className="flex flex-col gap-6">
          <Link 
            to="/projects" 
            className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all group w-fit"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('projectDetail.back')}
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{project.name}</h1>
            <p className="text-lg text-on-surface-variant font-medium">{project.description}</p>
          </div>
        </header>

        {/* Project Overview Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-primary-fixed/30 rounded-2xl w-fit">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('projectDetail.metrics.totalSuites')}</p>
              <p className="text-4xl font-black text-on-surface">{project.metrics.totalSuites}</p>
            </div>
          </div>
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl w-fit">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('projectDetail.metrics.successRate')}</p>
              <p className="text-4xl font-black text-on-surface">{project.metrics.successRate}</p>
            </div>
          </div>
          <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl w-fit">
              <Network className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('projectDetail.metrics.endpoints')}</p>
              <p className="text-4xl font-black text-on-surface">{project.metrics.endpoints}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Source Configuration */}
          <section className="bg-surface-container-low dark:bg-surface-container-high rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 dark:bg-surface-container-highest/30">
              <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                {t('projectDetail.dataSource.title')}
              </h2>
            </div>
            <div className="p-8 flex-1 space-y-6">
              <div className="flex items-start gap-4 p-6 bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <div className="p-3 bg-primary-fixed/30 rounded-xl">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">{t('projectDetail.dataSource.format')}</p>
                  <p className="text-lg font-bold text-on-surface">{project.dataSource.type}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-medium">{t('projectDetail.dataSource.fileName')}</span>
                  <span className="text-on-surface font-bold">{project.dataSource.fileName}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-medium">{t('projectDetail.dataSource.uploadedAt')}</span>
                  <span className="text-on-surface font-bold">{project.dataSource.uploadedAt}</span>
                </div>
              </div>
              <button className="w-full py-4 bg-surface-container-high dark:bg-surface-container-highest text-on-secondary-container font-bold rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                {t('projectDetail.dataSource.update')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Activity Timeline */}
          <section className="bg-surface-container-low dark:bg-surface-container-high rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 dark:bg-surface-container-highest/30">
              <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                {t('projectDetail.timeline.title')}
              </h2>
            </div>
            <div className="p-8 flex-1">
              <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/20">
                {project.timeline.map((item, i) => (
                  <div key={i} className="relative pl-10">
                    <div className={cn(
                      "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-surface-container-low dark:border-surface-container-high flex items-center justify-center",
                      item.status === 'success' ? "bg-emerald-500" : 
                      item.status === 'error' ? "bg-error" : "bg-primary"
                    )}>
                      {item.status === 'success' && <CheckCircle2 className="w-3 h-3 text-white" />}
                      {item.status === 'error' && <AlertCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-on-surface font-bold">{item.action}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

