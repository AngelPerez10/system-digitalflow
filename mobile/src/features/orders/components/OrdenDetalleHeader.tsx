import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { Orden, OrdenStatus } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import {
  clienteDisplay,
  folioDisplay,
  prioridadLabel,
  prioridadTone,
  statusLabel,
  statusTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { IconClock, IconPause, IconPhone, IconPin, IconVisto, TipoOrdenIcon } from './icons';

interface Props {
  orden: Orden;
  onVolver: () => void;
}

const STATUS_ICON: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={13} />,
  pausado: (color) => <IconPause color={color} size={13} />,
  resuelto: (color) => <IconVisto color={color} size={13} />,
};

/** Vidrio sobre la banda marina (siempre oscura en ambos temas). */
const GLASS = 'rgba(255,255,255,0.1)';
const GLASS_PRESSED = 'rgba(255,255,255,0.2)';

/**
 * Banda marina del detalle — mismo corte que `EditarHeader`. Llamar y
 * «Cómo llegar» viven aquí arriba: es lo que el técnico hace de pie frente
 * al domicilio, con el celular en una mano, antes que leer cualquier otra cosa.
 */
export function OrdenDetalleHeader({ orden, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tono = statusTone(orden.status, colors);
  // `prioridad_pool` es el nivel que fija el admin en el ERP; `prioridad` es legado.
  const prioTono = prioridadTone(orden.prioridad_pool, colors);
  const telefono = orden.telefono_cliente?.trim() || null;
  const direccion = orden.direccion?.trim() || null;

  const abrirMapa = () => {
    if (!direccion) return;
    const url = esEnlaceUbicacion(direccion)
      ? direccion
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.filaSuperior}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis órdenes"
          onPress={onVolver}
          hitSlop={4}
          style={({ pressed }) => [styles.volver, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={18} />
        </Pressable>

        <View style={styles.titulos}>
          <View style={styles.eyebrowFila}>
            <TipoOrdenIcon tipo={orden.tipo_orden} color={colors.onNavyMuted} size={11} />
            <Text style={[styles.eyebrow, { color: colors.onNavyMuted }]} numberOfLines={1}>
              {tipoOrdenLabel(orden.tipo_orden)}
            </Text>
          </View>
          <Text style={[styles.folio, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
            {folioDisplay(orden)}
          </Text>
        </View>

        <View
          style={[styles.statusPill, { backgroundColor: tono.bg }]}
          accessible
          accessibilityLabel={`Estatus: ${statusLabel(orden.status)}`}
        >
          {STATUS_ICON[orden.status](tono.text)}
          <Text style={[styles.statusTexto, { color: tono.text }]}>{statusLabel(orden.status)}</Text>
        </View>
      </View>

      <View style={styles.clienteFila}>
        <Text style={[styles.cliente, { color: colors.onNavy }]} numberOfLines={2}>
          {clienteDisplay(orden)}
        </Text>
        <View
          style={[styles.prioridad, { backgroundColor: prioTono.bg }]}
          accessible
          accessibilityLabel={`${orden.en_pool ? 'Disponible, prioridad' : 'Prioridad'} ${prioridadLabel(orden.prioridad_pool)}`}
        >
          <Text style={[styles.prioridadTexto, { color: prioTono.text }]}>
            {orden.en_pool ? 'Disponible · ' : ''}
            {prioridadLabel(orden.prioridad_pool)}
          </Text>
        </View>
      </View>

      {telefono || direccion ? (
        <View style={styles.acciones}>
          {telefono ? (
            <AccionBanda
              disco={colors.success}
              icon={<IconPhone color={colors.canvas} size={13} />}
              label="Llamar"
              accessibilityLabel={`Llamar al ${telefono}`}
              onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
            />
          ) : null}
          {direccion ? (
            <AccionBanda
              disco={colors.gold}
              icon={<IconPin color={colors.onGold} size={13} />}
              label="Cómo llegar"
              accessibilityLabel="Abrir la ubicación en el mapa"
              onPress={abrirMapa}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AccionBanda({
  disco,
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  /** Color sólido del círculo del ícono: le da identidad a cada acción. */
  disco: string;
  icon: React.ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.accion, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
    >
      <View style={[styles.disco, { backgroundColor: disco }]}>{icon}</View>
      <Text style={[styles.accionTexto, { color: colors.onNavy }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banda: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volver: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { flex: 1, minWidth: 0 },
  eyebrowFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  folio: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.7 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusTexto: { ...type.label, fontFamily: font.semibold, fontSize: 12 },
  clienteFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cliente: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  prioridad: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  prioridadTexto: { ...type.caption, fontSize: 11, fontFamily: font.semibold, letterSpacing: 0.3 },
  acciones: { flexDirection: 'row', gap: spacing.sm },
  disco: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  accion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.md,
  },
  accionTexto: { ...type.label, fontFamily: font.semibold },
});
