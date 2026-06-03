import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Github,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";
import { useGoogleLogin, GoogleLogin } from "@react-oauth/google";

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === "/login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccessEmail, setRegisterSuccessEmail] = useState("");
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
  const {
    login,
    register,
    loginWithGoogle,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  // Redirect if already authenticated, but allow direct access to /login
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && location.pathname !== "/login") {
      navigate("/choose-testing");
    }
  }, [isAuthenticated, isAuthLoading, location.pathname, navigate]);

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    const idToken = credentialResponse.credential;
    if (!idToken) return;
    try {
      setIsLoading(true);
      await loginWithGoogle(idToken);
      navigate("/choose-testing");
    } catch (err: any) {
      showErrorToast(err?.message || t("auth.googleLoginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Update isLogin based on route
  useEffect(() => {
    setIsLogin(location.pathname === "/login");
    setError("");
  }, [location.pathname]);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation for register
    if (!isLogin) {
      if (!formData.fullName.trim()) {
        setError(t("auth.validation.fullNameRequired"));
        return;
      }
      if (formData.fullName.trim().length < 2) {
        setError(t("auth.validation.fullNameMin"));
        return;
      }
      if (!formData.email.trim()) {
        setError(t("auth.validation.emailRequired"));
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t("auth.validation.emailInvalid"));
        return;
      }
      if (!formData.password) {
        setError(t("auth.validation.passwordRequired"));
        return;
      }
      if (formData.password.length < 8) {
        setError(t("auth.validation.passwordMin"));
        return;
      }
      if (!/[A-Z]/.test(formData.password)) {
        setError(t("auth.validation.passwordUppercase"));
        return;
      }
      if (!/[a-z]/.test(formData.password)) {
        setError(t("auth.validation.passwordLowercase"));
        return;
      }
      if (!/[0-9]/.test(formData.password)) {
        setError(t("auth.validation.passwordNumber"));
        return;
      }
      if (!/[^A-Za-z0-9]/.test(formData.password)) {
        setError(t("auth.validation.passwordSpecial"));
        return;
      }
      if (!formData.confirmPassword) {
        setError(t("auth.validation.confirmPasswordRequired"));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t("auth.passwordMismatch"));
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!isLogin) {
        await register(
          formData.fullName,
          formData.email,
          formData.password,
          formData.confirmPassword,
        );
        showSuccessToast(t("auth.validation.registerSuccess"));
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        navigate("/login");
      } else {
        await login(formData.email, formData.password);
        showSuccessToast(t("auth.validation.loginSuccess"));
        navigate("/choose-testing");
      }
    } catch (err: any) {
      // BE có thể trả errors array (ApiError.errors) hoặc message string
      const errorsArray = err?.errors?.errors || err?.errors;
      if (Array.isArray(errorsArray) && errorsArray.length > 0) {
        setError(errorsArray.join("\n"));
      } else {
        const errorMessage =
          err?.message ||
          err?.errors?.message ||
          t("auth.validation.genericError");
        showErrorToast(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Màn check email sau khi register thành công
  if (false && registerSuccessEmail) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center text-center space-y-6">
          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t("auth.verify.checkEmailTitle")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {t("auth.verify.checkEmailDesc", { email: registerSuccessEmail })}
            </p>
          </div>
          <Link
            to="/login"
            onClick={() => setRegisterSuccessEmail("")}
            className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors text-center block"
          >
            {t("auth.verify.goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors">
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 hover:bg-white/50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
          title={
            isDark
              ? t("common.switchToLightMode")
              : t("common.switchToDarkMode")
          }
          aria-label={
            isDark
              ? t("common.switchToLightMode")
              : t("common.switchToDarkMode")
          }
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs cursor-pointer"
          aria-label="Toggle language"
        >
          <Languages className="w-4 h-4" />
          <span className="uppercase">
            {i18n.language === "en" ? "EN" : "VI"}
          </span>
        </button>
      </div>

      {/* Background Elements */}
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      ></div>
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.12)] dark:shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10">
        {/* Left Side: Form */}
        <div className="p-10 md:p-16 flex flex-col justify-center space-y-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                TestFlow Al
              </span>
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isLogin ? t("auth.welcomeBack") : t("auth.registerAccount")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {isLogin
                ? t("auth.loginDescription")
                : t("auth.registerDescription")}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <ul className="space-y-1">
                {error.split("\n").map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1"
                  >
                    {t("auth.fullName")}
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      id="fullName"
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      autoComplete="name"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-sm"
                      placeholder="Alex Rivera"
                      type="text"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1"
                >
                  {t("auth.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    id="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-sm"
                    placeholder="alex@company.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label
                    htmlFor="password"
                    className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    {isLogin ? t("auth.password") : t("auth.createPassword")}
                  </label>
                  {isLogin && (
                    <Link
                      to="/forgot-password"
                      title={t("auth.forgotTitle")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    id="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-sm"
                    placeholder="••••••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
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
                  <label
                    htmlFor="confirmPassword"
                    className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1"
                  >
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      id="confirmPassword"
                      required
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-sm"
                      placeholder="••••••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
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

            <button
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-base shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>
                  {isLogin
                    ? t("auth.signInToDashboard")
                    : t("auth.registerAction")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 dark:text-slate-500">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Hidden GoogleLogin để trigger popup, custom button bên ngoài */}
            <div id="google-login-btn" className="hidden">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showErrorToast(t("auth.googleLoginFailed"))}
                useOneTap={false}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const btn = document.querySelector<HTMLElement>(
                  "#google-login-btn [role='button'], #google-login-btn div[tabindex='0']",
                );
                btn?.click();
              }}
              className="flex items-center justify-center gap-3 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer w-full"
            >
              {/* Google icon SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("auth.continueWithGoogle")}
            </button>
          </div>

          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {isLogin ? t("auth.dontHaveAccount") : t("auth.alreadyHaveAccount")}{" "}
            <Link
              to={isLogin ? "/register" : "/login"}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              {isLogin ? t("auth.registerFree") : t("auth.signIn")}
            </Link>
          </p>
        </div>

        {/* Right Side: Visual/Info */}
        <div className="hidden lg:block bg-slate-900 dark:bg-slate-800 p-16 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          ></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px]"></div>

          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {t("auth.enterpriseReady")}
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-[0.95] text-white">
                {t("auth.panelTitle")}
              </h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                {t("auth.panelDescription")}
              </p>
            </div>

            <div className="space-y-4">
              {(t("auth.benefits", { returnObjects: true }) as string[]).map(
                (item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10"
                  >
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span className="text-base font-bold text-white">
                      {item}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
