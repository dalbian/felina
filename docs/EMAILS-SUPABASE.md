# Plantillas de email de Supabase Auth (catalán)

Referencia versionada de los textos de los correos transaccionales que envía
Felina. **No son código**: se configuran a mano en el dashboard de Supabase. Se
guardan aquí para tenerlos a mano si algún día se recrea el proyecto de Supabase
(igual que las migraciones SQL).

## Qué correos usa Felina

Felina solo dispara dos plantillas de Supabase Auth:

| Plantilla (dashboard) | Flujo que la dispara | Origen en el código |
|---|---|---|
| **Invite user** | Un admin invita a alguien por email | Edge Function `invite-member` → `inviteUserByEmail` |
| **Reset Password** | "He oblidat la contrasenya" en el login | `useFelinaStore.handleForgotPassword` → `resetPasswordForEmail` |

Las demás plantillas (Confirm signup, Magic Link, Change Email Address,
Reauthentication) **no se usan** porque no hay registro libre — el alta es
siempre por invitación. Se pueden dejar como están.

## Dónde se configuran

Supabase Dashboard → **Authentication** → **Emails** (o *Email Templates*) →
seleccionar la plantilla → editar **Subject** y **Message body (HTML)** → **Save**.

⚠️ Mantener la variable `{{ .ConfirmationURL }}` **exactamente como está** — es el
enlace de acción (activar cuenta / restablecer contraseña) que genera Supabase.

El **nombre del remitente** (el "De: Felina") no está en estas plantillas sino en
Authentication → **SMTP Settings** → *Sender name* (el SMTP es Resend).

## Plantilla "Invite user"

**Subject:**

```
T'han convidat a Felina
```

**Message body (HTML):**

```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background-color:#F8F3E8;color:#1A1712;">
  <h1 style="font-size:22px;margin:0 0 16px;color:#1A1712;">Benvingut/da a Felina 🐾</h1>
  <p style="font-size:15px;line-height:1.6;color:#4A433C;margin:0 0 16px;">
    T'han convidat a formar part d'una organització a <strong>Felina</strong>, l'eina de gestió de colònies felines per a protectores i associacions de protecció animal.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#4A433C;margin:0 0 24px;">
    Per començar, activa el teu compte i defineix una contrasenya:
  </p>
  <p style="text-align:center;margin:0 0 24px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background-color:#1F3A2F;color:#F8F3E8;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Activa el meu compte</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#78706A;margin:0 0 8px;">
    Si el botó no funciona, copia i enganxa aquest enllaç al navegador:
  </p>
  <p style="font-size:12px;line-height:1.5;color:#8A7A5C;word-break:break-all;margin:0 0 24px;">
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size:12px;line-height:1.5;color:#8A7A5C;border-top:1px solid #EADFC9;padding-top:16px;margin:0;">
    Si no esperaves aquesta invitació, pots ignorar aquest correu.
  </p>
</div>
```

## Plantilla "Reset Password"

**Subject:**

```
Restableix la teva contrasenya de Felina
```

**Message body (HTML):**

```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background-color:#F8F3E8;color:#1A1712;">
  <h1 style="font-size:22px;margin:0 0 16px;color:#1A1712;">Restableix la contrasenya</h1>
  <p style="font-size:15px;line-height:1.6;color:#4A433C;margin:0 0 16px;">
    Has demanat restablir la contrasenya del teu compte de <strong>Felina</strong>. Fes clic al botó per crear-ne una de nova:
  </p>
  <p style="text-align:center;margin:0 0 24px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background-color:#1F3A2F;color:#F8F3E8;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Crea una contrasenya nova</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#78706A;margin:0 0 8px;">
    Si el botó no funciona, copia i enganxa aquest enllaç al navegador:
  </p>
  <p style="font-size:12px;line-height:1.5;color:#8A7A5C;word-break:break-all;margin:0 0 24px;">
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size:12px;line-height:1.5;color:#8A7A5C;border-top:1px solid #EADFC9;padding-top:16px;margin:0;">
    Si no has demanat aquest canvi, ignora aquest correu: la teva contrasenya no canviarà.
  </p>
</div>
```

## Después de configurar

Hacer una prueba real end-to-end:

1. Invitar a un email propio desde Ajustes → comprobar que llega el correo de
   invitación en catalán y que el enlace activa la cuenta.
2. En el login, pulsar "He oblidat la contrasenya" → comprobar el correo de
   recuperación en catalán y que el enlace lleva a definir contraseña nueva.

> Recordatorio: los primeros envíos pueden tardar unos minutos y caer en spam.
