import React from "react";
import {
  CreditCard,
  Check,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../hooks/useSubscription";
import Skeleton from "../components/ui/Skeleton";
import toast from "react-hot-toast";

export default function BillingPage() {
  const { t } = useTranslation();
  const hookResult = useSubscription();

  // Defensive check - ensure hook returns valid object
  if (!hookResult) {
    return (
      <MainLayout title={t("billing.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant">
              Failed to load subscription data
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const {
    plans,
    currentSubscription,
    usage,
    payments,
    loading,
    error,
    subscribeToPlan,
    refetch,
  } = hookResult;

  const handleSubscribe = async (planId: string) => {
    try {
      const paymentData = await subscribeToPlan(planId);
      console.log("Payment data received:", paymentData);

      if (!paymentData) {
        toast.error("Failed to create payment. Please try again.");
        return;
      }

      // Check if payment is required
      if (
        (paymentData as any).requiresPayment &&
        (paymentData as any).paymentIntentId
      ) {
        // Payment required - need to get payment URL
        // toast.info is not available, use toast.loading instead
        const loadingToast = toast.loading("Creating payment link...");

        // TODO: Need to implement API call to get payment URL from paymentIntentId
        // For now, show message
        toast.dismiss(loadingToast);
        toast.error(
          `Payment integration incomplete. Payment Intent: ${(paymentData as any).paymentIntentId}`,
        );
      } else if ((paymentData as any).subscription) {
        // Subscription created without payment (free plan)
        toast.success("Successfully subscribed to plan!");
        await refetch();
      } else {
        // Try to find payment URL
        const paymentDataAny = paymentData as any;
        const paymentUrl =
          paymentData.paymentUrl ||
          paymentDataAny.checkoutUrl ||
          paymentDataAny.url ||
          paymentDataAny.paymentLink;

        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          console.error("No payment URL found in response:", paymentData);
          toast.error("Payment URL not found. Please contact support.");
        }
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  if (error) {
    return (
      <MainLayout title={t("billing.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-error mx-auto" />
            <p className="text-on-surface-variant">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title={t("billing.title")}>
        <div className="space-y-10 pb-12">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  // Map usage data by limit type
  const usageMap = usage.reduce(
    (acc, u) => {
      acc[u.limitType] = u;
      return acc;
    },
    {} as Record<string, (typeof usage)[0]>,
  );

  const testRunsUsage = usageMap["TestRuns"] || {
    currentUsage: 0,
    limitValue: 1000,
  };
  const projectsUsage = usageMap["Projects"] || {
    currentUsage: 0,
    limitValue: 3,
  };
  const aiTokensUsage = usageMap["AITokens"] || {
    currentUsage: 0,
    limitValue: 25000,
  };

  return (
    <MainLayout title={t("billing.title")}>
      <div className="space-y-10 pb-12">
        <header className="flex justify-between items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("billing.title")}
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl">
              {t("billing.subtitle")}
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-surface-container-highest dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            Refresh
          </button>
        </header>

        {/* Usage Overview - REAL DATA */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Test Runs */}
          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {t("billing.usage.testRuns")}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface">
                {testRunsUsage.currentUsage.toLocaleString()}
              </h3>
              <span className="text-on-surface-variant text-sm">
                / {testRunsUsage.limitValue.toLocaleString()}
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${Math.min((testRunsUsage.currentUsage / testRunsUsage.limitValue) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              {Math.round(
                (testRunsUsage.currentUsage / testRunsUsage.limitValue) * 100,
              )}
              % used
            </p>
          </div>

          {/* Projects */}
          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {t("billing.usage.projects")}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface">
                {projectsUsage.currentUsage}
              </h3>
              <span className="text-on-surface-variant text-sm">
                / {projectsUsage.limitValue}
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full",
                  projectsUsage.currentUsage >= projectsUsage.limitValue
                    ? "bg-amber-500"
                    : "bg-primary",
                )}
                style={{
                  width: `${Math.min((projectsUsage.currentUsage / projectsUsage.limitValue) * 100, 100)}%`,
                }}
              ></div>
            </div>
            {projectsUsage.currentUsage >= projectsUsage.limitValue ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                {t("billing.usage.projectsLimit")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-on-surface-variant">
                {projectsUsage.limitValue - projectsUsage.currentUsage}{" "}
                remaining
              </p>
            )}
          </div>

          {/* AI Tokens */}
          <div className="bg-surface-container-low dark:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {t("billing.usage.aiTokens")}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-on-surface">
                {(aiTokensUsage.currentUsage / 1000).toFixed(1)}k
              </h3>
              <span className="text-on-surface-variant text-sm">
                / {(aiTokensUsage.limitValue / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{
                  width: `${Math.min((aiTokensUsage.currentUsage / aiTokensUsage.limitValue) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              Resets monthly
            </p>
          </div>
        </section>

        {/* Pricing Plans - REAL DATA */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface">
              {t("billing.plans.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.length > 0 ? (
              plans.map((plan) => {
                const isCurrentPlan = currentSubscription?.planId === plan.id;
                const isPopular =
                  plan.name?.toLowerCase().includes("professional") || false;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col p-8 rounded-3xl border transition-all duration-300",
                      isPopular
                        ? "bg-white dark:bg-surface-container-low border-primary shadow-xl shadow-primary/5 scale-105 z-10"
                        : "bg-surface-container-lowest dark:bg-surface-container-low border-outline-variant/20 hover:border-primary/30",
                    )}
                  >
                    {isPopular && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                        {t("billing.plans.mostPopular")}
                      </span>
                    )}

                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-on-surface mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-4xl font-bold text-on-surface">
                          ${plan.price || 0}
                        </span>
                        <span className="text-on-surface-variant font-medium">
                          /{plan.billingCycle?.toLowerCase() || "month"}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {plan.description || "No description available"}
                      </p>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.limits && plan.limits.length > 0 ? (
                        plan.limits.map((limit) => (
                          <li
                            key={limit.limitType}
                            className="flex items-start gap-3 text-sm text-on-surface-variant"
                          >
                            <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                            </div>
                            {limit.limitType}:{" "}
                            {limit.limitValue?.toLocaleString() || 0}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-on-surface-variant">
                          No limits specified
                        </li>
                      )}
                    </ul>

                    <button
                      onClick={() => !isCurrentPlan && handleSubscribe(plan.id)}
                      disabled={isCurrentPlan}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                        isCurrentPlan
                          ? "bg-indigo-600 dark:bg-indigo-500 text-white opacity-50 cursor-not-allowed hover:bg-indigo-600 dark:hover:bg-indigo-500"
                          : "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 active:scale-[0.98] cursor-pointer",
                      )}
                    >
                      {isCurrentPlan ? "Current Plan" : "Subscribe"}
                      {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12 text-on-surface-variant">
                No plans available
              </div>
            )}
          </div>
        </section>

        {/* Billing History - REAL DATA */}
        <section className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
          <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">
              {t("billing.history.title")}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low/50 dark:bg-surface-container-high/50">
                  <th className="px-8 py-4">
                    {t("billing.history.table.invoice")}
                  </th>
                  <th className="px-8 py-4">
                    {t("billing.history.table.date")}
                  </th>
                  <th className="px-8 py-4">
                    {t("billing.history.table.amount")}
                  </th>
                  <th className="px-8 py-4">
                    {t("billing.history.table.status")}
                  </th>
                  <th className="px-8 py-4 text-right">
                    {t("billing.history.table.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-surface-container-low/30 dark:hover:bg-surface-container-high/30 transition-colors"
                    >
                      <td className="px-8 py-5 text-sm font-bold text-on-surface">
                        {payment.id.substring(0, 13)}
                      </td>
                      <td className="px-8 py-5 text-sm text-on-surface-variant">
                        {new Date(payment.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-on-surface">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase",
                            payment.status === "Completed"
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                              : payment.status === "Pending"
                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
                          )}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-on-surface-variant"
                    >
                      No payment history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
