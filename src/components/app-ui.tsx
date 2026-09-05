import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <div className={cn("min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-9", className)}>
      <div className="mx-auto w-full max-w-[88rem] space-y-6 lg:space-y-7">{children}</div>
    </div>
  );
}

type PageHeroProps = {
  actions?: React.ReactNode;
  eyebrow: string;
  children?: React.ReactNode;
  description: string;
  title: string;
  variant?: "dark" | "light";
};

export function PageHero({
  actions,
  children,
  description,
  eyebrow,
  title,
  variant = "light",
}: PageHeroProps) {
  const isDark = variant === "dark";

  return (
    <header
      className={cn(
        "animate-rise overflow-hidden rounded-[1.5rem] border p-5 sm:p-7 lg:p-8",
        isDark
          ? "border-[#20382f] bg-[#10231c] text-white shadow-[0_12px_32px_rgb(15_35_28/0.12)]"
          : "border-slate-200 bg-white text-slate-950 shadow-[var(--shadow-panel)]",
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-[0.18em]",
              isDark ? "text-emerald-300" : "text-emerald-700",
            )}
          >
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            {title}
          </h1>
          <p
            className={cn(
              "mt-4 max-w-2xl text-sm leading-6 sm:text-base",
              isDark ? "text-slate-300" : "text-slate-600",
            )}
          >
            {description}
          </p>
          {children}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}

type SurfaceProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  id?: string;
};

export function Surface({
  action,
  children,
  className,
  description,
  id,
  title,
}: SurfaceProps) {
  return (
    <section
      id={id}
      className={cn(
        "animate-rise rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[var(--shadow-panel)] sm:p-6",
        className,
      )}
    >
      {title || description || action ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-semibold tracking-[-0.015em] text-slate-950 sm:text-lg">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type MetricCardProps = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone?: "amber" | "emerald" | "red" | "slate" | "sky";
  value: string;
};

const metricTones = {
  amber: {
    accent: "bg-amber-100 text-amber-700 ring-amber-200",
    value: "text-amber-700",
  },
  emerald: {
    accent: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    value: "text-emerald-700",
  },
  red: {
    accent: "bg-red-100 text-red-700 ring-red-200",
    value: "text-red-600",
  },
  sky: {
    accent: "bg-sky-100 text-sky-700 ring-sky-200",
    value: "text-sky-700",
  },
  slate: {
    accent: "bg-slate-100 text-slate-800 ring-slate-200",
    value: "text-slate-950",
  },
};

export function MetricCard({
  description,
  icon: Icon,
  label,
  tone = "slate",
  value,
}: MetricCardProps) {
  const classes = metricTones[tone];

  return (
    <article className="interactive-card animate-rise rounded-[1.1rem] border border-slate-200 bg-white p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("rounded-xl p-2 ring-1", classes.accent)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          "financial-value mt-4 text-2xl font-semibold sm:text-3xl",
          classes.value,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </article>
  );
}

type EmptyStateProps = {
  action?: React.ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="grid min-h-40 place-items-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="max-w-sm">
        {Icon ? (
          <span className="mx-auto grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
            <Icon className="size-5" />
          </span>
        ) : null}
        <p className="mt-3 font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

type SoftBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function SoftBadge({ children, className }: SoftBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
