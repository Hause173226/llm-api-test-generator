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

  return (
    <PublicMarketingLayout
      title={t("marketing.product.title")}
      subtitle={t("marketing.product.subtitle")}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-3">
              Product Layout Overview
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              A single workflow from API discovery to execution reporting, with a
              layout designed for speed, visibility, and team collaboration.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="grid grid-cols-3 gap-3">
              {[Network, Layers, LayoutDashboard].map((Icon, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 p-4"
                >
                  <Icon className="w-5 h-5 text-indigo-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
            >
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2">
                {kpi.label}
              </p>
              <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((capability) => (
            <div
              key={capability.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white/80 dark:bg-slate-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <capability.icon className="w-5 h-5 text-indigo-500 mb-3" />
              <p className="font-bold text-slate-900 dark:text-white mb-1">{capability.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{capability.desc}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-indigo-500" />
            <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
              Why Teams Pick This Product
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.slice(0, 3).map((item) => (
              <div
                key={item}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900"
              >
                <CheckCircle2 className="w-5 h-5 text-indigo-500 mb-2" />
                <p className="text-slate-700 dark:text-slate-200 font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-1">
          <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-3">
            {t("marketing.product.steps.label")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
              >
                <p className="text-xs font-black text-indigo-500 mb-2">0{index + 1}</p>
                <p className="font-semibold text-slate-900 dark:text-white">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-indigo-200/70 dark:border-indigo-700/40 bg-indigo-500/5 dark:bg-indigo-500/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Ready to modernize API quality?
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              Build your first intelligent suite in minutes and scale from there.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-opacity"
          >
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
