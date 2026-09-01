import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { Orden, OrdenStatus } from '@/types/orden';
import {
  clienteDisplay,
  folioDisplay,
  statusLabel,
  statusTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { IconClock, IconPause, IconVisto } from './icons';

interface Props {
  orden: Orden;
  onVolver: () => void;
}

const STATUS_ICON: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={14} />,
  pausado: (color) => <IconPause color={color} size={14} />,
  resuelto: (color) => <IconVisto color={color} size={14} />,
};

/**
 * Banda marina del detalle: chevron de vuelta, folio grande y píldora de
 * estatus. Mismo corte marino + hoja blanca de acceso y del portal del
 * cliente — el detalle deja de ser el único rincón que parecía otra app.
 */
export function OrdenDetalleHero({ orden, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tono = statusTone(orden.status, colors);

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a mis órdenes"
        onPress={onVolver}
        hitSlop={12}
        style={({ pressed }) => [styles.volver, pressed ? { opacity: 0.6 } : null]}
      >
        <IconChevron direction="left" color={colors.onNavy} size={16} />
        <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Mis órdenes</Text>
      </Pressable>

      <View style={styles.cuerpo}>
        <Text style={[styles.folio, { color: colors.onNavy }]} accessibilityRole="header">
          {folioDisplay(orden)}
        </Text>
        <Text style={[styles.meta, { color: colors.onNavyMuted }]} numberOfLines={2}>
          {tipoOrdenLabel(orden.tipo_orden)} · {clienteDisplay(orden)}
        </Text>

        <View style={[styles.statusPill, { backgroundColor: tono.bg }]}>
          {STATUS_ICON[orden.status](tono.text)}
          <Text style={[styles.statusTexto, { color: tono.text }]}>{statusLabel(orden.status)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  volver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  volverTexto: { ...type.label },
  cuerpo: { marginTop: spacing.sm, gap: spacing.xs },
  folio: { fontFamily: font.bold, fontSize: 27, lineHeight: 31, letterSpacing: -1 },
  meta: { ...type.caption, fontSize: 13 },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  statusTexto: { ...type.label, fontFamily: font.semibold },
});
