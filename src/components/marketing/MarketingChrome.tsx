import React, { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
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
import { Section } from "./MarketingPrimitives";

type NavItem = {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { path: "/product", labelKey: "landing.nav.product", icon: Layers3 },
  {
    path: "/intelligence",
    labelKey: "landing.nav.intelligence",
    icon: BrainCircuit,
  },
  { path: "/enterprise", labelKey: "landing.nav.enterprise", icon: Building2 },
  { path: "/pricing", labelKey: "landing.nav.pricing", icon: BadgeDollarSign },
];

export default function MarketingChrome({
  children,
  footer = true,
}: {
  children: ReactNode;
  footer?: boolean;
}) {
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f2efe7_0%,#f8f6ef_18%,#edf3f7_58%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#020617_0%,#08111f_30%,#0f172a_100%)] dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(99,102,241,0.14),transparent_24%),radial-gradient(circle_at_20%_62%,rgba(148,163,184,0.14),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(99,102,241,0.18),transparent_24%),radial-gradient(circle_at_20%_62%,rgba(30,41,59,0.22),transparent_26%)]" />
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.08)_1px,transparent_1px)] [background-size:84px_84px] dark:opacity-[0.12]" />
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(to_right,rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.12)_1px,transparent_1px)] [background-size:336px_336px] dark:opacity-[0.08]" />
        <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),transparent)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.36),transparent)]" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50">
        <Section className="pt-4">
          <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.68))] px-4 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.32)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(15,23,42,0.76))] dark:shadow-[0_16px_50px_-28px_rgba(2,6,23,0.9)]">
            <div className="flex h-[76px] items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-[0_18px_34px_-18px_rgba(15,23,42,0.72)] dark:bg-white dark:text-slate-950">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    {t("marketing.chrome.brandTag")}
                  </div>
                  <div className="text-[1.08rem] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                    TestFlow AI
                  </div>
                </div>
              </Link>

              <div className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-800 dark:bg-slate-900/80 md:flex">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-950 text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.72)] dark:bg-white dark:text-slate-950"
                          : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDark((value) => !value)}
                  className="rounded-full border border-slate-200/80 bg-white/82 p-2.5 text-slate-500 transition-colors hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-white"
                  aria-label={
                    isDark
                      ? t("common.switchToLightMode")
                      : t("common.switchToDarkMode")
                  }
                >
                  {isDark ? (
                    <Sun className="h-[18px] w-[18px]" />
                  ) : (
                    <Moon className="h-[18px] w-[18px]" />
                  )}
                </button>
                <button
                  onClick={() =>
                    i18n.changeLanguage(i18n.language === "en" ? "vi" : "en")
                  }
                  className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-white sm:inline-flex"
                >
                  <Languages className="h-4 w-4" />
                  {i18n.language === "en" ? "EN" : "VI"}
                </button>
                <Link
                  to="/login"
                  className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white lg:inline-flex"
                >
                  {t("landing.nav.signIn")}
                </Link>
                <Link
                  to="/register"
                  className="hidden items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 lg:inline-flex"
                >
                  {t("landing.nav.getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen((value) => !value)}
                  className="rounded-full border border-slate-200/80 bg-white/82 p-2.5 text-slate-500 transition-colors hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-white md:hidden"
                  aria-label={
                    isMobileMenuOpen
                      ? t("marketing.chrome.closeMenu")
                      : t("marketing.chrome.openMenu")
                  }
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden transition-[max-height,opacity,padding] duration-300 md:hidden",
                isMobileMenuOpen
                  ? "max-h-[420px] pb-4 opacity-100"
                  : "max-h-0 opacity-0",
              )}
            >
              <div className="space-y-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "bg-white/70 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    to="/login"
                    className="rounded-2xl border border-slate-200/80 px-4 py-3 text-center text-sm font-medium dark:border-slate-800"
                  >
                    {t("landing.nav.signIn")}
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                  >
                    {t("landing.nav.getStarted")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </nav>

      <div className="pt-30 sm:pt-36">{children}</div>

      {footer ? (
        <footer className="pb-10 pt-24">
          <Section>
            <div className="flex flex-col gap-8 rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.66))] px-6 py-8 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-2xl xl:flex-row xl:items-center xl:justify-between dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.78),rgba(15,23,42,0.74))]">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  TestFlow AI
                </div>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t("landing.footer.rights")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                <Link
                  to="/product"
                  className="rounded-full border border-slate-200/80 px-4 py-2 text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  {t("landing.nav.product")}
                </Link>
                <a
                  href="#"
                  className="rounded-full border border-slate-200/80 px-4 py-2 text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  {t("landing.footer.privacy")}
                </a>
                <a
                  href="#"
                  className="rounded-full border border-slate-200/80 px-4 py-2 text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  {t("landing.footer.terms")}
                </a>
              </div>
            </div>
          </Section>
        </footer>
      ) : null}
    </div>
  );
}
