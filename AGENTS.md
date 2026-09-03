# AGENTS.md — Guía para agentes de código

## Uso obligatorio

Antes de modificar arquitectura, rutas, autenticación, permisos, performance, seguridad, CI, estructura de carpetas o patrones globales, leer este archivo.

Si un cambio introduce una nueva convención, corrige un problema recurrente o cambia una decisión técnica, actualizar `AGENTS.md` en el mismo ticket.

## Context7 MCP

Usar siempre Context7 MCP antes de responder o modificar código cuando el trabajo involucre librerías, frameworks, SDKs, APIs, CLI tools o servicios cloud. Esto incluye React, Vite, Django, DRF, pnpm, GitHub Actions y dependencias del proyecto.

Flujo obligatorio: resolver primero el library ID con Context7 y luego consultar la documentación relevante. Si el MCP no está disponible, intentar habilitarlo con `npx ctx7 setup --codex --mcp --project --yes` y documentar el bloqueo antes de continuar.

## Arquitectura

- **Backend**: Django 5 + DRF en `backend/`. Apps por dominio (`cotizaciones`, `ordenes`, `clientes`, `users`, …).
- **Frontend**: React 19 + TypeScript + Vite en `frontend/`. Rutas en `src/App.tsx`, layout en `src/layout/`.
- **App móvil**: Expo (React Native) + TypeScript en `mobile/`. App de técnicos (órdenes de trabajo) sobre la **misma** API Django. Ver «App móvil» abajo.
- **Configuración**: pestaña al pie del sidebar. Gestión de usuarios vive en `frontend/src/pages/Configuracion/GestionUsuario.tsx` (ruta `/usuarios`, admin o `usuarios.view`). Ajustes generales (nombre y logo de la empresa) en `frontend/src/pages/Configuracion/AjustesGeneralesPage.tsx` (ruta `/configuracion`, admin). API pública `GET /api/v1/marca/` (si falta la tabla, 200 con default); `PATCH` y `POST /api/v1/marca/logo/` son admin. El logo público es solo HTTP(S), no `data:`. Modelo `MarcaSistema` en `apps.common`.
- **Auth**: cookies HttpOnly + CSRF. Usar siempre `fetchApi` de `src/config/api.ts` — no `localStorage.getItem("token")` ni `fetch` crudo para API autenticada. «Recordarme» en el login web manda `remember: true` y pone cookies persistentes (vida del refresh, 7 días); sin él las cookies son de sesión (cierran con el navegador). El usuario se guarda en `localStorage` (`df.login.remembered_username`); nunca la contraseña ni tokens. La app móvil ignora el flag y sigue persistente. Tokens JWT emitidos antes del claim `remember` se tratan como persistentes al refrescar.
- **Auth móvil**: la app nativa usa **Bearer + SecureStore**, no cookies. `POST /api/login/` y `POST /api/token/refresh/` incluyen `refresh` en el JSON **solo** cuando la petición se identifica como móvil (`X-Client: mobile` o `client: "mobile"`; ver `_is_mobile_client` en `apps/users/views.py`). El web mantiene el refresh únicamente en cookie HttpOnly. No quitar esa frontera: los tests `apps/users/tests/test_mobile_login.py` la fijan.
- **API**: las rutas nuevas deben preferir `/api/v1/`. El prefijo legado `/api/` se mantiene por compatibilidad; no eliminarlo sin plan de migración frontend/clientes.

### Storages (Django 5.2)

`backend/config/settings.py` configura storages **solo** por el dict `STORAGES`. `STATICFILES_STORAGE` y `DEFAULT_FILE_STORAGE` se eliminaron en Django 5.1: si alguien los reintroduce, Django los ignora en silencio (no fallan, simplemente no hacen nada).

