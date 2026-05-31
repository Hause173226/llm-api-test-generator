import React, { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BadgeDollarSign,
  BrainCircuit,
  Building2,
  Languages,
  Layers3,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface PublicMarketingLayoutProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: "/product", labelKey: "landing.nav.product", icon: Layers3 },
  {
    path: "/intelligence",
    labelKey: "landing.nav.intelligence",
    icon: BrainCircuit,
  },
  {
    path: "/enterprise",
    labelKey: "landing.nav.enterprise",
    icon: Building2,
  },
  { path: "/pricing", labelKey: "landing.nav.pricing", icon: BadgeDollarSign },
];

export default function PublicMarketingLayout({
  title,
  subtitle,
  children,
}: PublicMarketingLayoutProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-190px] left-1/2 -translate-x-1/2 h-[560px] w-[1040px] rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-[130px]" />
        <div className="absolute -left-48 top-[45%] h-[380px] w-[380px] rounded-full bg-cyan-400/10 dark:bg-cyan-500/10 blur-[110px]" />
        <div className="absolute right-[-160px] top-[30%] h-[420px] w-[420px] rounded-full bg-violet-500/10 dark:bg-violet-500/10 blur-[120px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
              TestFlow AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              title={
                isDark
                  ? t("common.switchToLightMode")
                  : t("common.switchToDarkMode")
              }
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">{i18n.language === "en" ? "EN" : "VI"}</span>
            </button>

            <Link
              to="/login"
              className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t("landing.nav.signIn")}
            </Link>

            <Link
              to="/register"
              className="hidden lg:inline-flex items-center px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
            >
              {t("landing.nav.getStarted")}
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="max-w-[1320px] mx-auto px-6 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}

              <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-lg text-sm font-bold text-center text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t("landing.nav.signIn")}
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm text-center hover:opacity-90 transition-opacity"
                >
                  {t("landing.nav.getStarted")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-28 pb-20">
        <section className="max-w-[1320px] mx-auto px-6 pt-8 md:pt-12 pb-8 md:pb-10">
          <div className="relative overflow-hidden rounded-[36px] border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-8 md:p-12 lg:p-14 shadow-2xl shadow-indigo-500/15 dark:shadow-indigo-900/40">
            <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-400/15 dark:bg-cyan-500/10 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7">
                <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 mb-5">
                  TestFlow Platform
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-[1.05] max-w-4xl">
                  {title}
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-3xl">
                  {subtitle}
                </p>
              </div>

              <div className="lg:col-span-5">
                <div className="relative rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-5 h-full flex flex-col justify-center backdrop-blur">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Layers3, label: "Specs" },
                      { icon: BrainCircuit, label: "AI" },
                      { icon: Building2, label: "Scale" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                      >
                        <item.icon className="w-4 h-4 text-indigo-500 mb-1.5" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-indigo-400/40 bg-indigo-500/5 dark:bg-indigo-500/10 p-3">
                    <div className="h-2 w-28 rounded-full bg-indigo-400/40 mb-2" />
                    <div className="h-2 w-full rounded-full bg-slate-300 dark:bg-slate-700 mb-2" />
                    <div className="h-2 w-3/4 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {children && (
          <section className="max-w-[1320px] mx-auto px-6 py-6 md:py-8">
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
