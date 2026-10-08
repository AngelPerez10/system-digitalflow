# Sistema de diseño — Grupo Intrax / DigitalFlow (frontend)

Guía visual **obligatoria** para cualquier vista nueva o rediseño en `frontend/`. Antes de diseñar, abre una vista de referencia y cópiale la anatomía: **no inventes una paleta nueva por módulo**.

**Vistas de referencia (fuente de verdad):**
- `pages/Operacion/Proyectos/ProyectosPage.tsx` — listado: migas, banda marina, tarjetas de resumen, búsqueda, barra segmentada de estado, tabla y tarjetas.
- `pages/Ventas/Cotizacion/NuevaCotizacionPage.tsx` — editor de página completa: encabezado con datos clave y pasos, secciones numeradas y resumen marino fijo.
- `pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage.tsx` e `pages/Inventario/InventarioPage.tsx` — mismos patrones de listado.
- `pages/Documentos/Contratos/` — listado, editor, detalle y una página **pública**, todo con este sistema.

**Tokens en código (no repitas hex sueltos si ya existe el token):**
- `pages/Operacion/Proyectos/shared/proyectoTokens.ts`: superficies, campos, botones (`btn.*`), tonos de estado (`ESTADO_TONE`) y foco.
- `pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles.ts`: `pageCardShellClass`, `pageSearchInputClass`, `erpPrimaryBtnClass` y `erpStatCardClass`.
- `components/ui/modal-kit/motion.css`: todo el movimiento (`cot-*`).
- `components/ui/modal-kit/ModalKit.tsx`: modales (`AppModal`, `AppModalHeader`, `AppConfirmDialog`, etc.).

> `layout/erpPageStyles.ts` (botón naranja `#ff801f` sobre crema) es **legado**. No lo uses en vistas nuevas.

---

## Carácter

El sistema es un ERP operativo: denso pero calmado, con **lienzo blanco y líneas de 1 px**. Cada página abre con una **banda marina** (`#17235B`) con acento **dorado** (`#E6A23C`). Todo lo accionable va en **azul eléctrico** (`#1B5CFF`), el único color de acción. Usa tipografía **Geist** sans en todo, sin serif. El movimiento es corto, de una sola vez y escalonado: transmite orden, no espectáculo.

## Color

### Marca
| Rol | Claro | Oscuro | Uso |
|---|---|---|---|
| Marino (banda) | `#17235B` | `#1B2A63` | Encabezado/hero, resumen fijo, encabezados de tablas en PDF |
| Dorado (acento) | `#E6A23C` (texto sobre blanco `#B7791F`) | `#E6A23C` | Ícono del hero, halos, barra de anticipo/avance en la banda, números de cláusula |
| Azul acción | `#1B5CFF` · hover `#1244D1` | `#4B7CFF` · hover `#3B6AF0` | Botón primario, foco, enlaces, barra de progreso, folios (`#1244D1`) |
| Azul tenue | `#EEF3FF` / anillo `#D7E3FF` | `#1B2A63`/70 | Chips activos, íconos de sección `rgba(27,92,255,0.10)` |

### Superficies
| Token | Claro | Oscuro |
|---|---|---|
| Lienzo de página | blanco / `#F7F8FA` en páginas públicas | `#0f172a` / `#0B1220` |
| Tarjeta | `#FFFFFF`, borde `#E7E7EA` (o `#E4E4E7`) | `#111827`, borde `#273244` |
| Hundido (listas, pistas) | `#FAFAFA`, borde `#F0F0F2` | `#0F172A`/60, borde `#1F2A3C` |
| Divisor interno | `#F0F0F2` | `#1F2A3C` |
| Riel segmentado | `#F4F4F5` | `#0F172A` |

### Texto
`#09090B` (títulos) · `#3F3F46` (etiquetas) · `#52525B` (cuerpo) · `#6E6E77`/`#71717A` (secundario) · `#A1A1AA` (pistas, sufijos). En oscuro: `#F8FAFC` · `#D6DEEA` · `#B7C1D1` · `#8EA0B8` · `#64748B`.

### Estados (`ESTADO_TONE`, siempre píldora con punto)
| Semántica | Texto | Fondo | Anillo |
|---|---|---|---|
| En curso / info | `#1244D1` | `#EEF3FF` | `#D7E3FF` |
| Espera / atención | `#8A5D0F` | `#FFF8EB` | `#F0D7A3` |
| Éxito / cerrado | `#04724D` | `#E9F8F0` | `#BFE6D4` |
| Error / cancelado | `#B42323` | `#FEF2F2` | `#F6CFCF` |
| Neutro / borrador | `#52525B` | `#F4F4F5` | `#E4E4E7` |

