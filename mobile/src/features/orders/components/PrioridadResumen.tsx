import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import type { Prioridad } from '../ordenFormat';

export type FiltroPrioridad = Prioridad | 'todas';

interface Props {
  total: number;
  conteo: Record<Prioridad, number>;
  filtro: FiltroPrioridad;
  onFiltro: (filtro: FiltroPrioridad) => void;
  cargando?: boolean;
}

const ORDEN: readonly Prioridad[] = ['alta', 'media', 'baja'];
const LABEL: Record<Prioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

/**
 * Desglose de la bolsa por prioridad, sobre la banda marina. La barra
 * apilada dice la proporción de un vistazo; las tres celdas debajo son el
 * filtro (tocar la activa vuelve a «todas»). La banda siempre es oscura, así
 * que los tonos salen de la paleta oscura en ambos temas.
 */
export function PrioridadResumen({ total, conteo, filtro, onFiltro, cargando = false }: Props) {
  const { colors } = useTheme();
  const tono: Record<Prioridad, string> = {
    alta: darkColors.danger,
    media: colors.gold,
    baja: 'rgba(255,255,255,0.55)',
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.totalFila}>
        <Text style={[styles.total, { color: colors.onNavy }]} accessibilityLiveRegion="polite">
          {cargando ? '—' : total}
        </Text>
        <Text style={[styles.totalLabel, { color: colors.onNavyMuted }]}>
          {total === 1 ? 'orden disponible' : 'órdenes disponibles'}
        </Text>
      </View>

      <View
        style={[styles.barra, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
        accessible
        accessibilityLabel={`Alta ${conteo.alta}, media ${conteo.media}, baja ${conteo.baja}`}
      >
        {total > 0
          ? ORDEN.filter((p) => conteo[p] > 0).map((p) => (
              <Segmento
                key={p}
                flex={conteo[p]}
                color={tono[p]}
                atenuado={filtro !== 'todas' && filtro !== p}
              />
            ))
          : null}
      </View>

      <View style={styles.celdas} accessibilityRole="radiogroup" accessibilityLabel="Filtrar por prioridad">
        {ORDEN.map((p) => (
          <Celda
            key={p}
            label={LABEL[p]}
            cantidad={conteo[p]}
            color={tono[p]}
            colorActivo={p === 'baja' ? colors.inkSubtle : tono[p]}
            activo={filtro === p}
            onPress={() => onFiltro(filtro === p ? 'todas' : p)}
          />
        ))}
      </View>
    </View>
  );
}

function Segmento({ flex, color, atenuado }: { flex: number; color: string; atenuado: boolean }) {
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.timing(entrada, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada, reduced]);

  return (
    <Animated.View
      style={[
        styles.segmento,
        {
          flex,
          backgroundColor: color,
          opacity: atenuado ? 0.3 : entrada,
          transform: [{ scaleY: entrada }],
        },
      ]}
    />
  );
}

function Celda({
  label,
  cantidad,
  color,
  colorActivo,
  activo,
  onPress,
}: {
  label: string;
  cantidad: number;
  color: string;
  /** Tono del punto sobre la celda activa (fondo claro). */
  colorActivo: string;
  activo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={`Prioridad ${label.toLowerCase()}: ${cantidad}`}
      accessibilityHint={activo ? 'Quita el filtro' : 'Muestra solo esta prioridad'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.celda,
        {
          backgroundColor: activo ? colors.onNavy : pressed ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
          borderColor: activo ? colors.onNavy : 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      <View style={styles.celdaCabeza}>
        <View style={[styles.punto, { backgroundColor: activo ? colorActivo : color }]} />
        <Text style={[styles.celdaLabel, { color: activo ? colors.navy : colors.onNavyMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.celdaNumero, { color: activo ? colors.navy : colors.onNavy }]}>{cantidad}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  totalFila: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  total: { fontFamily: font.bold, fontSize: 32, lineHeight: 36, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  totalLabel: { ...type.label, fontSize: 13 },
  barra: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  segmento: { height: 8 },
  celdas: { flexDirection: 'row', gap: spacing.sm },
  celda: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  celdaCabeza: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  celdaLabel: { ...type.caption, fontSize: 12, fontFamily: font.semibold },
  celdaNumero: { fontFamily: font.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
