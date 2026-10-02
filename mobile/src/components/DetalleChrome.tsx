import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconChevron, IconEditar } from './icons';

/**
 * Piezas compartidas de los detalles (Órdenes, Proyectos, Reportes): barra fija
 * con título compacto, portada marina con parallax, la hoja de datos que sube
 * sobre la portada y sus bloques internos. Un detalle nuevo se arma con estas
 * piezas y se mueve igual que los demás. Todo el movimiento es
 * transform/opacity en el hilo nativo y respeta «Reducir movimiento».
 *
 * Uso: un `Animated.Value` de desplazamiento (`scrollY`) conectado con
 * `Animated.event` al `onScroll` de la lista/ScrollView; la portada va dentro
 * del contenido desplazable (a sangre) y la barra, fija arriba.
 */

const GLASS = 'rgba(255,255,255,0.1)';
const GLASS_PRESSED = 'rgba(255,255,255,0.2)';
/** Desplazamiento (px) a partir del cual la barra muestra el título compacto. */
const UMBRAL_TITULO = 96;
/** Lo que la hoja de datos sube sobre la portada (px). */
export const TRASLAPE_PORTADA = 44;

/** Tres puntos horizontales («más opciones»). */
function Puntos({ color }: { color: string }) {
  return (
    <View style={styles.puntos}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.puntoMas, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

interface BarraProps {
  scrollY: Animated.Value;
  /** Título compacto que aparece al desplazar (el cliente). */
  titulo: string;
  /** Segunda línea del título compacto (el folio). */
  subtitulo?: string;
  onVolver: () => void;
  volverLabel?: string;
  /** Píldora dorada; sin ella (p. ej. sin permiso) no se muestra. */
  editar?: { label: string; onPress: () => void; accessibilityLabel?: string };
  /** «⋯»: abre la hoja con el resto de acciones. Sin acciones extra no se muestra. */
  onMas?: () => void;
  masHint?: string;
}

/**
 * Barra fija del detalle: volver, el título compacto (aparece cuando la
 * portada ya se fue) y las acciones — píldora dorada «Editar» y «⋯». Mismo
 * marino que la portada: al hacer scroll no hay costura.
 */
export function DetalleBarraSuperior({
  scrollY,
  titulo,
  subtitulo,
  onVolver,
  volverLabel = 'Volver',
  editar,
  onMas,
  masHint,
}: BarraProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const aparece = scrollY.interpolate({ inputRange: [UMBRAL_TITULO - 30, UMBRAL_TITULO + 20], outputRange: [0, 1], extrapolate: 'clamp' });
  const borde = scrollY.interpolate({ inputRange: [UMBRAL_TITULO, UMBRAL_TITULO + 60], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.barra, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={volverLabel}
        onPress={onVolver}
        hitSlop={4}
        style={({ pressed }) => [styles.circulo, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
      >
        <IconChevron direction="left" color={colors.onNavy} size={18} />
      </Pressable>

      <Animated.View
        style={[styles.compacto, { opacity: aparece, transform: [{ translateY: aparece.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text style={[styles.compactoTitulo, { color: colors.onNavy }]} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[styles.compactoSub, { color: colors.onNavyMuted }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </Animated.View>

      {editar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editar.accessibilityLabel ?? editar.label}
          onPress={editar.onPress}
          hitSlop={4}
          style={({ pressed }) => [styles.editar, { backgroundColor: pressed ? colors.navyDeep : colors.gold }]}
        >
          {({ pressed }) => (
            <>
              <IconEditar color={pressed ? colors.onNavy : colors.onGold} size={14} />
              <Text style={[styles.editarTexto, { color: pressed ? colors.onNavy : colors.onGold }]}>{editar.label}</Text>
            </>
          )}
        </Pressable>
      ) : null}
      {onMas ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          accessibilityHint={masHint}
          onPress={onMas}
          hitSlop={4}
          style={({ pressed }) => [styles.circulo, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
        >
          <Puntos color={colors.onNavy} />
        </Pressable>
      ) : null}

      {/* Línea de cierre que aparece cuando el contenido ya pasa por debajo. */}
      <Animated.View style={[styles.cierre, { opacity: borde }]} pointerEvents="none" />
    </View>
  );
}

export interface PildoraPortada {
  key: string;
  label: string;
  /** Tono relleno (estatus). Sin tono = píldora con contorno. */
  tono?: { bg: string; text: string };
  icon?: (color: string) => React.ReactNode;
  /** Folios y cifras: tipografía tabular. */
  mono?: boolean;
  accessibilityLabel?: string;
}

export interface AccionPortada {
  key: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  accessibilityHint?: string;
}

interface PortadaProps {
  scrollY: Animated.Value;
  /** Versalitas sobre el título («Orden de trabajo · Mantenimiento»). */
  eyebrow: string;
  titulo: string;
  pildoras: PildoraPortada[];
  /** Accesos rápidos sobre el marino (llamar, cómo llegar): mismo tamaño cada uno. */
  acciones?: AccionPortada[];
}

/**
 * Portada marina a sangre (va dentro del contenido desplazable). Sobria:
 * versalitas, el título grande y una fila de píldoras; opcionalmente accesos
 * rápidos de vidrio. Deja aire abajo para la hoja de datos. Al desplazar se
 * aleja con parallax y se desvanece, mientras la barra fija toma el título.
 */
export function DetallePortada({ scrollY, eyebrow, titulo, pildoras, acciones = [] }: PortadaProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      entrada.setValue(1);
      return;
    }
    const anim = Animated.timing(entrada, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [reduced, entrada]);

  const parallax = reduced
    ? null
    : {
        opacity: scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [-100, 0, 200], outputRange: [-30, 0, 60], extrapolate: 'clamp' }) }],
      };

  return (
    <View style={[styles.portada, { backgroundColor: colors.navy }]}>
      <Animated.View style={parallax}>
        <Animated.View
          style={[
            styles.portadaContenido,
            { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.onNavyMuted }]} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={2} accessibilityRole="header">
            {titulo}
          </Text>
          {pildoras.length > 0 ? (
            <View style={styles.pildoras}>
              {pildoras.map((p) => {
                const tinta = p.tono ? p.tono.text : colors.onNavy;
                return (
                  <View
                    key={p.key}
                    style={[styles.pildora, p.tono ? { backgroundColor: p.tono.bg } : styles.pildoraContorno]}
                    accessible
                    accessibilityLabel={p.accessibilityLabel ?? p.label}
                  >
                    {p.icon ? p.icon(tinta) : null}
                    <Text style={[p.mono ? styles.pildoraMono : styles.pildoraTexto, { color: tinta }]}>{p.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          {acciones.length > 0 ? (
            <View style={styles.acciones}>
              {acciones.map((a) => (
                <Pressable
                  key={a.key}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  accessibilityHint={a.accessibilityHint}
                  onPress={a.onPress}
                  style={({ pressed }) => [styles.accion, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
                >
                  {a.icon(colors.gold)}
                  <Text style={[styles.accionTexto, { color: colors.onNavy }]} numberOfLines={1}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Hoja blanca de datos que sube `TRASLAPE_PORTADA` px sobre la portada (patrón
 * hoja sobre cabecera). Entra subiendo después de la portada. El que la usa
 * pone un margen superior negativo (ver `estiloTraslape`).
 */
export function HojaDatos({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(entrada, { toValue: 1, duration: 420, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [reduced, entrada]);

  return (
    <Animated.View
      style={[
        styles.hoja,
        { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'card') },
        { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      <Text style={[styles.hojaTitulo, { color: colors.ink }]} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </Animated.View>
  );
}

/** Etiqueta de dato: ícono chico + versalitas. */
export function DatoEtiqueta({ icon, texto }: { icon?: React.ReactNode; texto: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.etiqueta}>
      {icon}
      <Text style={[styles.etiquetaTexto, { color: colors.inkSubtle }]}>{texto}</Text>
    </View>
  );
}

export interface CeldaDato {
  key: string;
  icon?: React.ReactNode;
  label: string;
  valor: string;
  secundario?: string | null;
  mono?: boolean;
  /** Valor vacío («Sin programar»): se muestra en gris. */
  apagado?: boolean;
}

/** Rejilla de dos celdas separadas por líneas de 1 px (sin cajas dentro de la caja). */
export function DatosRejilla({ celdas }: { celdas: [CeldaDato, CeldaDato] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.rejilla, { borderColor: colors.line }]}>
      {celdas.map((c, i) => (
        <React.Fragment key={c.key}>
          {i > 0 ? <View style={[styles.divisorV, { backgroundColor: colors.line }]} /> : null}
          <View style={styles.celda} accessible accessibilityLabel={`${c.label}: ${c.valor}${c.secundario ? `, ${c.secundario}` : ''}`}>
            <DatoEtiqueta icon={c.icon} texto={c.label} />
            <Text
              style={[c.mono ? styles.valorMono : styles.valor, { color: c.apagado ? colors.inkSubtle : colors.ink }]}
              numberOfLines={1}
            >
              {c.valor}
            </Text>
            {c.secundario ? (
              <Text style={[styles.secundario, { color: colors.inkSubtle }]} numberOfLines={1}>
                {c.secundario}
              </Text>
            ) : null}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export interface PersonaDato {
  nombre: string;
  /** Rol corto a la derecha («Responsable», «Auxiliar»). */
  rol?: string;
  /** Avatar (foto o iniciales); lo arma quien llama para usar `Avatar` con foto real. */
  avatar: React.ReactNode;
}

/** Bloque de personas: etiqueta y una fila por persona con su avatar. */
export function DatosPersonas({ etiqueta, icon, personas, vacio }: { etiqueta: string; icon?: React.ReactNode; personas: PersonaDato[]; vacio: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bloque} accessible accessibilityLabel={`${etiqueta}: ${personas.map((p) => p.nombre).join(', ') || vacio}`}>
      <DatoEtiqueta icon={icon} texto={personas.length > 1 ? `${etiqueta} · ${personas.length}` : etiqueta} />
      {personas.length === 0 ? (
        <Text style={[styles.secundario, { color: colors.inkSubtle }]}>{vacio}</Text>
      ) : (
        <View style={styles.personas}>
          {personas.map((p, i) => (
            <View key={`${p.nombre}-${i}`} style={styles.persona}>
              {p.avatar}
              <Text style={[styles.personaNombre, { color: colors.ink }]} numberOfLines={1}>
                {p.nombre}
              </Text>
              {p.rol ? (
                <View style={[styles.rol, { backgroundColor: colors.surfaceSunken }]}>
                  <Text style={[styles.rolTexto, { color: colors.inkMuted }]}>{p.rol}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Pie de la hoja: una línea de avance (etiqueta, valor y barra que se llena al entrar). */
export function DatosAvance({ label, valor, fraccion, color, completo = false }: { label: string; valor: string; fraccion: number; color: string; completo?: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const destino = Math.max(0, Math.min(1, fraccion));
  const barra = useRef(new Animated.Value(reduced ? destino : 0)).current;

  useEffect(() => {
    if (reduced) {
      barra.setValue(destino);
      return;
    }
    const anim = Animated.timing(barra, { toValue: destino, duration: 850, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [destino, reduced, barra]);

  return (
    <View
      style={[styles.avance, { borderTopColor: colors.line }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(destino * 100), text: valor }}
    >
      <View style={styles.avanceFila}>
        <Text style={[styles.avanceLabel, { color: colors.inkMuted }]}>{label}</Text>
        <Text style={[styles.avanceValor, { color: completo ? colors.statusResueltoText : colors.ink }]}>{valor}</Text>
      </View>
      <View style={[styles.pista, { backgroundColor: colors.surfaceSunken }]}>
        <Animated.View style={[styles.relleno, { backgroundColor: color, transform: [{ scaleX: barra }] }]} />
      </View>
    </View>
  );
}

/** Margen que monta la hoja de datos sobre la portada dentro de un contenedor con `gap`. */
export function estiloTraslape(gapDelContenedor: number) {
  return { marginTop: -TRASLAPE_PORTADA - gapDelContenedor };
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, zIndex: 2 },
  circulo: { width: TOUCH_TARGET - 6, height: TOUCH_TARGET - 6, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  compacto: { flex: 1, minWidth: 0, paddingHorizontal: spacing.xs },
  compactoTitulo: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2 },
  compactoSub: { ...type.mono, fontSize: 11 },
  editar: { flexDirection: 'row', alignItems: 'center', gap: 6, height: TOUCH_TARGET - 6, borderRadius: radius.pill, paddingHorizontal: spacing.md + 2 },
  editarTexto: { fontFamily: font.semibold, fontSize: 14 },
  puntos: { flexDirection: 'row', gap: 3 },
  puntoMas: { width: 4, height: 4, borderRadius: 2 },
  cierre: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  portada: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl + TRASLAPE_PORTADA },
  portadaContenido: { gap: spacing.sm },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  titulo: { fontFamily: font.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  pildoraContorno: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  pildoraTexto: { fontFamily: font.semibold, fontSize: 12 },
  pildoraMono: { ...type.mono, fontSize: 12, fontFamily: font.semibold },
  acciones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  accion: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: TOUCH_TARGET - 4, borderRadius: radius.md },
  accionTexto: { fontFamily: font.semibold, fontSize: 14, flexShrink: 1 },
  hoja: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.lg },
  hojaTitulo: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.3 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  etiquetaTexto: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase' },
  rejilla: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  celda: { flex: 1, minWidth: 0, gap: 3 },
  divisorV: { width: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  valor: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, marginTop: 2 },
  valorMono: { ...type.mono, fontSize: 15, fontFamily: font.semibold, marginTop: 2 },
  secundario: { ...type.caption, fontSize: 12 },
  bloque: { gap: spacing.sm },
  personas: { gap: spacing.sm },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personaNombre: { ...type.bodyMedium, fontSize: 14, flexShrink: 1, flex: 1 },
  rol: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  rolTexto: { fontFamily: font.semibold, fontSize: 11 },
  avance: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  avanceFila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  avanceLabel: { ...type.label },
  avanceValor: { fontFamily: font.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3, width: '100%', transformOrigin: 'left' },
});
