import { ComingSoonPage } from "@/components/coming-soon-page";

export default function BillsPage() {
  return (
    <ComingSoonPage
      title="Contas"
      description="Contas a pagar e receber com vencimento, recorrência e status."
      items={[
        "Pendentes, pagas e atrasadas",
        "Recorrência semanal, mensal e anual",
        "Lembretes futuros pelo bot",
      ]}
    />
  );
}
