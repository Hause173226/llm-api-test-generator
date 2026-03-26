import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Github,
  Chrome,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

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

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError(t("auth.passwordMismatch"));
        return;
      }
    }

    // Mock auth
    navigate("/dashboard");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest dark:bg-surface-container-low rounded-[40px] shadow-[0_50px_100px_rgba(11,28,48,0.1)] border border-outline-variant/10 dark:border-slate-800 overflow-hidden relative z-10">
        {/* Left Side: Form */}
        <div className="p-10 md:p-16 flex flex-col justify-center space-y-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-on-surface">
                TestFlow Intelligence
              </span>
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">
              {isLogin ? t("auth.welcomeBack") : t("auth.registerAccount")}
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">
              {isLogin
                ? t("auth.loginDescription")
                : t("auth.registerDescription")}
            </p>
          </div>

          {error && (
            <div className="bg-error-container/30 border border-error/20 p-4 rounded-2xl flex items-center gap-3 text-error text-sm font-bold">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    {t("auth.fullName")}
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60 font-medium text-sm"
                      placeholder="Alex Rivera"
                      type="text"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60 font-medium text-sm"
                    placeholder="alex@company.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {isLogin ? t("auth.password") : t("auth.createPassword")}
                  </label>
                  {isLogin && (
                    <Link
                      to="/forgot-password"
                      title={t("auth.forgotTitle")}
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60 font-medium text-sm"
                    placeholder="••••••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-12 pr-12 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none focus:ring-4 focus:ring-primary-fixed dark:focus:ring-indigo-900/30 transition-all text-on-surface placeholder:text-on-surface-variant/60 font-medium text-sm"
                      placeholder="••••••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-base shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
              {isLogin ? t("auth.signInToDashboard") : t("auth.registerAction")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-surface-container-lowest dark:bg-surface-container-low px-4 text-on-surface-variant">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl font-bold text-xs hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors">
              <Chrome className="w-5 h-5" />
              Google
            </button>
            <button className="flex items-center justify-center gap-3 py-3.5 bg-surface-container-low dark:bg-slate-900 rounded-2xl font-bold text-xs hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors">
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>

          <p className="text-center text-sm font-medium text-on-surface-variant">
            {isLogin ? t("auth.dontHaveAccount") : t("auth.alreadyHaveAccount")}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? t("auth.registerFree") : t("auth.signIn")}
            </button>
          </p>
        </div>

        {/* Right Side: Visual/Info */}
        <div className="hidden lg:block bg-on-surface dark:bg-slate-950 p-16 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          ></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/30 rounded-full blur-[100px]"></div>

          <div className="relative z-10 h-full flex flex-col justify-between text-surface">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface/10 rounded-full border border-surface/10">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {t("auth.enterpriseReady")}
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-[0.95]">
                {t("auth.panelTitle")}
              </h2>
              <p className="text-lg text-surface/70 font-medium leading-relaxed">
                {t("auth.panelDescription")}
              </p>
            </div>

            <div className="space-y-4">
              {(t("auth.benefits", { returnObjects: true }) as string[]).map(
                (item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-surface/5 p-4 rounded-2xl border border-surface/10"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-base font-bold">{item}</span>
                  </div>
                ),
              )}
            </div>

            <div className="pt-8 border-t border-surface/10">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-on-surface bg-surface-container overflow-hidden"
                    >
                      <img
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt="User"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-surface/60 uppercase tracking-widest">
                  {t("auth.joinedBy")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
