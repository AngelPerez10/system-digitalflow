import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  /** Texto chico sobre el folio («Editar orden», «Editar proyecto»). */
  eyebrow: string;
  folio: string;
  cliente: string;
  /** Etiqueta accesible del botón de volver. */
  volverLabel?: string;
  dirty: boolean;
  completadas: number;
  total: number;
  /** Nombre de la siguiente sección pendiente, o `null` si ya está todo. */
  siguiente: string | null;
  onVolver: () => void;
  onIrSiguiente: () => void;
  /** `false` oculta el bloque «Reporte X de Y» y su barra (solo identifica el registro). */
  mostrarProgreso?: boolean;
}

/**
 * Banda marina compacta de los formularios de edición (órdenes, proyectos). Además de identificar la orden,
 * resume el avance del reporte: la barra dorada y «Siguiente: …» llevan al
 * técnico directo a lo que le falta, sin recorrer todo el formulario.
 */
export function EditarHeader({
  eyebrow,
  folio,
  cliente,
  volverLabel = 'Volver al detalle',
  dirty,
  completadas,
  total,
  siguiente,
  onVolver,
  onIrSiguiente,
  mostrarProgreso = true,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const chip = useRef(new Animated.Value(dirty ? 1 : 0)).current;
  const avance = useRef(new Animated.Value(total ? completadas / total : 0)).current;
  const listo = completadas === total;

  useEffect(() => {
    const destino = dirty ? 1 : 0;
    if (reduced) {
      chip.setValue(destino);
      return;
    }
    const animacion = Animated.spring(chip, { toValue: destino, friction: 8, tension: 140, useNativeDriver: true });
    animacion.start();
    return () => animacion.stop();
  }, [dirty, chip, reduced]);

  useEffect(() => {
    const destino = total ? completadas / total : 0;
    if (reduced) {
      avance.setValue(destino);
      return;
    }
    Animated.timing(avance, {
      toValue: destino,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completadas, total, avance, reduced]);

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.filaSuperior}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={volverLabel}
          onPress={onVolver}
          hitSlop={4}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)' },
          ]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={18} />
        </Pressable>

        <View style={styles.titulos}>
          <Text style={[styles.eyebrow, { color: colors.onNavyMuted }]}>{eyebrow}</Text>
          <Text style={[styles.folio, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
            {folio}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.dirtyPill,
            {
              backgroundColor: colors.goldSoftBg,
              opacity: chip,
              transform: [{ scale: chip.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            },
          ]}
          pointerEvents="none"
          accessibilityElementsHidden={!dirty}
          importantForAccessibility={dirty ? 'auto' : 'no-hide-descendants'}
        >
          <View style={[styles.dirtyDot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.dirtyTexto, { color: colors.gold }]}>Sin guardar</Text>
        </Animated.View>
      </View>

      <Text style={[styles.cliente, { color: colors.onNavyMuted }]} numberOfLines={1}>
        {cliente}
      </Text>

      {mostrarProgreso ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          listo
            ? `Reporte completo, ${completadas} de ${total} secciones`
            : `Reporte ${completadas} de ${total}. Ir a la siguiente sección pendiente: ${siguiente ?? ''}`
        }
        disabled={listo}
        onPress={onIrSiguiente}
        style={({ pressed }) => [styles.progreso, pressed ? { opacity: 0.75 } : null]}
      >
        <View style={styles.progresoTextos}>
          <Text style={[styles.progresoTitulo, { color: colors.onNavy }]}>
            {listo ? 'Reporte completo' : `Reporte ${completadas} de ${total}`}
          </Text>
          {!listo && siguiente ? (
            <View style={styles.siguiente}>
              <Text style={[styles.siguienteTexto, { color: colors.gold }]} numberOfLines={1}>
                Siguiente: {siguiente}
              </Text>
              <IconChevron direction="right" color={colors.gold} size={12} />
            </View>
          ) : null}
        </View>
        <View style={[styles.pista, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          <Animated.View
            style={[
              styles.relleno,
              {
                backgroundColor: listo ? colors.success : colors.gold,
                width: avance.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volver: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  folio: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.7 },
  dirtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dirtyDot: { width: 6, height: 6, borderRadius: 3 },
  dirtyTexto: { ...type.label, fontSize: 12 },
  cliente: { ...type.caption, marginLeft: TOUCH_TARGET - 6 + spacing.md },
  progreso: { marginTop: spacing.xs, gap: spacing.sm },
  progresoTextos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progresoTitulo: { ...type.label, fontFamily: font.semibold },
  siguiente: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  siguienteTexto: { ...type.label, fontSize: 12, flexShrink: 1 },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
});
