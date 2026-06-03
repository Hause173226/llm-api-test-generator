import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  Network,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import MarketingChrome from "../components/marketing/MarketingChrome";
import {
  ButtonLink,
  Eyebrow,
  MarketingCard,
  MetricChip,
  Reveal,
  Section,
  SectionHeading,
  Stagger,
  StaggerItem,
} from "../components/marketing/MarketingPrimitives";

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Network,
      title: t("landing.features.items.discovery.title"),
      desc: t("landing.features.items.discovery.desc"),
    },
    {
      icon: Sparkles,
      title: t("landing.features.items.generation.title"),
      desc: t("landing.features.items.generation.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("landing.features.items.healing.title"),
      desc: t("landing.features.items.healing.desc"),
    },
    {
      icon: Zap,
      title: t("landing.features.items.diagnostics.title"),
      desc: t("landing.features.items.diagnostics.desc"),
    },
    {
      icon: Globe,
      title: t("landing.features.items.execution.title"),
      desc: t("landing.features.items.execution.desc"),
    },
    {
      icon: Layers,
      title: t("landing.features.items.mapping.title"),
      desc: t("landing.features.items.mapping.desc"),
    },
  ];

  const benefits = t("landing.social.benefits", {
    returnObjects: true,
  }) as string[];

  const heroSignals = [
    {
      label: t("marketing.landing.heroSignals.context.label"),
      value: t("marketing.landing.heroSignals.context.value"),
    },
    {
      label: t("marketing.landing.heroSignals.generation.label"),
      value: t("marketing.landing.heroSignals.generation.value"),
    },
    {
      label: t("marketing.landing.heroSignals.feedback.label"),
      value: t("marketing.landing.heroSignals.feedback.value"),
    },
  ];

  return (
    <MarketingChrome>
      <Section className="pt-8 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:items-end">
          <Reveal>
            <div className="relative overflow-hidden rounded-[42px] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,247,242,0.94)_40%,rgba(232,241,247,0.9))] px-6 py-8 shadow-[0_38px_110px_-60px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94)_42%,rgba(30,41,59,0.88))] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <div className="pointer-events-none absolute inset-0 opacity-[0.26] [background-image:linear-gradient(to_right,rgba(100,116,139,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.14)_1px,transparent_1px)] [background-size:84px_84px] dark:opacity-[0.08]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_70%)]" />
              <div className="relative">
                <Eyebrow>{t("marketing.landing.heroEyebrow")}</Eyebrow>
                <h1 className="mt-7 max-w-5xl text-5xl font-semibold tracking-[-0.07em] text-slate-950 sm:text-6xl lg:text-7xl xl:text-[5.7rem] xl:leading-[0.9] dark:text-white">
                  <Trans i18nKey="landing.hero.title">
                    Autonomous API Testing{" "}
                    <span className="text-slate-500 dark:text-slate-300">
                      Powered by Intelligence.
                    </span>
                  </Trans>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {t("landing.hero.subtitle")}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                  >
                    {t("landing.hero.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300/80 bg-white/84 px-6 py-4 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/84 dark:text-slate-200 dark:hover:border-slate-600"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {t("landing.hero.watchDemo")}
                  </button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  <MetricChip tone="editorial" label={t("landing.social.stats.executed")} value="12M+" />
                  <MetricChip tone="editorial" label={t("landing.social.stats.uptime")} value="99.9%" />
                  <MetricChip tone="editorial" label={t("landing.social.stats.rating")} value="4.8/5" />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-[40px] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96),rgba(15,23,42,0.99))] p-5 text-white shadow-[0_40px_120px_-58px_rgba(15,23,42,0.85)] dark:border-slate-800">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_30%)]" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:72px_72px]" />
              <div className="relative">
                <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {t("marketing.landing.orchestration.label")}
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-white">
                      {t("marketing.landing.orchestration.title")}
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    {t("marketing.landing.orchestration.status")}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {heroSignals.map((signal, index) => (
                    <div
                      key={signal.label}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          {signal.label}
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          0{index + 1}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {signal.value}
                      </p>
                      <div className="mt-4 h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-indigo-500"
                          style={{ width: `${70 + index * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {t("marketing.landing.metrics.coverage")}
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                      +38%
                    </div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">
                      Multi-source endpoint discovery and higher suite breadth in one control loop.
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {t("marketing.landing.metrics.confidence")}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-300">
                      {t("marketing.landing.metrics.confidenceDesc")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="pt-18 sm:pt-20">
        <Reveal>
          <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="relative overflow-hidden rounded-[36px] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95),rgba(15,23,42,0.98))] p-6 text-white shadow-[0_34px_90px_-54px_rgba(8,47,73,0.48)] sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_30%)]" />
              <div className="relative">
                <Eyebrow className="border-white/10 bg-white/5 text-slate-300">
                  {t("marketing.landing.editorial.label")}
                </Eyebrow>
                <h2 className="mt-6 max-w-md text-4xl font-semibold tracking-[-0.05em] text-white">
                  {t("marketing.landing.editorial.title")}
                </h2>
                <div className="mt-8 space-y-4">
                  {benefits.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                    >
                      <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] text-cyan-300" />
                      <span className="text-sm leading-7 text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => (
                <MarketingCard key={feature.title} tone="editorial" className={index === 0 ? "sm:col-span-2" : ""}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {feature.desc}
                  </p>
                </MarketingCard>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>

      <Section className="pt-24">
        <Reveal>
          <SectionHeading
            eyebrow={<Eyebrow>{t("landing.features.title")}</Eyebrow>}
            title={t("marketing.landing.featuresEditorialTitle")}
            description={t("landing.features.subtitle")}
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="rounded-[36px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,250,0.92),rgba(232,240,248,0.86))] p-6 shadow-[0_24px_90px_-54px_rgba(15,23,42,0.18)] backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.94),rgba(30,41,59,0.88))]">
              <Eyebrow>{t("marketing.landing.executionEyebrow")}</Eyebrow>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
                {t("landing.social.title")}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
                {t("landing.social.subtitle")}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <MetricChip tone="editorial" label={t("landing.social.stats.executed")} value="12M+" />
                <MetricChip tone="editorial" label={t("landing.social.stats.uptime")} value="99.9%" />
                <MetricChip tone="editorial" label={t("landing.social.stats.rating")} value="4.8/5" />
              </div>
            </div>
          </Reveal>

          <Stagger className="grid gap-3">
            {benefits.slice(0, 4).map((item) => (
              <StaggerItem key={item}>
                <MarketingCard tone="editorial" className="p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-cyan-500" />
                    <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                      {item}
                    </p>
                  </div>
                </MarketingCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section className="pb-4 pt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] border border-slate-900/85 bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(17,24,39,0.96),rgba(15,23,42,0.99))] px-6 py-8 text-white shadow-[0_40px_120px_-62px_rgba(15,23,42,0.88)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.18),transparent_28%)]" />
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="relative">
                <Eyebrow className="border-white/15 bg-white/5 text-slate-300">
                  {t("marketing.landing.ctaEyebrow")}
                </Eyebrow>
                <h2 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                  {t("landing.cta.title")}
                </h2>
                <p className="mt-5 text-sm uppercase tracking-[0.22em] text-slate-400">
                  {t("landing.cta.trial")}
                </p>
              </div>
              <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col">
                <ButtonLink to="/register" variant="primary" className="dark:bg-white dark:text-slate-950">
                  {t("landing.cta.button")}
                </ButtonLink>
                <ButtonLink to="/enterprise" variant="secondary" className="border-white/15 bg-white/5 text-white hover:bg-white/10 dark:border-white/15 dark:bg-white/5 dark:text-white">
                  {t("landing.cta.contact")}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </MarketingChrome>
  );
}
