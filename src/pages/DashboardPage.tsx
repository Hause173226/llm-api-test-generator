import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  TrendingUp, 
  Plus, 
  FolderOpen, 
  PlayCircle, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  Clock,
  Search,
  Filter,
  ChevronDown,
  Network
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <MainLayout title={t('dashboard.title')}>
      <div className="space-y-8">
        {/* Hero Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('dashboard.welcome')}</h1>
            <p className="text-on-surface-variant max-w-lg">
              Autonomous testing is currently monitoring <span className="text-primary font-semibold">12 active suites</span> with an overall pass rate of <span className="text-emerald-600 font-semibold">98.4%</span>.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all">
              <TrendingUp className="w-5 h-5" />
              Export Stats
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </section>

        {/* Metric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="col-span-1 bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <FolderOpen className="w-5 h-5 text-primary dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full uppercase tracking-wider">+4 New</span>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">{t('dashboard.activeProjects')}</p>
            <h3 className="text-3xl font-bold text-on-surface">24</h3>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-3/4"></div>
            </div>
          </div>

          <div className="col-span-1 bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full uppercase tracking-wider">Syncing</span>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">{t('dashboard.totalEndpoints')}</p>
            <h3 className="text-3xl font-bold text-on-surface">1,402</h3>
            <div className="mt-4 flex items-center gap-1">
              <span className="text-xs text-on-surface-variant"><span className="text-indigo-600 dark:text-indigo-400 font-bold">120</span> Added this week</span>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Monthly Test Runs</p>
                <h3 className="text-3xl font-bold text-on-surface">12.5k</h3>
              </div>
              <div className="text-right">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1 justify-end">
                  <TrendingUp className="w-4 h-4" /> 14%
                </span>
                <p className="text-[10px] text-on-surface-variant">vs last month</p>
              </div>
            </div>
            <div className="mt-6 flex items-end gap-1 h-12">
              {[0.5, 0.7, 0.3, 0.8, 0.5, 1, 0.9, 0.4, 0.7, 1].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-t-sm" style={{ height: `${h * 100}%`, opacity: 0.2 + h * 0.8 }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Health Chart Placeholder */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-container-low dark:bg-slate-900 p-8 rounded-xl relative overflow-hidden group border border-outline-variant/10 dark:border-slate-800">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-on-surface tracking-tight">{t('dashboard.systemHealth')}</h3>
                  <p className="text-sm text-on-surface-variant">Real-time performance metrics across all production clusters</p>
                </div>
                <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur px-1 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <button className="px-3 py-1 text-xs font-semibold bg-white dark:bg-slate-700 shadow-sm rounded-md text-primary dark:text-indigo-400">Live</button>
                  <button className="px-3 py-1 text-xs font-semibold text-on-surface-variant">24h</button>
                  <button className="px-3 py-1 text-xs font-semibold text-on-surface-variant">7d</button>
                </div>
              </div>
              <div className="h-64 flex items-end justify-between gap-2 relative z-10">
                {/* SVG Chart Placeholder */}
                <svg className="absolute bottom-0 w-full h-full stroke-primary fill-none opacity-20" preserveAspectRatio="none" viewBox="0 0 800 200">
                  <path d="M0,150 C100,140 150,50 200,80 S300,180 400,140 S500,40 600,60 S700,120 800,100" strokeLinecap="round" strokeWidth="4"></path>
                </svg>
                <svg className="absolute bottom-0 w-full h-full stroke-primary" preserveAspectRatio="none" viewBox="0 0 800 200">
                  <path d="M0,150 C100,140 150,50 200,80 S300,180 400,140 S500,40 600,60 S700,120 800,100" fill="url(#gradient-chart)" strokeLinecap="round" strokeWidth="2"></path>
                  <defs>
                    <linearGradient id="gradient-chart" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'rgba(53,37,205,0.1)', stopOpacity: 1 }}></stop>
                      <stop offset="100%" style={{ stopColor: 'rgba(53,37,205,0)', stopOpacity: 0 }}></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl border border-primary/10 dark:border-indigo-900/30 flex items-start gap-4 shadow-sm">
              <div className="mt-1 flex-shrink-0 w-10 h-10 bg-primary-fixed dark:bg-indigo-900/50 flex items-center justify-center rounded-lg text-on-primary-fixed-variant dark:text-indigo-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-on-surface">LLM Suggestion</h4>
                  <span className="bg-primary/10 dark:bg-indigo-900/30 text-primary dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Optimization</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Latency spike detected in <span className="text-primary dark:text-indigo-400 font-medium">Payment Gateway V2</span>. Automated load tests suggest scaling worker nodes in 'us-east-1' by <span className="text-on-surface font-semibold">20%</span> to maintain 99.9% uptime.
                </p>
              </div>
              <button className="ml-auto text-primary dark:text-indigo-400 text-sm font-semibold hover:underline">Apply Fix</button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-on-surface tracking-tight">{t('dashboard.recentActivity')}</h3>
              <button className="text-primary dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">View All</button>
            </div>
            <div className="space-y-6">
              {[
                { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500', text: 'Test Run #842 passed successfully.', time: '12 mins ago' },
                { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500', text: "New Vulnerability detected in 'User-Auth' service.", time: '1 hour ago' },
                { icon: Sparkles, color: 'text-primary', bg: 'bg-primary', text: 'AI Assistant generated 42 new edge-case tests.', time: '4 hours ago' },
                { icon: UserPlus, color: 'text-slate-500', bg: 'bg-slate-200', text: "Maya Chen joined the 'DevOps' team.", time: '6 hours ago' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i < 3 && <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-slate-100 dark:bg-slate-800"></div>}
                  <div className={cn("z-10 w-5 h-5 rounded-full ring-4 ring-white dark:ring-slate-900 flex items-center justify-center", item.bg)}>
                    <item.icon className="w-3 h-3 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-on-surface leading-snug">{item.text}</p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Data Table Section */}
        <section className="bg-surface-container-low/40 dark:bg-slate-900/40 rounded-2xl p-1 overflow-hidden">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-sm">
            <div className="px-8 py-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-on-surface">Top API Collections</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Search className="w-4 h-4 text-on-surface-variant mr-2" />
                  <input className="bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-on-surface-variant/60 w-48" placeholder="Search endpoints..." type="text"/>
                </div>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-on-surface-variant border-b border-slate-50 dark:border-slate-800">
                    <th className="px-8 py-4 font-bold">Endpoint</th>
                    <th className="px-8 py-4 font-bold">Method</th>
                    <th className="px-8 py-4 font-bold">Status</th>
                    <th className="px-8 py-4 font-bold">Latency</th>
                    <th className="px-8 py-4 font-bold text-right">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50 dark:divide-slate-800/50">
                  {[
                    { path: '/v2/auth/login', service: 'Auth-Service-Production', method: 'POST', status: 'Active', latency: '42ms', coverage: 100, color: 'bg-emerald-500' },
                    { path: '/api/payments/verify', service: 'Payment-Gateway', method: 'POST', status: 'Active', latency: '156ms', coverage: 88, color: 'bg-primary' },
                    { path: '/user/profile/:id', service: 'Core API', method: 'GET', status: 'Error Detected', latency: '--', coverage: 45, color: 'bg-error', pulse: true },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-5">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{row.path}</p>
                          <p className="text-[11px] text-on-surface-variant">{row.service}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">{row.method}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", row.color, row.pulse && "animate-pulse")}></span>
                          <span className="text-sm text-on-surface font-medium">{row.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-mono text-xs text-on-surface-variant">{row.latency}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-sm font-bold text-on-surface">{row.coverage}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={cn("h-full", row.color)} style={{ width: `${row.coverage}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-center">
              <button className="text-sm font-semibold text-on-surface-variant hover:text-primary dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                Load 50 more endpoints <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

