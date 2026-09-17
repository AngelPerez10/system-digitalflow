import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
import { clienteDisplay, folioDisplay, statusLabel, statusTone } from '../proyectoFormat';
import { colorPorAvance } from './PorcentajeAvance';
import { ProyectoStatusIcon } from './ProyectoStatusIcon';

interface Props {
  proyecto: Proyecto;
  onVolver: () => void;
}

/** Banda marina del detalle — mismo corte que `OrdenDetalleHero`. */
export function ProyectoDetalleHero({ proyecto, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tono = statusTone(proyecto.status, colors);
  const avanceTono = colorPorAvance(proyecto.porcentaje_avance, colors);

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a mis proyectos"
        onPress={onVolver}
        hitSlop={12}
        style={({ pressed }) => [styles.volver, pressed ? { opacity: 0.6 } : null]}
      >
        <IconChevron direction="left" color={colors.onNavy} size={16} />
        <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Mis proyectos</Text>
      </Pressable>

      <View style={styles.cuerpo}>
        <View style={styles.tituloFila}>
          <Text style={[styles.folio, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
            {folioDisplay(proyecto)}
          </Text>
          <View
            style={[styles.statusPill, { backgroundColor: tono.bg, borderColor: tono.text }]}
            accessibilityRole="text"
            accessibilityLabel={`Estatus: ${statusLabel(proyecto.status)}`}
          >
            <ProyectoStatusIcon status={proyecto.status} color={tono.text} size={12} />
            <Text style={[styles.statusTexto, { color: tono.text }]} numberOfLines={1}>
              {statusLabel(proyecto.status)}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: colors.onNavyMuted }]} numberOfLines={2}>
          {proyecto.tipo_trabajo_nombre ?? 'Proyecto'} · {clienteDisplay(proyecto)}
        </Text>
        {proyecto.porcentaje_avance > 0 ? (
          <View style={styles.avanceFila}>
            <View style={[styles.avancePista, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <View
                style={[styles.avanceBarra, { backgroundColor: avanceTono.bg, width: `${proyecto.porcentaje_avance}%` }]}
              />
            </View>
            <Text style={[styles.avanceTexto, { color: avanceTono.text }]}>
              {proyecto.porcentaje_avance}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  volver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  volverTexto: { ...type.label },
  cuerpo: { marginTop: spacing.sm, gap: spacing.xs },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  folio: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.bold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -1,
  },
  meta: { ...type.caption, fontSize: 13 },
  statusPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 3,
  },
  statusTexto: { ...type.label, fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.2 },
  avanceFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  avancePista: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  avanceBarra: { height: '100%', borderRadius: 3 },
  avanceTexto: { ...type.mono, fontSize: 11 },
});
