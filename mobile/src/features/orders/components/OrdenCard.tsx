import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { formatFecha, formatHora, hoyISO } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  accionLabel,
  clienteDisplay,
  folioDisplay,
  normalizarPrioridad,
  prioridadLabel,
  prioridadTone,
  statusLabel,
  statusTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { IconAlerta, IconCalendar, IconFlecha, IconPause, IconPhone, IconPin, TipoOrdenIcon } from './icons';

interface Props {
  orden: OrdenListItem;
  onPress: (orden: OrdenListItem) => void;
}

/** Acción rápida dentro de la tarjeta (llamar / mapa): no abre el detalle. */
function Atajo({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
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
      hitSlop={6}
      style={({ pressed }) => [
        styles.atajo,
        { backgroundColor: pressed ? colors.line : colors.surfaceSunken, borderColor: colors.line },
      ]}
    >
      {icon}
      <Text style={[styles.atajoTexto, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Tarjeta del listado. La placa de color con el ícono del tipo de orden
 * dice el estatus antes de leer nada; el cliente es lo más grande porque es
 * como el técnico piensa en su día («voy con ACME»), no por folio.
 */
export function OrdenCard({ orden, onPress }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const folio = folioDisplay(orden);
  const cliente = clienteDisplay(orden);
  const tono = statusTone(orden.status, colors);
  const prioridad = normalizarPrioridad(orden.prioridad_pool);
  const prioTono = prioridadTone(orden.prioridad_pool, colors);
  const esHoy = orden.fecha_inicio === hoyISO() && orden.status !== 'resuelto';
  const pausada = orden.status === 'pausado';

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const fecha = formatFecha(orden.fecha_inicio);
  const hora = formatHora(orden.hora_inicio);
  const cuando = [esHoy ? 'Hoy' : fecha, hora].filter((p) => p && p !== '—').join(' · ');

  const nota = pausada && orden.motivo_pausa ? orden.motivo_pausa : orden.problematica;
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
    <Animated.View style={[styles.envoltura, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Orden ${folio}, ${cliente}, ${statusLabel(orden.status)}${esHoy ? ', programada para hoy' : ''}`}
        accessibilityHint="Abre el detalle de la orden"
        onPress={() => onPress(orden)}
        onPressIn={() => animarA(0.98)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: pressed ? tono.text : colors.line,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={styles.cabeza}>
          <View style={[styles.placa, { backgroundColor: tono.bg }]} importantForAccessibility="no">
            <TipoOrdenIcon tipo={orden.tipo_orden} color={tono.text} size={18} />
          </View>

          <View style={styles.titulos}>
            <View style={styles.metaFila}>
              <Text style={[styles.folio, { color: colors.inkMuted }]} numberOfLines={1}>
                {folio}
              </Text>
              <View style={[styles.separador, { backgroundColor: colors.lineStrong }]} />
              <Text style={[styles.tipo, { color: colors.inkSubtle }]} numberOfLines={1}>
                {tipoOrdenLabel(orden.tipo_orden)}
              </Text>
            </View>
            <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
              {cliente}
            </Text>
          </View>

          <View style={styles.insignias}>
            {esHoy ? (
              <View style={[styles.insignia, { backgroundColor: colors.gold }]}>
                <Text style={[styles.insigniaTexto, { color: colors.onGold }]}>Hoy</Text>
              </View>
            ) : null}
            {prioridad !== 'baja' ? (
              <View style={[styles.insignia, { backgroundColor: prioTono.bg }]}>
                <View style={[styles.insigniaPunto, { backgroundColor: prioTono.text }]} />
                <Text style={[styles.insigniaTexto, { color: prioTono.text }]}>
                  {prioridadLabel(orden.prioridad_pool)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {nota ? (
          <View style={styles.nota}>
            {pausada ? (
              <IconPause color={colors.statusPausadoText} size={13} />
            ) : (
              <IconAlerta color={colors.statusPendienteText} size={13} />
            )}
            <Text style={[styles.notaTexto, { color: colors.inkMuted }]} numberOfLines={2}>
              {nota}
            </Text>
          </View>
        ) : null}

        {telefono || direccion ? (
          <View style={styles.atajos}>
            {direccion ? (
              <Atajo
                icon={<IconPin color={colors.primary} size={13} />}
                label={esEnlaceUbicacion(direccion) ? 'Ver en el mapa' : direccion}
                accessibilityLabel={`Abrir la ubicación en el mapa${esEnlaceUbicacion(direccion) ? '' : `: ${direccion}`}`}
                onPress={abrirMapa}
              />
            ) : null}
            {telefono ? (
              <Atajo
                icon={<IconPhone color={colors.success} size={13} />}
                label="Llamar"
                accessibilityLabel={`Llamar al ${telefono}`}
                onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
              />
            ) : null}
          </View>
        ) : null}

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          <View style={styles.cuando}>
            <IconCalendar color={esHoy ? colors.goldSoftText : colors.inkSubtle} size={13} />
            <Text
              style={[styles.cuandoTexto, { color: esHoy ? colors.goldSoftText : colors.inkSubtle }]}
              numberOfLines={1}
            >
              {cuando || 'Sin programar'}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={[styles.ctaTexto, { color: colors.navyText }]}>{accionLabel(orden.status)}</Text>
            <View style={[styles.ctaFlecha, { backgroundColor: colors.navy }]}>
              <IconFlecha color={colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const PLACA = 42;

const styles = StyleSheet.create({
  envoltura: { marginBottom: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: {
    width: PLACA,
    height: PLACA,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { ...type.mono, fontSize: 12, flexShrink: 0 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  tipo: { ...type.caption, fontSize: 12, flexShrink: 1 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  insignias: { alignItems: 'flex-end', gap: 4 },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  insigniaPunto: { width: 5, height: 5, borderRadius: 3 },
  insigniaTexto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 15 },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingRight: spacing.xs },
  notaTexto: { ...type.caption, flex: 1, marginTop: -2 },
  atajos: { flexDirection: 'row', gap: spacing.sm },
  atajo: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  atajoTexto: { ...type.label, fontSize: 12, flexShrink: 1 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  cuando: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  cuandoTexto: { ...type.mono, fontSize: 12, flexShrink: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctaTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  ctaFlecha: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
