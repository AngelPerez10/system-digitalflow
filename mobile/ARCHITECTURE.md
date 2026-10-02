# Arquitectura — app móvil (SertelPro)

Este documento describe cómo está organizado `mobile/` y las reglas a seguir al agregar
vistas nuevas. Es el complemento estructural de `PRODUCT.md` (qué hace la app y por qué) y
`DESIGN.md` (bitácora visual). Si algo aquí queda desactualizado por un cambio futuro,
corregir este archivo es parte de ese cambio.

## Capas

```
app/          Rutas (Expo Router) — orquestan, no calculan
  (app)/        Técnico: layout con guard de sesión + permisos
  cliente/       Portal cliente: layout propio
src/
  api/           Cliente HTTP, endpoints tipados, parsers y errores
  auth/          Sesión, SecureStore, permisos
  components/    UI reutilizable SIN dominio (botones, campos, íconos, tarjetas genéricas)
  hooks/         Primitivas de datos reutilizables SIN dominio (useEntityList/Detail)
  features/
    orders/        Todo lo específico de Órdenes (hooks, formato, componentes propios)
    proyectos/      Todo lo específico de Proyectos (mismo patrón)
    cotizaciones/   Cotizaciones (listado, detalle, crear y editar)
    reportes/       Reportes de mantenimiento (evidencia Antes / Después por zona)
    auth/           Formularios de acceso/registro
  navigation/    Configuración de transiciones
  notifications/ Push
  theme/         Tokens de marca
  types/         Espejo de los contratos del backend
  utils/         Helpers puros sin estado (fecha, enlaces, compresión de imagen…)
```

**Regla de capas (ya existía, se mantiene):** `UI (app/) → hook de feature → hook/api client`.
Ninguna pantalla hace `fetch`/`useEffect` de datos directamente.

**Regla de límites entre features (nueva, antes no se respetaba):**
`features/orders` y `features/proyectos` **no se importan entre sí**, ni una ruta importa
directo de la carpeta interna de una feature que no es la suya. Todo lo que dos features (o
una feature y una ruta) necesitan compartir vive en `src/components/`, `src/hooks/` o
`src/utils/` — nunca dentro de la carpeta de otra feature.

Antes de este cambio, `features/orders/components/` se había vuelto el cajón de lo
compartido: `proyectos`, las rutas del portal cliente y hasta `bienvenida.tsx` importaban
íconos y componentes de ahí porque era donde ya existían. Quedó corregido (ver
«Qué se movió» abajo), pero es fácil que vuelva a pasar si al agregar una vista nueva es más
rápido importar de la feature vecina que promover el componente. **Si vas a importar algo de
`features/<otra>/components/*` desde fuera de esa feature, es señal de que ese componente
debe vivir en `src/components/` — muévelo en vez de importarlo cruzado.**

## Flujo de datos: los dos hooks base

Antes, cada listado y cada detalle (Órdenes, Órdenes-pool, Órdenes-cliente, Proyectos) traía
su propia copia de: `useState` de datos/carga/refresco/error, `AbortController` para cancelar
peticiones en vuelo, y `useFocusEffect` para recargar al volver a la pantalla — ~6 copias casi
idénticas. Ahora esa mecánica vive una sola vez en `src/hooks/`:

- **`useEntityList<T>({ fetcher })`** — listado crudo: carga al enfocar, refresco con
  «jalar para actualizar», cancela peticiones al desmontar/re-enfocar. Devuelve
  `items, cargando, refrescando, error, recargar, mutar`. `mutar` permite editar la lista en
  memoria sin volver a pedirla (p. ej. quitar un elemento tras una acción).
- **`useEntityDetail<T>({ id, fetcher, idInvalidoMensaje? })`** — detalle por id: carga al
  montar y al re-enfocar (útil al volver de editar). Devuelve
  `data, cargando, error, recargar, aplicar`. `aplicar` acepta un valor o una función
  `(actual) => nuevo`, igual que el `setState` de React, para reflejar un cambio parcial
  (p. ej. una calificación) sin re-pedir el recurso completo.

