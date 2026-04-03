import React from "react";
import { BadgeDollarSign, CheckCircle2, Gem, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import PublicMarketingLayout from "../components/layout/PublicMarketingLayout";

export default function PricingPage() {
  const { t } = useTranslation();
  const [yearly, setYearly] = React.useState(false);

  const plans = [
    {
      name: t("marketing.pricing.plans.starter.name"),
      price: yearly ? "$0" : t("marketing.pricing.plans.starter.price"),
      desc: t("marketing.pricing.plans.starter.desc"),
      highlight: false,
      features: t("marketing.pricing.plans.starter.features", {
        returnObjects: true,
      }) as string[],
    },
    {
      name: t("marketing.pricing.plans.pro.name"),
      price: yearly ? "$39" : t("marketing.pricing.plans.pro.price"),
      desc: t("marketing.pricing.plans.pro.desc"),
      highlight: true,
      features: t("marketing.pricing.plans.pro.features", {
        returnObjects: true,
      }) as string[],
    },
    {
      name: t("marketing.pricing.plans.enterprise.name"),
      price: t("marketing.pricing.plans.enterprise.price"),
      desc: t("marketing.pricing.plans.enterprise.desc"),
      highlight: false,
      features: t("marketing.pricing.plans.enterprise.features", {
        returnObjects: true,
      }) as string[],
    },
  ];

  return (
    <PublicMarketingLayout
      title={t("marketing.pricing.title")}
      subtitle={t("marketing.pricing.subtitle")}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-3">
              Pricing Layout
            </p>
            <p className="text-on-surface-variant font-medium leading-relaxed">
              Transparent plans with a quick visual split for individual,
              product team, and enterprise growth stages.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[BadgeDollarSign, Gem, Info].map((Icon, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container p-4"
              >
                <Icon className="w-5 h-5 text-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-2xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container p-1.5 gap-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                !yearly
                  ? "bg-primary text-white"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                yearly
                  ? "bg-primary text-white"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-6 bg-surface dark:bg-surface-container transition-all ${
                plan.highlight
                  ? "border-primary/30 shadow-xl shadow-primary/15 -translate-y-1"
                  : "border-outline-variant/10"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold">
                  {plan.name}
                </p>
                {plan.highlight && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-white">
                    {t("marketing.pricing.popular")}
                  </span>
                )}
              </div>
              <p className="text-4xl font-black tracking-tight text-on-surface mb-2">
                {plan.price}
                {plan.price.includes("$") && (
                  <span className="text-sm font-semibold text-on-surface-variant ml-1">
                    /month
                  </span>
                )}
              </p>
              <p className="text-on-surface-variant font-medium mb-5">
                {plan.desc}
              </p>

              <div className="space-y-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-primary mt-0.5" />
                    <p className="text-sm font-medium text-on-surface">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <section className="py-1">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold">
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
                className="p-4 border-l-4 border-primary/40 bg-surface/60 dark:bg-surface-container/60 font-medium text-on-surface"
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
