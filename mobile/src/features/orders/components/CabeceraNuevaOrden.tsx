import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconClose } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing } from '@/theme/tokens';
import { hoyISO } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { describirFecha } from '../agendaFechas';

export interface PasoCabecera<K extends string> {
  clave: K;
  titulo: string;
  completo: boolean;
}

/**
 * Cabecera compacta de «Nueva orden»: título y contexto a la izquierda,
 * avance («1 de 4») y cerrar a la derecha; debajo, una barra fina de cuatro
 * tramos con el nombre de cada sección (tocable, lleva a su tarjeta).
 *
 * Sobria a propósito: el único movimiento es funcional — los tramos se llenan
 * de izquierda a derecha al completar una sección y el contenido entra con un
 * fundido corto. Solo `opacity`/`transform` en el hilo nativo.
 */
export function CabeceraNuevaOrden<K extends string>({
  pasos,
  actual,
  onCerrar,
  onIr,
  titulo = 'Nueva orden',
  contexto = 'Orden de trabajo',
  cerrarLabel = 'Cancelar orden nueva',
}: {
  pasos: PasoCabecera<K>[];
  /** Primer paso sin completar; `null` cuando todo está listo. */
  actual: K | null;
  onCerrar: () => void;
  onIr: (clave: K) => void;
  /** Título grande («Nueva orden», «Nuevo proyecto»). */
  titulo?: string;
  /** Contexto bajo el título; se le agrega la fecha de hoy. */
  contexto?: string;
  cerrarLabel?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const total = pasos.length;
  const completadas = pasos.filter((p) => p.completo).length;
  const listo = actual === null;
  const fecha = useMemo(() => describirFecha(hoyISO())?.fecha ?? '', []);

  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(entrada, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [entrada, reduced]);

  return (
    <View style={[s.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
      <Animated.View
        style={[
          s.fila,
          { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
        ]}
      >
        <View style={s.titulos}>
          <Text style={[s.titulo, { color: colors.onNavy }]} accessibilityRole="header" numberOfLines={1}>
            {titulo}
          </Text>
          <Text style={[s.contexto, { color: colors.onNavyMuted }]} numberOfLines={1}>
            {contexto}
            {fecha ? ` · ${fecha}` : ''}
          </Text>
        </View>

        <View
          style={[s.avance, listo ? { backgroundColor: colors.gold } : { backgroundColor: VIDRIO }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={listo ? 'Todo listo para crear' : 'Secciones completas'}
          accessibilityValue={{ min: 0, max: total, now: completadas }}
        >
          {listo ? <IconCheck color={colors.navy} size={11} /> : null}
          <Text style={[s.avanceTexto, { color: listo ? colors.navy : colors.onNavy }]}>
            {completadas}
            <Text style={{ color: listo ? colors.navy : colors.onNavyMuted }}> de {total}</Text>
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cerrarLabel}
          onPress={onCerrar}
          hitSlop={8}
          style={({ pressed }) => [s.cerrar, { backgroundColor: pressed ? VIDRIO_FUERTE : VIDRIO }]}
        >
          <IconClose color={colors.onNavy} size={14} />
        </Pressable>
      </Animated.View>

      <Animated.View style={[s.pasos, { opacity: entrada }]}>
        {pasos.map((p, i) => (
          <Paso
            key={p.clave}
            titulo={p.titulo}
            completo={p.completo}
            actual={p.clave === actual}
            retraso={i * 60}
            onPress={() => onIr(p.clave)}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Tramo de la barra con su nombre: dorado al completarse, blanco el que sigue. */
function Paso({
  titulo,
  completo,
  actual,
  retraso,
  onPress,
}: {
  titulo: string;
  completo: boolean;
  actual: boolean;
  retraso: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(completo ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(completo ? 1 : 0);
      return;
    }
    const anim = Animated.timing(v, {
      toValue: completo ? 1 : 0,
      duration: completo ? 380 : 180,
      delay: completo ? retraso : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [completo, v, reduced, retraso]);

  const color = actual ? colors.onNavy : completo ? colors.gold : colors.onNavyMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${completo ? 'lista' : actual ? 'siguiente' : 'pendiente'}`}
      accessibilityHint="Lleva a esta sección"
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [s.paso, pressed ? { opacity: 0.6 } : null]}
    >
      <View style={[s.pista, { backgroundColor: actual ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.14)' }]}>
        <Animated.View style={[s.relleno, { backgroundColor: colors.gold, transform: [{ scaleX: v }] }]} />
      </View>
      <View style={s.etiquetaFila}>
        {completo ? <IconCheck color={colors.gold} size={10} /> : null}
        <Text style={[s.etiqueta, { color }, actual ? { fontFamily: font.semibold } : null]} numberOfLines={1}>
          {titulo}
        </Text>
      </View>
    </Pressable>
  );
}

/** Vidrio sobre la banda marina (siempre oscura en ambos temas). */
const VIDRIO = 'rgba(255,255,255,0.1)';
const VIDRIO_FUERTE = 'rgba(255,255,255,0.2)';
const CERRAR = 34;

const s = StyleSheet.create({
  // +20 abajo: la hoja blanca del formulario se monta 20 px sobre la banda.
  banda: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md + 20, gap: spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titulos: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: font.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
  contexto: { fontFamily: font.medium, fontSize: 12, marginTop: 1 },
  avance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
  },
  avanceTexto: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  cerrar: { width: CERRAR, height: CERRAR, borderRadius: CERRAR / 2, alignItems: 'center', justifyContent: 'center' },

  pasos: { flexDirection: 'row', gap: 6 },
  paso: { flex: 1, minWidth: 0, gap: 6 },
  pista: { height: 3, borderRadius: 2, overflow: 'hidden' },
  relleno: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, transformOrigin: 'left center' },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  etiqueta: { fontFamily: font.medium, fontSize: 11, flexShrink: 1 },
});
