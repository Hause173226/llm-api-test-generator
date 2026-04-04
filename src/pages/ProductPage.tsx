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

  const kpis = [
    { label: "Active Teams", value: "320+" },
    { label: "Generated Cases", value: "1.8M" },
    { label: "Avg. Time Saved", value: "46%" },
  ];

  const useCases = [
    {
      title: "Regression at Scale",
      desc: "Keep large endpoint ecosystems stable with repeatable suites and execution gates.",
    },
    {
      title: "API Contract Validation",
      desc: "Verify requests, responses, and edge behavior against evolving specs.",
    },
    {
      title: "Release Confidence",
      desc: "Ship faster with clear run status, diagnostics, and dependency-aware execution.",
    },
  ];

  return (
    <PublicMarketingLayout
      title={t("marketing.product.title")}
      subtitle={t("marketing.product.subtitle")}
    >
      <div className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-3">
              Product Layout Overview
            </p>
            <p className="text-on-surface-variant font-medium leading-relaxed">
              A single workflow from API discovery to execution reporting, with
              a layout designed for high scanning speed and team collaboration.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="grid grid-cols-3 gap-3">
              {[Network, Layers, LayoutDashboard].map((Icon, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container p-4"
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-outline-variant/10 p-5 bg-linear-to-br from-surface to-surface-container-low dark:from-surface-container dark:to-surface-container-high"
            >
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                {kpi.label}
              </p>
              <p className="text-3xl font-black tracking-tight text-on-surface">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((capability) => (
            <div
              key={capability.title}
              className="rounded-2xl border border-outline-variant/10 p-5 bg-surface dark:bg-surface-container hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <capability.icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-bold text-on-surface mb-1">
                {capability.title}
              </p>
              <p className="text-sm text-on-surface-variant font-medium">
                {capability.desc}
              </p>
            </div>
          ))}
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold">
              Why Teams Pick This Product
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="p-4 border-l-4 border-primary/40 bg-surface/50 dark:bg-surface-container/60"
              >
                <p className="font-bold text-on-surface mb-2">
                  {useCase.title}
                </p>
                <p className="text-sm text-on-surface-variant font-medium">
                  {useCase.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-outline-variant/10 p-4 bg-surface/70 dark:bg-surface-container"
            >
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <p className="text-on-surface font-medium">{item}</p>
            </div>
          ))}
        </div>

        <section className="py-2">
          <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-3">
            {t("marketing.product.steps.label")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl bg-surface-container-low dark:bg-surface-container-high p-4"
              >
                <p className="text-xs font-black text-primary mb-2">
                  0{index + 1}
                </p>
                <p className="font-semibold text-on-surface">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-on-surface mb-2">
              Ready to modernize API quality?
            </p>
            <p className="text-on-surface-variant font-medium">
              Build your first intelligent suite in minutes and scale from
              there.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
