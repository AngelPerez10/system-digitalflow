# SertelPro (app móvil de técnicos)

App nativa Android (Expo / React Native) para que el técnico trabaje sus **órdenes de
trabajo** en campo. Consume la **misma API Django** que el ERP web (`backend/`); no es un
WebView ni un segundo backend.

- Fase 1 (implementada): login, listado «Mis órdenes» por mes, detalle y edición de campo
  (estatus, motivo de pausa, problemática, fechas y horas).
- Fase 2 (hecha): fotos y firma del cliente en la edición.
- Fase 3 (pendiente): equipos de inventario, mapa y envío de PDF por correo.

## Requisitos

- Node 20+ y **pnpm** (mismo `packageManager` que la raíz del monorepo).
- `mobile/` está en `pnpm-workspace.yaml`. El build de Render instala solo
  `frontend...` (`--filter frontend...`) para no bajar Expo en el static site.
- Android Studio / emulador, o un teléfono con **Expo Go de la tienda** (Play Store /
  App Store).

  El proyecto va deliberadamente en **SDK 54**, que es el que traen las Expo Go publicadas
  (`expoGoSdkVersion` en `https://api.expo.dev/v2/versions/latest`). Con un SDK más nuevo,
  Expo Go responde `Project is incompatible with this version of Expo Go` — en el teléfono
  se ve como pantalla en blanco y luego «Sorry about that» — y **no hay forma de instalar un
  Expo Go más nuevo en iPhone**, porque iOS no permite sideload.

  **Antes de subir de SDK**, comprobar qué soportan las tiendas:

  ```bash
  curl -s https://api.expo.dev/v2/versions/latest | jq -r '.data.expoGoSdkVersion'
  ```

  Si se sube por delante de ese número, hay que asumir development builds (`pnpm build:dev`)
  y dejar de usar Expo Go.

## Configuración

```bash
# Desde la raíz del monorepo (recomendado):
pnpm install
pnpm --dir mobile exec -- cp .env.example .env   # o copia manual; ajustar EXPO_PUBLIC_API_URL

# O solo dependencias de la app:
pnpm install --filter digitalflow-tecnico...
```

También sirve:

```bash
cd mobile
pnpm install   # resuelve vía workspace de la raíz
```

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL base de la API **sin** slash final. Emulador Android: `http://10.0.2.2:8000`. Dispositivo físico en LAN: `http://192.168.x.x:8000`. Release: siempre `https://`. |

Todo lo que empieza con `EXPO_PUBLIC_` viaja dentro del APK: **nunca** poner ahí llaves de
Cloudinary, SMTP ni `AI_API_KEY`. La app no necesita secretos: solo el token del usuario.

En compilaciones de release la app rechaza una URL que no sea HTTPS y lo avisa en la
pantalla de login en vez de fallar en silencio.

## Desarrollo

```bash
pnpm start          # Metro (elegir Android / escanear QR con Expo Go)
pnpm android        # abre directamente en emulador/dispositivo
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint app src
pnpm test           # jest (auth, cliente HTTP, parsers y formulario)
```

Desde la raíz del monorepo también: `pnpm mobile:start` (tras `pnpm mobile:install`).

## Probar contra el backend local (Expo Go)

### 0. Abrir la LAN en Windows (una sola vez)

Windows bloquea **todo** el tráfico entrante cuando la red está marcada como «Pública».
Síntoma exacto: Expo Go se queda en blanco y termina en «Sorry about that», y **Metro nunca
imprime `Android Bundling`** — señal de que el teléfono ni siquiera descargó el bundle.

En PowerShell **como Administrador**, desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File mobile\scripts\dev-lan-firewall.ps1
```

Marca la red como Privada y abre TCP 8081 (Metro) y 8000 (Django) **solo** en ese perfil.
Para revertir: el mismo comando con `-Remove`.

Alternativa sin tocar el firewall (teléfono por USB, con `adb` en el PATH):

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
# y en .env: EXPO_PUBLIC_API_URL=http://localhost:8000
```

### 0-bis. Vía rápida sin permisos: túnel

Si no puedes abrir el firewall (o el router aísla clientes), el túnel saca Metro por
Internet y evita la LAN por completo:

```bash
pnpm start:tunnel
```

Requiere `@expo/ngrok` (ya en devDependencies). El QR que imprime **sí** funciona desde
cualquier red, incluso datos móviles. Ojo: el túnel solo publica **Metro**, no Django — con
esto se ve la app, pero para iniciar sesión la API tiene que ser alcanzable (firewall
abierto, `adb reverse`, o apuntar `EXPO_PUBLIC_API_URL` a un backend desplegado).

### 1. Django escuchando en la LAN, no solo en localhost

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

En `DEBUG`, `config/settings.py` agrega solo las IPs LAN de la máquina a `ALLOWED_HOSTS`;
sin eso Django responde `400 Invalid HTTP_HOST header` al teléfono y la app solo dice
«No se pudo contactar al servidor».

### 2. `.env` con `http://`, la IP de la PC y el puerto de Django

```
EXPO_PUBLIC_API_URL=http://192.168.10.13:8000
```

- **8000 es Django**; 8081 es Metro. Apuntar la app a 8081 la deja sin API.
- Nada de `localhost` (en el teléfono es el propio teléfono) ni `https://` contra
  `runserver`, que sirve HTTP plano.
- Verificar la IP con `ipconfig` y que el teléfono esté en la **misma red** que la PC.

### Modo Expo Go vs development build

