import { ComingSoonPage } from "@/components/coming-soon-page";

export default function TelegramSettingsPage() {
  return (
    <ComingSoonPage
      title="Conectar Telegram"
      description="A vinculação usará token temporário e validação manual pelo bot antes de salvar qualquer movimentação."
      items={[
        "Gerar token de vínculo",
        "Validar telegram_links ativo",
        "Nunca confiar só no telegram_id",
      ]}
    />
  );
}
