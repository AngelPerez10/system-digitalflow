# Marca del sistema — diseño

## Objetivo

Un admin cambia **un nombre** y **un logo** en Configuración. Toda la empresa los ve: menú, login, PDFs y correos.

## Decisiones

- Ficha única `MarcaSistema` (pk=1) en `apps.common`.
- Nombre por defecto: **Grupo Intrax**.
- Sin logo subido: menú usa iniciales; login y PDFs siguen con `intrax-logo.png`.
- Iniciales: dos primeras palabras (`Grupo Intrax` → GI); una palabra → dos letras.
- GET público (`/api/v1/marca/`) para el login. PATCH y POST logo solo admin (`is_staff`).
- Logo en Cloudinary, carpeta `marca/logo/`.
