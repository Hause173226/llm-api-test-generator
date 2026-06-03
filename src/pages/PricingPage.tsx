import React from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Gem,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PublicMarketingLayout from "../components/layout/PublicMarketingLayout";
import {
  Eyebrow,
  MarketingCard,
  Reveal,
  Section,
  SectionHeading,
  Stagger,
  StaggerItem,
} from "../components/marketing/MarketingPrimitives";
import subscriptionService, {
  Plan,
  PlanLimit,
} from "../services/subscriptionService";

type ComparisonPoint = string | { key: string; value: string };

type PricingPlanViewModel = {
  id: string;
  name: string;
  rawName: string;
  price: string;
  priceSuffix: string | null;
  desc: string;
  highlight: boolean;
  features: string[];
  isContactPlan: boolean;
  monthlyValue: number | null;
  yearlyValue: number | null;
};

const isHiddenTestPlan = (plan: Pick<Plan, "name" | "displayName">) => {
  const normalizedName = `${plan.name ?? ""} ${plan.displayName ?? ""}`
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return normalizedName.includes("testplan");
};

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const [yearly, setYearly] = React.useState(false);
  const [plansFromBe, setPlansFromBe] = React.useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);
  const [plansError, setPlansError] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const loadPlans = async () => {
      setLoadingPlans(true);
      setPlansError(false);

      try {
        const plans = await subscriptionService.getPlansPublic();
        if (!mounted) return;
        setPlansFromBe(Array.isArray(plans) ? plans : []);
      } catch {
        if (!mounted) return;
        setPlansFromBe([]);
        setPlansError(true);
      } finally {
        if (mounted) {
          setLoadingPlans(false);
        }
      }
    };

    loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  const formatPrice = React.useCallback(
    (value?: number | null, currency?: string | null) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
      }

      const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
      const normalizedCurrency = currency?.toUpperCase();

      if (normalizedCurrency) {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: normalizedCurrency,
          maximumFractionDigits: 0,
        }).format(value);
      }

      return Number(value).toLocaleString(locale);
    },
    [i18n.language],
  );

  const formatLimitLabel = React.useCallback(
    (limitType: string) => {
      const labels =
        i18n.language === "vi"
          ? {
              MaxProjects: "Dự án",
              MaxEndpointsPerProject: "Endpoint mỗi dự án",
              MaxTestCasesPerSuite: "Test case mỗi suite",
              MaxTestRunsPerMonth: "Lượt chạy mỗi tháng",
              MaxConcurrentRuns: "Lượt chạy đồng thời",
              RetentionDays: "Ngày lưu trữ",
              MaxLlmCallsPerMonth: "Lượt gọi AI mỗi tháng",
              MaxStorageMB: "Dung lượng lưu trữ (MB)",
            }
          : {
              MaxProjects: "Projects",
              MaxEndpointsPerProject: "Endpoints per project",
              MaxTestCasesPerSuite: "Test cases per suite",
              MaxTestRunsPerMonth: "Test runs per month",
              MaxConcurrentRuns: "Concurrent runs",
              RetentionDays: "Retention days",
              MaxLlmCallsPerMonth: "LLM calls per month",
              MaxStorageMB: "Storage (MB)",
            };

      return (
        labels[limitType as keyof typeof labels] ??
        limitType
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/[_-]+/g, " ")
          .trim()
      );
    },
    [i18n.language],
  );

  const formatLimitValue = React.useCallback(
    (limit?: PlanLimit) => {
      if (limit?.isUnlimited) {
        return i18n.language === "vi" ? "Không giới hạn" : "Unlimited";
      }

      if (
        limit?.limitValue === null ||
        limit?.limitValue === undefined ||
        Number.isNaN(limit.limitValue)
      ) {
        return i18n.language === "vi" ? "Theo nhu cầu" : "Custom";
      }

      return Number(limit.limitValue).toLocaleString(
        i18n.language === "vi" ? "vi-VN" : "en-US",
      );
    },
    [i18n.language],
  );

  const plans = React.useMemo<PricingPlanViewModel[]>(() => {
    if (plansFromBe.length === 0) {
      return [];
    }

    const sorted = [...plansFromBe]
      .filter((plan) => plan.isActive !== false)
      .filter((plan) => !isHiddenTestPlan(plan))
      .sort((a, b) => {
        const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

        if (ao !== bo) {
          return ao - bo;
        }

        return String(a.name || "").localeCompare(String(b.name || ""));
      });

    return sorted.map((plan) => {
      const monthlyValue =
        plan.priceMonthly ?? (typeof plan.price === "number" ? plan.price : null);
      const yearlyValue = plan.priceYearly ?? null;
      const chosenValue = yearly ? yearlyValue ?? monthlyValue : monthlyValue;
      const planName = plan.displayName || plan.name || "Plan";
      const displayPrice = formatPrice(chosenValue, plan.currency);
      const isEnterpriseNamed = /enterprise|doanh/i.test(planName);
      const hasUnlimitedLimits = plan.limits?.some((limit) => limit.isUnlimited);
      const isContactPlan =
        chosenValue === null || (isEnterpriseNamed && Boolean(hasUnlimitedLimits));
      const features = (plan.limits || []).map((limit) => {
        return `${formatLimitLabel(limit.limitType)}: ${formatLimitValue(limit)}`;
      });

      return {
        id: plan.id,
        name: planName,
        rawName: plan.name || planName,
        price: displayPrice ?? (i18n.language === "vi" ? "Liên hệ" : "Contact"),
        priceSuffix: isContactPlan
          ? null
          : yearly
            ? t("marketing.pricing.page.billedYearly")
            : t("marketing.pricing.page.perMonth"),
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
          features.length > 0
            ? features
            : [
                i18n.language === "vi"
                  ? "Thông số giới hạn sẽ được cập nhật."
                  : "Limits will be updated",
              ],
        isContactPlan,
        monthlyValue,
        yearlyValue,
      };
    });
  }, [
    plansFromBe,
    yearly,
    formatPrice,
    formatLimitLabel,
    formatLimitValue,
    i18n.language,
    t,
  ]);

  const heroMetrics = React.useMemo(() => {
    if (plans.length === 0) {
      return [
        { label: t("marketing.pricing.page.metrics.starter"), value: "—" },
        {
          label: t("marketing.pricing.page.metrics.preferredPlan"),
          value: "—",
        },
        {
          label: t("marketing.pricing.page.metrics.buyerPath"),
          value: "—",
        },
      ];
    }

    const firstPlan = plans[0];
    const highlightedPlan = plans.find((plan) => plan.highlight) ?? plans[0];
    const contactPlan =
      plans.find((plan) => plan.isContactPlan) ?? plans[plans.length - 1];

    return [
      {
        label: firstPlan.name,
        value: firstPlan.price,
      },
      {
        label: t("marketing.pricing.page.metrics.preferredPlan"),
        value: highlightedPlan.name,
      },
      {
        label: t("marketing.pricing.page.metrics.buyerPath"),
        value: contactPlan.name,
      },
    ];
  }, [plans, t]);

  const comparisonPoints = React.useMemo<ComparisonPoint[]>(() => {
    if (plans.length === 0) {
      return [
        t("marketing.pricing.page.comparison.projects"),
        t("marketing.pricing.page.comparison.generation"),
        t("marketing.pricing.page.comparison.governance"),
        t("marketing.pricing.page.comparison.support"),
      ];
    }

    return plans
      .flatMap((plan) =>
        plan.features.slice(0, plan.highlight ? 2 : 1).map((feature) => ({
          key: `${plan.id}-${feature}`,
          value: `${plan.name}: ${feature}`,
        })),
      )
      .slice(0, 4);
  }, [plans, t]);

  return (
    <PublicMarketingLayout
      variant="control"
      title={t("marketing.pricing.title")}
      subtitle={t("marketing.pricing.subtitle")}
      eyebrow={t("marketing.pricing.page.eyebrow")}
      heroMetrics={heroMetrics}
      heroSlot={
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-[24px] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96),rgba(15,23,42,0.98))] p-5 text-white shadow-[0_24px_56px_-34px_rgba(49,46,129,0.45)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("marketing.pricing.page.hero.label")}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  {t("marketing.pricing.page.hero.title")}
                </div>
              </div>
              <Gem className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-indigo-400/80 via-cyan-400/50 to-transparent" />
          </div>
          <div className="mt-4 grid gap-3">
            {(
              t("marketing.pricing.page.phases", {
                returnObjects: true,
              }) as string[]
            ).map((phase, index) => (
              <div
                key={phase}
                className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.94))]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {phase}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    0{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <Section>
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,246,249,0.9))] p-1.5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.16)] backdrop-blur dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.94))]">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                !yearly
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {t("pages.BillingPage.monthly")}
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                yearly
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {t("pages.BillingPage.yearly")}
            </button>
          </div>
        </div>
      </Section>

      <Section className="pt-16">
        <Reveal>
          <SectionHeading
            eyebrow={<Eyebrow>{t("marketing.pricing.page.packagesEyebrow")}</Eyebrow>}
            title={t("marketing.pricing.page.packagesTitle")}
            description={t("marketing.pricing.page.packagesDesc")}
            align="center"
            className="max-w-3xl"
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <MarketingCard
                className={`h-full ${
                  plan.highlight
                    ? "border-slate-900/85 bg-[linear-gradient(180deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96),rgba(15,23,42,0.99))] text-white shadow-[0_38px_110px_-58px_rgba(49,46,129,0.48)] dark:border-slate-700/90"
                    : ""
                }`}
                tone="control"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${plan.highlight ? "text-slate-400" : "text-slate-400"}`}>
                    {plan.name}
                  </div>
                  {plan.highlight ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-950">
                      {t("marketing.pricing.popular")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-7">
                  <div className={`text-4xl font-semibold tracking-[-0.06em] sm:text-5xl ${plan.highlight ? "text-white" : "text-slate-950 dark:text-white"}`}>
                    {plan.price}
                  </div>
                  {plan.priceSuffix ? (
                    <div className={`mt-2 text-sm font-medium ${plan.highlight ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                      {plan.priceSuffix}
                    </div>
                  ) : null}
                </div>

                <p className={`mt-5 text-sm leading-7 ${plan.highlight ? "text-slate-300" : "text-slate-600 dark:text-slate-300"}`}>
                  {plan.desc}
                </p>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={`${plan.id}-${feature}`} className="flex items-start gap-3">
                      <CheckCircle2 className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${plan.highlight ? "text-cyan-300" : "text-cyan-500"}`} />
                      <p className={`text-sm leading-7 ${plan.highlight ? "text-slate-200" : "text-slate-700 dark:text-slate-200"}`}>
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <div
                    className={`inline-flex rounded-2xl px-4 py-3 text-sm font-semibold ${
                      plan.highlight
                        ? "bg-white text-slate-950"
                        : "border border-slate-200/80 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {plan.isContactPlan
                      ? t("marketing.pricing.page.talkToSales")
                      : t("marketing.pricing.page.startEvaluation")}
                  </div>
                </div>
              </MarketingCard>
            </StaggerItem>
          ))}
        </Stagger>

        {loadingPlans ? (
          <p className="mt-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("marketing.pricing.page.loading")}
          </p>
        ) : null}

        {!loadingPlans && plans.length === 0 ? (
          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {plansError ? t("billing.plans.noPlans") : t("billing.plans.noPlans")}
          </p>
        ) : null}
      </Section>

      <Section className="pt-24">
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <Reveal>
            <div className="rounded-[36px] border border-slate-900/85 bg-[linear-gradient(180deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96),rgba(15,23,42,0.99))] p-6 text-white shadow-[0_34px_96px_-56px_rgba(49,46,129,0.42)] dark:border-slate-800 sm:p-8">
              <Eyebrow className="border-white/15 bg-white/5 text-slate-300">
                {t("marketing.pricing.page.buyerTrustEyebrow")}
              </Eyebrow>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {t("marketing.pricing.page.buyerTrustTitle")}
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                {t("marketing.pricing.page.buyerTrustDesc")}
              </p>
            </div>
          </Reveal>

          <Stagger className="grid gap-4 sm:grid-cols-2">
            {comparisonPoints.map((point, index) => (
              <StaggerItem key={typeof point === "string" ? point : point.key}>
                <MarketingCard tone="control" className={index === 3 ? "sm:col-span-2" : ""}>
                  {index < 2 ? (
                    <BadgeDollarSign className="h-5 w-5 text-indigo-500" />
                  ) : index === 2 ? (
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  ) : (
                    <Info className="h-5 w-5 text-cyan-500" />
                  )}
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {typeof point === "string" ? point : point.value}
                  </p>
                </MarketingCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>
    </PublicMarketingLayout>
  );
}
