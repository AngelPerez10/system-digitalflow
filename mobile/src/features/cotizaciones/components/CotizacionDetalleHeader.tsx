import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { Cotizacion } from '@/types/cotizacion';
import { clienteDisplay, folioDisplay, formatMoneda, statusLabel, statusTone, totalMostrado } from '../cotizacionFormat';

interface Props {
  cotizacion: Cotizacion;
  onVolver: () => void;
}

/**
 * Cabecera compacta del detalle, misma anatomía que la de proyectos: volver,
 * el cliente como título y una sola línea con folio · estatus · total. El
 * color del estatus corre como una línea fina en el borde inferior.
 */
export function CotizacionDetalleHeader({ cotizacion, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Sobre marino (oscuro en ambos temas) el tono del estatus sale de la paleta oscura.
  const tono = statusTone(cotizacion.status, darkColors);
  const folio = folioDisplay(cotizacion);
  // En garantía el total se muestra en $0, como en la web y el PDF.
  const total = formatMoneda(totalMostrado(cotizacion));
  const estado = `${statusLabel(cotizacion.status)}${cotizacion.es_garantia ? ' · Garantía' : ''}`;
  const cancelada = cotizacion.status === 'CANCELADA';

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a cotizaciones"
          onPress={onVolver}
          hitSlop={4}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' },
          ]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={18} />
        </Pressable>

        <View style={styles.textos}>
          <Text style={[styles.cliente, { color: colors.onNavy }]} numberOfLines={2} accessibilityRole="header">
            {clienteDisplay(cotizacion)}
          </Text>
          <View
            style={styles.meta}
            accessible
            accessibilityLabel={`${folio}, ${estado}, total ${total}`}
          >
            <Text style={[styles.folio, { color: colors.onNavyMuted }]}>{folio}</Text>
            <View style={[styles.separador, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            <View style={[styles.punto, { backgroundColor: tono.text }]} />
            <Text style={[styles.metaTexto, { color: colors.onNavy }]}>{estado}</Text>
            <View style={[styles.separador, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            <Text style={[styles.metaTexto, styles.total, { color: colors.onNavy }, cancelada ? styles.tachado : null]}>
              {total}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.linea, { backgroundColor: tono.text }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {},
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  volver: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  cliente: { fontFamily: font.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  folio: { ...type.mono, fontSize: 12 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  metaTexto: { ...type.caption, fontSize: 12, fontFamily: font.semibold },
  total: { fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
  linea: { height: 3 },
});
