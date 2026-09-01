# Design

Mundo visual de **SertelPro** (app móvil de técnicos). Reemplaza por completo el crema +
naranja heredado del ERP web: decisión del usuario del 2026-08-26, que pidió azul en los
botones, fondo blanco y un resultado moderno y elegante.

El listón de acabado original, elegido por el usuario, fue **Linear / Vercel**: blanco casi
puro, jerarquía por peso tipográfico, líneas de 1 px, sombras al borde de lo perceptible. Se
mantiene en el acceso, el detalle y la edición.

**La pantalla de «Mis órdenes» rompe con esa contención**, a petición explícita del usuario
tras cuatro rondas de ajustes (más íconos, color en el avatar, sombra, barra de carga) que
seguían leyéndose «vacío» y «plano». El nuevo listón, con referencia nombrada, es la banca
móvil (BBVA, Banorte, Nu): bloques de color sólido, no líneas finas sobre blanco. Es una
tensión real y deliberada, no un descuido — ver «Dos lenguajes» más abajo.

## Tesis

La app no decora: quita fricción. En el acceso y la edición, todo el color disponible se
gasta en una sola cosa —el azul del control que el técnico va a tocar— y el resto de la
pantalla se aparta. En «Mis órdenes», el color se gasta distinto: un bloque navy sólido
carga el resumen del mes, y los estatus pasan de tinte pálido a relleno sólido con texto
blanco — la misma paleta, aplicada con la convicción que pide una app «profesional» en el
sentido bancario, no en el sentido editorial.

## Dos lenguajes, una paleta

- **Contenido/formulario** (acceso, detalle, edición): superficie blanca, borde de 1 px,
  texto como jerarquía principal. Sin cambios.
- **Resumen** (`OrdenesHero`, badges de estatus, avatar de tarjeta): bloques de color sólido
  —navy para el módulo de saldo, el propio `statusSolid()` para cada estatus—, con blanco
  como color de texto en vez de tinta oscura sobre pastel.

Ningún color nuevo entra al sistema: `heroBg` es un navy derivado del mismo azul de marca
(`#0F1E4D`, verificado en 15.99:1 con texto blanco), y los rellenos sólidos de estatus
reutilizan `statusPendienteText` / `statusPausadoText` / `statusResueltoText` que ya
existían como tinta — ahora también sirven de fondo (el más ajustado da 5.93:1 con blanco).

**Detalle ya extendido** (2026-08-27): la dirección convenció y el usuario pidió
explícitamente restructurar el detalle con el mismo lenguaje. `OrdenDetalleHero` reemplaza
el encabezado plano de texto: folio, botón de volver (el encabezado nativo del stack se
ocultó también aquí, mismo criterio que la lista), el nombre del cliente como ancla grande
(28 px, no 56 — el detalle no tiene un número que mostrar) y dos chips — estatus y tipo de
orden. Debajo, tarjetas de contenido con ícono por campo (`CampoDato`/`CampoUbicacion`),
agrupadas por tema: Contacto, Detalles del servicio, Fechas.

**Corrección** (misma sesión): las tres tarjetas del detalle se quedaron sin la sombra
`elevation.card` que ya tenía `OrdenCard` en la lista — mismo defecto de «plano» que había
en la lista, reintroducido por descuido al construir el detalle. Corregido, más:
- Cada tarjeta lleva ahora un ícono pequeño (15 px, azul) junto a su título — Contacto,
  Detalles del servicio, Fechas. Sin caja de fondo: la primera versión usaba
  `surfaceSunken` detrás del ícono, el mismo error de contraste casi invisible (≈1.04:1)
  que ya se había corregido dos veces antes en el avatar de `OrdenCard` y en el esqueleto de
  carga — esta vez se evitó antes de llegar a pantalla, quitando la caja en vez de cambiarle
  el color.
- El lienzo blanco debajo del hero lleva la misma retícula de puntos + halo azul del acceso
  (`BackgroundGrid`, `haloY=0.14` para alinearse con el hero). Antes era blanco liso.

**Edición — bitácora de campo** (2026-08-27): folio como ancla tipográfica (32 px),
raya azul de 3 px, píldora «Sin guardar» cuando hay dirty state, segmento de estatus
con pastilla `primary` (resorte), panel hundido único para Horario (inicio +
finalización), Guardar + Cancelar texto. A11y: `accessibilityRole="header"`,
alertas en vivo, `accessibilityValue` en filas de fecha, título de `Stack.Screen`
con folio. Componentes en `StatusSegment` / `DateTimeField` (fuera de `app/`).

- Dependencia: `@react-native-community/datetimepicker`.
- `OrdenDetalleHero.statusOverride` / `volverLabel` siguen para el detalle.

**Acceso — probado y revertido** (2026-08-28): a petición del usuario, con una referencia
visual (app «Jobsly»), se intentó un rediseño del acceso al lenguaje del resumen —
gradiente a sangre completa + hoja blanca montada encima con curva. Pasó por varias rondas
de corrección real (la curva no se pintaba por un `marginTop` negativo dentro de un
`ScrollView`, que recorta su contenido a sus propios límites; un vacío enorme abajo con el
formulario anclado arriba en vez de centrado; proporción y tamaño de curva ajustados dos
veces) pero el usuario, tras verlo en dispositivo, pidió dejar el acceso «como estaba
antes». Revertido por completo a la versión anterior — panel plano centrado, sin
gradiente — y se quitó la dependencia `expo-linear-gradient` (ya no la usa nada en el
proyecto). Si se retoma el gradiente en el futuro, la lección de la ronda anterior sigue
siendo válida: cualquier «tarjeta montada sobre un fondo» necesita el fondo en
`position: 'absolute'` con el contenedor desplazable calculando su propio `paddingTop` —
nunca un margen negativo dentro de contenido con scroll.

