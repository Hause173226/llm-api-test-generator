import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Sparkles,
  Moon,
  Sun,
  Languages,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopAppBarProps {
  title: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  breadcrumbs?: BreadcrumbItem[];
}

export default function TopAppBar({
  title,
  isSidebarCollapsed,
  onToggleSidebar,
  breadcrumbs,
}: TopAppBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const LAST_AUTOMATED_ROUTE_KEY = "last-automated-route";

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
    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith("/manual-testing")) {
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      sessionStorage.setItem(LAST_AUTOMATED_ROUTE_KEY, fullPath);
    }
  }, [location.pathname, location.search, location.hash]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "vi" : "en";
    i18n.changeLanguage(newLang);
  };

  const handleNavigateSettings = () => {
    setIsUserMenuOpen(false);
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      // Force navigation even if logout fails
      navigate("/login", { replace: true });
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 h-16 flex justify-between items-center px-8 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/20 dark:border-slate-700/20 shadow-[0_20px_50px_rgba(11,28,48,0.05)] transition-all duration-300 ease-in-out w-full",
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group cursor-pointer"
        >
          <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        </button>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  )}
                  {crumb.href && !isLast ? (
                    <button
                      onClick={() => navigate(crumb.href!)}
                      className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold tracking-tight",
                        isLast
                          ? "text-on-surface"
                          : "text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <h2 className="font-sans text-lg font-semibold tracking-tight text-on-surface">
            {title}
          </h2>
        )}
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden md:flex items-center gap-2 bg-primary-fixed/30 px-3 py-1.5 rounded-full">
          <Sparkles className="w-4 h-4 text-primary fill-primary" />
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
            {t("common.llmActive")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
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
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            <Languages className="w-4 h-4" />
            <span className="uppercase">
              {i18n.language === "en" ? "EN" : "VI"}
            </span>
          </button>
        </div>

        {/* Quick switch between Manual <-> Automated testing */}
        <div className="hidden sm:flex items-center">
          <button
            onClick={() => {
              const isManual = location.pathname.startsWith("/manual-testing");
              if (isManual) {
                const fallback = sessionStorage.getItem(LAST_AUTOMATED_ROUTE_KEY);
                navigate(fallback || "/runs");
                return;
              }
              navigate("/manual-testing");
            }}
            title="Switch testing mode"
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-bold text-slate-700 dark:text-slate-300"
          >
            {location.pathname.startsWith("/manual-testing")
              ? "Go to Automated"
              : "Go to Manual"}
          </button>
        </div>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 cursor-pointer group active:scale-95 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 p-1.5 -m-1.5 rounded-2xl transition-all duration-150"
          >
            <div className="text-right hidden sm:block max-w-[140px]">
              <p className="text-sm font-semibold text-on-surface leading-none truncate">
                {user?.fullName}
              </p>
              <p className="text-[10px] text-on-surface-variant tracking-wider uppercase font-bold mt-1">
                {user?.roles?.[0] || t("common.softwareStudent")}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-white overflow-hidden shadow-sm">
              {user?.avatarUrl ? (
                <img
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src={user.avatarUrl}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm font-bold">
                  {user?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-on-surface-variant transition-transform",
                isUserMenuOpen && "rotate-180",
              )}
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-3 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-50">
              <button
                onClick={handleNavigateSettings}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>{t("common.accountSettings")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("common.logOut")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
