import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { formatFecha } from '@/utils/fecha';
import {
  clienteDisplay,
  folioDisplay,
  prioridadLabel,
  prioridadTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { FallaBox } from './FallaBox';
import { IconCalendar, IconPin, TipoOrdenIcon } from './icons';

interface Props {
  orden: OrdenListItem;
  tomando: boolean;
  onTomar: (orden: OrdenListItem) => void;
}

/**
 * Tarjeta de una orden disponible (liberada a la lista). Sin píldora de estatus (todas
 * están libres): lo que manda es el nivel de prioridad y el botón "Tomar".
 */
export function PoolOrdenCard({ orden, tomando, onTomar }: Props) {
  const { colors } = useTheme();
  const prio = prioridadTone(orden.prioridad_pool, colors);
  const fecha = formatFecha(orden.fecha_inicio) || formatFecha(orden.fecha_creacion);

  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'card') },
      ]}
    >
      <View style={[styles.acento, { backgroundColor: prio.text }]} />

      <View style={styles.contenido}>
        <View style={styles.cabecera}>
          <Text style={[styles.folio, { color: colors.inkMuted, borderColor: colors.lineStrong }]}>
            {folioDisplay(orden)}
          </Text>
          <View style={[styles.prioridadPill, { backgroundColor: prio.bg }]}>
            <Text style={[styles.prioridadTexto, { color: prio.text }]}>
              Prioridad · {prioridadLabel(orden.prioridad_pool)}
            </Text>
          </View>
        </View>

        <View style={[styles.tipoChip, { backgroundColor: colors.surfaceSunken }]}>
          <TipoOrdenIcon tipo={orden.tipo_orden} color={colors.inkSubtle} size={11} />
          <Text style={[styles.tipoTexto, { color: colors.inkMuted }]} numberOfLines={1}>
            {tipoOrdenLabel(orden.tipo_orden)}
          </Text>
        </View>

        <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
          {clienteDisplay(orden)}
        </Text>

        {orden.problematica ? (
          <FallaBox titulo="Falla reportada" texto={orden.problematica} numberOfLines={3} />
        ) : null}

        {orden.direccion ? (
          <View style={styles.fila}>
            <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>
              <IconPin color={colors.navy} size={12} />
            </View>
            <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={2}>
              {orden.direccion}
            </Text>
          </View>
        ) : null}

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          {fecha ? (
            <View style={styles.fechaFila}>
              <IconCalendar color={colors.inkSubtle} size={13} />
              <Text style={[styles.fechaTexto, { color: colors.inkSubtle }]}>{fecha}</Text>
            </View>
          ) : (
            <View />
          )}
          <AppButton
            label="Tomar"
            loading={tomando}
            onPress={() => onTomar(orden)}
            accessibilityHint="Asignarte esta orden disponible"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  acento: { width: 3 },
  contenido: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  folio: {
    ...type.mono,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  prioridadPill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  prioridadTexto: { ...type.caption, fontSize: 11, fontFamily: type.label.fontFamily },
  tipoChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tipoTexto: { ...type.caption, fontSize: 11 },
  cliente: { ...type.bodyMedium, fontSize: 16, flexShrink: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconoPlaca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: { ...type.caption, flex: 1, flexShrink: 1 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  fechaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  fechaTexto: { ...type.mono, fontSize: 12 },
});