**Acceso — rediseñado con Sleek** (2026-08-28, mismo día): el usuario pidió usar las skills
de diseño del proyecto con total libertad. Se generó una propuesta con
[sleek.design](https://sleek.design) (`.agents/skills/design-mobile-apps`) describiéndole el
producto real (técnicos de campo, sin registro, sin login social) y se implementó tal cual
en código tras aprobación del usuario:

- **Franja azul fija** (3 px, arriba de todo) — «sistema operativo», mismo lenguaje que la
  barra de progreso de la lista de órdenes: una línea de color, no un banner.
- **Encabezado centrado**: `BrandMark` a 56 px, «SertelPro» en `Geist_700Bold` (peso nuevo,
  ver «Tipografía» — antes el sistema topaba en `semibold`), y debajo «ACCESO TÉCNICO» en
  mayúsculas con tracking ancho como kicker de contexto.
- **Campos con línea, no con caja** — `TextField` ganó `variant="underline"` (por defecto
  sigue siendo `"box"`; ninguna otra pantalla lo usa todavía): solo borde inferior de 2 px,
  etiqueta pequeña en mayúsculas con tracking ancho arriba del campo, sin anillo de foco ni
  fondo. Reutiliza toda la lógica existente (animación de foco, mostrar/ocultar contraseña) —
  solo cambia el tratamiento visual.
- **Sin panel/tarjeta contenedora**: los campos y el botón viven directo sobre el lienzo
  blanco, no dentro de una caja con borde y sombra — diferencia deliberada frente a la
  versión anterior.
- **Pie fijo**: «SertelPro · Operaciones seguras» en mayúsculas pequeñas, siempre visible al
  fondo de la pantalla (fuera del `ScrollView`, no se desplaza con el formulario).

El HTML de Sleek usaba un ícono genérico (`solar:shield-check-bold`); se sustituyó por
`BrandMark`, la marca real de la app, en vez de adoptar un ícono de librería ajeno a la
identidad ya establecida.

Para llegar a este punto fue necesario borrar el único proyecto de Sleek que existía en la
cuenta («Ember Fitness (Copy)», ajeno a este producto) porque el plan solo permite uno
activo — autorizado explícitamente por el usuario antes de borrar.

**Acceso — fondo recuperado** (2026-08-28, mismo día): el usuario dijo que le gustó el
rediseño pero sintió el fondo vacío. `BackgroundGrid` (retícula de puntos + halo azul)
volvió detrás de la marca — es la misma textura que ya vivía en la primera versión del
acceso y sigue en el detalle de orden, así que no es un elemento nuevo: es recuperar uno
que se había quitado sin querer al copiar el lienzo liso de la referencia de Sleek.

**Lista de órdenes — segunda generación (diseño con Sleek)** (2026-08-28, mismo día): mismo
flujo que el acceso — descripción del producto real a Sleek, una ronda pidiendo «más
moderno, elegante y profesional» sobre la primera propuesta, aprobación del usuario, y
luego implementación en código con datos reales (nunca los de muestra del HTML — «Carlos
Mendoza», «#804», «67% éxito» eran de Sleek, no del producto, y no se copiaron).

- **`OrdenesHero` reemplazado por completo**: el bloque navy sólido con el número gigante
  (la referencia bancaria de la sesión anterior) dio paso a una tarjeta clara — perfil
  (iniciales + nombre + cerrar sesión), barra «Resumen de {mes}» con el total, y tres
  tarjetas KPI (una por estatus, con `useCountUp`) en vez del número único + chips. El navy
  sigue vivo en `OrdenDetalleHero` (detalle de orden) — son componentes separados que solo
  comparten `HeroTextura`/`EstadoChipHero` como piezas sueltas, así que este cambio no lo
  toca.
- **`OrdenCard` reemplazado por completo**: barra de acento de 4 px a la izquierda
  (`statusSolid`), folio como placa con **borde**, no relleno pálido — el relleno
  (`primaryDisabled` + texto `primary`) medía ≈4.1:1, bajo el mínimo; el borde blanco
  mantiene ≥5:1. Recuadro «Falla reportada» (o «Motivo de la pausa» si está pausada) solo
  cuando hay texto que mostrar, filas de dirección/teléfono con placa de ícono cuadrada, y
  un botón de acción al pie — mismo destino que tocar la tarjeta, pero con la etiqueta
  «Atender orden» / «Reanudar orden» / «Ver reporte» según el estatus (`accionLabel()`), así
  el técnico sabe qué va a pasar sin tener que entrar primero. `OrdenStatusBadge` quedó sin
  uso y se borró.
- **`EstadoConteo`** pasó de círculo sólido a píldora con borde (mismo `statusTone()` pálido
  que ya usa el resto del sistema) — junto a las tarjetas claras, el círculo de relleno
  sólido se sentía pesado.
- **Encabezado de sección**: punto de color (`statusSolid().bg`) antes del título, título en
  mayúsculas con tracking — antes era solo texto gris plano.
- **`MesSelector`**: la etiqueta del mes pasó a una píldora azul pálida (`primaryDisabled` +
  texto `primaryPressed`, no `primary` — mismo problema de contraste que el folio, mismo
  arreglo: el tono presionado, más oscuro, sí pasa 4.5:1). Sigue al final de la lista, no
  fija — ver «Paginación al final» más arriba, decisión ya tomada en otra ronda.
- Íconos nuevos en `features/orders/components/icons.tsx`: `IconAlerta`, `IconFlecha`,
  `IconClock`, `IconVisto` — mismo trazo de 1.7 px que el resto del set.
- `OrdenCardSkeleton` se rehizo para reflejar la silueta de la tarjeta nueva (barra de
  acento, dos insignias, recuadro de falla, botón) — antes seguía la silueta de la tarjeta
  con avatar de la primera generación.

**Detalle y edición — emparejados con el listado** (2026-08-28, mismo día): Sleek se quedó
sin créditos (`out_of_credits`) antes de poder generar una propuesta para estas dos
pantallas, así que el rediseño se hizo directo en código, aplicando el mismo lenguaje de
insignias que ya se estableció en `OrdenCard` y `OrdenesHero` — el usuario lo autorizó
explícitamente en vez de esperar a recargar créditos.

- **`OrdenDetalleHero` reemplazado por completo**: el bloque navy sólido (misma referencia
  bancaria de la primera generación del listado) dio paso a una tarjeta clara — folio en
  placa con borde, píldora de estatus pálida y chip de tipo, mismo trío que ya usa
  `OrdenCard`. El detalle era el único rincón que seguía viéndose como otra app después de
  que el listado cambió de lenguaje.
- **Componentes huérfanos borrados**: `HeroTextura`, `EstadoChipHero` y `OrdenStatusBadge`
  ya no los usaba nada — quedaron sin llamadas al reemplazar `OrdenesHero` y
  `OrdenDetalleHero`. Con ellos, los tokens `heroBg`, `heroChipBg`, `heroChipBorder`,
  `onHeroMuted` y `heroGridDot` también salieron de `tokens.ts`: ningún componente los leía
  ya.
- **`CampoDato`/`CampoUbicacion`** ganaron la misma placa cuadrada de ícono (22×22,
  `surfaceSunken`) que ya usan las filas de dirección y teléfono de `OrdenCard` — antes el
  ícono iba suelto, sin caja, un lenguaje distinto al de la tarjeta de la que viene.
- **Edición**: la línea azul + texto de tipo bajo el folio pasó a un chip con ícono
  (`TipoOrdenIcon` + `surfaceSunken`), y cada encabezado de sección (Estatus, Servicio,
  Horario) ganó un ícono pequeño a 14 px — mismo patrón de «ícono + título» que las tarjetas
  del detalle. El resto de la pantalla («bitácora de campo»: folio como ancla, segmento de
  estatus con resorte, panel hundido de horario, barra de Guardar sticky) ya estaba bien
  resuelto y no se tocó.

**Detalle — tercera pasada, gramática del listado** (2026-08-31): el emparejamiento anterior
igualó el encabezado, pero el cuerpo del detalle seguía con su propia gramática: títulos
metidos dentro de cada tarjeta con un ícono azul, mientras el listado ya titulaba **afuera**
con punto de color y versalitas. El usuario pidió el mismo diseño del panel de órdenes y del
acceso; esta ronda lo aplica al cuerpo, no solo al encabezado.

- **Títulos de sección fuera de la tarjeta** (`Seccion` en `[id]/index.tsx`): punto de 7 px +
  versalitas + contador a la derecha, la misma fila que separa Pendientes / Pausados /
  Resueltas en el listado. El punto toma el color **del estatus de la orden**, no un azul
  fijo: al bajar por una orden larga la píldora del encabezado ya no se ve, y el color es lo
  único que sigue diciendo en qué estado está. Con los títulos afuera, las tarjetas quedaron
  como contenedores limpios y desapareció el ícono azul por tarjeta — el azul vuelve a ser
  escaso, como manda la regla de color.
- **Barra de acento en el encabezado**: `OrdenDetalleHero` gana los mismos 4 px de color a la
  izquierda que `OrdenCard`. Al tocar una tarjeta, la franja que traía no se apaga.
- **`FallaBox` extraído** (`components/FallaBox.tsx`): el recuadro hundido con ícono de alerta
  vivía dentro de `OrdenCard`. Ahora lo comparten la tarjeta y el detalle, donde la
  problemática era un `CampoDato` cualquiera pese a ser lo primero que se busca al abrir una
  orden. Una orden pausada muestra **dos** recuadros: motivo de la pausa (tinte índigo) y
  falla reportada.
- **`AccionesRapidas`**: «Llamar» y «Cómo llegar» como par de botones bajo el encabezado. En
  la lista ambos datos ya eran tocables; en el detalle el teléfono era texto muerto. Cuando
  la dirección no es un enlace de Maps se arma la búsqueda con el texto capturado, así que
  una dirección escrita a mano también navega. `CampoTelefono` completa el par dentro de la
  sección Contacto.
- **Placas de fecha**: Inicio y Finalización pasan de dos filas de `CampoDato` a dos placas
  lado a lado con la anatomía de las tarjetas KPI del encabezado del listado — etiqueta chica
  en versalitas, dato en la familia display con numerales tabulares, hora debajo. Sin fecha
  dicen «Sin programar» en vez de un guion.
- **Barra fija de acción**: «Editar orden» sale del final del scroll a una barra sticky con
  línea superior, igual que la de Guardar en edición. En una orden con fotos, firmas y
  equipos el botón quedaba a varias pantallas de distancia.

**Edición — movimiento y esqueletos** (2026-08-31, misma sesión): el usuario pidió que la
edición «se vea mucho mejor, con animaciones y menús de carga». La composición («bitácora de
campo») ya estaba resuelta, así que esta ronda trabaja el tiempo, no el layout: qué ve el
técnico mientras espera y cómo responde la pantalla a lo que toca.

- **`SkeletonBar` / `SkeletonRegion` / `SkeletonPanel`** (`components/Skeleton.tsx`): la barra
  que pulsa vivía privada dentro de `OrdenCardSkeleton`. Ahora es la primitiva compartida —
  un segundo pulso con otra duración se notaría al navegar entre listado, detalle y edición.
  `SkeletonRegion` saca el esqueleto del árbol de accesibilidad y lo anuncia como una sola
  región ocupada, en vez de dejar veinte barras sin nombre.
- **`DetalleOrdenSkeleton` y `EditarOrdenSkeleton`** (`components/OrdenSkeletons.tsx`)
  reemplazan el indicador giratorio centrado de las dos pantallas. Cada uno copia la anatomía
  real de la suya —barra de acento, par de acciones rápidas, secciones con punto afuera; folio
  grande, chip de tipo, segmento, panel de horario— para que el relevo sea un relleno y no un
  cambio de composición. En edición importa más: el técnico llega con la intención de
  escribir y necesita ver dónde.
- **Guardar pasó de `AppButton` a `SubmitButton`**: el botón de tres fases del acceso. Colapsa
  a círculo y gira mientras va el `PATCH`, dibuja la palomita y **entonces** vuelve al
  detalle. El guardado se confirma en el botón que se pulsó, no en la pantalla siguiente.
- **`BarraCarga` en la edición**: la misma línea indeterminada que el listado usa al cambiar
  de mes, arriba mientras se guarda. Reserva sus 3 px siempre, así que aparecer no empuja el
  formulario.
- **`Colapsable`** (`components/Colapsable.tsx`): «Motivo de la pausa» se despliega con altura
  animada en vez de aparecer de golpe al mover el segmento. Mide su contenido en posición
  absoluta a propósito — un hijo absoluto no queda limitado por la altura del padre, así que
  informa su alto natural incluso con el bloque cerrado a 0 px; midiéndolo en flujo normal la
  medición sería la altura recortada y el bloque nunca abriría.
- **Píldora «Sin guardar» siempre montada**, animada con resorte en los dos sentidos.
  Desmontarla al deshacer el último cambio la hacía desaparecer de un cuadro al otro, que se
  lee como un glitch y no como una confirmación.
- **`SeccionTitulo`** (`features/orders/components/SeccionTitulo.tsx`): el encabezado de
  sección del listado (punto, versalitas, contador) es ahora un componente compartido por el
  detalle y la edición; sustituye el «ícono azul + título» que la edición tenía aparte. En
  edición el punto sigue el estatus **seleccionado**, y el cambio de color se interpola: un
  salto de ámbar a verde en el mismo cuadro se percibe como parpadeo, no como respuesta.
- **Aviso de error con entrada propia** (`AvisoAnimado`, montado con `key` en el mensaje) y la
  vista sube sola al mostrarlo: un error de validación puede referirse a un campo que quedó
  fuera de pantalla, y el aviso vive arriba.

Todo el movimiento nuevo respeta `useReducedMotion`: con «reducir movimiento» activo los
valores se fijan en su destino y no se programa ninguna animación.

**Edición — gramática del listado** (2026-08-31): el usuario pidió que editar dejara la
bitácora tipográfica y siguiera el mismo diseño del panel donde se muestran todas las
órdenes. La composición cambió de folio suelto + raya azul a la anatomía de `OrdenCard` /
`OrdenesHero`.

- **`EditarOrdenHero`**: tarjeta con barra de acento de 4 px (sigue el estatus
  *seleccionado*), folio en placa, píldora de estatus, cliente en display, chip de tipo, y
  debajo la barra hundida del resumen del listado («Editando orden») con el chip «Sin
  guardar». El botón de volver vive dentro del hero, como en el detalle — ya no hay chrome
  suelto arriba.
- **`StatusSegment` rehaceado como KPIs**: las tres placas del encabezado del listado
  (punto + etiqueta + ícono + número) pasan a ser radios. La activa se rellena con el tono
  pálido del estatus; las demás se quedan en borde tintado. El técnico elige el estatus con
  el mismo vocabulario visual que acaba de ver en el resumen del mes. El segmento deslizante
  azul quedó atrás.
- **Secciones + tarjetas**: Estatus, Servicio y Horario usan `SeccionTitulo` (punto +
  versalitas) afuera y `elevation.card` adentro — misma gramática que el detalle y que las
  tarjetas del listado. El padding pasa a `spacing.lg` (16), el mismo del listado.
- El esqueleto de edición copia la silueta nueva (hero + tres KPIs + tarjetas), no el folio
  tipográfico anterior.

**Edición — panel de campo** (2026-08-31, misma sesión): el usuario rechazó el clon del
listado («no me gusta») y pidió libertad total con `/frontend-design`. Dirección: **panel
de instrumento**, no más tarjetas de resumen.

- **Cabecera tipográfica** (`EditarOrdenHero`): folio en placa + tipo, cliente a 28 px,
  kicker «Registro de campo». Sin barra de acento ni tarjeta — el listado y el detalle ya
  gastaron esa gramática; aquí la identidad es etiqueta de instrumento.
- **Estatus = tres filas de mando** (`StatusSegment`): la seleccionada usa `statusSolid`
  (fondo del color del estatus, texto blanco, check); las demás quedan en superficie con
  radio vacío. Targets ≥56 px. Radiogroup + `accessibilityState.selected`.
- **Un solo panel** para problemática + horario (pozo hundido), con retícula y franja azul
  del acceso. El azul de marca vuelve a Guardar y a la franja; el color de estatus lo cargan
  las filas sólidas.
- Píldora «Sin guardar» con punto que late. Esqueleto alineado a la silueta nueva.

**Edición — comentario, horario, fotos y firma** (2026-08-31): el formulario deja de
editar `problematica` y pasa a `comentario_tecnico` (lo que el técnico escribe en sitio).
El backend añade `comentario_tecnico` y `firma_cliente_url` a `LIMITED_ORDEN_EDIT_FIELDS`.
Horario rediseñado: celdas con valor grande + chips Hoy/Ahora/Limpiar (ya no el pozo de
filas de ajustes). Evidencia: `FotosEditor` (cámara/galería → `upload-image`) y
`SignaturePad` (trazo + `react-native-view-shot` → data URL en el PATCH).

**Edición — hermana del detalle + firma fluida** (2026-08-31): misma retícula, hero con
barra de acento, `SeccionTitulo` + tarjetas elevadas (detalle en modo escritura; no KPIs
del listado). La firma abre un **modal a pantalla completa**: Catmull-Rom → Bezier,
puntos interpolados en saltos rápidos, trazo grueso (~4.8), SVG sin capturar toques y
flush por `requestAnimationFrame`.

**Navbar lateral + modo oscuro** (2026-08-31): barra superior con **hamburguesa**; el
menú abre un **drawer izquierdo** (marca, Mis órdenes, apariencia claro/oscuro, cerrar
sesión). Preferencia de tema en SecureStore. UI lee `useTheme().colors`.

**Movimiento sutil (Operate)** (2026-08-31): navegación nativa — lista→detalle
`ios_from_right` / default iOS (~260 ms); detalle→editar `fade_from_bottom` (~240 ms);
login↔app `fade` (~180 ms). Entradas de bloque: 8 px + stagger 48 ms. Drawer del menú:
slide + fade del scrim (~280 ms abrir / ~200 ms cerrar); el Modal se desmonta solo al
terminar el cierre. Con «reducir movimiento» del sistema, todo cae a fade/corte corto.
Shared-element nativo queda pendiente (requiere `react-native-reanimated` como
dependencia directa).

## Color

Tokens en `src/theme/tokens.ts`. Nunca escribir hex en un componente.

| Rol | Token | Valor |
|---|---|---|
| Lienzo | `canvas` / `surface` | `#FFFFFF` |
| Superficie hundida | `surfaceSunken` | `#FAFAFA` |
| Línea | `line` / `lineStrong` | `#E7E7EA` / `#D3D3D8` |
| Tinta | `ink` / `inkMuted` / `inkSubtle` | `#09090B` / `#52525B` / `#6E6E77` |
| Acento | `primary` / `primaryPressed` | `#1B5CFF` / `#1244D1` |
| Acento inactivo | `primaryDisabled` / `onPrimaryDisabled` | `#DCE7FF` / `#2F4899` |
| Anillo de foco | `primaryRing` | azul al 18 % |
| Acceso — cabecera | `navy` / `navyDeep` / `navyDisabled` | `#17235B` / `#0F1A46` / `#C6CCE0` |
| Acceso — sobre marino | `onNavy` / `onNavyMuted` | `#FFFFFF` / blanco @72 % |
| Acceso — acción | `gold` / `onGold` | `#E6A23C` / `#17235B` |
| Acceso — píldora dorada | `goldSoftBg` / `goldSoftText` | ámbar @14 % / `#9A6B15` |

Reglas:

- **El azul es escaso.** Botón primario en formularios internos, foco, enlace embebido y
  estado seleccionado. En las vistas de técnico (lista / detalle / edición) la acción
  primaria es **marina**, no azul (ver «Rediseño marino/dorado de técnico», 2026-09-01).
- **El marino + dorado es transversal.** Cabecera del acceso (bienvenida / login / registro),
  portal del cliente **y** vistas del técnico: banda marina de cabecera + hoja blanca
  redondeada montada encima, dorado como acento pequeño (flecha de «ver detalle», píldora
  «Sin guardar», viñetas de «lo que se hizo»). Nunca como fondo de acción primaria — ese es
  `navy`. Los tokens viven en `tokens.ts` (`navy*`, `onNavy*`, `gold*`).
- **La separación la hace la línea; la sombra da presencia.** `elevation.card` para tarjetas
  de contenido; la hoja blanca lleva su propia sombra **hacia arriba** (`shadowOffset` y
  −10, `shadowRadius` 24) para despegarse de la banda marina.
- **El fondo es plano.** La retícula de puntos (`BackgroundGrid`) se retiró del detalle y la
  edición de orden en el rediseño marino: el fondo es la banda marina sólida + la hoja
  blanca, igual que el acceso y el portal del cliente.
- **El texto secundario se tinta desde su superficie**, nunca en gris neutro sobre color.
- Los estados de orden (pendiente / pausado / resuelto) conservan su ámbar, índigo y verde:
  son información, no decoración, y son la única familia de color fuera del azul.

## Tipografía

**Geist** (`@expo-google-fonts/geist`), la tipografía de Vercel, en cuatro pesos: 400, 500,
600 y 700 (`font.bold`, agregado 2026-08-28 para el título «SertelPro» del acceso — ningún
otro texto del sistema lo usa, `semibold` sigue siendo el techo del resto). Se carga en
`app/_layout.tsx` y el splash se mantiene hasta que está lista.

Los `.ttf` se importan **por subruta** y se cargan con el `useFonts` de **`expo-font`**, no
con el hook del paquete de fuentes: `@expo-google-fonts/geist` no declara `react` ni como
peer ni como dependencia, así que en un monorepo pnpm su hook resuelve el React *hoisted*
(el del frontend) y la app muere con «Invalid hook call: more than one copy of React». Misma
precaución con cualquier otro `@expo-google-fonts/*`.

En React Native `fontFamily` **no se hereda**: todo estilo de texto debe partir de un token
de `type`, o el texto cae en Roboto y rompe el sistema.

| Token | Tamaño / interlínea | Tracking | Uso |
|---|---|---|---|
| `display` | 34 / 38 | −1.1 | Título de pantalla completa |
| `title` | 20 / 26 | −0.5 | Encabezados de sección |
| `body` · `bodyMedium` | 15 / 22 | −0.1 | Texto corrido y énfasis |
| `label` | 13 / 18 | −0.05 | Etiquetas de campo, encabezados de lista |
| `caption` | 13 / 18 | 0 | Apoyo y metadatos |
| `mono` | 13 / 18 | 0 | Folios, horas, host: datos, nunca prosa |

El tracking negativo en los tamaños grandes no es opcional: sin él el display se lee blando
y el parecido con la tipografía del sistema regresa.

## Espacio y forma

- Escala de **4 px** (`spacing`). Nada se coloca fuera de ese paso.
- Radios: `sm` 8 (pastillas de estado), `md` 10 (campos y botones), `lg` 14 (tarjetas),
  `xl` 24 (`OrdenesHero`: más presencia que cualquier tarjeta de contenido, es el módulo
  principal de la pantalla).
- Objetivo táctil mínimo **48 px** (`TOUCH_TARGET`), por encima del mínimo de 44.

## Componentes

> **Nota de vigencia (2026-09-01):** las vistas de técnico (lista, detalle, edición) están en
> su **tercera generación** — banda marina + hoja blanca, la misma familia del acceso y del
> portal del cliente. Ver «Rediseño marino/dorado de técnico» abajo. Todo lo que las
> secciones «Dos lenguajes, una paleta» y las entradas de componentes de aquí abajo dicen
> sobre `OrdenesHero` como bloque navy con número gigante, `OrdenCard`/`OrdenDetalleHero`/
> `EditarOrdenHero` como tarjetas claras con barra de acento de 4 px, `SeccionTitulo`/
> `SeccionCampo`, las tres «KPI» del hero y `BackgroundGrid` en el detalle **ya no es el
> estado actual** — se deja como registro histórico. `SeccionTitulo`, `SeccionCampo` y
> `useCountUp` se eliminaron del código.

---

## Rediseño marino/dorado de técnico (2026-09-01)

Las tres vistas del técnico adoptan el corte del acceso y del portal: **banda marina plana +
hoja blanca redondeada** (`borderTopRadius` 26, `marginTop` −20, sombra hacia arriba). La
familia de color de **estado** (ámbar / índigo / verde) se conserva — es información.

- **Cabecera por pantalla.** Cada pantalla monta su propia banda marina; no hay una cabecera
  global. `AppNavbar` (barra superior + drawer) **solo aparece en el listado** (`_layout.tsx`
  la condiciona a `pathname === '/ordenes'`): el detalle y la edición traen su propio chevron
  de vuelta, así que la barra encima sería una segunda cabecera redundante. En el listado la
  navbar es marina para fundirse con la banda: hamburguesa y marca sobre `colors.navy`, marca
  en dorado, «Mis órdenes» activo con marcador dorado. Como el detalle/edición ya no tienen
  navbar, sus `OrdenDetalleHero`/`EditarOrdenHero` aplican `insets.top` y las pantallas fijan
  `StatusBar` en claro.
- **Lista (`OrdenesHero` + `ordenes/index.tsx`).** El hero se reduce a **saludo compacto**
  («Hola, {nombre}» + «Técnico de campo · {mes}») sobre la banda marina. Sin avatar —el
  avatar (con iniciales), el cambio de tema y el cerrar sesión viven en el drawer. Se
  eliminaron las tres tarjetas KPI y `useCountUp`. `BarraCarga` se envuelve en una tira
  marina para que su espaciador de 3 px no deje una línea blanca bajo la navbar. La `SectionList` vive dentro de la hoja
  blanca; el buscador es su primer elemento. `MesSelector` en el pie con píldora dorada
  (`goldSoftBg`/`goldSoftText`). `OrdenCard`: `radius.card`, barra de acento de 3 px con
  `statusSolid`, folio en placa tinta (no azul), enlaces en `colors.navy`, botón de acción
  marino, borde dorado en `pressed`.
- **Detalle (`OrdenDetalleHero` + `[id]/index.tsx`).** Banda marina: chevron «Mis órdenes»,
  folio grande (`font.bold`), «{tipo} · {cliente}» y píldora de estatus grande con icono.
  Contenido en `SeccionCard` (etiqueta uppercase **dentro** de la tarjeta hundida y
  bordeada). Sin `BackgroundGrid`. `AccionesRapidas` con enlaces marinos. Viñetas de
  «servicios realizados» con punto dorado. **Barra fija abajo** (`DockBar`) con «Editar
  orden» marino — deja de ir al final del scroll; solo se monta si el permiso lo permite.
- **Edición (`EditarOrdenHero` + `[id]/editar.tsx`).** Banda marina con «Editar {folio}» +
  cliente + píldora dorada **«Sin guardar»**. Secciones en `SeccionCard` (Estatus, Comentario,
  Horario, Equipos, Fotos, Firma). `KeyboardAvoidingView` + `scrollToEnd`/`persistTaps` se
  conservan. **Barra fija abajo** (`DockBar`): «Guardar cambios» marino + «Cancelar». Sin
  confirmación de descarte (comportamiento actual, no se añadió).
- **Componentes nuevos.** `SeccionCard` (`features/orders/components/`, extraído de
  `app/cliente/[id].tsx` — el portal lo importa desde aquí) y `DockBar`.
- **Migración a `useTheme()`.** Todos los componentes de `features/orders/components/` que
  usaban `colors` estático (solo claro) pasaron a `useTheme()`: `OrdenCard`, `EstadoConteo`,
  `MesSelector`, `StatusSegment`, `CampoDato`, `FallaBox`, `AccionesRapidas`, `FirmasTarjeta`,
  los tres heroes. Excepción intencional: los visores a pantalla completa de `SignaturePad` y
  `FotosGaleria` conservan sus `#FFFFFF` / `rgba(9,9,11,…)` fijos.

- **`OrdenDetalleHero`** — hero de la pantalla de detalle: mismo navy, misma textura, mismo
  chip translúcido que `OrdenesHero`. Folio pequeño arriba junto al botón de volver, nombre
  del cliente como ancla (28 px — no hay un número que mostrar aquí, a diferencia de la
  lista), y dos chips: estatus (`EstadoChipHero`) y tipo de orden.
- **`HeroTextura`** (`src/components/`) — la retícula de puntos blancos, extraída de
  `OrdenesHero` para que el hero de detalle la reutilice sin duplicar el SVG.
- **`EstadoChipHero`** — el chip de estatus del hero, extraído de `OrdenesHero`. Nunca usa
  `statusSolid()` como fondo del chip en sí: medido, el índigo de «pausado» da 1.98:1 contra
  el navy — se funde. El punto de color adentro sigue comunicando la categoría.
- **`CampoDato` / `CampoUbicacion`** — fila de dato con ícono **y etiqueta**, para la vista
  de detalle: a diferencia de `OrdenCard` (icono + texto, sin etiqueta — el contexto de la
  fila ya dice qué es), el detalle tiene campos que no se explican solos («Contacto en
  sitio», «Técnico asignado»). `CampoUbicacion` repite la detección de enlace de mapa de
  `OrdenCard` para `direccion`.
- **`IconChevron`** (`src/components/icons.tsx`, íconos genéricos no específicos de
  órdenes) — extraído de `MesSelector` porque el botón de volver del hero de detalle
  también necesita una flecha, en blanco sobre navy en vez del gris de siempre.
- **`IconPerson` / `IconComment`** — nuevos en el set de íconos de orden, para «Contacto en
  sitio» / «Técnico asignado» y «Comentario técnico» respectivamente.
- **`OrdenesHero`** — tarjeta de resumen del mes en «Mis órdenes»: bloque navy sólido
  (`colors.heroBg`, radio `xl`) con un **número grande** como ancla (56 px, numerales
  tabulares) — el mismo dispositivo que el saldo de una app bancaria, con el saludo
  reducido a una línea pequeña arriba, no como titular. Debajo, un conteo por estatus en
  píldoras translúcidas (`heroChipBg`/`heroChipBorder`, borde 1 px al 22 %), cada una con un
  punto del color sólido de su estatus. Una retícula de puntos blancos casi invisible
  (`heroGridDot`, mismo patrón que `BackgroundGrid` del acceso) le da textura de tarjeta al
  navy sin competir con el número. La pantalla ya no muestra el título nativo del stack
  («Mis órdenes» en gris, apilado sobre el saludo): el hero asume esa función.
  - El número **cuenta desde 0** (`useCountUp`, 700 ms, `Easing.out(Easing.cubic)`) cada vez
    que el total cambia — también al cambiar de mes, no solo al abrir la app. Anima con
    `useNativeDriver: false` a propósito: no hay equivalente nativo para animar el
    *contenido* de un `<Text>`, así que el valor alimenta un `setState` vía
    `Animated.Value.addListener` en vez de interpolar un estilo.
  - Los chips de estatus entran escalonados (`useEntrance`) justo después de que el hero
    termina de aparecer — dos movimientos en secuencia, no uno solo repetido.
- **Selector de mes al pie** — `MesSelector` ya no vive en el encabezado: es el
  `ListFooterComponent` de la lista, después de las órdenes (o del estado vacío). El técnico
  ve primero lo que tiene este mes; cambiar de mes es la última acción, no la primera.
- **`statusSolid()`** — hermano de `statusTone()` en `ordenFormat.ts`: el mismo `text` de
  cada estatus pasa a ser el fondo, con texto blanco encima (los tres pares miden ≥5.9:1).
  Lo usan el badge de la tarjeta, el avatar de tipo de orden y el círculo de conteo de cada
  sección — `statusTone()` (el pastel original) queda solo para el texto del motivo de pausa,
  donde sigue siendo lo correcto: una etiqueta sobre fondo blanco, no un bloque.
- **`AppButton`** — `primary` (azul sólido), `secondary` (blanco con línea), `ghost`. Altura
  48, radio 10. El estado presionado oscurece; el deshabilitado aclara el fondo **y** tiñe
  la etiqueta de azul oscuro, en vez de bajar la opacidad: blanco sobre azul pálido daba
  1.79:1 e invisible al sol, y así queda en 6.75:1.
- **`TextField`** — etiqueta encima, alto 52, borde de 1 px y anillo azul exterior que se
  funde en 160 ms al enfocar (no salta). Admite una acción a la derecha en su propio objetivo
  de 48 px: con `revealable`, el ojo de mostrar/ocultar contraseña. Cursor y selección
  tintados desde la paleta: son superficies que la plataforma pintaría por su cuenta y aquí
  pertenecen al sistema.
- **`BrandMark` / `BrandLockup`** — tres arcos de señal saliendo de un punto emisor, en SVG.
  El oficio de la empresa (transmisión, CCTV, alarmas) en una sola forma. Con `animated`,
  emite en bucle.
- **`SubmitButton`** — botón de acceso de tres fases (`idle` / `sending` / `success`).
- **`BackgroundGrid`** — retícula y halo del acceso, en SVG y sin capturar toques.
- **`IconButton`** — botón cuadrado de solo ícono, con la misma retroalimentación de escala
  que `AppButton`. Nace de las flechas de `MesSelector`, generalizado porque el encabezado
  de la lista de órdenes necesita el mismo vocabulario (salir de sesión) — un icon-button
  para toda la app, no un patrón nuevo por pantalla. Variantes `bordered` (chrome de
  pantalla) y `ghost` (sin borde ni fondo, para acciones secundarias de encabezado).
- **`EstadoConteo`** — conteo tintado por estatus, en dos formas: la píldora completa del
  resumen superior de la lista («12 pendientes») y el círculo compacto de un encabezado de
  sección («Pendientes 12»). Lee del mismo `statusTone()` (`ordenFormat.ts`) que ya usa
  `OrdenStatusBadge` — un solo mapa de color para todo lo que habla de estatus, sin
  duplicar la paleta.
- **`OrdenCardSkeleton` / `OrdenesSkeletonList`** — silueta de `OrdenCard` con un pulso lento
  (700 ms, `Easing.inOut(Easing.quad)`) mientras llega el primer lote de órdenes, en vez del
  spinner genérico. Las barras usan `colors.line`, no `surfaceSunken`: ese tono (#FAFAFA) es
  casi invisible sobre una tarjeta blanca y ahí no sirve de nada. Reproduce el avatar y las
  filas de la tarjeta real — si la tarjeta gana presencia, el esqueleto no puede quedarse más
  flaco que lo que sustituye.
- **`BarraCarga`** — línea de progreso indeterminada (3 px, segmento azul en bucle de
  1.1 s). Es la señal de «estoy trabajando» que faltaba al cambiar de mes: antes la lista
  se quedaba mostrando los datos del mes anterior sin ningún indicio de que había una
  petición en curso, y el usuario lo percibía como lentitud aunque la red respondiera rápido.
  Anima `transform: translateX` sobre un ancho medido con `onLayout`, nunca `left` —
  `left` es una propiedad de layout y `useNativeDriver: true` no la soporta.
- **`src/features/orders/components/icons.tsx`** — set propio de íconos de la tarjeta de
  orden (edificio, ubicación, teléfono, nota, pausa, calendario, herramienta, y uno por tipo
  de orden). Mismo trazo de 1.7 px con remates redondeados que el resto del sistema — un
  solo lenguaje de línea, nunca emoji ni glifos Unicode. `OrdenCard` ahora lleva un ícono por
  cada dato (dirección, teléfono, problemática, motivo de pausa) más un avatar de 40×40 con
  el ícono del tipo de orden — decisión explícita del usuario tras dos rondas de ajuste fino
  que no resolvían su queja real: «faltan iconos por todos lados».
- **`statusTone()` exportado** desde `ordenFormat.ts` — antes vivía duplicado dentro de
  `OrdenStatusBadge`; ahora también lo usa `EstadoConteo` y el avatar de `OrdenCard` (antes
  gris neutro, ahora tintado por estatus: la principal fuente de color nueva en la lista).
- **`elevation.card`** — segunda sombra, más presente que `elevation.panel` (opacidad 0.10,
  radio 16, elevación Android 4 vs. 0.06/12/3). El panel de acceso se quedó con la suya; las
  tarjetas de orden y su esqueleto usan esta. Se separaron a propósito: subir la sombra del
  panel de login no se pidió, y una sola escala para las dos cosas habría forzado a elegir
  entre dejar el login más plano de lo aprobado o las tarjetas más tenues de lo pedido.
- **`esEnlaceUbicacion()` / `CampoUbicacion`** — algunas órdenes traen en `direccion` un
  enlace de Google Maps en vez de una dirección legible (dato capturado así desde el web).
  Mostrar la URL cruda se veía roto en la tarjeta; ahora se detecta y se muestra como un
  botón «Ver ubicación en el mapa» en azul que abre el mapa nativo — el único texto de la
  tarjeta que lleva el color de marca, porque es el único que además es una acción.
- **Reaparición del contenido** — al cambiar de mes o de búsqueda con carga en curso, la
  lista se atenúa a 45% (120 ms) y vuelve a 100% con un leve ascenso de 6 px (280 ms,
  `Easing.out(Easing.exp)`) cuando llega el nuevo lote. Antes el contenido saltaba de golpe
  sin transición, lo que junto a la falta de `BarraCarga` hacía que un cambio de mes se
  sintiera «trabado» aunque la petición hubiera respondido a tiempo.
- **`TextField.leadingIcon`** — ícono fijo no interactivo a la izquierda del campo (aditivo;
  sin él, el campo se ve exactamente igual). Lo usa la lupa del buscador de la lista.
- **`EmptyState.icon`** — slot opcional sobre el título (aditivo). Lo usa el glifo de «sin
  órdenes»: un punto sin ondas, el reverso silencioso de `BrandMark` — mismo vocabulario de
  marca, no una ilustración nueva.
- **`OrdenCard`** — el cliente manda, el folio es dato tabular y el estado es la única
  mancha de color de la fila.
- **`InlineError`** — glifo de alerta dibujado, sobre superficie de peligro con su línea.

Los iconos se dibujan en `react-native-svg` con trazo de 2 px y remates redondeados. Nunca
emoji ni glifos Unicode haciendo de icono.

## Movimiento

Tres momentos, todos en el acceso. Fuera de esa pantalla no se mueve nada.

1. **Entrada** — los bloques suben 12 px escalonados 70 ms, con `Animated.spring`
   (`friction: 9, tension: 60`) en vez de una curva de tiempo fija. Antes era
   `Easing.out(Easing.exp)`: llegaba a destino y se detenía de golpe, algo que se sentía
   «mecánico» junto al asentamiento con leve inercia de las transiciones nativas de iOS. Los
   parámetros están calibrados para que no rebote — la fluidez viene de cómo desacelera, no
   de un salto visible.
2. **Señal de la marca** — las dos ondas del glifo se emiten en bucle de 3,2 s: nacen tenues
   junto al emisor, se abren y se apagan al salir; la larga va desfasada un 22 %. Es el único
   movimiento perpetuo del producto y dice lo que la empresa hace.
3. **Confirmación** — al enviar, el botón colapsa a un círculo de 48 px y gira; al confirmar
   dibuja la palomita (trazo progresivo, 315 ms) antes de ceder el paso a las órdenes. La
   redirección se retiene a propósito hasta que el trazo termina.

**Extraído a `src/utils/useEntrance.ts`.** Antes vivía duplicado dentro de
`login.tsx`; ahora lo usan también el detalle de orden y el formulario de
edición, con el mismo `MOTION.stagger` — una sola entrada para toda la app,
no una nueva por pantalla. **No** se aplica por fila en una
lista que se desplaza (`OrdenCard`): repetir la entrada en cada ítem se siente
artificioso y cuesta rendimiento en Android: ahí el movimiento es solo
retroalimentación táctil (abajo).

**Retroalimentación táctil.** Todo control presionable se hunde ~3 % al tocar
y vuelve con un leve rebote (`Easing.out(Easing.back(1.4–1.6))`, 90/180 ms):
`AppButton`, `OrdenCard` y las flechas de mes. Antes
solo cambiaban de color de golpe; el color instantáneo se conserva **junto**
con la escala — la escala confirma el toque, el color confirma el estado.

**Estatus en edición** (`StatusSegment`) — tres filas de mando a ancho completo. La activa
usa `statusSolid` (fondo del color del estatus, texto blanco, check); las demás quedan en
superficie con radio vacío. Ya no son KPIs del resumen ni pastilla azul deslizante.

Reglas técnicas que cuestan un fallo silencioso si se ignoran:

- `strokeDashoffset` es una **prop de SVG**, no un estilo: se anima con
  `useNativeDriver: false` o no se dibuja.
- `width` no tiene equivalente nativo: el botón mide su ancho con `onLayout` e interpola
  entre números. React Native **no** interpola entre `'100%'` y `'48px'`.
- Un `delay` dentro de `Animated.loop` acumula pausa en cada vuelta; para desfasar dos
  bucles, el retraso envuelve al bucle.
- Animar `backgroundColor`/`borderColor`/`color` exige `useNativeDriver: false` (no son
  propiedades de transform/opacity); animar `transform`/`opacity` exige `true`. Mezclar
  ambos tipos en el mismo `Animated.Value` no funciona — son dos animaciones separadas
  sobre valores separados (ver `StatusChip` vs. la escala de `AppButton`).

Todo respeta `AccessibilityInfo.isReduceMotionEnabled` (`useReducedMotion`), y la preferencia
se escucha en vivo: con ella activa, los bloques aparecen colocados, la marca queda quieta y
la palomita se dibuja de golpe.

**Recarga en la lista, sin atenuar nada.** La lista de órdenes recarga al volver de foco
(`useFocusEffect`) y al cambiar de mes, con datos previos aún en pantalla. Se probaron dos
versiones con atenuado de opacidad — primero todo el contenido, luego solo las filas — y en
ambas el destello gris sobre las tarjetas blancas leía como una falla visual, no como una señal
de carga. Se retiró por completo: `BarraCarga` (la línea de progreso superior) es la única
señal de que algo está cargando; el contenido nunca cambia de opacidad ni se mueve, solo se
reemplaza cuando llegan los datos nuevos — el mismo criterio que un refresh de banca móvil.

**`MesSelector` tiene su propio indicador.** `BarraCarga` vive arriba de todo, pero la
paginación (por pedido explícito) vive al final de la lista — al tocar una flecha de mes
ahí abajo, la única señal de carga quedaba fuera de la vista y se sentía como si el toque
no hubiera hecho nada. Ahora `MesSelector` recibe `cargando` y muestra un
`ActivityIndicator` pequeño junto a la etiqueta del mes, con las dos flechas deshabilitadas
(opacidad 0.4) mientras dura la petición — la señal aparece exactamente donde el técnico
está mirando. `IconButton` ganó un prop `disabled` genérico para esto, reutilizable por
cualquier otro botón de solo ícono.

## Pantalla de acceso

Hace **una sola cosa**: entrar. Sin biometría, sin recordar usuario, sin registro (decisión
de producto, ver PRODUCT.md).

No muestra ningún dato técnico: el pie con el host se retiró porque la pantalla la usan
técnicos de campo, no informáticos. Un problema de configuración aparece como aviso en
lenguaje llano, no como una dirección de servidor.

El texto de la pantalla evita toda jerga («credenciales», «ERP», «administrador»), y los
errores del servidor se traducen antes de mostrarse.

### Gate de rol antes del acceso (2026-09-01)

Antes del formulario, `app/bienvenida.tsx` pregunta **«¿Cómo entras hoy?»** con dos
`RolSelectorCard` (`src/components/RolSelectorCard.tsx`): *Soy técnico* y *Soy cliente*.
Cada tarjeta es una fila: cuadro de ícono 52×52 (`radius.md`) — marino con ícono blanco en la
de técnico, `surfaceSunken` en la de cliente —, título `font.semibold` 17, descripción
`type.caption`, y una flecha en un **círculo dorado** (32 px) que avanza 3 px al presionar.
Borde de 1 px (`radius.card`) que se tiñe de dorado en `pressed` o cuando la tarjeta está
`destacada`; una `destacada` añade la píldora `goldSoft` «Entraste aquí la última vez».

### Dirección marino + dorado del acceso (2026-09-01)

Las pantallas sin sesión (`bienvenida`, `login`, `login-cliente`, `registro-cliente`) usan
una familia propia — **marino + dorado, sin la retícula de puntos** — codificada en
`tokens.ts` (no vive fuera del flujo de acceso):

| Rol | Token | Claro / Oscuro |
|---|---|---|
| Superficie de cabecera | `navy` | `#17235B` / `#1B2A63` |
| Marino profundo (pressed) | `navyDeep` | `#0F1A46` / `#131E49` |
| Botón deshabilitado (sobre marino) | `navyDisabled` | `#C6CCE0` / `#2A3560` |
| Texto/ícono sobre marino | `onNavy` / `onNavyMuted` | `#FFFFFF` / blanco @72% |
| Acento de acción | `gold` | `#E6A23C` (ambos) |
| Sobre dorado (flecha) | `onGold` | `#17235B` (ambos) |
| Píldora dorada tenue | `goldSoftBg` / `goldSoftText` | ámbar @14% + `#9A6B15` / @18% + `#E6A23C` |

Formas: `radius.card` (20) para `RolSelectorCard`, `radius.sheet` (28) para la cabecera
`AuthHero` y la hoja blanca.

**Anatomía** — `AuthHero` (`src/components/AuthHero.tsx`) es una cabecera marina sólida
(un degradado SVG dejaba un rectángulo sin recortar). `roundBottom` va recto cuando debajo
se solapa una **hoja blanca** (`borderTopRadius` 26, `marginTop` −20, sombra hacia arriba)
encabezada por un título propio — patrón «hoja sobre cabecera». `bienvenida` mantiene el
borde inferior redondeado porque ahí no hay hoja: las `RolSelectorCard` flotan sobre el
lienzo. Piezas con props añadidas para esta familia: `BrandMark` (`background`/`foreground`),
`ThemeToggle` (`onDark`, sin caja), `SubmitButton` (`tint`/`tintPressed`/`tintDisabled`).

**Transición** entre las cuatro: `fade` a 260 ms (`app/_layout.tsx`, `acceso`) — la cabecera
marina compartida hace que el fundido se lea como continuidad. Respeta «Reducir movimiento».
Pendiente: `react-native-reanimated` para una transición shared-element de la tarjeta al
formulario.

**`registro-cliente`** (`src/features/auth/RegistroClienteForm.tsx`) — solicitud de cuenta de
portal cliente contra `POST /api/portal-cliente/registro/`: nombre, apellidos, correo, celular
y aceptar el aviso de privacidad (los campos de empresa del serializer se omiten). No
autentica: crea una `ClienteRegistroSolicitud` que un admin aprueba y manda credenciales por
correo; la pantalla termina en «Solicitud enviada». El enlace vive en el login de cliente
(`AccesoForm` con prop `onRegistro`). El resto de la app sigue con `BackgroundGrid` y el
azul de marca (`primary`).

### Portal cliente (2026-09-01)

Zona autenticada del cliente (`app/cliente/`), en la misma familia marino + dorado que el
acceso. **Todo es de solo lectura**: el cliente consulta el avance de sus servicios, no los
edita. El backend lo garantiza (`PortalClientePermission` solo acepta `SAFE_METHODS`), así que
la UI no tiene ni un control de edición que haga falta deshabilitar.

- **Cambio de contraseña obligatorio** — la que llega por correo es temporal
  (`must_change_password`). `app/cliente/_layout.tsx` redirige a
  `/cliente/cambiar-contrasena` mientras la bandera siga activa; el propio formulario queda
  fuera del redirect para no ciclar. Al guardar, `recargarSesion()` relee `/me/` y la guarda
  deja pasar. Sin «volver»: la única salida sin cambiarla es cerrar sesión.
- **Lista** (`app/cliente/index.tsx`) — cabecera marina compacta («Hola, {nombre}» + tema +
  salir) y hoja blanca redondeada con las órdenes. `OrdenClienteCard` es la variante de solo
  lectura de `OrdenCard`: folio, chip de estatus con la familia `status*`, tipo, problemática,
  dirección/fecha/técnico y un «Ver detalle» con la flecha dorada — **sin** el botón de acción
  («Atender orden») del técnico. Lista plana, sin `MesSelector` ni búsqueda: el cliente tiene
  pocas órdenes.
- **Detalle** (`app/cliente/[id].tsx`) — «resumen para cliente». Cabecera marina con el folio,
  «{tipo} · {cliente}» y una **píldora de estatus** grande con ícono. En la hoja, arriba del
  todo, la **tarjeta del técnico** (`Avatar` con su **foto real** —
  `tecnico_asignado_avatar_url`, iniciales sobre marino si no tiene— + «Tu técnico» + nombre,
  y las estrellas si ya calificó): el «quién te atendió», estilo ficha de conductor. Debajo,
  cada bloque es una **tarjeta** (`surfaceSunken`, borde 1 px, `radius.card`): aviso de pausa,
  datos del servicio (rows con placa de ícono), lo que reportó, lo que se hizo (viñetas con
  punto dorado), comentario del técnico, `FotosGaleria` y su firma. Nada del expediente
  interno.

El **cliente no tiene foto de perfil** en ningún lado del portal: en la lista y el detalle
sale su nombre, nada más. `Avatar` (`src/components/Avatar.tsx`) — círculo con `<Image>`
(dimensión fija, sin salto de layout) y **fallback a iniciales** si no hay URL o la imagen
falla — se usa **solo para el técnico**, con `tecnico_asignado_avatar_url` del serializer del
portal.
- **Calificación del técnico** (`CalificacionTecnico.tsx`), al pie del detalle — cinco
  estrellas doradas de 32 px (área táctil de 48) con rebote al tocar, una leyenda que
  traduce la nota («Muy mal» → «Excelente») y un comentario opcional. Es la **única
  escritura** del portal. Tres estados, siempre visible: *todavía no* (aviso «podrás
  calificar cuando quede resuelto»), *calificable* (formulario) y *ya calificada* (resumen
  con las estrellas y la cita del comentario). Como al terminar un viaje: solo con la orden
  resuelta y una sola vez — el servidor lo vuelve a validar (400 si no está resuelta, 409 si
  ya se calificó). Como está al pie de un `ScrollView` largo, el detalle lo envuelve en
  `KeyboardAvoidingView` y al enfocar el comentario hace `scrollToEnd`: el campo nunca queda
  tapado por el teclado (mismo patrón que los formularios de acceso).

Contrato: `GET /api/portal-cliente/ordenes/`, `.../ordenes/<id>/` y
`POST .../ordenes/<id>/calificar/` (`backend/apps/clientes/portal_views.py`), con lista
blanca de campos en `PortalOrdenListSerializer` / `PortalOrdenDetalleSerializer` (este
último añade `calificacion` y `puede_calificar`). La calificación vive en
`OrdenCalificacion` (`apps/ordenes/models.py`): una por orden, con el técnico calificado
guardado aparte para poder promediar por técnico. Una orden de otro cliente responde
**404**, no 403: el portal no confirma que exista el servicio de otro.

**Persistencia y ruteo** — `src/auth/portalAcceso.ts` guarda `'tecnico' | 'cliente'` en
SecureStore (`digitalflow.portal`), mismo patrón `enMemoria` + `restore()` que `tokenStore`:

- Se guarda **al tocar la tarjeta**, no después del login. `bienvenida` hace
  `portalAcceso.set(portal)` y luego `router.replace` al acceso correspondiente.
- `portalAcceso.get()` devuelve `null` cuando nunca se eligió — **`null` no es «técnico»**.
- `app/index.tsx` (sin sesión): `'tecnico'` → `/login`, `'cliente'` → `/login-cliente`,
  `null` → `/bienvenida`. Un usuario recurrente se salta la bienvenida.
- «Cambiar de perfil» en `AccesoForm` hace `portalAcceso.clear()` + `router.replace('/bienvenida')`,
  así el picker vuelve a salir en el próximo arranque en frío.
- Si `bienvenida` se abre con una elección ya guardada (deep link), la tarjeta de ese portal
  se muestra `destacada` con la marca «Entraste aquí la última vez».

**Los dos accesos comparten `AccesoForm`** — difieren solo en copy (`subtitulo`, `submitHint`,
`ayudaMensaje`) y en el destino post-login. No hay identidad visual por rol.

### Portal de cliente (placeholder)

`app/cliente/index.tsx` es una pantalla honesta «en construcción»: marca + saludo arriba,
un `EmptyState` centrado (`IconClipboard`, «Tu portal está en camino») y abajo *Cerrar sesión*
+ *¿Eres técnico?* (esta última: `signOut()` → `portalAcceso.clear()` → `/bienvenida`).
`app/cliente/_layout.tsx` aún no tiene guard de permiso (el área de técnico sí exige
`ordenes.view`); el backend ya da a los clientes `{ portal_cliente: { view: true } }`.

## Fotos, firmas y equipos en el detalle

El backend (`OrdenSerializer`) siempre mandó `fotos_urls`, `firma_cliente_url`,
`firma_encargado_url`, `servicios_realizados` y `equipos_inventario`, y el parser del móvil
(`parseOrden`) ya los leía — pero ninguno se mostraba en pantalla. Se agregaron tres tarjetas
nuevas al detalle:

- **Equipos** (`EquiposLista`) — lectura sola. El `PATCH` limitado del técnico ignora por
  completo `equipos_inventario` (`edit_scope.py`), así que no hay controles aquí todavía;
  cada fila muestra una miniatura de 48×48, nombre, marca/modelo, cantidad y dos
  indicadores (Entregado/Instalado) con el mismo verde de `statusResuelto*` que ya usa el
  sistema para «hecho». **La tarjeta siempre se muestra**, con un aviso de texto («Aún no
  se han asignado equipos a esta orden») cuando la lista viene vacía — la primera versión
  la ocultaba por completo, y sin equipo asignado (el caso más común) parecía que la
  función no existía o estaba rota.
  - La miniatura sale de `equipo.imagenUrl`, la misma imagen del ítem de inventario
    (`InventarioItem.imagen_url` — de SYSCOM, de TVC, o subida a mano al dar de alta el
    ítem sin fuente automática) copiada a la línea de la orden al agregar el equipo
    (`normalize_equipos_payload`, backend). El lienzo es blanco fijo, no
    `colors.surface`, porque las fotos de producto de estos catálogos casi siempre traen
    fondo transparente. Sin `imagenUrl` (ítems dados de alta hace tiempo, antes de que el
    catálogo trajera foto), un cuadro con `IconBox` hace de relleno — nunca un hueco vacío.
- **Fotos** (`FotosGaleria`) — cuadrícula de miniaturas de **2** columnas (no 3: con tres la
  miniatura quedaba casi un ícono, y son pocas fotos por orden — el tamaño importa más que
  la densidad), con sombra (`elevation.panel`) para que se lean como fotos, no como
  botones planos. Tocar una abre un visor de pantalla completa propio (`Modal`, sin
  librería — no hay ninguna en el proyecto) con deslizar horizontal (`PanResponder`, sin
  librería de gestos), puntos de paginación abajo y los insets reales del dispositivo
  (`useSafeAreaInsets`) en vez de un margen fijo arriba. Solo se muestra cuando hay fotos —
  a diferencia de equipos, una orden sin fotos es la norma y no necesita explicarse.
- **Firmas** (`FirmasTarjeta`) — la firma es trazo negro sobre blanco; el lienzo que la
  contiene es `#FFFFFF` fijo, no `colors.surface`, para que se lea igual sin importar el
  tema de la superficie. **Apiladas, no lado a lado**: la primera versión ponía cliente y
  encargado en la misma fila, así que cada lienzo se quedaba con menos de la mitad del
  ancho de la tarjeta — una firma necesita espacio horizontal para leerse. Ahora cada una
  ocupa el ancho completo, con `aspectRatio: 5/3` en vez de `16/9`.

`servicios_realizados` no amerita tarjeta propia — es una lista corta de texto, así que se
agregó como un campo más dentro de «Detalles del servicio».

**Enlaces externos, misma regla que las direcciones** (ver «Enlaces externos» abajo): no
aplica aquí porque fotos y firmas se muestran embebidas (`<Image>`), no como enlace tocable.

## Contraste medido

Todos los pares de texto del sistema se verificaron por cálculo, no por ojo. El más ajustado
es `inkSubtle` sobre la superficie hundida, en 4.84:1. Al mover un token de tinta o de
superficie, recalcular: el mínimo es 4.5:1 para texto normal.

## Safe area inferior

Toda pantalla con contenido accionable cerca del borde inferior (un botón final, un
formulario) usa `SafeAreaView` con `'bottom'` incluido en `edges` — o, si la parte superior
ya la resuelve un header nativo, `edges={['bottom']}` solo. Un `paddingBottom` fijo no sabe
cuánto ocupa la barra de navegación del teléfono; en Android con barra gestual grande, un
botón final terminaba pegado a ella. Corregido en `ordenes/index`, `ordenes/[id]/index` y
`ordenes/[id]/editar` (esta última no tenía `SafeAreaView` en absoluto).

**`LoadingState`/`ErrorState` llevan su propio `SafeAreaView`.** Las dos se usan como
sustituto de la pantalla completa (`if (cargando) return <LoadingState .../>`) en seis
puntos — acceso, el guard de `_layout`, la redirección inicial, el detalle y el
formulario de edición — y en los seis el `return` temprano ocurría *antes* del
`SafeAreaView` propio de cada pantalla: el spinner o el aviso de error podían quedar
pegados al notch o a la barra de navegación mientras cargaba. Se movió el `SafeAreaView`
adentro de ambos componentes en `StateViews.tsx` en vez de arreglar cada sitio por
separado, para que ninguna pantalla nueva reintroduzca el defecto.

**El formulario de editar es una bitácora tipográfica**, no un clon del detalle:
folio ancla, segmento azul, panel de horario hundido, Guardar fijo + Cancelar
texto. El stack sigue con `headerShown: false` (título vía `Stack.Screen` para a11y).

## `flexShrink` en texto dentro de filas anidadas

Un `Text` dentro de un `View` con `flex: 1` **no** se encoge solo con eso en RN/Yoga: el
`flex: 1` del contenedor sí implica `flexShrink: 1`, pero el `Text` hijo, al ser un nodo
hoja, necesita su propio `flexShrink: 1` — sin él, un texto largo sin oportunidad de salto
(el nombre de un producto de catálogo SYSCOM/TVC, por ejemplo) se sale de la tarjeta y de
la pantalla en vez de envolverse o truncarse con `numberOfLines`. Encontrado en
`EquiposLista` (nombre y marca/modelo del equipo) y corregido también, preventivamente, en
`CampoDato` (mismo patrón de fila anidada). **Regla:** cualquier `Text` de longitud
variable dentro de una fila (`flexDirection: 'row'`) lleva `flexShrink: 1` explícito en su
propio `style`, no solo en el `View` que lo envuelve.

## Enlaces externos

`Linking.openURL` nunca se llama sin atrapar el rechazo. El botón «Ver ubicación en el
mapa» (`OrdenCard` y `CampoDato.CampoUbicacion`) lo hacía directo (`void
Linking.openURL(direccion)`); si el teléfono no podía abrir el enlace — sin app de mapas,
sin conexión — la promesa rechazada llegaba sin capturar y disparaba el overlay de error
crudo de React Native («Unable to open URL…»), que un técnico de campo no sabe
interpretar. `src/utils/abrirEnlace.ts` centraliza el intento con un `Alert.alert` en
español llano como salida de error; cualquier botón nuevo que abra un enlace externo pasa
por ahí, no por `Linking.openURL` directo.

## No hacer

- Heredar el naranja `#ff801f` ni el crema del ERP web: son de otro producto.
- Tarjetas dentro de tarjetas, ni la tarjeta como estructura por defecto de una pantalla.
- Texto con degradado, cristal esmerilado decorativo o bordes de color de más de 1 px.
- Sombras duras sin desenfoque.
- Una etiqueta pequeña encima de un título haciendo de antetítulo: el título se basta.
- Monoespaciado como disfraz de «técnico»: solo para datos que se comparan o se leen dígito
  a dígito.
