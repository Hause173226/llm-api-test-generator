import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import MarketingChrome from "../marketing/MarketingChrome";
import {
  Eyebrow,
  MetricChip,
  Reveal,
  Section,
} from "../marketing/MarketingPrimitives";

interface HeroMetric {
  label: string;
  value: string;
}

interface PublicMarketingLayoutProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  heroSlot?: ReactNode;
  heroMetrics?: HeroMetric[];
  children?: ReactNode;
  variant?: "editorial" | "control";
}

export default function PublicMarketingLayout({
  title,
  subtitle,
  eyebrow,
  heroSlot,
  heroMetrics,
  children,
  variant = "editorial",
}: PublicMarketingLayoutProps) {
  const { t } = useTranslation();

  return (
    <MarketingChrome>
      <Section className="pt-8 sm:pt-10">
        <div
          className={`relative overflow-hidden rounded-[42px] border px-6 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14 ${
            variant === "control"
              ? "border-slate-300/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,248,250,0.96)_44%,rgba(226,232,240,0.94))] shadow-[0_36px_110px_-56px_rgba(15,23,42,0.26)] dark:border-slate-700/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.98)_44%,rgba(2,6,23,0.96))]"
              : "border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,249,247,0.92)_42%,rgba(231,240,246,0.88))] shadow-[0_34px_100px_-54px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.94),rgba(15,23,42,0.94)_48%,rgba(30,41,59,0.88))]"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              variant === "control"
                ? "bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.1),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_28%)]"
                : "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_28%)]"
            }`}
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(100,116,139,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.12)_1px,transparent_1px)] [background-size:84px_84px] dark:opacity-[0.08]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] lg:items-end">
            <Reveal>
              <div>
                <Eyebrow>{eyebrow ?? t("marketing.chrome.platform")}</Eyebrow>
                <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-[5rem] xl:leading-[0.94] dark:text-white">
                  {title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {subtitle}
                </p>

                {heroMetrics?.length ? (
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {heroMetrics.map((metric) => (
                      <MetricChip
                        key={`${metric.label}-${metric.value}`}
                        label={metric.label}
                        value={metric.value}
                        tone={variant}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="relative">
                <div
                  className={`absolute -inset-10 rounded-full blur-3xl ${
                    variant === "control"
                      ? "bg-indigo-500/12 dark:bg-indigo-500/18"
                      : "bg-cyan-500/14 dark:bg-cyan-500/20"
                  }`}
                />
                <div
                  className={`relative min-h-[320px] rounded-[34px] border p-5 backdrop-blur ${
                    variant === "control"
                      ? "border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,247,250,0.94),rgba(226,232,240,0.9))] shadow-[0_32px_80px_-46px_rgba(79,70,229,0.16)] dark:border-slate-700/90 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.94),rgba(2,6,23,0.9))] dark:shadow-[0_30px_90px_-46px_rgba(2,6,23,0.82)]"
                      : "border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,250,249,0.88),rgba(236,243,248,0.84))] shadow-[0_30px_80px_-46px_rgba(8,47,73,0.16)] dark:border-slate-800/90 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.94),rgba(2,6,23,0.88))] dark:shadow-[0_30px_90px_-46px_rgba(15,23,42,0.8)]"
                  }`}
                >
                  {heroSlot}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {children ? <div className="pb-8 pt-12 sm:pt-16">{children}</div> : null}
    </MarketingChrome>
  );
}
