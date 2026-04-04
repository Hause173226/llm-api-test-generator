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
    <div className="min-h-screen bg-surface dark:bg-surface-container-lowest text-on-surface overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-160px] left-1/2 -translate-x-1/2 h-[460px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[-140px] top-[28%] h-[380px] w-[380px] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 bg-surface/70 dark:bg-surface-container-lowest/70 backdrop-blur-2xl border-b border-outline-variant/10">
        <div className="max-w-[1320px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-on-surface leading-tight">
                TestFlow Intelligence
              </span>
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                AI-Powered Testing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low/70 dark:bg-surface-container/60 px-2 py-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    isActive
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/30"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high dark:hover:bg-surface-container-high",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-surface-container-high dark:hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary font-semibold text-sm"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">
                {i18n.language === "en" ? "EN" : "VI"}
              </span>
            </button>

            <Link
              to="/login"
              className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors"
            >
              {t("landing.nav.signIn")}
            </Link>

            <Link
              to="/register"
              className="hidden lg:inline-flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              {t("landing.nav.getStarted")}
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-outline-variant/10 bg-surface dark:bg-surface-container-lowest">
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
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high dark:hover:bg-surface-container",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}

              <div className="pt-4 border-t border-outline-variant/10 space-y-2">
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-lg text-sm font-semibold text-center text-on-surface hover:text-primary hover:bg-surface-container-high dark:hover:bg-surface-container transition-colors"
                >
                  {t("landing.nav.signIn")}
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-3 bg-primary text-on-primary rounded-lg font-semibold text-sm text-center hover:bg-primary/90 transition-colors"
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
          <div className="relative overflow-hidden rounded-[36px] border border-outline-variant/10 bg-linear-to-br from-surface-container-low to-surface dark:from-surface-container-high dark:to-surface-container p-8 md:p-12 lg:p-14 shadow-xl shadow-primary/10">
            <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7">
                <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-primary/10 text-primary mb-5">
                  TestFlow Platform
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-on-surface mb-4 leading-[1.05] max-w-4xl">
                  {title}
                </h1>
                <p className="text-lg md:text-xl text-on-surface-variant font-medium leading-relaxed max-w-3xl">
                  {subtitle}
                </p>
              </div>

              <div className="lg:col-span-5">
                <div className="relative rounded-3xl border border-outline-variant/20 bg-surface/80 dark:bg-surface-container/80 p-5 h-full flex flex-col justify-center">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Layers3, label: "Specs" },
                      { icon: BrainCircuit, label: "AI" },
                      { icon: Building2, label: "Scale" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container-high p-3"
                      >
                        <item.icon className="w-4 h-4 text-primary mb-1.5" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                    <div className="h-2 w-28 rounded-full bg-primary/30 mb-2" />
                    <div className="h-2 w-full rounded-full bg-surface-container-high dark:bg-surface-container-low mb-2" />
                    <div className="h-2 w-3/4 rounded-full bg-surface-container-high dark:bg-surface-container-low" />
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
