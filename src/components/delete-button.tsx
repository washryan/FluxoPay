"use client";

import { ConfirmButton } from "@/components/confirm-button";

type DeleteButtonProps = {
  children?: React.ReactNode;
  message: string;
};

export function DeleteButton({ children = "Excluir", message }: DeleteButtonProps) {
  return (
    <ConfirmButton message={message} pendingLabel="Excluindo..." variant="danger">
      {children}
    </ConfirmButton>
  );
}
