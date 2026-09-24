import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { CotizacionStatus } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { STATUS_ORDER, statusLabel, statusTone, type ResumenMes } from '../cotizacionFormat';
import type { FiltroCotizacion } from '../useCotizaciones';

interface Props {
  resumen: ResumenMes;
  filtro: FiltroCotizacion;
  onFiltro: (filtro: FiltroCotizacion) => void;
}

/**
 * Panel del mes, solo con conteos (sin montos): cuántas cotizaciones hay, el
 * porcentaje de cierre, una barra apilada por estatus y tres celdas que además
 * funcionan como filtro (tocar «Autorizadas» deja solo esas; tocar de nuevo,
 * todas).
 */
export function ResumenMesCotizaciones({ resumen, filtro, onFiltro }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const crecer = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const { cantidad, porStatus } = resumen;

  useEffect(() => {
    if (reduced) return;
    crecer.setValue(0);
    const anim = Animated.timing(crecer, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [cantidad, reduced, crecer]);

  const tasa = cantidad > 0 ? Math.round((porStatus.AUTORIZADA / cantidad) * 100) : 0;

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.cabeza}>
        <View style={styles.flex}>
          <Text style={[styles.label, { color: colors.inkSubtle }]}>Cotizaciones del mes</Text>
          <View style={styles.totalFila}>
            <Text style={[styles.total, { color: colors.ink }]}>{cantidad}</Text>
            <Text style={[styles.totalUnidad, { color: colors.inkMuted }]}>{cantidad === 1 ? 'cotización' : 'cotizaciones'}</Text>
          </View>
        </View>
        {cantidad > 0 ? (
          <View
            style={[styles.tasa, { backgroundColor: colors.statusResueltoBg }]}
            accessible
            accessibilityLabel={`${tasa} por ciento autorizadas`}
          >
            <Text style={[styles.tasaValor, { color: colors.statusResueltoText }]}>{tasa}%</Text>
            <Text style={[styles.tasaLabel, { color: colors.statusResueltoText }]}>cierre</Text>
          </View>
        ) : null}
      </View>

      {/* Barra apilada por conteo: crece desde la izquierda con scaleX (sin animar el ancho). */}
      <View
        style={[styles.pista, { backgroundColor: colors.surfaceSunken }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[styles.barra, { transform: [{ scaleX: crecer }] }]}>
          {STATUS_ORDER.map((s) =>
            porStatus[s] > 0 ? <View key={s} style={{ flex: porStatus[s], backgroundColor: statusTone(s, colors).text }} /> : null,
          )}
        </Animated.View>
      </View>

      <View style={styles.celdas}>
        {STATUS_ORDER.map((s) => (
          <Celda
            key={s}
            status={s}
            cantidad={porStatus[s]}
            porcentaje={cantidad > 0 ? Math.round((porStatus[s] / cantidad) * 100) : 0}
            activa={filtro === s}
            atenuada={filtro !== 'todas' && filtro !== s}
            onPress={() => onFiltro(filtro === s ? 'todas' : s)}
          />
        ))}
      </View>
    </View>
  );
}

function Celda({
  status,
  cantidad,
  porcentaje,
  activa,
  atenuada,
  onPress,
}: {
  status: CotizacionStatus;
  cantidad: number;
  porcentaje: number;
  activa: boolean;
  atenuada: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tono = statusTone(status, colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`${cantidad} ${statusLabel(status).toLowerCase()}${cantidad === 1 ? '' : 's'}`}
      accessibilityHint={activa ? 'Quita el filtro' : `Muestra solo las ${statusLabel(status).toLowerCase()}s`}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.celda,
        {
          backgroundColor: activa ? tono.bg : pressed ? colors.surfaceSunken : 'transparent',
          borderColor: activa ? tono.text : colors.line,
          opacity: atenuada ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.celdaCabeza}>
        <View style={[styles.celdaPunto, { backgroundColor: tono.text }]} />
        <Text style={[styles.celdaLabel, { color: activa ? tono.text : colors.inkMuted }]} numberOfLines={1}>
          {statusLabel(status)}s
        </Text>
      </View>
      <Text style={[styles.celdaValor, { color: colors.ink }]}>{cantidad}</Text>
      <Text style={[styles.celdaPct, { color: colors.inkSubtle }]}>{porcentaje}% del mes</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  panel: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' },
  totalFila: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  total: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  totalUnidad: { ...type.label },
  tasa: { alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tasaValor: { fontFamily: font.bold, fontSize: 17, lineHeight: 20, fontVariant: ['tabular-nums'] },
  tasaLabel: { ...type.caption, fontSize: 10, lineHeight: 12 },
  pista: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barra: { flex: 1, flexDirection: 'row', gap: 2, transformOrigin: 'left' },
  celdas: { flexDirection: 'row', gap: spacing.sm },
  celda: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 2, minHeight: 72 },
  celdaCabeza: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  celdaPunto: { width: 6, height: 6, borderRadius: 3 },
  celdaLabel: { fontFamily: font.semibold, fontSize: 11, flexShrink: 1 },
  celdaValor: { fontFamily: font.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  celdaPct: { ...type.caption, fontSize: 10, lineHeight: 13 },
});
