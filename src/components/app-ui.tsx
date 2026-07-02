import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <div className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
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
        "animate-rise overflow-hidden rounded-[2rem] border p-5 shadow-sm sm:p-7 lg:p-8",
        isDark
          ? "card-sheen border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,#34d399_0,#0f766e_26%,#07111f_68%)] text-white shadow-emerald-950/20"
          : "border-white/80 bg-white/90 text-slate-950 shadow-slate-200/70 backdrop-blur",
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p
            className={cn(
              "text-xs font-black uppercase tracking-[0.28em]",
              isDark ? "text-emerald-200" : "text-emerald-700",
            )}
          >
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p
            className={cn(
              "mt-4 max-w-2xl text-sm leading-6 sm:text-base",
              isDark ? "text-emerald-50/85" : "text-slate-600",
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
        "animate-rise rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur",
        className,
      )}
    >
      {title || description || action ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
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
    <article className="interactive-card animate-rise rounded-[1.65rem] border border-white/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("rounded-2xl p-2 ring-1", classes.accent)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          "mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl",
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
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="grid min-h-44 place-items-center rounded-3xl border border-dashed border-slate-200/90 bg-slate-50/80 p-6 text-center">
      <div className="max-w-sm">
        {Icon ? (
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <Icon className="size-5" />
          </span>
        ) : null}
        <p className="mt-3 font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}
