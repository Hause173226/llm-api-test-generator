import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock reset instruction send
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-container-lowest flex items-center justify-center p-6 relative overflow-hidden transition-colors">
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 hover:bg-surface-container-high dark:hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
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
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-high dark:hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary font-bold text-xs"
        >
          <Languages className="w-4 h-4" />
          <span className="uppercase">
            {i18n.language === "en" ? "EN" : "VI"}
          </span>
        </button>
      </div>

      {/* Background Elements */}
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      ></div>
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-xl bg-surface-container-lowest dark:bg-surface-container-low rounded-[40px] shadow-[0_50px_100px_rgba(11,28,48,0.1)] border border-outline-variant/10 dark:border-slate-800 overflow-hidden relative z-10 p-10 md:p-16">
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-on-surface">
                TestFlow Intelligence
              </span>
            </Link>

            {isSubmitted ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-on-surface">
                    {t("auth.instructionsSent")}
                  </h1>
                  <p className="text-on-surface-variant font-medium text-sm">
                    <Trans i18nKey="auth.instructionsBody" values={{ email }}>
                      We have sent a secure reset link to{" "}
                      <span className="text-on-surface font-bold">{email}</span>
                      . Please check your inbox.
                    </Trans>
                  </p>
                </div>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("auth.returnToSignIn")}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-black tracking-tight text-on-surface">
                  {t("auth.forgotTitle")}
                </h1>
                <p className="text-on-surface-variant font-medium text-sm max-w-sm mx-auto">
                  {t("auth.forgotSubtitle")}
                </p>
              </>
            )}
          </div>

          {!isSubmitted && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60 font-medium text-sm"
                    placeholder="alex@company.com"
                    type="email"
                  />
                </div>
              </div>

              <button className="w-full py-5 bg-primary text-on-primary rounded-2xl font-bold text-lg shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
                {t("auth.sendReset")}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 text-on-surface-variant font-bold text-sm hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("auth.returnToSignIn")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
