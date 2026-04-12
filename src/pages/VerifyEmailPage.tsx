import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authService } from "../services/authService";

type Status = "loading" | "success" | "already_confirmed" | "error";

export default function VerifyEmailPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<Status>("loading");
    const [message, setMessage] = useState("");
    const [resendEmail, setResendEmail] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSent, setResendSent] = useState(false);

    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    useEffect(() => {
        if (!token || !email) {
            setStatus("error");
            setMessage(t("auth.verify.missingParams"));
            return;
        }

        const confirm = async () => {
            try {
                const res = await authService.confirmEmail(email, token);
                const msg = res.message || "";
                // BE trả 200 cho cả "đã confirm rồi" và "confirm thành công"
                if (msg.toLowerCase().includes("đã được xác nhận") || msg.toLowerCase().includes("already")) {
                    setStatus("already_confirmed");
                } else {
                    setStatus("success");
                }
                setMessage(msg);
            } catch (err: any) {
                setStatus("error");
                setMessage(err?.message || t("auth.verify.errorDefault"));
                setResendEmail(email);
            }
        };

        confirm();
    }, []);

    const handleResend = async () => {
        if (!resendEmail) return;
        setResendLoading(true);
        try {
            await authService.resendConfirmationEmail(resendEmail);
            setResendSent(true);
        } catch {
            // BE luôn 200 để tránh email enumeration, nên không cần xử lý lỗi
            setResendSent(true);
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center text-center space-y-6">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                        TestFlow Intelligence
                    </span>
                </Link>

                {/* Status icon */}
                {status === "loading" && (
                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                )}
                {(status === "success" || status === "already_confirmed") && (
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                )}
                {status === "error" && (
                    <XCircle className="w-16 h-16 text-rose-500" />
                )}

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {status === "loading" && t("auth.verify.verifying")}
                        {status === "success" && t("auth.verify.successTitle")}
                        {status === "already_confirmed" && t("auth.verify.alreadyTitle")}
                        {status === "error" && t("auth.verify.errorTitle")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {status === "loading"
                            ? t("auth.verify.verifyingDesc")
                            : message || (status === "success" ? t("auth.verify.successDesc") : "")}
                    </p>
                </div>

                {/* Actions */}
                {(status === "success" || status === "already_confirmed") && (
                    <Link
                        to="/login"
                        className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors"
                    >
                        {t("auth.verify.goToLogin")}
                    </Link>
                )}

                {status === "error" && (
                    <div className="w-full space-y-3">
                        {!resendSent ? (
                            <>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {t("auth.verify.resendHint")}
                                </p>
                                <button
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {resendLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Mail className="w-4 h-4" />}
                                    {t("auth.verify.resendButton")}
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                <CheckCircle2 className="w-4 h-4" />
                                {t("auth.verify.resendSent")}
                            </div>
                        )}
                        <Link
                            to="/login"
                            className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {t("auth.returnToSignIn")}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
