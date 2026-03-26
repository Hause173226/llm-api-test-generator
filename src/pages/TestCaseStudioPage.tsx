import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Code2, 
  Play, 
  Save, 
  Sparkles, 
  ChevronRight, 
  Terminal, 
  Database, 
  ShieldCheck,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { cn } from '../lib/utils';

export default function TestCaseStudioPage() {
  const { t } = useTranslation();

  return (
    <MainLayout title={t('testCaseStudio.title')}>
      <div className="flex flex-col gap-6 pb-12">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">{t('testCaseStudio.title')}</h1>
            <p className="text-sm text-on-surface-variant">{t('testCaseStudio.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all">
              <Save className="w-4 h-4" />
              {t('testCaseStudio.saveButton')}
            </button>
            <button className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-4 h-4" />
              {t('testCaseStudio.runButton')}
            </button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Panel: Test Structure */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testCaseStudio.caseNameLabel')}</label>
                <input 
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 font-semibold text-on-surface" 
                  defaultValue="Verify User Authentication Flow"
                  type="text"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testCaseStudio.endpointTargetLabel')}</label>
                <div className="flex items-center gap-2 p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black rounded">POST</span>
                  <span className="text-sm font-mono text-on-surface truncate">/v1/auth/login</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('testCaseStudio.assertionsLabel')}</label>
                  <button className="text-primary dark:text-indigo-400 hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {t('testCaseStudio.addNewAssertion')}
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { type: 'Status Code', value: '200 OK', icon: ShieldCheck },
                    { type: 'Response Body', value: 'token exists', icon: Database },
                    { type: 'Response Time', value: '< 500ms', icon: Terminal },
                  ].map((assertion, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <assertion.icon className="w-4 h-4 text-primary dark:text-indigo-400" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{assertion.type}</p>
                          <p className="text-xs font-bold text-on-surface">{assertion.value}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-on-surface-variant"><Copy className="w-3 h-3" /></button>
                        <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-error dark:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Assistant Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
              <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  <h3 className="font-bold tracking-tight">{t('testCaseStudio.aiAssistant.title')}</h3>
                </div>
                <p className="text-sm text-indigo-100 leading-relaxed mb-6 break-words">
                  {t('testCaseStudio.aiAssistant.description')}
                </p>
                <button className="w-full py-3 bg-white text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                  {t('testCaseStudio.aiAssistant.button')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Editor & Console */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* Code Editor Placeholder */}
            <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="bg-slate-800 px-6 py-3 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">test_auth_flow.js</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest">{t('testCaseStudio.editor.format')}</button>
                  <Code2 className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="flex-1 p-6 font-mono text-sm text-slate-300 overflow-y-auto no-scrollbar">
                <div className="flex gap-4">
                  <div className="text-slate-600 text-right select-none">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-purple-400">import</span> &#123; test, expect &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">'@testflow/core'</span>;</p>
                    <p>&nbsp;</p>
                    <p><span className="text-blue-400">test</span>(<span className="text-emerald-400">'User Authentication Flow'</span>, <span className="text-purple-400">async</span> () =&gt; &#123;</p>
                    <p>&nbsp;&nbsp;<span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> <span className="text-blue-400">request</span>.<span className="text-blue-400">post</span>(<span className="text-emerald-400">'/v1/auth/login'</span>, &#123;</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;body: &#123;</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;username: <span className="text-emerald-400">'admin_test'</span>,</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;password: <span className="text-emerald-400">'secure_pass_123'</span></p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&#125;</p>
                    <p>&nbsp;&nbsp;&#125;);</p>
                    <p>&nbsp;</p>
                    <p>&nbsp;&nbsp;<span className="text-blue-400">expect</span>(response.status).<span className="text-blue-400">toBe</span>(<span className="text-amber-400">200</span>);</p>
                    <p>&nbsp;&nbsp;<span className="text-blue-400">expect</span>(response.body.token).<span className="text-blue-400">toBeDefined</span>();</p>
                    <p>&#125;);</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Console Output */}
            <div className="h-48 bg-slate-950 rounded-2xl p-6 font-mono text-xs overflow-y-auto no-scrollbar border border-slate-800">
              <div className="flex items-center gap-2 mb-4 text-slate-500 uppercase tracking-widest font-bold">
                <Terminal className="w-3 h-3" />
                <span>{t('testCaseStudio.editor.consoleTitle')}</span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">[18:54:12] {t('testCaseStudio.editor.initRunner')}</p>
                <p className="text-slate-400">[18:54:13] {t('testCaseStudio.editor.connecting')}</p>
                <p className="text-emerald-400">[18:54:14] POST /v1/auth/login - 200 OK (142ms)</p>
                <p className="text-emerald-400">[18:54:14] Assertion Passed: Status Code is 200</p>
                <p className="text-emerald-400">[18:54:14] Assertion Passed: Token is defined</p>
                <p className="text-indigo-400 font-bold mt-2">{t('testCaseStudio.editor.complete')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

