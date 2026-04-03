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

export default function EnterprisePage() {
  const { t } = useTranslation();

  const governanceItems = t("marketing.enterprise.governance.items", {
    returnObjects: true,
  }) as string[];

  const trustMetrics = [
    { label: "SLA", value: "99.95%" },
    { label: "Audit Retention", value: "365 days" },
    { label: "Enterprise Accounts", value: "90+" },
  ];

  const deploymentModes = [
    {
      icon: Building2,
      title: "Managed Cloud",
      desc: "Fast onboarding with centralized updates and built-in resilience.",
    },
    {
      icon: Server,
      title: "Hybrid",
      desc: "Keep sensitive workloads in your network while using cloud control plane.",
    },
    {
      icon: LockKeyhole,
      title: "On-prem",
      desc: "Deploy fully inside your infrastructure with strict compliance boundaries.",
    },
  ];

  return (
    <PublicMarketingLayout
      title={t("marketing.enterprise.title")}
      subtitle={t("marketing.enterprise.subtitle")}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-3">
              Enterprise Layout
            </p>
            <p className="text-on-surface-variant font-medium leading-relaxed">
              Security-first architecture for enterprise teams with governance,
              compliance, and deployment flexibility.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[LockKeyhole, ShieldCheck, Building2].map((Icon, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container p-4 min-h-[72px] flex items-center justify-center"
              >
                <Icon className="w-5 h-5 text-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {trustMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-outline-variant/10 p-5 bg-linear-to-br from-surface to-surface-container-low dark:from-surface-container dark:to-surface-container-high h-full"
            >
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                {metric.label}
              </p>
              <p className="text-3xl font-black tracking-tight text-on-surface">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {[
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
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-outline-variant/10 p-5 bg-surface dark:bg-surface-container h-full"
            >
              <item.icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-bold text-on-surface mb-1">{item.title}</p>
              <p className="text-sm text-on-surface-variant font-medium">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <section className="py-1">
          <div className="flex items-center gap-3 mb-4">
            <UserCog className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold">
              {t("marketing.enterprise.governance.label")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            {governanceItems.map((item) => (
              <div
                key={item}
                className="p-4 border-l-4 border-primary/35 bg-surface/50 dark:bg-surface-container/50 h-full"
              >
                <p className="font-semibold text-on-surface">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-1">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold">
              Deployment Options
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {deploymentModes.map((mode) => (
              <div
                key={mode.title}
                className="rounded-2xl border border-outline-variant/10 p-4 bg-surface dark:bg-surface-container h-full"
              >
                <mode.icon className="w-5 h-5 text-primary mb-3" />
                <p className="font-bold text-on-surface mb-1">{mode.title}</p>
                <p className="text-sm text-on-surface-variant font-medium">
                  {mode.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-on-surface mb-2">
              Need enterprise onboarding support?
            </p>
            <p className="text-on-surface-variant font-medium">
              We can help map security controls, rollout strategy, and migration
              plan.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Talk to Sales
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