Usa el mismo verde `#04724D` (oscuro `#22A06B`) en las palomitas de paso completado.

## Tipografía

- **Familia:** `Geist, Outfit, system-ui, sans-serif` (`sansStyle` / `fontSans`). No uses serif ni Georgia en vistas nuevas.
- **H1 de banda:** 28–32 px, peso 600–700, tracking `-0.8px` a `-1.1px`, blanco.
- **Eyebrow:** 11 px, peso 600, mayúsculas, tracking `0.12em`, `text-white/55` sobre marino y `#71717A` sobre blanco.
- **Título de sección:** 16 px, peso 600, tracking `-0.2px`. El texto de apoyo va a 13 px en `#71717A`.
- **Cuerpo:** 14–15 px. Las etiquetas de campo van a 13 px, peso 500, `#3F3F46`.
- **Cifras:** siempre con `tabular-nums`. Para importes grandes del resumen: 34–38 px, peso 600, tracking `-1px`.
- **Folios, RFC, CLABE, hashes:** `font-mono`. El folio va a 12 px, peso 600, en `#1244D1`.

## Layout

- **Contenedor:** `mx-auto max-w-[min(100%,1920px)] px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 pt-6 pb-12 space-y-5 sm:space-y-6`.
- **Listado:** migas → banda marina → resumen (2–4 `StatCard`) → búsqueda + botón primario → tarjeta (`pageCardShellClass`, radio 24 px) con encabezado, barra segmentada, tabla en `md+` y tarjetas en celular.
- **Editor:** encabezado (banda + `dl` de datos clave + barra de pasos) → grid `minmax(0,1fr)_360px`: secciones numeradas a la izquierda; a la derecha un `aside` **fijo** (`lg:sticky lg:top-24`) con resumen marino y acciones. En celular las acciones van en una barra inferior fija con `env(safe-area-inset-bottom)`.
- **Detalle:** encabezado marino con acciones (`heroBtn`, y `heroBtnPrimary` en blanco para la principal) → línea de vida → grid documento + `aside` con tarjetas.
- **Radios:** botones y campos 10 px · tarjetas 16–20 px · contenedor de listado y banda 24 px · píldoras `full`.
- **Toque:** mínimo 44 px (`min-h-11`). Los íconos de acción miden 36 px (`iconBtn`).

## Componentes clave

- **Banda marina:** `bg-[#17235B]` + `cot-sheen` + retícula de puntos al 7 % con máscara + halo dorado `bg-[#E6A23C]/15 blur-3xl` (y opcionalmente uno azul). Lleva un ícono dorado en una caja de 44–48 px (`rgba(230,162,60,0.16)`) y los datos clave en `dl` con `gap-px` sobre `bg-white/10`.
- **Botones** (`btn.*`): `primary` azul · `secondary` blanco con borde · `ghost` azul tenue · `dangerSoft` rojo tenue · `onNavy` translúcido. Todos llevan `cot-press` y foco `ring-4 rgba(27,92,255,0.18)`.
- **Campos** (`input`, `textarea`, `select`): alto 44 px, borde `#E4E4E7`; el foco pone el borde azul y un anillo de 4 px. Para errores usa `inputInvalid` y pon el mensaje **bajo el campo** (`fieldError`, `role="alert"`). Los sufijos y prefijos (`$`, `MXN`, `Mbps`) van dentro del campo en `#A1A1AA`.
- **Sección numerada** (`SectionCard`): número en círculo; al completarse cambia a verde con palomita `cot-tick`.
- **Barra segmentada de estado:** riel `#F4F4F5`; el segmento activo es una píldora blanca con el tono del estado y un conteo `cot-flash`. Se navega con flechas.
- **Estado vacío:** ícono en caja `#EEF3FF` 56 px con `cot-tick`, título de 16 px y una acción.
- **Carga:** esqueletos `animate-pulse` en `#F4F4F5`. Para documentos usa renglones `cot-write`. Nada de spinners a pantalla completa en listados.
- **Modales:** solo `ModalKit`. No uses `alert()`/`confirm()` nativos. Las confirmaciones destructivas van con `AppConfirmDialog`.
- **Avisos:** `components/ui/alert/Alert` en modo toast, siempre con título.

