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
            <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-3">
              Intelligence Architecture
            </p>
            <p className="text-on-surface-variant font-medium leading-relaxed">
              Build governed prompt pipelines and convert runtime failures into
              actionable generation insights.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[Database, Workflow, BrainCircuit].map((Icon, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-variant/20 bg-surface-container-low dark:bg-surface-container p-4"
              >
                <Icon className="w-5 h-5 text-primary" />
              </div>
            ))}
          </div>
        </div>

        <section className="py-1">
          <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-4">
            Intelligence Architecture
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {architecture.map((block) => (
              <div
                key={block.title}
                className="p-4 border-l-4 border-primary/40 bg-surface/60 dark:bg-surface-container/60"
              >
                <block.icon className="w-5 h-5 text-primary mb-3" />
                <p className="font-bold text-on-surface mb-1">{block.title}</p>
                <p className="text-sm text-on-surface-variant font-medium">
                  {block.desc}
                </p>
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
              className="rounded-2xl p-5 border border-outline-variant/10 bg-surface dark:bg-surface-container"
            >
              <feature.icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-bold text-on-surface mb-1">{feature.title}</p>
              <p className="text-sm text-on-surface-variant font-medium">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <section className="py-1">
          <p className="text-sm uppercase tracking-widest text-on-surface-variant font-bold mb-4">
            {t("marketing.intelligence.pipeline.label")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {pipelineSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl bg-surface dark:bg-surface-container-low p-4 border border-outline-variant/10"
              >
                <p className="text-xs font-black text-primary mb-2">
                  0{index + 1}
                </p>
                <p className="font-semibold text-on-surface">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((item) => (
            <div
              key={item}
              className="rounded-2xl p-5 border border-outline-variant/10 bg-surface dark:bg-surface-container flex items-start gap-3"
            >
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <p className="font-medium text-on-surface">{item}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-on-surface mb-2">
              Turn failures into learning loops
            </p>
            <p className="text-on-surface-variant font-medium">
              Route execution insights directly into smarter suggestions for the
              next run.
            </p>
          </div>
          <Link
            to="/runs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Open Runs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
