"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  className,
  disabled = false,
  pendingLabel = "Salvando...",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:bg-slate-300",
        className,
      )}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