## Movimiento (`motion.css`)

Solo se animan `transform` y `opacity`. Las animaciones son de una sola vez (los únicos bucles permitidos son los de carga) y **todo queda desactivado con `prefers-reduced-motion`**.

| Clase | Uso |
|---|---|
| `cot-rise` + `style={{"--cot-i": n}}` | Entrada escalonada de bloques y filas (70 ms por índice; limita `n` a ~12 en listas) |
| `cot-fade` | Cambio de contenido en el mismo lugar (pestañas, filtros, mensajes); remonta con `key` |
| `cot-flash` | Cifra que cambió (`key={valor}`) |
| `cot-tick` | Palomita o ícono que aparece |
| `cot-bar` | Barras de progreso con `scaleX()`; nunca animes `width` |
| `cot-press` | Respuesta al pulsar en botones y tarjetas |
| `cot-sheen` | Destello único de la banda marina |
| `cot-pop` | Paneles desplegables |
| `cot-write` | Renglones «escribiéndose» mientras carga un documento |
| `cot-draw` | Trazo SVG que se dibuja (palomita de éxito); requiere `pathLength={1}` |
| `cot-step-next` / `cot-step-back` | Paso de asistente que entra en la dirección del avance |
| `cot-shake` | Error de captura (código incorrecto); remonta con `key` para repetir |
| `cot-pop-in` | Insignia de éxito con rebote suave |
| `cot-reveal` | Bloque que entra al llegar a la vista; el JS pone `data-shown` una vez (ver `pages/Dashboard/home/Reveal.tsx`) |
| `cot-lift` | Tarjeta que se eleva 2 px al pasar el cursor |

Regla: anima **1 o 2 elementos protagonistas por interacción**. Al cambiar de paso, el foco va al `h1` (`tabIndex={-1}`).

## Hacer / No hacer

**Hacer**
- Reutilizar `proyectoTokens`, `ordenServicioStyles` y `ModalKit` antes de escribir clases nuevas.
- Abrir cada vista con banda marina y, en listados, con tarjetas de resumen.
- Usar el azul `#1B5CFF` solo para acciones y foco. Los estados usan su tono semántico.
- Definir el modo oscuro de cada color (`dark:`) en el mismo `className`.
- Usar `aria-*` en tablist, progressbar y botones de solo ícono, más `aria-live` en conteos y totales.

**No hacer**
- No usar crema, coral ni serif. Esa era la guía de Claude.com y **no** es la marca de este sistema.
- No usar el naranja `#ff801f` de `erpPageStyles` en vistas nuevas.
- No animar `width`/`height`/`top` ni dejar animaciones en bucle que no indiquen carga.
- No usar `alert`/`confirm`/`prompt` del navegador.
- No poner sombras pesadas: la profundidad viene del borde de 1 px y de, como mucho, `0_6px_20px_-12px`.

## Documentos PDF (backend)

Los PDF formales (p. ej. contratos) replican el formato del contrato modelo en Word:
- **Calibri 11 pt** (Carlito como sustituto métrico en servidores sin Calibri), negro y justificado.
- Título en mayúsculas, negritas, **azul `#0039B2`** a 14 pt, centrado; subtítulo en gris `#444444`.
- Títulos de sección y de cláusula («PRIMERA. OBJETO») en negritas azul, en su propio renglón.
- **Sin tablas**: todo es texto corrido (la constancia de firma también va como texto «Etiqueta: valor»).
- Firma del prestador: siempre la firma registrada (Cloudinary) del usuario `CONTRATOS_FIRMANTE_USERNAME` (hoy `IvanCruz01`).
- **Sin marca de agua.** Las firmas van **una sola vez**, al final, en una tabla sin bordes. Nada de rúbricas en el pie de página.
- Encabezado de cada hoja con folio y fecha; pie con el título y «Página X de Y» (`pdf_overrides` de `render_html_to_pdf`).

## Páginas públicas (sin sesión)

Por ejemplo `/firmar/contrato`. Llevan la misma marca:
- Banda marina con el nombre de la marca y el chip «Firma segura».
- Tarjeta blanca que se superpone a la banda (`-mt-14`).
- Progreso de pasos con `cot-bar`.
- No cargan nada de `AppLayout`, y usan `fetch` directo con credenciales en cabeceras (nunca en la URL ni en cookies).