- **Definir `STORAGES` sobrescribe el default completo — no hay merge.** Las dos claves (`default` y `staticfiles`) son obligatorias; omitir una revienta con `InvalidStorageError: Could not find config for '<alias>' in settings.STORAGES`. ([docs](https://docs.djangoproject.com/en/5.2/ref/settings/#storages))
- `staticfiles`: `whitenoise.storage.CompressedManifestStaticFilesStorage` en producción (compresión + manifest/cache-busting), `StaticFilesStorage` plano en `DEBUG` para no exigir `collectstatic` en cada cambio.
- `default` (media): `FileSystemStorage`. **Cloudinary no es un backend de storage aquí** — `cloudinary_storage` no está en `INSTALLED_APPS` y todas las subidas van directo por el SDK (`cloudinary.uploader.upload`, ver `apps/ordenes/image_services.py`). `django-cloudinary-storage` queda en `requirements.txt` solo como dependencia arrastrada; no cambiar `default` a Cloudinary sin migrar los `FileField`.
- Con manifest activo, todo `{% static %}` debe apuntar a un archivo que exista en `STATIC_ROOT` tras `collectstatic`, o el render falla con `Missing staticfiles manifest entry for…`. Hoy no hay plantillas propias (`TEMPLATES.DIRS` vacío), solo admin y DRF.

### Plantilla de feature pages (programa arquitectura)

Ver `docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md`.
Ola 1 (Proyectos): carpetas `list/`, `form/`, `shared/`, `instalaciones/` — detalle en
`docs/superpowers/specs/2026-07-30-proyectos-frontend-architecture-design.md`.
Ola 2 (Órdenes servicio): carpetas `list/`, `form/`, `shared/` — detalle en
`docs/superpowers/specs/2026-07-30-ordenes-frontend-architecture-design.md`.

## Permisos

Los permisos viven en `UserPermissions.permissions` (JSON por módulo: `view`, `create`, `edit`, `delete`).

- Backend: subclases de `ModulePermission` en `apps/users/permissions.py` (`OrdenesPermission`, `ProyectosPermission`, `InventarioPermission`, `TareasPermission`, …).
- Frontend: guards `Require*Permission` con comprobación estricta `=== true` para `view`. Admin (`isAdmin`) bypass en guards.
- **Órdenes — `own_only`:** en Gestión de usuarios el switch «Ver todas las órdenes» guarda `ordenes.own_only=false`. Con eso el técnico lista/ve órdenes ajenas y, si también tiene `edit`, la edición es **completa** (no el modo limitado de problemática/estado/fotos). Con `own_only=true` (default técnico) solo ve/edita las suyas (asignado o creador).
- **Órdenes — status `pausado`:** además de `pendiente` / `resuelto`, el status del técnico puede ser `pausado`; exige `motivo_pausa` (texto). El listado agrupa Pendientes → Pausados → Resueltas.
- **Catálogos en cotización**: GET a `/api/productos/syscom/*`, `/api/productos/tvc/*` y `/api/productos-manuales/` permiten usuarios con acceso a `cotizaciones` (aunque no tengan módulo `productos`). Altas/edición/baja de manuales siguen exigiendo `productos`.
- **Proyectos**: módulo propio `proyectos` (independiente de `ordenes`). Sidebar y ruta `/proyectos` requieren `proyectos.view`.
- **Póliza de mantenimiento**: ruta `/polizas-mantenimiento`, página `frontend/src/pages/Operacion/PolizasMantenimiento/PolizasMantenimientoPage.tsx` (listado como Proyectos; alta/edición en modal `form/PolizaFormModal.tsx`), solo admin (`RequireAdmin`). CRUD `GET/POST /api/polizas-mantenimiento/`, `GET/PATCH/DELETE /api/polizas-mantenimiento/{id}/`, `GET /api/polizas-mantenimiento/{id}/pdf/`, `GET /api/polizas-mantenimiento/{id}/xml/` (admin, `IsAdminUser`). Picker liviano `GET /api/polizas-mantenimiento/cotizaciones/?cliente_id=` (FK o misma razón social). Folio `POL-10001+`. Tipo actual `cctv`. Sin módulo de permisos `polizas`. Spec: `docs/superpowers/specs/2026-08-14-polizas-mantenimiento-placeholder-design.md`.
- **Reporte de mantenimiento**: ruta `/reportes-mantenimiento` (+ `/nuevo`, `/:id`, `/:id/pdf`), solo admin (`RequireAdmin`). Modelo `ReporteMantenimiento` en `apps.operacion`: FK a orden de servicio (`orden_id` / snapshots `orden_folio`, `orden_cliente`) + `foto_orden_url` opcional + secciones JSON `{ id, titulo, fotos_antes[], fotos_despues[] }` (hasta 10 fotos por lado; compat con `foto_antes_url` / `foto_despues_url` legacy). CRUD `GET/POST /api/reportes-mantenimiento/`, `GET/PATCH/DELETE /api/reportes-mantenimiento/{id}/`, `GET /api/reportes-mantenimiento/{id}/pdf/`, `POST /api/reportes-mantenimiento/upload-image/` y `delete-image/` (Cloudinary `reportes-mantenimiento/`). Folio `RM-10001+`. PDF generado en servidor (plantilla operativa Antes/Después). FE: `frontend/src/pages/Operacion/ReportesMantenimiento/` (`ReportePdfPage` como Órdenes/Proyectos).
- **Inventario**: módulo propio `inventario` (escáner HID / código de barras). En el sidebar vive bajo **Productos Y Servicios**; la ruta `/inventario` requiere `inventario.view`; registrar entradas y salidas (`POST /api/inventario/scan/`) requieren `inventario.create`; editar ficha de ítem (`PATCH`) requiere `inventario.create` o `inventario.edit`; buscar en catálogo para vincular (`GET /api/inventario/catalogo/`) requiere `inventario.view` (SYSCOM/TVC + productos manuales); registrar desde catálogo sin movimiento (`POST /api/inventario/registrar-catalogo/`) requiere `inventario.create` (si el ítem es nuevo se crea con stock inicial 1; si ya existe se reutiliza sin alterar stock); importar factura (`POST /api/inventario/importar-factura/`) requiere `inventario.create`; subir foto (`POST /api/inventario/upload-image/`) requiere `inventario.create`; eliminar ítem (`DELETE`) requiere `inventario.delete`. FE: `frontend/src/pages/Inventario/`. Ítems tienen `seccion` (12 categorías fijas + vacío); listado filtra con `?seccion=<slug|sin>`. Spec: `docs/superpowers/specs/2026-08-10-inventario-secciones-design.md`.

## Convenciones

1. **Cambios mínimos** — no refactorizar fuera del alcance del ticket.
2. **Tipos** — preferir archivos `*Types.ts` por dominio (ver `wialonTypes.ts`, `cotizacionFormTypes.ts`).
3. **Modales** — componente `Modal` exige `ariaLabelledBy` o `ariaLabel`; incluye focus trap.
4. **Seguridad** — `DEBUG` se lee de env (default `false`). Imágenes remotas: `apps/common/ssrf.py`.
5. **Tests** — Vitest en frontend; `python manage.py test` en backend para smoke de permisos.
6. **Componentes compartidos** — evitar duplicados con APIs parecidas. `SearchableSelect` canónico vive en `frontend/src/components/form/SearchableSelect.tsx`; no crear variantes en `components/ui/select` sin migrar usos y documentar la nueva frontera.

## Calidad de código

Antes de cerrar un ticket, ejecutar los mismos checks que CI (ver `.github/workflows/ci.yml`).

### Frontend

```bash
cd frontend
pnpm exec tsc -b --noEmit    # 0 errores TypeScript
pnpm test                    # Vitest
pnpm exec eslint src         # ver alcance CI abajo
```

**ESLint en CI** lintea `src` **excepto** `src/pages/**`, `src/context/**` y `src/svg.d.ts`. Eso no significa que `pages/` esté exento de calidad: al tocar una página, corregir en el mismo diff los problemas que ESLint reporte ahí (`pnpm exec eslint src/pages/...`).

| Regla | Política |
|-------|----------|
| `@typescript-eslint/no-explicit-any` | Evitar `any` nuevo. Tipar respuestas API en `*Types.ts`. Reducir deuda gradualmente en archivos que se editen. |
| `no-empty` | Prohibido `catch {}` vacío. Comentar la intención o registrar el error (`console.error` / toast). |
| `react-hooks/exhaustive-deps` | Corregir al modificar el efecto; no silenciar sin revisar bugs de datos obsoletos. |
| `prefer-const` | Usar `const` si la variable no se reasigna. |

### Backend

```bash
cd backend
ruff check apps              # imports, estilo (auto-fix: ruff check apps --fix)
python manage.py test apps.users apps.productos apps.cotizaciones apps.ordenes apps.operacion apps.common apps.clientes apps.escritorio apps.inventario
```

### Ortografía (UI)

- Textos visibles al usuario en **español de México** con tildes: Cotización, Teléfono, Descripción, Número, etc.
- Nombres de variables, rutas y claves API sin tilde (`telefono`, `/cotizacion`) — es correcto.
- Revisar mensajes de toast, `title`, `placeholder`, `label` y textos de PDF al añadir copy nuevo.

### Deuda conocida (auditoría 2026-08)

- Usos de `any` en `frontend/src/pages/**`: bajaron de ~355 (auditoría 2026-06) a **~164**. Seguir tipando al editar cada módulo.
- **Archivos monolíticos** — extraer hooks/componentes al ampliar funcionalidad, no en refactors masivos no solicitados. Los mayores hoy:

  | Archivo | Líneas |
  |---------|--------|
  | `frontend/src/pages/Ventas/Cotizacion/NuevaCotizacionPage.tsx` | ~3,630 |
  | `backend/apps/operacion/wialon_client.py` | ~2,530 |
  | `frontend/src/pages/Operacion/CuentasAntarix/EditWialonUserModal.tsx` | ~2,400 |
  | `frontend/src/pages/Configuracion/GestionUsuario.tsx` | ~2,200 |
  | `frontend/src/pages/.../LevantamientoForm.tsx` | ~2,220 |
  | `backend/apps/ordenes/views.py` | ~1,950 |

- **Cobertura desigual de tests** (actualizado 2026-08-25): backend cubierto en los tres módulos que iban en rojo.
  - `apps/ai/tests/test_chat_proxy.py` (14 tests): el proxy `POST /api/ai/chat/` exige auth, valida `messages` y la config (`AI_API_KEY`, `AI_API_URL` https) antes de tocar la red, y traduce timeout → 504 / conexión caída → 502 / 5xx del upstream → 502 en vez de reventar. **Ningún test sale a la red**: todos parchan `http.client.HTTPSConnection`. Al ampliar la app de IA, mantener esa regla.
  - `apps/users/tests/test_permissions_matrix.py` (48 tests): matriz de bordes de `ModulePermission` (usuario sin `UserPermissions`, `view` ausente / `None` / `False` / string, claves con mayúsculas, módulo no-dict, bypass staff/superuser, método HTTP → clave CRUD, `has_object_permission` por autoría, fallback `reportes`→`ordenes`) y de `user_module_own_only`. Incluye la lista blanca de delegación de permisos.
  - `apps/users/tests/test_smtp_crypto.py` (24 tests): round-trip Fernet, normalización de la clave pegada con comillas/espacios, derivación desde `SECRET_KEY`, error accionable al rotar clave, y que la contraseña SMTP nunca quede en claro en BD ni salga en las respuestas de `/api/users/accounts/`.
  - `apps/clientes/tests/test_crud_permisos.py` (37 tests): CRUD con permisos del módulo (403 tanto en listado como en detalle por ID), alcance de solo lectura de `ClientesCatalogPermission` para usuarios de órdenes, tipos `EMPRESA`/`PERSONA_FISICA`/`PROVEEDOR` (el filtro `?tipo=PROVEEDOR` alimenta inventario), `idx` automático y de solo lectura, contacto principal y aislamiento de contactos/documentos.
  - Frontend sigue con test directo en ~9% de los archivos fuente.
- **Bugs de producción detectados por esos tests y NO corregidos** (marcados con `@expectedFailure`; al arreglarlos, unittest los reportará como «unexpected success» → quitar el decorador):
  1. `apps/users/permissions.py` — `ModulePermission.has_permission` hace `permissions.get(module_key)` sin verificar que `permissions` sea dict (el helper `_module_perms_for_key` sí lo hace). Si `UserPermissions.permissions` guarda una lista o un string, **toda** petición de ese usuario da `AttributeError` → HTTP 500. Es alcanzable: `PUT /api/users/accounts/{id}/permissions/` acepta cualquier JSON sin validar el tipo. Arreglo: usar `_module_perms_for_key(...)` también en `has_permission` y/o validar dict en el serializer.
  2. `apps/users/serializers.py` — `_save_smtp` escribe sobre la instancia de `UserSmtpCredentials.objects.get_or_create(...)`, distinta de la relación ya cacheada por `select_related('smtp_credentials')`. La respuesta del `PATCH` con `smtp_clear` devuelve el estado anterior (`smtp_configured: true`) aunque la BD sí quedó limpia: Gestión de usuarios sigue mostrando el buzón hasta recargar.
  3. `apps/clientes/views.py` — el `except Exception` de `create()`/`update()` atrapa también las excepciones de DRF: un `PermissionDenied` de objeto sale como **400 «Error al actualizar el registro.»** y un `PATCH` a un ID inexistente da 400 en vez de 404 (mientras GET y DELETE del mismo ID sí dan 404). Arreglo: dejar pasar `APIException`/`Http404` antes del `except` genérico.
- ~~**`STATICFILES_STORAGE` es un no-op**~~ — **resuelto (2026-08)**: migrado al dict `STORAGES` en `backend/config/settings.py`. Ver «Storages» abajo.
- **Modo limitado de edición de órdenes inalcanzable**: `get_object` ya rechaza la orden ajena con `own_only=True`, y con `own_only=False` la edición es completa. La rama limitada de `filter_limited_orden_update` se mantiene como defensa en profundidad, no como camino vivo.
- **`render.yaml` solo define el frontend**: el servicio Django/gunicorn vive configurado a mano en el dashboard de Render, fuera de control de versiones.
- **App huérfana `documentos` con migración ya aplicada en BD** (auditoría 2026-08): `backend/apps/documentos/` conserva **solo** `migrations/0001_initial.py` (único archivo versionado; sin `__init__.py`, `models.py` ni `views.py` — fue un spike de OneDrive/Graph que nunca se commiteó). La app **nunca** estuvo en `INSTALLED_APPS`, así que Django no la carga y `showmigrations` no la lista.

  **Pero la migración sí se aplicó contra la BD remota**: existe la fila `('documentos', '0001_initial')` en `django_migrations` (aplicada 2026-08-05) y la tabla `documentos_onedriveconnection`. Alguien corrió `migrate` con la app instalada en local sin commitear el `settings.py`.

  **No borrar el directorio sin limpiar la BD primero.** Borrar solo el archivo deja la tabla y la fila huérfanas sin forma de revertirlas por Django, y crea una trampa: si algún día se crea otra app con label `documentos`, su `0001_initial` se considerará ya aplicada y **no** creará sus tablas. Limpieza correcta (requiere ventana de mantenimiento y confirmar con quién opera la BD): reinstalar temporalmente `apps.documentos` en `INSTALLED_APPS`, `python manage.py migrate documentos zero` (dropea la tabla y borra la fila) y recién entonces eliminar el directorio y la entrada de `INSTALLED_APPS`.

## App móvil (`mobile/`)

App Android de técnicos, **SertelPro** (Expo Router + TypeScript strict). Consume `backend/`; no es un WebView ni un segundo backend. Documentación de uso y build: `mobile/README.md`.

- **Gestor de paquetes**: **pnpm** (workspace: `frontend` + `mobile`). `mobile/.npmrc` fija `strict-peer-dependencies=false` porque Expo SDK 57 fija `react@19.2.3` y `expo-router` arrastra peers más nuevos. Render/frontend usa `pnpm install --frozen-lockfile --filter frontend...` para **no** instalar Expo en el static site.
- **Capas**: UI (`app/`) → hooks (`src/features/*`) → cliente HTTP (`src/api/`). Sin `fetch` suelto en pantallas.
- **Tokens**: `access` en memoria + `expo-secure-store`; `refresh` **solo** en SecureStore. Nunca AsyncStorage sin cifrar y nunca loguear tokens ni credenciales.
- **Refresh**: `src/api/httpClient.ts` mantiene **una sola cola**. El backend rota y blacklistea el refresh en cada uso, así que N refresh concurrentes invalidarían la sesión.
- **Autorización**: siempre del servidor (`OrdenesPermission`, `edit_scope`, `own_only`). Los helpers de `src/auth/permissions.ts` son espejo de lectura para ocultar UI, no una segunda fuente de verdad.
- **Edición de campo**: solo los campos de `LIMITED_ORDEN_EDIT_FIELDS` (`backend/apps/ordenes/edit_scope.py`): `comentario_tecnico`, `status`, `motivo_pausa`, fechas/horas, `fotos_urls`, `fotos_extra_max`, `firma_cliente_url`. El formulario manda un PATCH **solo con lo que cambió** y siempre parte de `GET /api/ordenes/{id}/` (el listado hace `defer` de fotos y firmas). Fechas/horas: selector nativo `@react-native-community/datetimepicker` (`DateTimeField`); el PATCH sigue mandando `YYYY-MM-DD` / `HH:MM`. Fotos: `expo-image-picker` + `POST /api/ordenes/upload-image/`. Firma: lienzo + `react-native-view-shot` → data URL en el PATCH.
- **Tema**: la app tiene **mundo visual propio**, documentado en `mobile/DESIGN.md`: azul eléctrico `#1B5CFF` sobre blanco, tipografía **Geist**, líneas de 1 px. **No** hereda el crema + naranja del ERP web (decisión del usuario, 2026-08-26). Incluye **modo oscuro** (`ThemeProvider` + `AppNavbar` con interruptor; preferencia en SecureStore). Todo estilo de texto parte de un token de `type`: en React Native `fontFamily` no se hereda y el texto cae en Roboto. `mobile/PRODUCT.md` guarda la verdad de producto. El `CLAUDE.md` de la raíz es brand de marketing de Claude, **no** el design system de este producto.
- **Dev contra backend local**: `runserver 0.0.0.0:8000` + `EXPO_PUBLIC_API_URL=http://<IP-LAN>:8000`. En `DEBUG`, `config/settings.py` agrega solo las IPs LAN de la máquina a `ALLOWED_HOSTS` (antes eran fijas y una IP nueva daba `400 Invalid HTTP_HOST header`). Tras tocar `.env` hay que reiniciar Metro con `-c`: las `EXPO_PUBLIC_*` se inyectan al compilar.
- **SDK anclado a Expo Go (54)**: el proyecto va en **SDK 54** a propósito, no en el `latest` de npm. Expo Go de las tiendas solo ejecuta el SDK que trae compilado (`.data.expoGoSdkVersion` de `https://api.expo.dev/v2/versions/latest`); con SDK 57 fallaba en Android **y** iPhone con `Project is incompatible with this version of Expo Go`, y en iOS no hay sideload posible. **Antes de subir de SDK**, verificar ese número: ir por delante obliga a development builds. `npx expo-doctor` debe salir sin fallos, y las versiones exactas importan (un desfase de patch en `expo`/`react-native`, o módulos nativos duplicados por pnpm, hace que Expo Go crashee al abrir sin dejar logs en Metro).
- **pnpm + React Native**: `pnpm-workspace.yaml` declara `publicHoistPattern: ['*metro*']`. RN y `@expo/cli` asumen un `node_modules` plano; sin eso `expo start`/`expo export` mueren con `Cannot find module 'metro-runtime/package.json'`. `@types/react` va en `expo.install.exclude` (mobile/package.json) porque el `override` de la raíz lo fija en 19.2 para el frontend, mientras el SDK 54 espera 19.1.
- **`app.json`**: el schema del SDK 57 **rechaza** `newArchEnabled` y `splash` (la nueva arquitectura ya es el default y el splash va por el plugin `expo-splash-screen`). Un `app.json` inválido rompe el manifiesto que lee Expo Go.
- **Nunca volcar cuerpos de error en la UI**: `src/api/errors.ts` solo muestra textos que vengan en JSON, de una línea y ≤300 caracteres. Con `DEBUG=True`, Django responde a un host no permitido con su página de depuración (22 KB de HTML con traceback y configuración) y la app llegó a mostrarla completa al fallar el login. `httpClient` descarta el cuerpo si no es JSON (en dev deja un recorte en consola). Tests: `src/api/__tests__/errors.test.ts`.
- **`ALLOWED_HOSTS`**: `resolve_allowed_hosts` en `config/settings.py`. Con `DEBUG=True` devuelve `['*']` — **también** si `.env` trae una lista —, porque la IP LAN cambia con la red y el valor se evalúa al arrancar; con `DEBUG=False` manda la lista explícita del entorno y nunca hay comodín. Tests: `apps/common/tests/test_allowed_hosts.py`.
- **Arranque de sesión**: `src/auth/bootstrapSession.ts` **siempre** resuelve (tope de 8 s). La app no debe poder quedarse en «Restaurando sesión…»; un fallo de red manda a Login **sin** borrar los tokens, y solo un rechazo real del servidor los borra.
- **Distribución**: EAS, perfil `preview` → APK sideload (`pnpm exec eas build -p android --profile preview` desde `mobile/`). Sin Play Store en v1. Subir `version` y `android.versionCode` en `app.json` por build. No commitear keystores ni secretos de EAS.
- **Calidad** (antes de cerrar un ticket de `mobile/`):

```bash
cd mobile
pnpm typecheck
pnpm lint
pnpm test
pnpm exec expo export --platform android   # el bundle debe compilar
```

# Desde la raíz:
# pnpm mobile:typecheck && pnpm mobile:lint && pnpm mobile:test

Fases: **1 (hecha)** auth + listado + detalle + edición de campo · **2 (hecha)** fotos y firma del cliente en edición · **3** equipos de inventario, mapa y envío de PDF.

## Web Performance

Las rutas de `src/App.tsx` usan **`React.lazy` + `Suspense`** (code splitting por página). Reglas:

1. **Páginas nuevas siempre lazy** — añadir con `const Pagina = lazy(() => import("@/pages/..."))`. Solo quedan eager: `SignIn`, `AppLayout`, guards (`Require*`) y `ScrollToTop`.
2. **Las páginas lazy deben tener `export default`** (requisito de `React.lazy`).
3. **Fallback de carga**: `src/components/common/RouteLoadingFallback.tsx` (accesible: `role="status"` + `aria-live="polite"`, compatible claro/oscuro). Reutilizarlo, no crear spinners por ruta.
4. **ErrorBoundary global**: `src/components/common/ErrorBoundary.tsx` envuelve al `<Router>` en `App.tsx`. Existe porque tras un deploy los chunks viejos dejan de existir y una pestaña abierta que navega recibe un 404 al pedir su chunk: sin boundary la SPA queda en blanco. Es class component a propósito (`getDerivedStateFromError` no tiene equivalente en hooks). No quitarlo ni anidar un segundo boundary global.
5. **Librerías pesadas** (ApexCharts, FullCalendar, Leaflet, markdown, drag & drop) solo deben importarse desde páginas/componentes lazy — nunca desde `main.tsx`, `App.tsx`, layout o guards, porque eso las mete al bundle inicial.
6. **CSS de librerías** se importa en el componente que la usa (ej. flatpickr en `components/form/date-picker.tsx`), no en `main.tsx`.
7. Antes de cerrar cambios de performance ejecutar:
   - `cd frontend && pnpm exec tsc -b --noEmit`
   - `cd frontend && pnpm test`
   - `cd frontend && pnpm exec eslint src/App.tsx src/components/common`
   - `cd frontend && pnpm build` (verificar que la página siga partida en chunks y el entry no crezca)

Deuda pendiente (fase 2): listados de cotizaciones sin virtualización; chunk de ApexCharts (~570 KB) compartido por dashboard y reportes. Órdenes: el listado sigue sin `page`/`page_size`, pero `GET /api/ordenes/` acepta `mes=YYYY-MM`, `tipo_orden=…` y `limit=1–200` (feed liviano) y usa `OrdenListSerializer` (sin fotos/firmas); el detalle (`retrieve`) sigue con el serializer completo. Al editar en FE se hace `GET /api/ordenes/{id}/` antes de abrir el formulario (si se reusara solo la fila del listado, al guardar se podrían borrar firma/fotos). Panel admin: `GET /api/dashboard/stats/` (staff) devuelve agregados mensuales sin dumps.

### Dependencias (auditoría 2026-06)

Se eliminaron 15 paquetes sin uso o duplicados: `react-dnd`, `react-dnd-html5-backend`, `animejs`, `swiper`, `react-markdown`, `rehype-raw`, `remark-gfm`, `@tanstack/react-table`, `class-variance-authority`, `leaflet`, `react-simple-maps`, `world-atlas`, `@fullcalendar/list` y los types asociados. Convenciones vigentes:

- **Drag & drop**: solo `@atlaskit/pragmatic-drag-and-drop`. No reintroducir `react-dnd`.
- **Animaciones**: solo `motion` (`motion/react`). No reintroducir `animejs`.
- **Mapas**: Leaflet se carga vía CDN en runtime (`window.L`) — no instalar el paquete npm sin migrar también los componentes que usan el global.
- Antes de añadir una dependencia nueva, verificar que no exista ya una equivalente en `package.json`.

#### `package.json` de la raíz (auditoría 2026-08)

El `package.json` de la raíz es el contenedor del workspace pnpm: `packageManager`, scripts `frontend:*` / `mobile:*` y nada de `devDependencies` propias. `render.yaml` instala con `pnpm install --frozen-lockfile --filter frontend...` para no meter Expo en el build del static site.

- Se eliminaron `@qwen-code/qwen-code` (+ scripts `qwen` y `qwen:version`) y `husky`: ninguno tenía uso en el repo.
- **Sin git hooks**: no hay `.husky/` ni script `prepare`, y es deliberado. Las puertas de calidad viven en `.github/workflows/ci.yml` (tsc, eslint, vitest, ruff, tests de Django). No reintroducir `husky` a medias — declararlo sin `prepare` ni `.husky/` no instala nada y solo engorda el build. Si algún día se quieren hooks, activarlos completos (`prepare` + hook rápido sobre archivos staged) y documentarlo aquí; la suite de Django (~10 min) nunca va en un `pre-commit`.

## Accesibilidad y semántica

- **Skip link**: `AppLayout` incluye "Saltar al contenido principal" hacia `#main-content`. No eliminarlo ni cambiar el `id` del `<main>`.
- **Modales**: `Modal` exige `ariaLabelledBy` (preferido, apuntando al `id` del título visible) o `ariaLabel` descriptivo en español. Sin ninguno, el lector de pantalla anuncia solo "Diálogo" — no dejar modales así.
- **Botones de icono**: todo `<button>` sin texto visible lleva `aria-label` en español ("Cerrar notificaciones", "Abrir menú lateral", …). Los toggles llevan además `aria-pressed`/`aria-expanded`.
- **Tablas**: `TableCell isHeader` renderiza `<th scope="col">` por defecto; usar `scope="row"` para encabezados de fila.
- **Imágenes**: `alt` significativo en imágenes informativas (producto → título del producto). `alt=""` solo para imágenes decorativas.

## Flujo local (resumen)

```text
Terminal 1: backend/.venv → migrate → runserver :8000
Terminal 2: frontend → pnpm dev :5173
```

### Local, no GitHub

`.agents/`, `.codex/`, `.cursor/`, `.superpowers/`, `.worktrees/` y `docs/` son locales (`.gitignore`). No commitearlos.

### TestSprite local

- MCP y lanzador viven en `.codex/` (local; no versionar). Config: `.codex/config.toml`; script: `.codex/start-testsprite.ps1`.
- La clave se define como `TESTSPRITE_API_KEY` en `.env` o `backend/.env`. El lanzador solo la traduce a `API_KEY`, que es el nombre esperado por TestSprite; nunca imprimirla ni commitearla.
- Para pruebas de UI usar el frontend en el puerto `5173`; para pruebas de API usar Django en el puerto `8000`.
- Después de agregar o cambiar la clave, reiniciar Codex antes de invocar TestSprite.

## Archivos de referencia

| Tema | Archivo |
|------|---------|
| API cliente | `frontend/src/config/api.ts` |
| Permisos backend | `backend/apps/users/permissions.py` |
| Settings / DEBUG | `backend/config/settings.py` |
| SSRF imágenes | `backend/apps/common/ssrf.py` |
| CI | `.github/workflows/ci.yml` |
| ESLint (frontend) | `frontend/eslint.config.js` |
| Arquitectura frontend (roadmap) | `docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md` |
| Proyectos — Ola 1 (carpetas) | `docs/superpowers/specs/2026-07-30-proyectos-frontend-architecture-design.md` |
| Órdenes servicio — Ola 2 (carpetas) | `docs/superpowers/specs/2026-07-30-ordenes-frontend-architecture-design.md` |
| Ventas (pages) | `frontend/src/pages/Ventas/` — ver tabla abajo |

### `pages/Ventas/` (lazy imports)

Las páginas de ventas viven en subcarpetas; el `import()` de `App.tsx` debe coincidir **exactamente** con la ruta del archivo (incluida la subcarpeta y el casing).

| Pantalla | Archivo | Lazy import en `App.tsx` |
|----------|---------|---------------------------|
| Cotizaciones | `Ventas/Cotizacion/CotizacionesPage.tsx` | `@/pages/Ventas/Cotizacion/CotizacionesPage` |
| Nueva / editar cotización | `Ventas/Cotizacion/NuevaCotizacionPage.tsx` | `@/pages/Ventas/Cotizacion/NuevaCotizacionPage` |
| PDF cotización | `Ventas/Cotizacion/CotizacionPdfPage.tsx` | `@/pages/Ventas/Cotizacion/CotizacionPdfPage` |
| PDF proyecto | `Operacion/Proyectos/ProyectoPdfPage.tsx` | `@/pages/Operacion/Proyectos/ProyectoPdfPage` |
| PDF póliza | `Operacion/PolizasMantenimiento/PolizaPdfPage.tsx` | `@/pages/Operacion/PolizasMantenimiento/PolizaPdfPage` |
| Facturas CFDI (SICAR) | `Ventas/FacturasCFDI/FacturasCfdiPage.tsx` | `@/pages/Ventas/FacturasCFDI/FacturasCfdiPage` |

Si el import apunta a `@/pages/Ventas/FacturasCfdiPage` (sin `FacturasCFDI/`), Vite devuelve HTML (404 del SPA) y el navegador reporta `MIME type "text/html"`. Windows tolera mayúsculas en disco; CI/Linux no — usar siempre `FacturasCFDI`.

## Decisiones de seguridad (documentadas)

### Rate limit de login (dos ejes)

`backend/apps/users/throttling.py` — la vista `login_view` aplica **dos** throttles a la vez:

| Throttle | Eje | Límite | Motivo |
|----------|-----|--------|--------|
| `LoginRateThrottle` | IP | 20/min | Deliberadamente holgado: varios técnicos comparten la IP de la oficina. **No bajarlo.** |
| `LoginAccountRateThrottle` | cuenta (username/email) | 10/min | Cierra el password spraying distribuido que el eje IP no ve: N IPs probando contraseñas contra el mismo usuario. |

El límite por cuenta es case-insensitive (igual que el lookup de la vista) y su clave de caché es un SHA-256 salado con `SECRET_KEY`: **nunca** guardar el username en claro en la clave. Sin `username`/`email` en el body no aplica (lo cubre el eje IP). Tests: `backend/apps/users/tests/test_login_throttling.py`.

### CSRF + `Authorization: Bearer`

En `backend/config/middleware.py`, las peticiones a `/api/*` con cabecera `Authorization: Bearer …` **no exigen token CSRF**. Es compatibilidad con clientes que envían JWT en header (p. ej. access token en memoria/`sessionStorage`).

**Riesgo:** si un atacante inyecta JS (XSS) y lee el access token, puede hacer mutaciones sin CSRF. La mitigación principal es cookie HttpOnly para refresh + CSP; el bypass de Bearer es **intencional** hasta migrar por completo a cookie-only.

**Antes de endurecer:** acordar con producto/seguridad — opciones: eliminar bypass en producción, restringirlo a rutas concretas, o retirar el access token del body de login/refresh.

### Auth cookie-only y `sessionStorage`

`frontend/src/config/authSession.ts` mantiene el access token solo en memoria del tab y limpia claves legacy de tokens en `sessionStorage`. No volver a persistir access/refresh token en Web Storage.

`AuthContext` no debe cachear usuario/permisos en `sessionStorage`; en recargas o pestañas nuevas debe reconstruir sesión con cookies HttpOnly usando `/api/token/refresh/` y después `/api/me/`.

## PDF / plantillas

- HTML de cotizaciones: `backend/apps/cotizaciones/pdf_templates/cotizacion.py`
- HTML de órdenes: `backend/apps/ordenes/pdf_templates/orden.py`
- HTML de proyectos: `backend/apps/operacion/pdf_templates/proyecto.py` (`GET /api/proyectos/{id}/pdf/`, bitácora por jornada, sin precios)
- **Póliza de mantenimiento (CCTV)**: modelo `PolizaMantenimiento` en `apps/operacion`. CRUD admin `GET/POST /api/polizas-mantenimiento/`, `GET/PATCH/DELETE /api/polizas-mantenimiento/{id}/`, PDF guardado `GET /api/polizas-mantenimiento/{id}/pdf/`, XML `GET /api/polizas-mantenimiento/{id}/xml/` (admin, `IsAdminUser`; no es un CFDI). Plantilla de borrador `GET /api/polizas-mantenimiento/pdf/?tipo=cctv` y `GET /api/polizas-mantenimiento/xml/?tipo=cctv` con overlay opcional `folio`, `cliente`, `cotizacion`, `v1`–`v3`. Vista FE `/polizas-mantenimiento/pdf`. Folio `POL-{idx}` desde 10001. Spec: `docs/superpowers/specs/2026-08-14-polizas-mantenimiento-placeholder-design.md`.
- **Reporte de mantenimiento**: modelo `ReporteMantenimiento` (`orden`, `fecha_servicio`, `tecnico_nombre`, `foto_orden_url`, `secciones` JSON con `fotos_antes[]` / `fotos_despues[]`, máx. 10 por lado). CRUD admin `/api/reportes-mantenimiento/` + `upload-image/` + `delete-image/` + `GET …/{id}/pdf/`. Folio `RM-{idx}` desde 10001. Vista FE `/reportes-mantenimiento/:id/pdf`. Spec: `docs/superpowers/specs/2026-08-21-reporte-mantenimiento-design.md`.
- **Enviar PDF de proyecto por correo**: `GET /api/proyectos/{id}/correo-sugerido/`, `POST /api/proyectos/{id}/enviar-pdf/` — mismo SMTP por usuario (`ProyectosSendPdfPermission`, basta `proyectos.view`). Asunto/cuerpo en `backend/apps/operacion/email_pdf.py`.
- HTML de facturas CFDI (SICAR): `backend/apps/cotizaciones/sicar_cfdi_pdf.py`
- Helpers compartidos: `backend/apps/common/pdf_html.py`, `backend/apps/common/pdf_images.py`
- **Proyectos CRUD** (`apps/operacion`): `GET/POST /api/proyectos/`, `GET/PATCH/DELETE /api/proyectos/{id}/`, `GET /api/proyectos/{id}/pdf/`, `GET /api/proyectos/{id}/correo-sugerido/`, `POST /api/proyectos/{id}/enviar-pdf/`, `POST /api/proyectos/upload-image/` y `delete-image/`. Permisos del módulo **`proyectos`** (`ProyectosPermission`; envío PDF con `ProyectosSendPdfPermission`). Folio `PRJ-{idx}`. Carpetas Cloudinary: `proyectos/evidencias`, `proyectos/bitacora`, `proyectos/firmas`, `proyectos/instalacion/dibujos`.
- **Inventario** (`apps/inventario`): `POST /api/inventario/scan/` (entrada/salida ±1 por código de barras; alta automática en entrada), `GET /api/inventario/items/` (`?search=&page=&page_size=` → `{ count, next, previous, results }`, default 20; al listar rellena hasta 5 secciones vacías de la página desde el catálogo), `GET /api/inventario/stats/` (totales globales), `GET/PATCH/DELETE /api/inventario/items/{id}/`, `GET /api/inventario/movimientos/` (`?item=&desde=&page=&page_size=` — paginado; cada movimiento incluye `usuario` + `usuario_nombre` + campos `item_*`), `GET /api/inventario/catalogo/` (`?search=`, mínimo 3 caracteres; SYSCOM/TVC + productos manuales), `POST /api/inventario/registrar-catalogo/` (`{ fuente: "syscom"|"tvc"|"manual", ref, modelo, nombre, marca, imagen_url }` → crea o reutiliza ítem; si es nuevo inicia con stock 1 y sin movimiento), `GET /api/inventario/catalogo/detalle/` (`?fuente=&ref=&modelo=`), `POST /api/inventario/sincronizar-secciones/` (`{ limit }` → backfill de `seccion` vacía; requiere `inventario.view`), `POST /api/inventario/importar-factura/` (`{ proveedor: "syscom"|"tvc", folio }` → entradas masivas desde factura; TVC responde 501 hasta soportarlo), `POST /api/inventario/upload-image/` (`{ data_url }` → carpeta Cloudinary `inventario/productos`). Permisos módulo **`inventario`** (`InventarioPermission`). FE: `frontend/src/pages/Inventario/`. Spec paginación: `docs/superpowers/specs/2026-08-07-inventario-paginacion-design.md`.

  **Importar factura.** `POST /api/inventario/importar-factura/` consulta el detalle en el proveedor (`GET /api/v1/facturas/{FA26}/{id}` en SYSCOM), matchea por `fuente+ref_externa` o por `codigo_barras==modelo`, crea con modelo como código si no existe, suma la cantidad de cada línea en un solo movimiento de entrada y registra `InventarioImportacion` (unique proveedor+folio) para bloquear reimports (`409`). Spec: `docs/superpowers/specs/2026-08-05-inventario-importar-factura-design.md`.

 **Líneas de servicio en la factura.** SYSCOM factura el envío como si fuera un producto de catálogo (`SYSCOM-ENVIO-136321`, `cod_art: "ENVIO"`), así que no basta con filtrar líneas sin `producto_id`. `es_linea_de_servicio` (en `invoice_import.py`) descarta por código normalizado: prefijos `ENVIO`/`FLETE`/`PAQUETERIA` y códigos `SEGURO`/`MANIOBRA(S)`. Si aparece otro cargo que no sea mercancía, agregarlo ahí — no al frontend.

 **Títulos con entidades HTML.** Los `titulo` de la factura vienen escapados (`Conexi&oacute;n`, `Env&iacute;o`). `_nombre_corto` los pasa por `_plain_text` (de `enrichment.py`) antes de partir el título en nombre + características; no guardar el título crudo.

  **Última compra en el ítem.** Cada import sobrescribe en `InventarioItem`: `folio_factura`, `precio_unitario` (de la línea SYSCOM) y `proveedor` (FK a `Cliente` tipo `PROVEEDOR`). `obtener_o_crear_proveedor` busca/crea “SYSCOM” o “TVC” en Contactos. Spec: `docs/superpowers/specs/2026-08-07-inventario-folio-proveedor-precio-design.md`.

  **Precio desde catálogo.** Al enriquecer/vincular, `_map_product` calcula `precio_unitario` en MXN tomando el **más bajo** entre lista/especial/descuento (SYSCOM: USD × tipocambio × 1.16; TVC: `precio_mxn` o escala al descuento). Solo rellena si el campo está vacío; el modal lo edita vía `PATCH`. Spec: `docs/superpowers/specs/2026-08-07-inventario-precio-catalogo-design.md`.

  **Detalle del catálogo (foto y ficha técnica).** La búsqueda `/catalogo/` **no** trae foto ni características: eso solo vive en el detalle. `GET /api/inventario/catalogo/detalle/?fuente=&ref=&modelo=` lo resuelve con `fetch_catalog_detail` (SYSCOM por `producto_id` con `_fetch_syscom_detalle`; TVC cae a búsqueda por modelo porque no expone detalle por id). Toma la fuente y la referencia por query, no del ítem, para que el modal también pueda consultarlo con un candidato recién elegido y aún sin guardar. Devuelve el mismo shape que `/catalogo/` y **no escribe**: el modal rellena solo los campos vacíos y el operador guarda. Requiere `inventario.view`.

  **Características → `notas`.** `_map_product` agrega `caracteristicas`: lista `caracteristicas` de SYSCOM, si no `descripcion`/`description` con el HTML limpiado (`_plain_text` convierte `</li>`, `</p>`, `<br>` en saltos de renglón), si no las `hash_tags` de TVC; recortado a `MAX_CARACTERISTICAS`. El alta automática al escanear lo guarda en `InventarioItem.notas` (el ítem es nuevo, no pisa nada) y el modal lo ofrece en el campo "Características y notas": autollenado solo si está vacío, o reemplazo explícito con el botón "Traer del catálogo". TVC no publica ficha técnica, así que ahí casi siempre toca capturarla a mano.

  **Foto del producto.** `InventarioItem.imagen_url` se llena con `img_portada` del catálogo al vincular, o con una subida manual. El `DELETE` del ítem y el `PATCH` que reemplaza la foto borran la imagen anterior de Cloudinary (`delete_cloudinary_resource`); por eso `inventario/productos/` está en `ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES` de `apps/ordenes/image_services.py`. Borrar un ítem **también borra sus movimientos** (FK en cascada): existe para limpiar escaneos equivocados, ya que un mismo producto puede traer más de un código de barras.

  **Códigos de barras vs. catálogos (verificado contra las APIs reales).** SYSCOM y TVC **no exponen EAN/UPC**: SYSCOM devuelve `modelo`, `sku`, `sat_key`, `titulo`, `marca`; TVC devuelve `modelo`, `sku`, `tvc_model`, `provider_model`. `sat_key` es la clave fiscal del SAT, no un código de barras. Por eso el EAN impreso en la caja **nunca** se puede traducir a un producto de catálogo con una consulta, y `enrich_from_catalogs` solo acierta cuando lo escaneado es el modelo del fabricante.

  El flujo soportado es **vincular una vez y aprender**: en la ficha del ítem se busca el producto con `search_catalogs` (`apps/inventario/enrichment.py`) y el `PATCH` guarda `fuente` + `ref_externa` sobre ese `codigo_barras`. Como el `InventarioItem` persiste el mapeo, los escaneos posteriores del mismo código ya traen nombre, marca y modelo. No reintroducir la idea de "buscar el EAN en el catálogo": ya se comprobó que devuelve 0 resultados.
- **Instalaciones GPS de proyecto**: `GET/POST /api/proyecto-instalaciones/`, `GET/PATCH/DELETE /api/proyecto-instalaciones/{id}/` (filtro `?proyecto=`). Folio UI `INS-{idx}`. Permisos módulo **`proyectos`**.
- **Cuentas Antarix / Wialon** (`apps/operacion`, módulo `cuentas_antarix`): `GET /api/wialon/usuarios/` (`?refresh=1` solo invalida caché), `PATCH /api/wialon/usuarios/limpiar-bloqueados/` (`{ days, dry_run }` — requiere `edit`; desactiva unidades y elimina usuarios bloqueados >N días), `PATCH /api/wialon/unidades/{id}/activo/` (`{ active }` → `unit/set_active`, no borra; requiere `edit`). Comando: `python manage.py wialon_purge_blocked [--days=35] [--dry-run]`. Al pulsar Actualizar en el FE (con `edit`), se llama la purga vía PATCH (CSRF). FE: `frontend/src/pages/Operacion/CuentasAntarix/`.
- **M2M Dataglobal (SIM)** (`apps/operacion`, mismo módulo `cuentas_antarix`): proxy a `https://m2mcenter.app/apiclient/v1/` con `M2M_API_KEY` (header `X-API-KEY`; opcional `M2M_API_BASE`, `M2M_USER_AGENT`). `GET /api/m2m/sims/detalle/?imei=&msisdn=&icc=` (view; `?refresh=1` bypasea caché); `POST /api/m2m/sims/test-gsm/`, `test-gprs/`, `reset/`, `sms/` requieren `edit` (body: `imei`/`msisdn`/`icc`; SMS también `message` máx. 160). Match con unidad Wialon por `uid`→IMEI o `phone`→MSISDN. Caché detalle en memoria `M2M_DETAIL_CACHE_TTL_SEC` (default 120) + caché en el tab del FE. FE: panel `UnitSimPanel` en modal de flota — comandos al equipo (`RELAY`, `RESET`, etc.) van por **SMS M2M** (no por Wialon: las SIM M2M suelen no tener `ph` en Wialon). La API-key nunca va al browser.
- **SMS Wialon (opcional)** (`apps/operacion`): `POST /api/wialon/unidades/{id}/sms/` con `{ message }` (máx. 160; requiere `cuentas_antarix.edit`). Asegura comando `custom_msg`/`gsm` y `unit/exec_cmd`. Solo útil si la unidad tiene teléfono (`ph`) y SMS de cuenta Wialon; el panel SIM usa M2M.
- **Equipos en órdenes:** `Orden.equipos_inventario` (JSON). Admin agrega desde inventario (buscar/escanear) y, si no existe, desde el catálogo de Productos (manuales / SYSCOM / TVC) vía `POST /api/inventario/registrar-catalogo/` (si es alta nueva: stock inicial 1, sin movimiento). Marca Entregado (dispara salida de stock N en la misma transacción del POST/PUT). Técnico asignado solo marca instalación. Desmarcar Entregado revierte stock. Spec: `docs/superpowers/specs/2026-08-13-orden-equipos-inventario-design.md`.
- **Fotos de orden:** `POST /api/ordenes/upload-image/`. El FE comprime con `createImageBitmap` y sube de **2 en 2** (`ordenImageUpload.ts`); se pueden elegir varias a la vez. Cloudinary: `overwrite=False`, `unique_filename=True`. Si Cloudinary falla, no se guarda un data URL (miniaturas en blanco). HEIC no se procesa: pedir «Más compatible» (JPG) en iPhone.
- **Enviar PDF de orden por correo** (solo servicio técnico resuelto): `POST /api/ordenes/{id}/enviar-pdf/`. SMTP autenticado con el **buzón del usuario** que envía (`UserSmtpCredentials` en Gestión de usuarios). Host/puerto/SSL: `EMAIL_HOST` / `EMAIL_PORT=465` / `EMAIL_USE_SSL=true`. Cifrado: `SMTP_CREDENTIALS_KEY` (ver `backend/.env.example`). Lógica en `backend/apps/ordenes/email_pdf.py`.
- **Enviar PDF de cotización por correo** (PENDIENTE o AUTORIZADA): `POST /api/cotizaciones/{id}/enviar-pdf/` — mismo SMTP por usuario; asunto/cuerpo en `backend/apps/cotizaciones/email_pdf.py`. Si el usuario no tiene SMTP configurado → 400 con mensaje claro.

## No hacer

- Commitear `backend/.env`, `db.sqlite3`, `frontend/dist/`, `node_modules/`, `.agents/`, `.codex/`, `.cursor/`, `.superpowers/`, `.worktrees/` o `docs/`.
- Inferir `DEBUG` por host de despliegue.
- Guards permisivos (`view !== false`) en rutas nuevas.