Cada hook de feature (`useOrdenes`, `useProyectos`, `useOrdenesPool`, `useOrdenesCliente`,
`useOrden`, `useProyecto`, `useOrdenCliente`) es ahora una envoltura delgada: le pasa a la
primitiva un `fetcher` que cierra sobre el endpoint y los filtros del dominio (mes, id), y
encima calcula lo propio de esa pantalla (`secciones`, `conteos`, búsqueda) con `useMemo`.

**Al agregar una vista nueva con listado + detalle, parte de estos dos hooks — no reimplementes
carga/error/refresco a mano.** Ejemplo mínimo:

```ts
// features/<nuevo>/useAlgo.ts
export function useAlgoDetalle(id: number | null) {
  const fetcher = useCallback((algoId: number, signal: AbortSignal) => getAlgo(algoId, signal), []);
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Algo>({
    id,
    fetcher,
    idInvalidoMensaje: 'Algo no válido.',
  });
  return { algo: data, cargando, error, recargar, aplicarAlgo: aplicar };
}
```

Si el fetcher depende de un filtro que cambia en pantalla (como `mes` en Órdenes), pásalo
como dependencia del `useCallback` del fetcher — la recarga es automática mientras la
pantalla está enfocada; no hace falta un efecto adicional.

## Qué se movió a `src/components/` y por qué

Estos componentes no tienen ningún tipo de dato de Órdenes ni de Proyectos en su firma — son
UI genérica que antes vivía, por historia, dentro de `features/orders/components/`:

| Componente | Antes | Usado también por |
|---|---|---|
| `icons.tsx` (todo salvo `TipoOrdenIcon`) | `features/orders/components/` | proyectos, portal cliente, `bienvenida.tsx`, `RolSelectorCard` |
| `SeccionCard`, `CampoDato` (+ `CampoTelefono`/`CampoUbicacion`), `DateTimeField`, `FotosEditor`, `FotosGaleria`, `SignaturePad`, `MesSelector`, `FirmasTarjeta` | `features/orders/components/` | proyectos, portal cliente |

`features/orders/components/icons.tsx` ahora es un archivo delgado: reexporta todo
`@/components/icons` (para no romper las ~15 importaciones internas por ruta relativa
`./icons` que ya tenía Órdenes) y define solo `TipoOrdenIcon` — el único ícono que sí
depende de un tipo de dominio (`TipoOrden`).

También se movieron dos utilidades puras que no dependían de ningún tipo de Orden/Proyecto
pero vivían en `features/orders/`:

- `esEnlaceUbicacion` → `src/utils/abrirEnlace.ts` (junto a `abrirEnlace`, con quien siempre
  se usa en pareja).
- `comprimirFotoParaSubida` → `src/utils/comprimirFoto.ts` (compresión de imagen agnóstica al
  endpoint; ya la usaban tanto Órdenes como Proyectos).

**Lo que se quedó donde estaba, a propósito:** `EstadoConteo`, `EquiposLista` y componentes
similares siguen en `features/orders/components/` porque sí están tipados contra
`OrdenStatus`/`EquipoInventarioItem` — no son genéricos, solo *parecen* compartibles porque
Proyectos tiene un equivalente casi idéntico (`ProyectoEstadoConteo`, `EquiposProyectoLista`).
Fusionarlos requeriría generalizar sus props (status y colores por parámetro en vez de
import fijo), que es un cambio de forma, no solo de carpeta — ver «Duplicación pendiente».

## Duplicación pendiente (deliberadamente no tocada en este cambio)

Órdenes y Proyectos comparten forma (listado agrupado por status + detalle + edición) pero
**no** comparten tipos, así que sus componentes de tarjeta/hero/skeleton siguen siendo pares
paralelos y no una sola implementación genérica:

`OrdenCard`/`ProyectoCard`, `OrdenesHero`/`ProyectosHero`,
`OrdenDetalleHero`/`ProyectoDetalleHero`, `OrdenCardSkeleton`/`ProyectoCardSkeleton`,
`StatusSegment`/`ProyectoStatusSegment`, `EstadoConteo`/`ProyectoEstadoConteo`,
`EquiposLista`/`EquiposProyectoLista`, `EquiposOrdenEditor`/`EquiposProyectoEditor`,
`FirmasTarjeta`\*/`FirmasProyectoTarjeta` (\*ya unificado, ver tabla arriba).

Esto es candidato a una siguiente pasada (un `<EntityCard>`/`<EntityHero>` genérico
parametrizado por mapa de status→color/ícono), pero solo vale la pena si aparece una
**tercera** entidad con el mismo patrón — dos casos ya están razonablemente al día con hooks
compartidos; forzar la abstracción con solo dos usos reales tiende a producir una interfaz
genérica peor que los dos componentes concretos que reemplaza. Si agregas una tercera entidad
de tipo "listado por status + detalle + edición", ese es el momento de extraer el genérico —
no antes.

## Convenciones al agregar una vista nueva

1. **Ruta** en `app/` — delgada: arma la pantalla con hooks de `features/<tu-feature>/` y
   componentes de `src/components/` o de tu propia feature. Nada de `fetch`/`useState` de
   datos aquí.
2. **Datos**: un hook en `features/<tu-feature>/use<Recurso>.ts` construido sobre
   `useEntityList`/`useEntityDetail` (ver arriba).
3. **Formato/dominio**: funciones puras en `features/<tu-feature>/<recurso>Format.ts`
   (mostrar, agrupar, validar) — nunca inline en el componente de ruta.
4. **Componentes**: si el componente no importa ningún tipo de `features/<tu-feature>` en su
   firma de props, va en `src/components/`. Si sí, va en
   `features/<tu-feature>/components/`.
5. **Tipos**: contratos del backend en `src/types/<recurso>.ts`, reflejando el shape real de
   la API (no lo que "debería" ser).
6. **Tests**: los hooks de feature no necesitan test propio de fontanería (carga/error/abort)
   porque eso ya lo prueba/cubre `useEntityList`/`useEntityDetail`; sí conviene test para la
   lógica de formato/agrupamiento pura (`agrupar.ts`, `*Format.ts`), siguiendo el patrón de
   `src/features/orders/__tests__/`.
7. Antes de importar algo de otra feature, revisa la sección de límites arriba.

## Brechas conocidas (no resueltas en este cambio, para la siguiente pasada)

- **Sin cobertura de tests en `app/`** ni en `src/components/`: los archivos de ruta más
  grandes (`app/cliente/[id].tsx`, los `editar.tsx` de Órdenes/Proyectos) y los componentes
  más grandes (`AppNavbar`, `SignaturePad`, `DateTimeField`) no tienen test automatizado.
- **Archivos de ruta grandes**: `app/cliente/[id].tsx` (~500 líneas) y
  `app/(app)/proyectos/[id]/editar.tsx` (~480 líneas) mezclan orquestación de UI, mapas de
  íconos por status y animación en un solo archivo — candidatos a extraer sub-componentes.
- **`DESIGN.md` crece sin límite** (bitácora cronológica, no un estado actual consultable).
  Si vuelve a crecer mucho, vale la pena separar «sistema de diseño vigente» de «bitácora de
  decisiones».
- **`src/api/parsers.ts`** concentra el parseo de ambos dominios (Órdenes y Proyectos) en un
  solo archivo; si sigue creciendo, dividir en `ordenParsers.ts`/`proyectoParsers.ts`.

## Reportes de mantenimiento (2026-10-02)

