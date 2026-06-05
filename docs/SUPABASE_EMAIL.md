# E-mails de autenticacao no Supabase

## Situacao atual

No projeto hospedado, o Supabase pode bloquear a edicao do HTML/source dos
templates enquanto o envio usa o provedor padrao deles. A mensagem exibida e:

```txt
Set up custom SMTP to edit the source
```

Isso significa que, para personalizar totalmente o template de confirmacao,
recuperacao de senha e outros e-mails de Auth, precisamos configurar um SMTP
proprio.

## O que preencher em Custom SMTP

Campos do Supabase:

- `Sender email address`: e-mail remetente, por exemplo `noreply@seudominio.com`.
- `Sender name`: nome exibido na caixa de entrada, por exemplo `FluxoPay`.
- `Host`: host SMTP do provedor escolhido.
- `Port number`: geralmente `465` para SSL ou `587` para TLS.
- `Minimum interval per user`: manter `60` no inicio.
- `Username`: usuario SMTP fornecido pelo provedor.
- `Password`: senha SMTP ou API key SMTP fornecida pelo provedor.

## Recomendacao para o MVP

Para desenvolvimento e uso privado inicial, podemos manter o provedor padrao do
Supabase e deixar o template padrao por enquanto. Isso nao bloqueia cadastro,
login nem confirmacao de conta.

O callback do app fica em `/auth/callback` e aceita os formatos de confirmacao
usados pelo Supabase:

- `?code=...`, usado no fluxo PKCE;
- `?token_hash=...&type=...`, usado em templates customizados;
- `#access_token=...&refresh_token=...`, usado por alguns fluxos que retornam a
  sessao no fragmento da URL.

Se o login retornar `Email not confirmed`, use o botao de reenviar confirmacao
na tela de login e clique no link mais recente recebido.

Antes de abrir para usuarios externos ou assinaturas, configurar:

- dominio proprio;
- remetente `noreply@seudominio.com`;
- SPF, DKIM e DMARC no DNS;
- provedor transacional como Resend, Brevo, Mailgun, Amazon SES ou equivalente.

## Template sugerido para confirmacao

Quando o SMTP estiver configurado e o Supabase liberar a edicao:

```html
<h2>Confirme sua conta no FluxoPay</h2>

<p>Ola,</p>

<p>Recebemos uma solicitacao para criar uma conta no FluxoPay.</p>

<p>
  <a href="{{ .ConfirmationURL }}">
    Confirmar minha conta
  </a>
</p>

<p>Se voce nao criou essa conta, ignore este e-mail.</p>
```

Variaveis importantes:

- `{{ .ConfirmationURL }}`: link seguro gerado pelo Supabase.
- `{{ .Token }}`: codigo OTP de 6 digitos.
- `{{ .TokenHash }}`: hash do token para fluxos customizados.
- `{{ .SiteURL }}`: URL principal configurada em Auth.
- `{{ .RedirectTo }}`: URL de redirecionamento permitida.
- `{{ .Email }}`: e-mail do usuario.
- `{{ .Data }}`: metadados do usuario.

## Fontes

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/passwords
