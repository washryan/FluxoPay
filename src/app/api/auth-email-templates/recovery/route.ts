import { NextResponse } from "next/server";

const recoveryTemplate = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redefinir senha do FluxoPay</title>
  </head>
  <body style="margin:0;background:#f4f6f5;color:#0f172a;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:40px 20px">
      <div style="border:1px solid #e2e8f0;border-radius:20px;background:#ffffff;padding:32px">
        <p style="margin:0 0 12px;color:#047857;font-weight:700">FluxoPay</p>
        <h1 style="margin:0 0 16px;font-size:26px">Redefinir sua senha</h1>
        <p style="margin:0 0 24px;line-height:1.6;color:#475569">
          Use o botão abaixo para continuar. Sua senha não será alterada até você escolher uma nova.
        </p>
        <a href="{{ .SiteURL }}/auth/recovery/confirm?token_hash={{ .TokenHash }}"
           style="display:inline-block;border-radius:12px;background:#047857;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:700">
          Continuar recuperação
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b">
          Se você não solicitou esta recuperação, ignore este e-mail.
        </p>
      </div>
    </div>
  </body>
</html>`;

export function GET() {
  return new NextResponse(recoveryTemplate, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
