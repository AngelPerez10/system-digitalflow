import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { formatFecha, formatHora } from '@/utils/fecha';
import {
  clienteDisplay,
  folioDisplay,
  haceCuanto,
  prioridadLabel,
  prioridadTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { IconAlerta, IconCalendar, IconClock, IconFlecha, IconPin, TipoOrdenIcon } from './icons';

interface Props {
  orden: OrdenListItem;
  tomando: boolean;
  /** Otra orden se está tomando: esta se bloquea para no disparar dos. */
  bloqueada?: boolean;
  onTomar: (orden: OrdenListItem) => void;
}

/**
 * Tarjeta de una orden disponible. Aquí manda la prioridad (la placa y la
 * franja superior toman su tono) y la acción es una sola, grande: «Tomar
 * orden». Toda la tarjeta no es tocable a propósito — tomar es una decisión,
 * no un toque accidental al hacer scroll.
 */
export function PoolOrdenCard({ orden, tomando, bloqueada = false, onTomar }: Props) {
  const { colors } = useTheme();
  const prio = prioridadTone(orden.prioridad_pool, colors);
  const fecha = formatFecha(orden.fecha_inicio);
  const hora = formatHora(orden.hora_inicio);
  const cuando = [fecha, hora].filter((p) => p && p !== '—').join(' · ');
  const liberada = haceCuanto(orden.liberada_at);
  const direccion = orden.direccion?.trim() || null;
  const esMapa = direccion ? esEnlaceUbicacion(direccion) : false;

  const abrirMapa = () => {
    if (!direccion) return;
    const url = esMapa ? direccion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'card') },
      ]}
    >
      <View style={[styles.franja, { backgroundColor: prio.text }]} />

      <View style={styles.cuerpo}>
        <View style={styles.cabeza}>
          <View style={[styles.placa, { backgroundColor: prio.bg }]} importantForAccessibility="no">
            <TipoOrdenIcon tipo={orden.tipo_orden} color={prio.text} size={18} />
          </View>
          <View style={styles.titulos}>
            <View style={styles.metaFila}>
              <Text style={[styles.folio, { color: colors.inkMuted }]} numberOfLines={1}>
                {folioDisplay(orden)}
              </Text>
              <View style={[styles.separador, { backgroundColor: colors.lineStrong }]} />
              <Text style={[styles.tipo, { color: colors.inkSubtle }]} numberOfLines={1}>
                {tipoOrdenLabel(orden.tipo_orden)}
              </Text>
            </View>
            <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
              {clienteDisplay(orden)}
            </Text>
          </View>
          <View style={[styles.prioridad, { backgroundColor: prio.bg }]}>
            <View style={[styles.prioridadPunto, { backgroundColor: prio.text }]} />
            <Text style={[styles.prioridadTexto, { color: prio.text }]}>{prioridadLabel(orden.prioridad_pool)}</Text>
          </View>
        </View>

        {orden.problematica ? (
          <View style={styles.nota}>
            <IconAlerta color={colors.statusPendienteText} size={13} />
            <Text style={[styles.notaTexto, { color: colors.inkMuted }]} numberOfLines={3}>
              {orden.problematica}
            </Text>
          </View>
        ) : null}

        <View style={styles.datos}>
          {direccion ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={esMapa ? 'Ver ubicación en el mapa' : `Abrir en el mapa: ${direccion}`}
              onPress={abrirMapa}
              hitSlop={6}
              style={({ pressed }) => [
                styles.dato,
                { backgroundColor: pressed ? colors.line : colors.surfaceSunken, borderColor: colors.line },
              ]}
            >
              <IconPin color={colors.primary} size={13} />
              <Text style={[styles.datoTexto, { color: colors.ink }]} numberOfLines={1}>
                {esMapa ? 'Ver en el mapa' : direccion}
              </Text>
            </Pressable>
          ) : null}
          {cuando ? (
            <View style={[styles.dato, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
              <IconCalendar color={colors.inkSubtle} size={13} />
              <Text style={[styles.datoTexto, styles.mono, { color: colors.inkMuted }]} numberOfLines={1}>
                {cuando}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          <View style={styles.liberada}>
            <IconClock color={colors.inkSubtle} size={12} />
            <Text style={[styles.liberadaTexto, { color: colors.inkSubtle }]} numberOfLines={1}>
              {liberada ? `Liberada ${liberada}` : 'Disponible'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tomar la orden ${folioDisplay(orden)}`}
            accessibilityHint="Te asigna esta orden"
            accessibilityState={{ disabled: bloqueada || tomando, busy: tomando }}
            disabled={bloqueada || tomando}
            onPress={() => onTomar(orden)}
            style={({ pressed }) => [
              styles.tomar,
              {
                backgroundColor: bloqueada ? colors.navyDisabled : pressed ? colors.navyDeep : colors.navy,
              },
            ]}
          >
            {tomando ? (
              <ActivityIndicator size="small" color={colors.onNavy} />
            ) : (
              <>
                <Text style={[styles.tomarTexto, { color: colors.onNavy }]}>Tomar orden</Text>
                <View style={[styles.tomarIcono, { backgroundColor: colors.gold }]}>
                  <IconFlecha color={colors.onGold} size={12} />
                </View>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const PLACA = 42;

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  franja: { height: 3 },
  cuerpo: { padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: { width: PLACA, height: PLACA, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { ...type.mono, fontSize: 12, flexShrink: 0 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  tipo: { ...type.caption, fontSize: 12, flexShrink: 1 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  prioridad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  prioridadPunto: { width: 5, height: 5, borderRadius: 3 },
  prioridadTexto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 15 },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notaTexto: { ...type.caption, flex: 1, marginTop: -2 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dato: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  datoTexto: { ...type.label, fontSize: 12, flexShrink: 1 },
  mono: { ...type.mono, fontSize: 12 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  liberada: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  liberadaTexto: { ...type.caption, fontSize: 12 },
  tomar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET - 4,
    minWidth: 140,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: 6,
  },
  tomarTexto: { ...type.button, fontFamily: font.semibold, fontSize: 14 },
  tomarIcono: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
