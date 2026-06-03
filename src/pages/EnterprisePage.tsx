import React from "react";
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Server,
  ShieldCheck,
  UserCog,
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

export default function EnterprisePage() {
  const { t } = useTranslation();

  const governanceItems = t("marketing.enterprise.governance.items", {
    returnObjects: true,
  }) as string[];

  const deploymentModes = [
    {
      icon: Building2,
      title: t("marketing.enterprise.page.deployment.managed.title"),
      desc: t("marketing.enterprise.page.deployment.managed.desc"),
    },
    {
      icon: Server,
      title: t("marketing.enterprise.page.deployment.hybrid.title"),
      desc: t("marketing.enterprise.page.deployment.hybrid.desc"),
    },
    {
      icon: LockKeyhole,
      title: t("marketing.enterprise.page.deployment.onPrem.title"),
      desc: t("marketing.enterprise.page.deployment.onPrem.desc"),
    },
  ];

  const enterpriseFeatures = [
    {
      icon: LockKeyhole,
      title: t("marketing.enterprise.features.identity.title"),
      desc: t("marketing.enterprise.features.identity.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("marketing.enterprise.features.compliance.title"),
      desc: t("marketing.enterprise.features.compliance.desc"),
    },
    {
      icon: Building2,
      title: t("marketing.enterprise.features.deployment.title"),
      desc: t("marketing.enterprise.features.deployment.desc"),
    },
  ];

  return (
    <PublicMarketingLayout
      variant="control"
      title={t("marketing.enterprise.title")}
      subtitle={t("marketing.enterprise.subtitle")}
      eyebrow={t("marketing.enterprise.page.eyebrow")}
      heroMetrics={[
        { label: t("marketing.enterprise.page.metrics.sla"), value: "99.95%" },
        { label: t("marketing.enterprise.page.metrics.auditRetention"), value: "365 days" },
        { label: t("marketing.enterprise.page.metrics.enterpriseAccounts"), value: "90+" },
      ]}
      heroSlot={
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-[24px] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96),rgba(15,23,42,0.98))] p-5 text-white shadow-[0_24px_56px_-34px_rgba(49,46,129,0.45)] dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t("marketing.enterprise.page.hero.label")}
            </div>
            <div className="mt-3 text-xl font-semibold tracking-[-0.04em]">
              {t("marketing.enterprise.page.hero.title")}
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-indigo-400/80 via-cyan-400/50 to-transparent" />
          </div>
          <div className="mt-4 grid gap-3">
            {(
              t("marketing.enterprise.page.hero.items", {
                returnObjects: true,
              }) as string[]
            ).map((item, index) => (
              <div
                key={item}
                className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.94))]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">
                    {item}
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
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal>
            <div className="rounded-[36px] border border-slate-900/85 bg-[linear-gradient(180deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96),rgba(15,23,42,0.99))] p-6 text-white shadow-[0_34px_96px_-56px_rgba(49,46,129,0.42)] dark:border-slate-800 sm:p-8">
              <Eyebrow className="border-white/15 bg-white/5 text-slate-300">
                {t("marketing.enterprise.page.overview.eyebrow")}
              </Eyebrow>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {t("marketing.enterprise.page.overview.title")}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                {t("marketing.enterprise.page.overview.desc")}
              </p>
            </div>
          </Reveal>

          <Stagger className="grid gap-4 md:grid-cols-3">
            {enterpriseFeatures.map((item) => (
              <StaggerItem key={item.title}>
                <MarketingCard tone="control" className="h-full">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.desc}
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
            eyebrow={<Eyebrow>{t("marketing.enterprise.governance.label")}</Eyebrow>}
            title={t("marketing.enterprise.page.governanceTitle")}
            description={t("marketing.enterprise.page.governanceDesc")}
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {governanceItems.map((item) => (
              <StaggerItem key={item}>
                <MarketingCard tone="control" className="h-full">
                  <UserCog className="h-5 w-5 text-indigo-500" />
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {item}
                  </p>
                </MarketingCard>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.08}>
            <div className="grid gap-4">
              <MetricChip tone="control" label={t("marketing.enterprise.page.metrics.identityControls")} value="SSO + RBAC" />
              <MetricChip tone="control" label={t("marketing.enterprise.page.metrics.deploymentFit")} value={t("marketing.enterprise.page.metrics.cloudToOnPrem")} />
              <MetricChip tone="control" label={t("marketing.enterprise.page.metrics.approvalPath")} value={t("marketing.enterprise.page.metrics.policyAware")} />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="pt-24">
        <Reveal>
          <SectionHeading
            eyebrow={<Eyebrow>{t("pages.EnterprisePage.deployment_options")}</Eyebrow>}
            title={t("marketing.enterprise.page.deploymentTitle")}
            description={t("marketing.enterprise.page.deploymentDesc")}
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-4 lg:grid-cols-3">
          {deploymentModes.map((mode, index) => (
            <StaggerItem key={mode.title}>
              <MarketingCard tone="control">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <mode.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  {mode.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {mode.desc}
                </p>
              </MarketingCard>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="pt-24">
        <Reveal>
          <div className="flex flex-col gap-5 rounded-[38px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(243,246,249,0.94),rgba(226,232,240,0.9))] p-6 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.94),rgba(15,23,42,0.92),rgba(30,41,59,0.88))] sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div>
              <Eyebrow>{t("marketing.enterprise.page.cta.eyebrow")}</Eyebrow>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                {t("pages.EnterprisePage.need_enterprise_onboarding_support")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("marketing.enterprise.page.cta.desc")}
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {t("pages.EnterprisePage.talk_to_sales")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Section>
    </PublicMarketingLayout>
  );
}
