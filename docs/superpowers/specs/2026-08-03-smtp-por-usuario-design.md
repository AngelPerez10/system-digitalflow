# SMTP por usuario — diseño

## Objetivo

Los PDF de órdenes y cotizaciones se envían autenticando SMTP con el buzón webmail del **usuario que dispara el envío**, no con `soporte@intrax.mx` global.

## Decisiones

- Credenciales por usuario (correo + contraseña webmail).
- Solo admin las configura en Gestión de usuarios.
- Sin fallback a `soporte@`: si no hay credenciales → bloquear con mensaje claro.
- Host/puerto/SSL siguen en `.env` (`EMAIL_HOST`, `EMAIL_PORT`, …).
- Contraseña cifrada con Fernet (`SMTP_CREDENTIALS_KEY`); nunca se expone en GET.

## Modelo

`UserSmtpCredentials` 1:1 con `User`:

- `smtp_email`
- `smtp_password_encrypted`
- `updated_at`

## API

En `UserAccountSerializer` (admin):

- Lectura: `smtp_email`, `smtp_configured` (bool)
- Escritura: `smtp_email`, `smtp_password` (write-only), `smtp_clear` (bool)

## Envío

`POST .../enviar-pdf/` usa `request.user` → descifra → `send_pdf_email(..., smtp_user=..., smtp_password=..., from_email=...)`.

## UI

Sección “Correo de envío (SMTP)” en modal editar usuario + badge en listado.
