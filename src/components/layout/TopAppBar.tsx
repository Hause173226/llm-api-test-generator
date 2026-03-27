import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Sparkles,
  Moon,
  Sun,
  Languages,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

interface TopAppBarProps {
  title: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function TopAppBar({
  title,
  isSidebarCollapsed,
  onToggleSidebar,
}: TopAppBarProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      await logout();
      setIsUserMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
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
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
        >
          <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        </button>
        <h2 className="font-sans text-lg font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
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
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
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
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300 font-bold text-xs"
          >
            <Languages className="w-4 h-4" />
            <span className="uppercase">
              {i18n.language === "en" ? "EN" : "VI"}
            </span>
          </button>
        </div>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 cursor-pointer group active:scale-95 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 p-1.5 -m-1.5 rounded-2xl transition-all duration-150"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-on-surface leading-none">
                {user?.fullName || user?.email || "User"}
              </p>
              <p className="text-[10px] text-on-surface-variant tracking-wider uppercase font-bold mt-1">
                {user?.roles?.[0] || t("common.softwareStudent")}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-white overflow-hidden shadow-sm">
              {user?.avatar ? (
                <img
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src={user.avatar}
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
