"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type ConfirmButtonProps = {
  children: React.ReactNode;
  className?: string;
  message: string;
  pendingLabel?: string;
  variant?: "dark" | "danger" | "emerald" | "outline";
};

const variantStyles = {
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  emerald:
    "bg-emerald-700 text-white hover:bg-emerald-800",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

export function ConfirmButton({
  children,
  className,
  message,
  pendingLabel = "Processando...",
  variant = "outline",
}: ConfirmButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-70",
        variantStyles[variant],
        className,
      )}
      disabled={pending}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