`features/reportes/` sigue las convenciones de arriba al pie de la letra: `useReportes` /
`useReporte` sobre `useEntityList` / `useEntityDetail`, lógica pura en `reporteFormat.ts` y
`editarReporteForm.ts` (con tests), API en `src/api/reportesApi.ts` + `reporteParsers.ts`
(parsers propios, no se sumaron a `parsers.ts`). Para elegir la orden o el proyecto de origen
usa `listOrdenes` / `listProyectos` **de `src/api/`**, no de las features vecinas
(`useOrigenesReporte`), y define su propio `folioReporte` en vez de importar el de Órdenes.

Es la tercera entidad «listado por grupo + detalle + edición». **No** se extrajo el
`<EntityCard>` genérico que sugiere «Duplicación pendiente»: su tarjeta es distinta en forma
(portada de fotos Antes | Después, agrupa por estado de la evidencia y no por estatus), así
que un genérico tendría que parametrizar casi todo. Lo que sí resultó compartible se promovió:

- `src/components/BotonAccion.tsx` — botón de barra al pie con ícono que ocupa su parte de la
  fila (acciones del mismo tamaño).
- `src/components/BotonFlotante.tsx` — el botón «crear» flotante que vivía privado en
  `cotizaciones/index.tsx`; ahora lo usan Cotizaciones y Reportes.
- `src/utils/miniatura.ts` — URL de miniatura de Cloudinary (recorte + `q_auto,f_auto`).
  La usan las tarjetas de reportes y, desde este cambio, `FotosEditor` para sus miniaturas
  (la foto completa solo se baja en el visor).
- `src/components/HojaAcciones.tsx` — hoja de «más opciones» desde abajo (acciones con
  ícono, las destructivas al final), genérica.
- El PDF del reporte no usa `ReportePdf` (que trae correo, y los reportes solo exponen el
  enlace firmado): `usePdfReporte` + `PdfReporteTarjeta` en la feature.

Backend: se agregaron `pdf-enlace` y `pdf-compartido` a `/api/reportes-mantenimiento/`
(mismo patrón que Proyectos; salt propio), que `ReportePdf` necesita para descargar y
compartir por WhatsApp.

## Detalle compartido: `DetalleChrome` (2026-10-02)

Con Reportes, Órdenes y Proyectos ya son tres detalles con la misma cabecera — el momento
que «Duplicación pendiente» marcaba para extraer lo común. `src/components/DetalleChrome.tsx`
reúne: `DetalleBarraSuperior` (fija: volver, título compacto al desplazar, píldora «Editar» y
«⋯»), `DetallePortada` (marina, a sangre, con parallax), `HojaDatos` + `DatosRejilla` /
`DatosPersonas` / `DatosAvance` (la hoja que sube `TRASLAPE_PORTADA` px sobre la portada) y
`estiloTraslape`. Cada pantalla conecta un `Animated.Value` de desplazamiento con
`Animated.event` y arma su contenido con estas piezas; no hay cabecera propia por entidad
(`OrdenDetalleHeader`, `ProyectoDetalleHeader` y la de reportes se borraron).
`personasDelEquipo` pasó de `EquipoTrabajo` (borrado) a `proyectoFormat.ts`.

## Historial de este documento

- **2026-10-02** — `DetalleChrome` unifica la cabecera de los tres detalles.
- **2026-10-02** — Agregada la feature `reportes/` (ver sección propia); `BotonFlotante` y
  `miniaturaUrl` promovidos a `src/`.
- **2026-09-18** — Creado. Se introdujeron `src/hooks/useEntityList` y `useEntityDetail`
  (eliminan la duplicación de carga/error/abort/refresco entre `useOrdenes`, `useProyectos`,
  `useOrdenesPool`, `useOrdenesCliente`, `useOrden`, `useProyecto`, `useOrdenCliente`); se
  promovieron a `src/components/`, `src/utils/` los componentes/utilidades de
  `features/orders/` que no dependían de ningún tipo de Orden y que ya usaban Proyectos y el
  portal cliente (ver tabla arriba). Verificado con `tsc --noEmit`, `eslint` y la suite de
  `jest` completa (134 tests) en verde.
