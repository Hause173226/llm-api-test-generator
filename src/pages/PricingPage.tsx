import React from "react";
import { BadgeDollarSign, CheckCircle2, Gem, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import PublicMarketingLayout from "../components/layout/PublicMarketingLayout";
import subscriptionService, { Plan } from "../services/subscriptionService";

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const [yearly, setYearly] = React.useState(false);
  const [plansFromBe, setPlansFromBe] = React.useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      setLoadingPlans(true);
      try {
        const plans = await subscriptionService.getPlansPublic();
        if (!mounted) return;
        setPlansFromBe(Array.isArray(plans) ? plans : []);
      } catch {
        if (!mounted) return;
        setPlansFromBe([]);
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const formatPrice = React.useCallback(
    (value?: number | null, currency?: string) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
      }
      const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
      if (currency && currency.toUpperCase() !== "USD") {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency.toUpperCase(),
          maximumFractionDigits: 0,
        }).format(value);
      }
      return `$${Number(value).toLocaleString(locale)}`;
    },
    [i18n.language],
  );

  const fallbackPlans = [
    {
      id: "starter",
      name: t("marketing.pricing.plans.starter.name"),
      price: yearly ? "$0" : t("marketing.pricing.plans.starter.price"),
      desc: t("marketing.pricing.plans.starter.desc"),
      highlight: false,
      features: t("marketing.pricing.plans.starter.features", {
        returnObjects: true,
      }) as string[],
      source: "fallback" as const,
    },
    {
      id: "pro",
      name: t("marketing.pricing.plans.pro.name"),
      price: yearly ? "$39" : t("marketing.pricing.plans.pro.price"),
      desc: t("marketing.pricing.plans.pro.desc"),
      highlight: true,
      features: t("marketing.pricing.plans.pro.features", {
        returnObjects: true,
      }) as string[],
      source: "fallback" as const,
    },
    {
      id: "enterprise",
      name: t("marketing.pricing.plans.enterprise.name"),
      price: t("marketing.pricing.plans.enterprise.price"),
      desc: t("marketing.pricing.plans.enterprise.desc"),
      highlight: false,
      features: t("marketing.pricing.plans.enterprise.features", {
        returnObjects: true,
      }) as string[],
      source: "fallback" as const,
    },
  ];

  const plans = React.useMemo(() => {
    if (plansFromBe.length === 0) return fallbackPlans;

    const sorted = [...plansFromBe].sort((a, b) => {
      const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return sorted.map((plan) => {
      const monthlyValue =
        plan.priceMonthly ?? (typeof plan.price === "number" ? plan.price : null);
      const yearlyValue = plan.priceYearly ?? null;
      const chosenValue = yearly ? yearlyValue ?? monthlyValue : monthlyValue;
      const displayPrice = formatPrice(chosenValue, plan.currency);
      const isContactPlan =
        displayPrice === null ||
        /enterprise|doanh/i.test(plan.name || "") && chosenValue === null;
      const planName = plan.displayName || plan.name || "Plan";
      const featuresFromLimits =
        Array.isArray(plan.limits) && plan.limits.length > 0
          ? plan.limits.map((limit) => {
              const valueText =
                limit.limitValue < 0
                  ? i18n.language === "vi"
                    ? "Không giới hạn"
                    : "Unlimited"
                  : Number(limit.limitValue).toLocaleString(
                      i18n.language === "vi" ? "vi-VN" : "en-US",
                    );
              return `${limit.limitType}: ${valueText}`;
            })
          : [];

      return {
        id: plan.id,
        name: planName,
        price:
          displayPrice ??
          (i18n.language === "vi" ? "Liên hệ" : "Contact"),
        desc:
          plan.description ||
          t("marketing.pricing.plans.noDescription", {
            defaultValue:
              i18n.language === "vi"
                ? "Thông tin gói sẽ được cập nhật."
                : "Plan details will be updated.",
          }),
        highlight: /pro|professional/i.test(planName),
        features:
          featuresFromLimits.length > 0
            ? featuresFromLimits
            : [
                i18n.language === "vi"
                  ? "Thông số giới hạn sẽ được cập nhật"
                  : "Limits will be updated",
              ],
        source: "be" as const,
        isContactPlan,
      };
    });
  }, [plansFromBe, fallbackPlans, yearly, formatPrice, i18n.language, t]);

  return (
    <PublicMarketingLayout
      title={t("marketing.pricing.title")}
      subtitle={t("marketing.pricing.subtitle")}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-3">
              Pricing Layout
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Transparent plans with clean growth paths from individual teams to
              enterprise deployment.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[BadgeDollarSign, Gem, Info].map((Icon, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 p-4"
              >
                <Icon className="w-5 h-5 text-indigo-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1.5 gap-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                !yearly
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                yearly
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 bg-white dark:bg-slate-900 transition-all ${
                plan.highlight
                  ? "border-indigo-400/50 shadow-xl shadow-indigo-500/25 -translate-y-1"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
                  {plan.name}
                </p>
                {plan.highlight && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white">
                    {t("marketing.pricing.popular")}
                  </span>
                )}
              </div>
              <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                {plan.price}
                {String(plan.price).includes("$") && (
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">
                    /month
                  </span>
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium mb-5">
                {plan.desc}
              </p>

              <div className="space-y-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500 mt-0.5" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {loadingPlans && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {i18n.language === "vi"
              ? "Đang tải bảng giá từ hệ thống..."
              : "Loading plans from backend..."}
          </p>
        )}

        <section className="py-1">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-indigo-500" />
            <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
              Feature Comparison Snapshot
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            {[
              "Unlimited projects on Pro & Enterprise",
              "LLM-powered generation from Pro",
              "SSO and governance controls on Enterprise",
              "Email support for all plans",
            ].map((point) => (
              <div
                key={point}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
              >
                {point}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicMarketingLayout>
  );
}
