import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Globe,
  PlayCircle,
  Network,
  Layers,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "vi" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                TestFlow Al
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <Link
              to="/product"
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.product")}
            </Link>
            <Link
              to="/intelligence"
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.intelligence")}
            </Link>
            <Link
              to="/enterprise"
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.enterprise")}
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.pricing")}
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label={isDark ? t("common.switchToLightMode") : t("common.switchToDarkMode")}
              title={isDark ? t("common.switchToLightMode") : t("common.switchToDarkMode")}
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs cursor-pointer"
              aria-label="Toggle language"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">
                {i18n.language === "en" ? "EN" : "VI"}
              </span>
            </button>
            <Link
              to="/login"
              className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero: centered */}
      <section className="relative pt-24 pb-16 overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-indigo-500/8 dark:bg-indigo-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center text-center space-y-10">
          {/* Text */}
          <div className="space-y-6 max-w-3xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[0.9]">
              <Trans i18nKey="landing.hero.title">
                Autonomous API Testing{" "}
                <span className="text-indigo-600 dark:text-indigo-400">Powered by Intelligence.</span>
              </Trans>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
              >
                {t("landing.hero.cta")}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                type="button"
                className="w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
              >
                <PlayCircle className="w-6 h-6" />
                {t("landing.hero.watchDemo")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              {t("landing.features.title")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              {t("landing.features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Network,
                title: t("landing.features.items.discovery.title"),
                desc: t("landing.features.items.discovery.desc"),
              },
              {
                icon: Sparkles,
                title: t("landing.features.items.generation.title"),
                desc: t("landing.features.items.generation.desc"),
              },
              {
                icon: ShieldCheck,
                title: t("landing.features.items.healing.title"),
                desc: t("landing.features.items.healing.desc"),
              },
              {
                icon: Zap,
                title: t("landing.features.items.diagnostics.title"),
                desc: t("landing.features.items.diagnostics.desc"),
              },
              {
                icon: Globe,
                title: t("landing.features.items.execution.title"),
                desc: t("landing.features.items.execution.desc"),
              },
              {
                icon: Layers,
                title: t("landing.features.items.mapping.title"),
                desc: t("landing.features.items.mapping.desc"),
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 p-10 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 transition-colors">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-32 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-[48px] p-16 md:p-24 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.95] text-white">
                  {t("landing.social.title")}
                </h2>
                <p className="text-xl text-slate-400 font-medium leading-relaxed">
                  {t("landing.social.subtitle")}
                </p>
                <div className="flex flex-wrap gap-8 pt-4">
                  <div>
                    <p className="text-4xl font-black text-white">12M+</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {t("landing.social.stats.executed")}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-slate-700 hidden sm:block"></div>
                  <div>
                    <p className="text-4xl font-black text-white">99.9%</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {t("landing.social.stats.uptime")}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-slate-700 hidden sm:block"></div>
                  <div>
                    <p className="text-4xl font-black text-white">4.8/5</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {t("landing.social.stats.rating")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {(
                  t("landing.social.benefits", {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10"
                  >
                    <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0" />
                    <span className="text-lg font-bold text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 text-center space-y-12 bg-slate-50 dark:bg-slate-900">
        <h2 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[0.9]">
          {t("landing.cta.title")}
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/register"
            className="w-full sm:w-auto px-12 py-6 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            {t("landing.cta.button")}
          </Link>
          <button className="w-full sm:w-auto px-12 py-6 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer">
            {t("landing.cta.contact")}
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-500 font-bold text-sm uppercase tracking-widest">
          {t("landing.cta.trial")}
        </p>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white">
              TestFlow Al
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-500 text-sm font-medium">
            {t("landing.footer.rights")}
          </p>
          <div className="flex items-center gap-8">
            <a
              href="#"
              className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.footer.privacy")}
            </a>
            <a
              href="#"
              className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.footer.terms")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
