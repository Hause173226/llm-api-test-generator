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
    <div className="min-h-screen bg-surface dark:bg-surface-container-lowest selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-on-surface">
              TestFlow Intelligence
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.nav.product")}
            </a>
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.nav.intelligence")}
            </a>
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.nav.enterprise")}
            </a>
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.nav.pricing")}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 hover:bg-surface-container-high dark:hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
              title={
                isDark
                  ? t("common.switchToLightMode")
                  : t("common.switchToDarkMode")
              }
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-high dark:hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary font-bold text-xs"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">
                {i18n.language === "en" ? "EN" : "VI"}
              </span>
            </button>
            <Link
              to="/login"
              className="text-sm font-bold text-on-surface hover:text-primary transition-colors"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 bg-on-surface dark:bg-on-surface-variant text-surface dark:text-on-surface rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-on-surface/10"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-7xl mx-auto px-6 text-center space-y-10">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-on-surface leading-[0.9] max-w-5xl mx-auto">
            <Trans i18nKey="landing.hero.title">
              Autonomous API Testing{" "}
              <span className="text-primary">Powered by Intelligence.</span>
            </Trans>
          </h1>

          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto font-medium leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Link
              to="/register"
              className="w-full sm:w-auto px-10 py-5 bg-primary text-on-primary rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              {t("landing.hero.cta")}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-10 py-5 bg-surface-container-highest dark:bg-surface-container-high text-on-secondary-container rounded-2xl font-bold text-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-3">
              <PlayCircle className="w-6 h-6" />
              {t("landing.hero.watchDemo")}
            </button>
          </div>

          {/* Hero Visual: Abstract Gradient & Blurred Dashboard Preview */}
          <div className="mt-24 relative max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-surface dark:from-surface-container-lowest via-transparent to-transparent z-20"></div>
            <div className="relative group">
              {/* Abstract Glows */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
              <div
                className="absolute -bottom-20 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>

              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[40px] p-8 shadow-[0_50px_100px_rgba(53,37,205,0.15)] border border-outline-variant/10 overflow-hidden relative z-10 backdrop-blur-sm bg-white/40 dark:bg-surface-container-low/40">
                <div className="aspect-video w-full rounded-[24px] bg-slate-100/50 dark:bg-slate-900/50 overflow-hidden relative">
                  {/* Mock Dashboard UI Elements */}
                  <div className="absolute top-0 left-0 w-full h-12 bg-white/80 dark:bg-surface-container-high/80 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="absolute top-12 left-0 w-64 h-full bg-white/40 dark:bg-surface-container-low/40 border-r border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-4 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg w-full"
                      ></div>
                    ))}
                  </div>
                  <div className="ml-64 mt-12 p-10 space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-32 bg-white/60 dark:bg-surface-container-high/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                        ></div>
                      ))}
                    </div>
                    <div className="h-64 bg-white/60 dark:bg-surface-container-high/60 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"></div>
                  </div>

                  {/* Blur Overlay for "Modern/Abstract" feel */}
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-primary/5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-surface-container-low/30 dark:bg-surface-container-low/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-on-surface">
              {t("landing.features.title")}
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-medium">
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
                className="bg-surface-container-lowest dark:bg-surface-container-low p-10 rounded-[32px] border border-outline-variant/10 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-on-surface dark:bg-surface-container-high rounded-[48px] p-16 md:p-24 text-surface dark:text-on-surface relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.95]">
                  {t("landing.social.title")}
                </h2>
                <p className="text-xl text-surface/70 dark:text-on-surface/70 font-medium leading-relaxed">
                  {t("landing.social.subtitle")}
                </p>
                <div className="flex flex-wrap gap-8 pt-4">
                  <div>
                    <p className="text-4xl font-black">12M+</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-surface/50 dark:text-on-surface/50">
                      {t("landing.social.stats.executed")}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-surface/10 dark:bg-on-surface/10 hidden sm:block"></div>
                  <div>
                    <p className="text-4xl font-black">99.9%</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-surface/50 dark:text-on-surface/50">
                      {t("landing.social.stats.uptime")}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-surface/10 dark:bg-on-surface/10 hidden sm:block"></div>
                  <div>
                    <p className="text-4xl font-black">4.8/5</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-surface/50 dark:text-on-surface/50">
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
                    className="flex items-center gap-4 bg-surface/5 dark:bg-on-surface/5 p-6 rounded-2xl border border-surface/10 dark:border-on-surface/10"
                  >
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <span className="text-lg font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 text-center space-y-12">
        <h2 className="text-5xl md:text-7xl font-black tracking-tight text-on-surface max-w-4xl mx-auto leading-[0.9]">
          {t("landing.cta.title")}
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/register"
            className="w-full sm:w-auto px-12 py-6 bg-primary text-on-primary rounded-2xl font-bold text-xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            {t("landing.cta.button")}
          </Link>
          <button className="w-full sm:w-auto px-12 py-6 bg-surface-container-highest dark:bg-surface-container-high text-on-secondary-container rounded-2xl font-bold text-xl hover:bg-surface-container-high transition-all">
            {t("landing.cta.contact")}
          </button>
        </div>
        <p className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
          {t("landing.cta.trial")}
        </p>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-on-surface">
              TestFlow Intelligence
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">
            {t("landing.footer.rights")}
          </p>
          <div className="flex items-center gap-8">
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.footer.privacy")}
            </a>
            <a
              href="#"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("landing.footer.terms")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
