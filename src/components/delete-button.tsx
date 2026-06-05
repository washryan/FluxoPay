"use client";

type DeleteButtonProps = {
  children?: React.ReactNode;
  message: string;
};

export function DeleteButton({ children = "Excluir", message }: DeleteButtonProps) {
  return (
    <button
      className="whitespace-nowrap rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
