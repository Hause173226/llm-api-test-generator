import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Layers,
  LineChart,
  Network,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicMarketingLayout from "../components/layout/PublicMarketingLayout";
import {
  Eyebrow,
  MarketingCard,
  MetricChip,
  Reveal,
  Section,
  SectionHeading,
  Stagger,
  StaggerItem,
} from "../components/marketing/MarketingPrimitives";

export default function ProductPage() {
  const { t } = useTranslation();

  const items = t("marketing.product.checklist", {
    returnObjects: true,
  }) as string[];

  const capabilities = [
    {
      icon: Network,
      title: t("marketing.product.capabilities.discovery.title"),
      desc: t("marketing.product.capabilities.discovery.desc"),
    },
    {
      icon: Layers,
      title: t("marketing.product.capabilities.studio.title"),
      desc: t("marketing.product.capabilities.studio.desc"),
    },
    {
      icon: Rocket,
      title: t("marketing.product.capabilities.runs.title"),
      desc: t("marketing.product.capabilities.runs.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("marketing.product.capabilities.gate.title"),
      desc: t("marketing.product.capabilities.gate.desc"),
    },
  ];

  const steps = t("marketing.product.steps.items", {
    returnObjects: true,
  }) as string[];

  return (
    <PublicMarketingLayout
      variant="editorial"
      title={t("marketing.product.title")}
      subtitle={t("marketing.product.subtitle")}
      eyebrow={t("marketing.product.page.eyebrow")}
      heroMetrics={[
        { label: t("marketing.product.page.metrics.activeTeams"), value: "320+" },
        { label: t("marketing.product.page.metrics.generatedCases"), value: "1.8M" },
        { label: t("marketing.product.page.metrics.timeSaved"), value: "46%" },
      ]}
      heroSlot={
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-[24px] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94),rgba(15,23,42,0.98))] p-5 text-white shadow-[0_24px_56px_-34px_rgba(8,47,73,0.42)] dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("marketing.product.page.hero.label")}
                </div>
                <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-white">
                  {t("marketing.product.page.hero.title")}
                </div>
              </div>
              <LayoutDashboard className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-cyan-400/80 via-indigo-400/50 to-transparent" />
          </div>

          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[24px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,248,250,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-slate-800 dark:bg-slate-900/84"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {step}
                  </div>
                  <div className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-950">
                    0{index + 1}
                  </div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-indigo-500"
                    style={{ width: `${(index + 1) * 30}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricChip tone="editorial" label={t("marketing.product.page.metrics.suiteVelocity")} value="+28%" />
            <MetricChip tone="editorial" label={t("marketing.product.page.metrics.releaseBlockers")} value="-41%" />
          </div>
        </div>
      }
    >
      <Section>
        <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <Reveal>
            <div className="relative overflow-hidden rounded-[36px] border border-slate-900/85 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95),rgba(15,23,42,0.98))] p-6 text-white shadow-[0_34px_90px_-54px_rgba(8,47,73,0.46)] sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_30%)]" />
              <div className="relative">
                <Eyebrow className="border-white/15 bg-white/5 text-slate-300">
                  {t("marketing.product.page.overview.eyebrow")}
                </Eyebrow>
                <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  {t("marketing.product.page.overview.title")}
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                  {t("marketing.product.page.overview.desc")}
                </p>
              </div>
            </div>
          </Reveal>

          <Stagger className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <StaggerItem key={item}>
                <MarketingCard tone="editorial" className="h-full">
                  <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {item}
                  </p>
                </MarketingCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section className="pt-24">
        <Reveal>
          <SectionHeading
            eyebrow={<Eyebrow>{t("marketing.product.page.storytelling.eyebrow")}</Eyebrow>}
            title={t("marketing.product.page.storytelling.title")}
            description={t("marketing.product.page.storytelling.desc")}
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-4 lg:grid-cols-2">
          {capabilities.map((capability, index) => (
            <StaggerItem key={capability.title}>
              <MarketingCard
                className={index === 0 ? "border-slate-900/85 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95),rgba(15,23,42,0.98))] text-white" : ""}
                tone={index === 0 ? "default" : "editorial"}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index === 0 ? "bg-white text-slate-950" : "bg-slate-950 text-white dark:bg-white dark:text-slate-950"}`}>
                    <capability.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${index === 0 ? "text-slate-400" : "text-slate-400"}`}>
                    {t("marketing.product.page.moduleLabel", { index: `0${index + 1}` })}
                  </span>
                </div>
                <h3 className={`mt-8 text-2xl font-semibold tracking-[-0.04em] ${index === 0 ? "text-white" : "text-slate-950 dark:text-white"}`}>
                  {capability.title}
                </h3>
                <p className={`mt-3 max-w-lg text-sm leading-7 ${index === 0 ? "text-slate-300" : "text-slate-600 dark:text-slate-300"}`}>
                  {capability.desc}
                </p>
              </MarketingCard>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="pt-24">
        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <Reveal>
            <MarketingCard tone="editorial" className="overflow-hidden p-0">
              <div className="border-b border-slate-200/80 px-6 py-5 dark:border-slate-800 sm:px-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <LineChart className="h-[18px] w-[18px] text-cyan-500" />
                  {t("marketing.product.page.delivery.label")}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  {t("marketing.product.page.delivery.title")}
                </h3>
              </div>
              <div className="grid gap-0 md:grid-cols-3">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className="border-t border-slate-200/80 px-6 py-6 dark:border-slate-800 md:border-l md:first:border-l-0 sm:px-8"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {t("marketing.product.page.stageLabel", { index: `0${index + 1}` })}
                    </div>
                    <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-200">
                      {step}
                    </p>
                    <div className="mt-5 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-indigo-500"
                        style={{ width: `${(index + 1) * 30}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </MarketingCard>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="grid gap-4">
              <MetricChip tone="editorial" label={t("marketing.product.page.metrics.crossEnvironment")} value="24/7" />
              <MetricChip tone="editorial" label={t("marketing.product.page.metrics.reviewLoop")} value="< 10 min" />
              <MetricChip tone="editorial" label={t("marketing.product.page.metrics.confidenceSignal")} value={t("marketing.product.page.metrics.confidenceReady")} />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="pt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[38px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,247,242,0.94),rgba(232,241,247,0.88))] p-6 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.24)] sm:flex sm:items-end sm:justify-between sm:gap-6 sm:p-8 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.94),rgba(15,23,42,0.92),rgba(30,41,59,0.88))]">
            <div>
              <Eyebrow>{t("marketing.product.page.cta.eyebrow")}</Eyebrow>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                {t("marketing.product.page.cta.title")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("marketing.product.page.cta.desc")}
              </p>
            </div>
            <Link
              to="/register"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 sm:mt-0"
            >
              {t("marketing.product.page.cta.button")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Section>
    </PublicMarketingLayout>
  );
}
