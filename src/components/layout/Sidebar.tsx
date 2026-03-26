import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Network, 
  Layers, 
  DoorOpen, 
  Edit3, 
  Sparkles, 
  Settings2, 
  PlayCircle, 
  AlertCircle, 
  BarChart3, 
  CreditCard,
  HelpCircle,
  Settings,
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t('common.dashboard'), path: '/dashboard' },
    { icon: FolderKanban, label: t('common.projectManagement'), path: '/projects' },
    { icon: FileText, label: t('common.apiSpecifications'), path: '/specifications' },
    { icon: Network, label: t('common.endpointsManagement'), path: '/endpoints' },
    { icon: Layers, label: t('common.testSuites'), path: '/test-suites' },
    { icon: DoorOpen, label: t('common.testExecutionOrderGate'), path: '/order-gate' },
    { icon: Edit3, label: t('common.testCaseStudio'), path: '/studio' },
    { icon: Sparkles, label: t('common.llmSuggestions'), path: '/suggestions' },
    { icon: Settings2, label: t('common.environments'), path: '/environments' },
    { icon: PlayCircle, label: t('common.testExecutionRuns'), path: '/runs' },
    { icon: AlertCircle, label: t('common.failureExplanation'), path: '/failure-explanation' },
    { icon: BarChart3, label: t('common.reports'), path: '/reports' },
    { icon: CreditCard, label: t('common.subscriptionBilling'), path: '/billing' },
  ];

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col p-4 z-40 bg-slate-50 dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className={cn("mb-10 px-4 py-4 flex items-center", isCollapsed ? "justify-center" : "justify-start")}>
        <div className="w-10 h-10 bg-indigo-700 dark:bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-xl font-bold tracking-tighter text-indigo-700 dark:text-indigo-400 whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
            TestFlow Intelligence
          </span>
        )}
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar font-sans text-sm font-medium tracking-tight">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
                isCollapsed ? "justify-center" : "justify-start gap-3",
                isActive 
                  ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
              title={isCollapsed ? item.label : ""}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">{item.label}</span>
              )}
            </Link>
          );
        })}
        
        <div className="mt-auto pt-8 flex flex-col gap-1">
          <Link 
            to="/settings" 
            className={cn(
              "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start gap-3",
              location.pathname === '/settings' 
                ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            )}
            title={isCollapsed ? t('common.accountSettings') : ""}
          >
            <Settings className={cn("w-5 h-5 shrink-0", location.pathname === '/settings' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">{t('common.accountSettings')}</span>
            )}
          </Link>
          <Link 
            to="/help" 
            className={cn(
              "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start gap-3",
              location.pathname === '/help' 
                ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            )}
            title={isCollapsed ? t('common.help') : ""}
          >
            <HelpCircle className={cn("w-5 h-5 shrink-0", location.pathname === '/help' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">{t('common.help')}</span>
            )}
          </Link>
        </div>
      </nav>
    </aside>
  );
}