`expo start` arranca en modo **development build** si `expo-dev-client` está entre las
dependencias, y entonces el QR es `exp+sertelpro://…`, que **Expo Go no entiende** (parece
que «no agarra el QR»). Este proyecto no lo lleva instalado a propósito, para que el QR sea
el de Expo Go. La línea `› Using development build (Press s to switch to Expo Go)` en Metro
avisa del modo; se alterna con la tecla `s`.

Si algún día se quiere el development build: `npx expo install expo-dev-client` y luego
`pnpm build:dev`.

### 3. Reiniciar Metro limpiando caché

Las variables `EXPO_PUBLIC_*` se inyectan al compilar el bundle, no se leen en caliente:

```bash
pnpm start -c
```

### Cómo saber dónde falla

| Síntoma | Causa |
|---------|-------|
| Metro no imprime `Android Bundling` al escanear | El teléfono no alcanza la PC: firewall (paso 0) u otra red |
| «Sorry about that» sin logs | Lo mismo, o `app.json` inválido / versiones desalineadas (`npx expo-doctor` debe dar 18/18) |
| Se ve el login pero «No se pudo contactar al servidor» | `EXPO_PUBLIC_API_URL` mal (esquema, IP o puerto) o Django en `127.0.0.1` |
| `Project is incompatible with this version of Expo Go` | Expo Go del teléfono más viejo que el SDK del proyecto: actualizarlo desde Play Store o instalar un development build |
| Se ve el login y dice credenciales inválidas | Ya hay conexión: es usuario/contraseña |

**Mensajes de error:** la app solo muestra texto que la API mande en JSON (una línea, ≤300
caracteres). Cualquier otro cuerpo — la página de depuración de Django, el HTML de un proxy,
un traceback — se descarta y se muestra el mensaje genérico del código de estado. En dev,
`httpClient` deja un recorte del cuerpo en la consola de Metro para poder diagnosticar.

Si algo del arranque falla, la app **nunca** se queda en «Restaurando sesión…»: a los 8 s
manda a Login con el motivo (`src/auth/bootstrapSession.ts`), y en dev el detalle técnico
sale en la consola de Metro con el prefijo `[auth]`.

## Autenticación

La app usa **Bearer + SecureStore**, no cookies:

1. `POST /api/login/` con `X-Client: mobile` (y `client: "mobile"` en el body). Solo con esa
   marca el backend incluye `refresh` en el JSON; el SPA web lo sigue recibiendo únicamente
   en cookie HttpOnly.
2. El `access` vive en memoria + SecureStore; el `refresh` **solo** en SecureStore
   (Keystore/Keychain).
3. Ante un `401`, `src/api/httpClient.ts` renueva con `POST /api/token/refresh/` usando una
   **sola cola** (varias peticiones concurrentes comparten la misma renovación, porque el
   backend rota y deja en blacklist el refresh en cada uso) y reintenta la petición una vez.
   Si el refresh ya no sirve, cierra sesión y vuelve a Login.
4. `POST /api/logout/` manda el refresh para invalidarlo; el borrado local ocurre igual si
   no hay red.

La autorización siempre la decide el servidor (`OrdenesPermission`, `edit_scope`,
`own_only`). La app solo oculta lo que el usuario no puede hacer.

## Estructura

```
mobile/
  app/                    Rutas (Expo Router)
    login.tsx
    (app)/_layout.tsx     Guard: sesión + permiso `ordenes.view`
    (app)/ordenes/…       Listado, detalle y edición
  src/
    api/                  Cliente HTTP, endpoints tipados y parsers
    auth/                 SecureStore, sesión y espejo de permisos
    components/           UI reutilizable
    features/orders/      Lógica de órdenes (agrupación, formulario, hooks)
    theme/                Tokens de marca DigitalFlow
    types/                Espejo de los contratos del backend
    utils/
```

Regla de capas: **UI → hooks → api client**. Sin `fetch` suelto en pantallas.

## Compilar el APK (EAS)

```bash
pnpm dlx eas-cli@^22.5.0 login    # una sola vez
pnpm build:apk                    # APK instalable (perfil preview)
pnpm build:dev                    # development build (reemplaza a Expo Go)
```

Se invoca con `pnpm dlx` (el equivalente de `npx` en pnpm), no como dependencia del
proyecto: `eas-cli` arrastra `dtrace-provider`, un build nativo que pnpm 11 bloquea, y eso
rompe **todos** los `pnpm exec` del proyecto con `ERR_PNPM_IGNORED_BUILDS`.

- El perfil `preview` (`eas.json`) produce **APK** con `distribution: internal`; `production`
  produce AAB (aún sin uso: en v1 no hay Play Store).
- Las credenciales de firma las administra EAS: **no** commitear keystores ni secretos.
- Subir `version` y `android.versionCode` en `app.json` en cada build que se reparta.

### Instalación (sideload)

1. Descargar el APK desde el enlace que da EAS al terminar el build.
2. En el teléfono: Ajustes → Aplicaciones → Acceso especial → **Instalar apps desconocidas**
   y permitir el navegador o gestor de archivos usado.
3. Abrir el APK e instalar. Iniciar sesión con las **mismas credenciales del ERP**.

## Notas

- `.npmrc` fija `strict-peer-dependencies=false` (equivalente pnpm a `legacy-peer-deps` de
  npm): `expo-router` arrastra peers de React que no coinciden con el de Expo SDK 57.
- No mezclar con `npm` en esta carpeta: no generar `package-lock.json`; la fuente de
  verdad es el `pnpm-lock.yaml` de la **raíz** del monorepo.
- Jest corre con `jest-expo/android` y `jest@29` (la versión que `jest-expo` 57 declara en
  sus dependencias). Subir a `jest@30` rompe el entorno del preset.
