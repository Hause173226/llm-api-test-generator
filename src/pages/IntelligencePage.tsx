import React from "react";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  RefreshCw,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicMarketingLayout from "../components/layout/PublicMarketingLayout";

export default function IntelligencePage() {
  const { t } = useTranslation();

  const pipelineSteps = t("marketing.intelligence.pipeline.items", {
    returnObjects: true,
  }) as string[];

  const notes = t("marketing.intelligence.notes", {
    returnObjects: true,
  }) as string[];

  const architecture = [
    {
      icon: Database,
      title: "Context Layer",
      desc: "Collect endpoint metadata, ordering, and business constraints before prompting.",
    },
    {
      icon: Workflow,
      title: "Prompt Orchestration",
      desc: "Compose governed prompts from backend rules, task instructions, and format contracts.",
    },
    {
      icon: BrainCircuit,
      title: "Reasoning Layer",
      desc: "Generate scenarios and explanations tuned for boundary, negative, and failure analysis.",
    },
  ];

  return (
    <PublicMarketingLayout
      title={t("marketing.intelligence.title")}
      subtitle={t("marketing.intelligence.subtitle")}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-3">
              Intelligence Architecture
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Build governed prompt pipelines and convert runtime failures into
              actionable generation insights.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[Database, Workflow, BrainCircuit].map((Icon, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 p-4"
              >
                <Icon className="w-5 h-5 text-indigo-500" />
              </div>
            ))}
          </div>
        </div>

        <section className="py-1">
          <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-4">
            Intelligence Architecture
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {architecture.map((block) => (
              <div
                key={block.title}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900"
              >
                <block.icon className="w-5 h-5 text-indigo-500 mb-3" />
                <p className="font-bold text-slate-900 dark:text-white mb-1">{block.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{block.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: BrainCircuit,
              title: t("marketing.intelligence.features.suggestions.title"),
              desc: t("marketing.intelligence.features.suggestions.desc"),
            },
            {
              icon: Workflow,
              title: t("marketing.intelligence.features.governance.title"),
              desc: t("marketing.intelligence.features.governance.desc"),
            },
            {
              icon: RefreshCw,
              title: t("marketing.intelligence.features.feedback.title"),
              desc: t("marketing.intelligence.features.feedback.desc"),
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl p-5 border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
            >
              <feature.icon className="w-5 h-5 text-indigo-500 mb-3" />
              <p className="font-bold text-slate-900 dark:text-white mb-1">{feature.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>

        <section className="py-1">
          <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-4">
            {t("marketing.intelligence.pipeline.label")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {pipelineSteps.map((step, index) => (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((item) => (
            <div
              key={item}
              className="rounded-2xl p-5 border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 flex items-start gap-3"
            >
              <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5" />
              <p className="font-medium text-slate-700 dark:text-slate-200">{item}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-indigo-200/70 dark:border-indigo-700/40 bg-indigo-500/5 dark:bg-indigo-500/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Turn failures into learning loops
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              Route execution insights directly into smarter suggestions for the next run.
            </p>
          </div>
          <Link
            to="/runs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-opacity"
          >
            Open Runs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
