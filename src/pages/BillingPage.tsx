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
import { showErrorToast, showSuccessToast } from "../utils/errorHandler";

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
              {t("billing.error.loadFailed")}
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
    createPayOsCheckout,
    refetch,
  } = hookResult;

  // Billing cycle state: 0 = Monthly, 1 = Yearly
  const [selectedBillingCycle, setSelectedBillingCycle] =
    React.useState<number>(0);

  const formatCurrency = React.useCallback((value?: number | null) => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const getLimitValueFromCurrentPlan = React.useCallback(
    (limitType: string, fallback: number) => {
      const currentPlan = plans.find((p) => p.id === currentSubscription?.planId);
      const matched = currentPlan?.limits?.find(
        (l) => String(l.limitType) === limitType,
      );
      if (!matched) return fallback;
      if ((matched as any).isUnlimited) return fallback;
      const value = Number(matched.limitValue);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    },
    [plans, currentSubscription?.planId],
  );

  const handleSubscribe = async (planId: string) => {
    try {
      // Step 1: Create subscription purchase intent
      const subscribeResult = await subscribeToPlan(
        planId,
        selectedBillingCycle,
      );

      if (!subscribeResult) {
        showErrorToast("Failed to create subscription. Please try again.");
        return;
      }

      // Free plan – no payment required
      if (!subscribeResult.requiresPayment) {
        showSuccessToast("Successfully subscribed to plan!");
        await refetch();
        return;
      }

      const intentId = subscribeResult.paymentIntentId;
      if (!intentId) {
        showErrorToast("Payment intent missing. Please try again.");
        return;
      }

      // Step 2: Create PayOS checkout link
      const checkout = await hookResult.createPayOsCheckout(intentId);
      if (!checkout?.checkoutUrl) {
        showErrorToast("Could not create payment link. Please try again.");
        return;
      }

      // Redirect to PayOS checkout
      window.location.href = checkout.checkoutUrl;
    } catch (error) {
      console.error("Subscribe error:", error);
      showErrorToast("Failed to subscribe. Please try again.");
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
              {t("billing.tryAgain")}
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

  // Pick the most recently updated usage record.
  // Do not rely on periodEnd ordering because some BE rows may contain abnormal future dates.
  const toEpoch = (value?: string | null) => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  const latestUsage =
    usage.length > 0
      ? [...usage].sort((a, b) => {
          const bTs =
            toEpoch(b.updatedDateTime) ||
            toEpoch(b.createdDateTime) ||
            toEpoch(b.periodEnd);
          const aTs =
            toEpoch(a.updatedDateTime) ||
            toEpoch(a.createdDateTime) ||
            toEpoch(a.periodEnd);
          return bTs - aTs;
        })[0]
      : null;

  const testRunsUsage = {
    currentUsage: Number(latestUsage?.testRunCount ?? 0),
    limitValue: getLimitValueFromCurrentPlan("MaxTestRunsPerMonth", 1000),
  };
  const projectsUsage = {
    currentUsage: Number(latestUsage?.projectCount ?? 0),
    limitValue: getLimitValueFromCurrentPlan("MaxProjects", 3),
  };
  const aiTokensUsage = {
    currentUsage: Number(latestUsage?.llmCallCount ?? 0),
    limitValue: getLimitValueFromCurrentPlan("MaxLlmCallsPerMonth", 25000),
  };

  const getPaymentDateText = (payment: (typeof payments)[number]) => {
    const rawDate = payment.createdDateTime || payment.transactionDate;
    if (!rawDate) return "N/A";
    const d = new Date(rawDate);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
  };

  const getPaymentStatusView = (status: number) => {
    switch (status) {
      case 0:
        return {
          label: "Pending",
          className:
            "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
        };
      case 1:
        return {
          label: "Succeeded",
          className:
            "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
        };
      case 2:
        return {
          label: "Failed",
          className:
            "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
        };
      case 3:
        return {
          label: "Refunded",
          className:
            "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
        };
      default:
        return {
          label: "Unknown",
          className:
            "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
        };
    }
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
            {t("billing.refresh")}
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
              {t("billing.usage.percentUsed", {
                percent: Math.round(
                  (testRunsUsage.currentUsage / testRunsUsage.limitValue) * 100,
                ),
              })}
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
                {t("billing.usage.remaining", {
                  count: projectsUsage.limitValue - projectsUsage.currentUsage,
                })}
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
              {t("billing.usage.resetsMonthly")}
            </p>
          </div>
        </section>

        {/* Pricing Plans - REAL DATA */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface">
              {t("billing.plans.title")}
            </h2>
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-surface-container-high rounded-xl p-1">
              <button
                onClick={() => setSelectedBillingCycle(0)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  selectedBillingCycle === 0
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedBillingCycle(1)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  selectedBillingCycle === 1
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Yearly
              </button>
            </div>
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
                        {t(`billing.plans.names.${plan.name?.toLowerCase()}`, {
                          defaultValue: plan.displayName || plan.name,
                        })}
                      </h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-4xl font-bold text-on-surface">
                          {formatCurrency(
                            (selectedBillingCycle === 1
                              ? plan.priceYearly
                              : plan.priceMonthly) ??
                              plan.price ??
                              0,
                          )}
                        </span>

                        <span className="text-on-surface-variant font-medium">
                          /
                          {t(
                            `billing.plans.billingCycle.${selectedBillingCycle === 1 ? "yearly" : "monthly"}`,
                            {
                              defaultValue: selectedBillingCycle === 1 ? "year" : "month",
                            },
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {t(
                          `billing.plans.descriptions.${plan.name?.toLowerCase()}`,
                          {
                            defaultValue:
                              plan.description ||
                              t("billing.plans.noDescription"),
                          },
                        )}
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
                            {t(`billing.plans.limitTypes.${limit.limitType}`, {
                              defaultValue: limit.limitType,
                            })}
                            :{" "}
                            {(limit as any).isUnlimited
                              ? t("common.unlimited", { defaultValue: "Unlimited" })
                              : (limit.limitValue?.toLocaleString() ?? 0)}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-on-surface-variant">
                          {t("billing.plans.noLimits")}
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
                      {isCurrentPlan
                        ? t("billing.plans.currentPlan")
                        : t("billing.plans.subscribe")}
                      {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12 text-on-surface-variant">
                {t("billing.plans.noPlans")}
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
                  payments.map((payment) => {
                    const statusView = getPaymentStatusView(payment.status);
                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-surface-container-low/30 dark:hover:bg-surface-container-high/30 transition-colors"
                      >
                        <td className="px-8 py-5 text-sm font-bold text-on-surface">
                          {payment.id.substring(0, 13)}
                        </td>
                        <td className="px-8 py-5 text-sm text-on-surface-variant">
                          {getPaymentDateText(payment)}
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-on-surface">
                          ${payment.amount.toFixed(2)} {payment.currency}
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={cn(
                              "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase",
                              statusView.className,
                            )}
                          >
                            {statusView.label}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                            <CreditCard className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-on-surface-variant"
                    >
                      {t("billing.history.noPayments")}
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
