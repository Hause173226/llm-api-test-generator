import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
};

export function Stagger({ children, className, stagger = 0.08 }: StaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Section({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-[1320px] px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,244,245,0.86))] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(30,41,59,0.86))] dark:text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <div className="mb-5">{eyebrow}</div> : null}
      <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl lg:text-[3.35rem] lg:leading-[1.02] dark:text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function MarketingCard({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "editorial" | "control";
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-6 backdrop-blur transition duration-300 before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-400/55 before:to-transparent before:opacity-100 after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_34%)] after:opacity-60",
        tone === "editorial" &&
          "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,248,250,0.96),rgba(232,240,248,0.92))] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 hover:shadow-[0_34px_86px_-46px_rgba(8,47,73,0.2)] dark:border-slate-800/90 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.96),rgba(30,41,59,0.92))] dark:shadow-[0_28px_90px_-52px_rgba(8,47,73,0.62)]",
        tone === "control" &&
          "border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,249,0.96),rgba(226,232,240,0.94))] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_34px_90px_-46px_rgba(49,46,129,0.2)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.98),rgba(2,6,23,0.96))] dark:shadow-[0_28px_90px_-52px_rgba(2,6,23,0.82)]",
        tone === "default" &&
          "border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-42px_rgba(37,99,235,0.24)] dark:border-slate-800 dark:bg-slate-900/84 dark:shadow-[0_24px_80px_-45px_rgba(15,23,42,0.85)]",
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

export function MetricChip({
  label,
  value,
  className,
  tone = "default",
}: {
  label: string;
  value: string;
  className?: string;
  tone?: "default" | "editorial" | "control";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4 backdrop-blur",
        tone === "editorial" &&
          "border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,251,0.9))] shadow-[0_18px_40px_-32px_rgba(14,116,144,0.14)] dark:border-slate-800/90 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.94))]",
        tone === "control" &&
          "border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_38px_-28px_rgba(15,23,42,0.16)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.84),rgba(15,23,42,0.94))]",
        tone === "default" &&
          "border-white/60 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80",
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export function ButtonLink({
  to,
  children,
  variant = "primary",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300",
        variant === "primary"
          ? "bg-slate-950 text-white shadow-[0_18px_42px_-20px_rgba(15,23,42,0.62)] hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          : "border border-slate-300/80 bg-white/84 text-slate-700 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900",
        className,
      )}
    >
      {children}
    </Link>
  );
}
