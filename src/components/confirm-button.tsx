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
  dark: "bg-slate-950 text-white hover:bg-slate-800",
  danger: "border border-red-200 text-red-700 hover:bg-red-50",
  emerald: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  outline: "border border-slate-200 text-slate-700 hover:bg-slate-50",
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
        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
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
