"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/utils";

type CreateDialogProps = {
  children: React.ReactNode;
  description?: string;
  label: string;
  title: string;
  triggerClassName?: string;
};

export function CreateDialog({
  children,
  description,
  label,
  title,
  triggerClassName,
}: CreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    function handleClose() {
      document.body.style.overflow = "";
      dialog?.querySelectorAll("form").forEach((form) => form.reset());
    }

    dialog?.addEventListener("close", handleClose);
    return () => {
      dialog?.removeEventListener("close", handleClose);
      document.body.style.overflow = "";
    };
  }, []);

  function openDialog() {
    document.body.style.overflow = "hidden";
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200",
          triggerClassName,
        )}
        onClick={openDialog}
        type="button"
      >
        <Plus className="size-4" />
        {label}
      </button>

      <dialog
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100%-2rem))] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-0 text-slate-950 shadow-[0_24px_64px_rgb(15_23_42/0.18)] backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        ref={dialogRef}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold" id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-slate-500" id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Fechar"
              className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
              onClick={closeDialog}
              type="button"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
